import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scamListUrl = 'https://raw.githubusercontent.com/Discord-AntiScam/scam-links/main/list.json';
const fallbackFilePath = path.join(config.database.dir, 'scam_links.json');

// Memory cache of scam domains
let scamDomains = new Set();
let updateInterval = null;

/**
 * Initializes the scam filter by loading cached list or fetching the live one.
 */
export async function initScamFilter() {
  // Try loading fallback local copy first to ensure we have *something* immediately
  loadFallback();

  try {
    logger.info('[Scam Filter] Fetching latest scam domains list...');
    const response = await fetch(scamListUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (Array.isArray(data)) {
      scamDomains = new Set(data.map(d => d.toLowerCase()));
      logger.info(`[Scam Filter] Successfully loaded ${scamDomains.size} scam domains from remote.`);
      
      // Save local fallback
      try {
        if (!fs.existsSync(config.database.dir)) {
          fs.mkdirSync(config.database.dir, { recursive: true });
        }
        fs.writeFileSync(fallbackFilePath, JSON.stringify(data, null, 2), 'utf8');
      } catch (err) {
        logger.error('[Scam Filter] Failed to save fallback file:', err);
      }
    } else {
      logger.warn('[Scam Filter] Received invalid data format from remote list.');
    }
  } catch (error) {
    logger.warn(`[Scam Filter] Failed to fetch live list: ${error.message}. Using local fallback.`);
    loadFallback();
  }

  // Schedule background refresh every 12 hours if not already scheduled
  if (!updateInterval && process.env.NODE_ENV !== 'test') {
    updateInterval = setInterval(initScamFilter, 12 * 60 * 60 * 1000);
    if (updateInterval.unref) {
      updateInterval.unref(); // Don't block Node process exit
    }
  }
}

/**
 * Loads the scam links list from the local fallback file if it exists.
 */
function loadFallback() {
  try {
    if (fs.existsSync(fallbackFilePath)) {
      const content = fs.readFileSync(fallbackFilePath, 'utf8');
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        scamDomains = new Set(data.map(d => d.toLowerCase()));
        logger.info(`[Scam Filter] Loaded ${scamDomains.size} scam domains from local fallback.`);
      }
    }
  } catch (error) {
    logger.error('[Scam Filter] Failed to load local fallback:', error);
  }
}

/**
 * Helper to extract hostnames/domains from a string.
 * @param {string} text
 * @returns {string[]}
 */
export function extractDomains(text) {
  if (!text) return [];
  // Regex to match URLs or potential domains
  const urlRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/gi;
  const domains = [];
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    let host = match[1].toLowerCase();
    // Strip trailing paths, queries, hashes, ports if captured
    host = host.split('/')[0].split('?')[0].split('#')[0].split(':')[0];
    if (host) {
      domains.push(host);
    }
  }
  return domains;
}

/**
 * Checks if content contains any domains present in the scam list.
 * @param {string} content
 * @returns {boolean}
 */
export function containsScamLink(content) {
  if (!content || scamDomains.size === 0) return false;

  const domains = extractDomains(content);
  for (const domain of domains) {
    // Direct match check
    if (scamDomains.has(domain)) {
      return true;
    }

    // Subdomain/parent check: if domain is a.b.c.com, check:
    // a.b.c.com, b.c.com, c.com
    const parts = domain.split('.');
    while (parts.length > 1) {
      const checkDomain = parts.join('.');
      if (scamDomains.has(checkDomain)) {
        return true;
      }
      parts.shift();
    }
  }

  return false;
}

/**
 * Retrieves the current count of loaded scam domains in the memory set.
 * @returns {number}
 */
export function getScamDomainsCount() {
  return scamDomains.size;
}

/**
 * Direct access to clean cache (mainly for testing)
 */
export function clearScamCache() {
  scamDomains.clear();
}
