import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { config } from '../config.js';
import logger from './logger.js';
import { V2Embed } from './v2Embed.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';

// Cache to prevent duplicate healing processes running concurrently for the same plugin
const activeHealing = new Set();

/**
 * Sanitizes messages and stack traces to hide credentials, tokens, and database keys.
 * @param {string} text - The raw text to sanitize
 * @returns {string} The sanitized text
 */
export function sanitizeData(text) {
  if (!text) return '';
  let clean = String(text);
  
  // Clean discord tokens
  clean = clean.replace(/[a-zA-Z0-9_\-]{24}\.[a-zA-Z0-9_\-]{6}\.[a-zA-Z0-9_\-]{27}/g, '[REDACTED_DISCORD_TOKEN]');
  // Clean supabase keys
  clean = clean.replace(/sb-[a-zA-Z0-9]{20}/g, '[REDACTED_SUPABASE_KEY]');
  
  // Clean from environment variables
  if (process.env.DISCORD_TOKEN) {
    clean = clean.replaceAll(process.env.DISCORD_TOKEN, '[REDACTED_DISCORD_TOKEN]');
  }
  if (process.env.GROQ_API_KEY) {
    clean = clean.replaceAll(process.env.GROQ_API_KEY, '[REDACTED_GROQ_KEY]');
  }
  if (process.env.SUPABASE_KEY) {
    clean = clean.replaceAll(process.env.SUPABASE_KEY, '[REDACTED_SUPABASE_KEY]');
  }
  
  return clean;
}

/**
 * Initiates the self-healing process for a failing plugin.
 * @param {string} pluginName - The name of the failing plugin
 * @param {string} errorMessage - The error message thrown
 * @param {string} errorStack - The stack trace of the exception
 * @param {object} context - Discord context including the client
 */
export async function triggerSelfHealing(pluginName, errorMessage, errorStack, context) {
  const { client } = context;
  if (!client) {
    logger.error('[Self-Healing] Missing client in context. Aborting.');
    return;
  }

  const ownerId = process.env.OWNER_ID;
  if (!ownerId) {
    logger.warn('[Self-Healing] OWNER_ID not found in environment variables. Aborting.');
    return;
  }

  if (activeHealing.has(pluginName)) {
    logger.info(`[Self-Healing] Healing process already active for "${pluginName}". Skipping.`);
    return;
  }

  activeHealing.add(pluginName);
  logger.info(`[Self-Healing] Starting self-healing process for plugin "${pluginName}"...`);

  const timestamp = Date.now();
  const branchName = `ai-patch/${pluginName.toLowerCase()}-${timestamp}`;
  const pluginsDir = path.join(process.cwd(), 'src/plugins');

  try {
    // 1. Locate the plugin file
    if (!fs.existsSync(pluginsDir)) {
      throw new Error(`Plugins directory not found at ${pluginsDir}`);
    }

    const files = fs.readdirSync(pluginsDir);
    let pluginFile = null;
    for (const f of files) {
      if (f.toLowerCase().includes(pluginName.toLowerCase())) {
        pluginFile = f;
        break;
      }
    }

    if (!pluginFile) {
      throw new Error(`Could not find plugin file matching "${pluginName}" in ${pluginsDir}`);
    }

    const pluginFilePath = path.join(pluginsDir, pluginFile);
    const originalCode = fs.readFileSync(pluginFilePath, 'utf8');

    // 2. Git checkout temporary branch
    logger.info(`[Self-Healing] Creating branch ${branchName}...`);
    execSync(`git checkout -b ${branchName}`, { stdio: 'ignore' });

    // 3. Sanitize inputs
    const sanitizedError = sanitizeData(errorMessage);
    const sanitizedStack = sanitizeData(errorStack);

    // 4. Request Groq to patch the file
    logger.info(`[Self-Healing] Requesting patch from Groq AI API...`);
    const patchPrompt = `You are a self-healing system for a modular Discord Bot.
A plugin failed during execution. Your job is to rewrite the JavaScript code of the plugin to fix the bug.
Do not modify the core architecture or change how the plugin is registered. Maintain the exact same ES Module export format.

--- ERROR DETAILS ---
Error Message: ${sanitizedError}
Stack Trace:
${sanitizedStack}

--- CURRENT SOURCE CODE ---
\`\`\`javascript
${originalCode}
\`\`\`

Analyze the error and output only the complete revised JavaScript file.
Do not include explanations, notes, or wrap the response in markdown blocks other than a single code block starting with \`\`\`javascript and ending with \`\`\`.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.groq.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.groq.model,
        messages: [{ role: 'user', content: patchPrompt }],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: status ${response.status}`);
    }

    const resBody = await response.json();
    let fixedCodeRaw = resBody.choices?.[0]?.message?.content || '';

    // Extract code from javascript markdown block if present
    const codeBlockMatch = fixedCodeRaw.match(/```javascript\s*([\s\S]*?)```/);
    let fixedCode = codeBlockMatch ? codeBlockMatch[1].trim() : fixedCodeRaw.trim();

    if (!fixedCode.includes('export const')) {
      throw new Error('AI generated code does not seem to contain valid plugin exports.');
    }

    // 5. Write code and commit to git branch
    fs.writeFileSync(pluginFilePath, fixedCode, 'utf8');
    logger.info(`[Self-Healing] Patch written to ${pluginFile}. Running local tests...`);

    // Commit changes on the branch
    execSync(`git add ${pluginFilePath}`, { stdio: 'ignore' });
    execSync(`git commit -m "chore: AI patch for ${pluginName} error: ${sanitizedError.slice(0, 30)}"`, { stdio: 'ignore' });

    // 6. Run local unit tests
    let testsPassed = false;
    try {
      // Check if a specific test file exists for the plugin
      const testFileName = `${pluginName.toLowerCase()}.test.js`;
      const testFilePath = path.join(process.cwd(), 'tests', testFileName);
      const testCommand = fs.existsSync(testFilePath) ? `npm test tests/${testFileName}` : 'npm test';

      logger.info(`[Self-Healing] Running tests with command: ${testCommand}`);
      execSync(testCommand, { stdio: 'inherit' });
      testsPassed = true;
    } catch {
      logger.warn(`[Self-Healing] Unit tests failed on branch ${branchName}.`);
    }

    if (testsPassed) {
      logger.info(`[Self-Healing] Unit tests passed! Returning to dev branch and staging approval...`);
      // Return to dev branch (the changes remain committed on branchName)
      execSync('git checkout dev', { stdio: 'ignore' });

      // Generate brief diff summary for the embed description
      const diffSummary = getDiffSummary(originalCode, fixedCode);

      // Create Discord approval elements
      const approveBtnId = `ai_approve_healing_${branchName}_${pluginName}`;
      const rejectBtnId = `ai_reject_healing_${branchName}_${pluginName}`;

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(approveBtnId)
          .setLabel('Approve & Merge')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(rejectBtnId)
          .setLabel('Reject & Discard')
          .setStyle(ButtonStyle.Danger)
      );

      const embed = new V2Embed()
        .setTitle('System Alert: AI Self-Healing Code Patch 🧠🛡️')
        .setDescription(
          `**Failing Plugin:** \`${pluginName}\`\n` +
          `**Error:** \`${sanitizedError}\`\n` +
          `**Patch Branch:** \`${branchName}\`\n\n` +
          `**Generated Patch Summary (Diff):**\n` +
          `\`\`\`diff\n${diffSummary}\n\`\`\`\n` +
          `*All Jest unit tests successfully passed on this patch.*`
        )
        .addActionRow(row)
        .build();

      // Send direct message to the Bot Owner exclusively
      const owner = await client.users.fetch(ownerId).catch(() => null);
      if (owner) {
        await owner.send({
          content: `⚠️ **[SYSTEM ALERT]** AI Agent generated a self-healing patch for \`${pluginName}\`.`
        });
        await owner.send({
          components: [embed],
          flags: MessageFlags.IsComponentsV2
        });
        logger.info(`[Self-Healing] Sent merge approval card to Bot Owner (${ownerId}).`);
      } else {
        logger.error(`[Self-Healing] Failed to find Bot Owner user object with ID ${ownerId} to send DM.`);
        // Cleanup since owner couldn't be contacted
        execSync(`git branch -D ${branchName}`, { stdio: 'ignore' });
      }
    } else {
      // Cleanup branch on test failure
      execSync('git checkout dev', { stdio: 'ignore' });
      execSync(`git branch -D ${branchName}`, { stdio: 'ignore' });
      logger.error(`[Self-Healing] Healing failed. Unit tests did not pass on patch branch.`);
    }

  } catch (err) {
    logger.error(`[Self-Healing] Exception occurred during self-healing:`, err);
    // Safe fallback checkout
    try {
      execSync('git checkout dev', { stdio: 'ignore' });
      if (branchName) {
        execSync(`git branch -D ${branchName}`, { stdio: 'ignore' });
      }
    } catch {}
  } finally {
    activeHealing.delete(pluginName);
  }
}

/**
 * Generates a simple text diff representation between two code blocks.
 */
function getDiffSummary(oldCode, newCode) {
  const oldLines = oldCode.split('\n');
  const newLines = newCode.split('\n');
  let diff = '';
  let count = 0;
  const maxDiffLines = 15;

  for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
    if (oldLines[i] !== newLines[i]) {
      if (oldLines[i] !== undefined) {
        diff += `- ${oldLines[i].trim().slice(0, 60)}\n`;
        count++;
      }
      if (newLines[i] !== undefined) {
        diff += `+ ${newLines[i].trim().slice(0, 60)}\n`;
        count++;
      }
      if (count >= maxDiffLines) {
        diff += `... [Diff truncated - too many changes]`;
        break;
      }
    }
  }

  return diff || 'No textual difference found.';
}

/**
 * Handles the approval/rejection button interaction from the bot owner.
 * @param {import('discord.js').ButtonInteraction} interaction - The button interaction
 */
export async function handleHealingInteraction(interaction) {
  const isApprove = interaction.customId.startsWith('ai_approve_healing_');
  const prefix = isApprove ? 'ai_approve_healing_' : 'ai_reject_healing_';
  const remainder = interaction.customId.substring(prefix.length);
  const lastUnderscore = remainder.lastIndexOf('_');
  const branchName = remainder.substring(0, lastUnderscore);
  const pluginName = remainder.substring(lastUnderscore + 1);

  const ownerId = process.env.OWNER_ID;
  if (interaction.user.id !== ownerId) {
    return interaction.reply({
      content: '❌ Hanya Bot Owner yang dapat menyetujui atau menolak self-healing code patch.',
      flags: MessageFlags.Ephemeral
    });
  }

  await interaction.deferUpdate();

  try {
    if (isApprove) {
      logger.info(`[Self-Healing] Merging patch branch ${branchName} into dev...`);
      execSync(`git merge ${branchName}`, { stdio: 'ignore' });
      execSync(`git branch -D ${branchName}`, { stdio: 'ignore' });

      const embed = new V2Embed()
        .setTitle('System Alert: AI Self-Healing Patch Approved ✅')
        .setDescription(`Patch untuk plugin \`${pluginName}\` telah berhasil di-merge ke branch \`dev\` dan patch branch \`${branchName}\` telah dihapus.`)
        .build();

      await interaction.editReply({
        components: [embed],
        flags: MessageFlags.IsComponentsV2
      });
    } else {
      logger.info(`[Self-Healing] Discarding patch branch ${branchName}...`);
      execSync(`git branch -D ${branchName}`, { stdio: 'ignore' });

      const embed = new V2Embed()
        .setTitle('System Alert: AI Self-Healing Patch Rejected ❌')
        .setDescription(`Patch untuk plugin \`${pluginName}\` telah ditolak dan patch branch \`${branchName}\` telah dihapus.`)
        .build();

      await interaction.editReply({
        components: [embed],
        flags: MessageFlags.IsComponentsV2
      });
    }
  } catch (err) {
    logger.error(`[Self-Healing] Error processing interaction for ${branchName}:`, err);
    await interaction.followUp({
      content: `❌ Gagal memproses aksi self-healing: ${err.message}`,
      flags: MessageFlags.Ephemeral
    });
  }
}

