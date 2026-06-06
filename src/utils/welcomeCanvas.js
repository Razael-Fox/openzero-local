import { createCanvas, loadImage } from '@napi-rs/canvas';

/**
 * Generate a beautiful custom welcome image buffer for a new member
 * @param {import('discord.js').GuildMember} member - The guild member who joined
 * @param {string} locale - The translation locale ('id' or 'en')
 * @returns {Promise<Buffer>} The generated image buffer (PNG)
 */
export async function createWelcomeImage(member, locale = 'en') {
  const width = 800;
  const height = 350;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 1. Draw Sleek Dark Background with Gradients
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, '#100a20'); // Dark violet
  bgGradient.addColorStop(0.5, '#191135'); // Deep indigo
  bgGradient.addColorStop(1, '#0b0813'); // Near black
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // 2. Add Decorative Glassmorphic & Neon Accents
  ctx.strokeStyle = 'rgba(110, 76, 193, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(width, 0, 200, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(245, 142, 37, 0.15)';
  ctx.beginPath();
  ctx.arc(0, height, 150, 0, Math.PI * 2);
  ctx.stroke();

  // Draw a sleek frame border around the canvas
  const borderGradient = ctx.createLinearGradient(0, 0, width, 0);
  borderGradient.addColorStop(0, '#6e4cc1');
  borderGradient.addColorStop(0.5, '#f58e25');
  borderGradient.addColorStop(1, '#6e4cc1');
  ctx.strokeStyle = borderGradient;
  ctx.lineWidth = 8;
  ctx.strokeRect(0, 0, width, height);

  // 3. Draw Circular Avatar with Glowing Neon Border
  const avatarX = 140;
  const avatarY = height / 2;
  const avatarRadius = 80;

  // Outer Neon Glow circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 6, 0, Math.PI * 2);
  ctx.shadowColor = '#6e4cc1';
  ctx.shadowBlur = 15;
  ctx.strokeStyle = '#6e4cc1';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  // Draw Avatar Image
  let avatarImg;
  try {
    const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    const res = await fetch(avatarUrl);
    if (!res.ok) throw new Error('Failed to fetch avatar');
    const arrayBuffer = await res.arrayBuffer();
    const avatarBuffer = Buffer.from(arrayBuffer);
    avatarImg = await loadImage(avatarBuffer);
  } catch (err) {
    // Fallback to default avatar color block or generic shape if fetch fails
    avatarImg = null;
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
  ctx.clip();

  if (avatarImg) {
    ctx.drawImage(avatarImg, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
  } else {
    // Fallback draw
    ctx.fillStyle = '#6e4cc1';
    ctx.fillRect(avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(member.user.username.slice(0, 2).toUpperCase(), avatarX, avatarY);
  }
  ctx.restore();

  // 4. Draw Typography & Information
  const textStartX = 260;
  ctx.shadowBlur = 0; // Reset shadow

  // A. Welcome Title Text
  const titleText = locale === 'id' ? 'SELAMAT DATANG' : 'WELCOME';
  ctx.fillStyle = '#f58e25'; // Accent orange
  ctx.font = 'bold 22px "Montserrat", "Segoe UI", Arial, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(titleText, textStartX, 75);

  // B. User Tag / Name
  const userTag = member.user.tag;
  ctx.fillStyle = '#ffffff'; // White
  ctx.font = 'bold 36px "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  
  // Truncate username if too long to prevent overflowing canvas
  let maxTagWidth = 480;
  let tagToDraw = userTag;
  if (ctx.measureText(tagToDraw).width > maxTagWidth) {
    while (ctx.measureText(tagToDraw + '...').width > maxTagWidth && tagToDraw.length > 5) {
      tagToDraw = tagToDraw.slice(0, -1);
    }
    tagToDraw += '...';
  }
  ctx.fillText(tagToDraw, textStartX, 115);

  // C. Server/Guild Name Info
  const guildNameText = locale === 'id' 
    ? `di ${member.guild.name}` 
    : `to ${member.guild.name}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = 'italic 20px "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  ctx.fillText(guildNameText, textStartX, 170);

  // D. Member Counter Badge
  const memberCount = member.guild.memberCount;
  const countText = locale === 'id'
    ? `Member #${memberCount}`
    : `Member #${memberCount}`;
  
  // Draw a rounded tag capsule for the member count
  const badgeY = 220;
  const badgeHeight = 40;
  ctx.font = 'bold 18px "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  const badgeTextWidth = ctx.measureText(countText).width;
  const badgeWidth = badgeTextWidth + 30;

  ctx.fillStyle = '#6e4cc1'; // Primary purple capsule
  ctx.beginPath();
  ctx.roundRect(textStartX, badgeY, badgeWidth, badgeHeight, 8);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(countText, textStartX + badgeWidth / 2, badgeY + badgeHeight / 2);

  // 5. Output Canvas to Buffer
  return canvas.toBuffer('image/png');
}
