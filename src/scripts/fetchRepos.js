import fs from 'fs/promises';

const INPUT_PATH =
  '/data/data/com.termux/files/home/openzero-local/data/obtainium-export-2026-06-01T23-37-03.954804.json';
const OUTPUT_JSON =
  '/data/data/com.termux/files/home/openzero-local/data/obtainium_repos_data.json';
const OUTPUT_YAML =
  '/data/data/com.termux/files/home/openzero-local/data/obtainium_repos_data.yaml';

// Helper delay untuk menghindari hitting rate limit
const delay = (ms) => new Promise((resolve) => resolve(setTimeout(resolve, ms)));

/**
 * Parsing URL repositori untuk mendapatkan owner dan repo name
 */
function parseRepoUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return {
        host: url.hostname,
        owner: parts[0],
        repo: parts[1]
      };
    }
  } catch {
    // Abaikan error parsing
  }
  return null;
}

/**
 * Helper fetch dengan header lengkap
 */
async function fetchWithHeaders(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'OpenZero-Bot-Fetcher-Antigravity',
      Accept: 'application/vnd.github.v3+json'
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Mengambil deskripsi dan README dari GitHub
 */
async function fetchGithubRepo(owner, repo) {
  let description = '';
  let readme = '';

  // 1. Fetch Repository Info
  try {
    const repoInfo = await fetchWithHeaders(`https://api.github.com/repos/${owner}/${repo}`);
    description = repoInfo.description || '';
  } catch (error) {
    console.error(`[GitHub Info Error] ${owner}/${repo}:`, error.message);
  }

  // 2. Fetch README
  try {
    const readmeInfo = await fetchWithHeaders(
      `https://api.github.com/repos/${owner}/${repo}/readme`
    );
    if (readmeInfo.content && readmeInfo.encoding === 'base64') {
      readme = Buffer.from(readmeInfo.content, 'base64').toString('utf-8');
    }
  } catch (error) {
    console.error(`[GitHub README Error] ${owner}/${repo}:`, error.message);
  }

  return { description, readme };
}

/**
 * Mengambil deskripsi dan README dari Codeberg
 */
async function fetchCodebergRepo(owner, repo) {
  let description = '';
  let readme = '';

  // 1. Fetch Repository Info
  try {
    const repoInfo = await fetchWithHeaders(`https://codeberg.org/api/v1/repos/${owner}/${repo}`);
    description = repoInfo.description || '';
  } catch (error) {
    console.error(`[Codeberg Info Error] ${owner}/${repo}:`, error.message);
  }

  // 2. Fetch README
  try {
    const readmeInfo = await fetchWithHeaders(
      `https://codeberg.org/api/v1/repos/${owner}/${repo}/contents/README.md`
    );
    if (readmeInfo.content && readmeInfo.encoding === 'base64') {
      readme = Buffer.from(readmeInfo.content, 'base64').toString('utf-8');
    }
  } catch (error) {
    console.error(`[Codeberg README Error] ${owner}/${repo}:`, error.message);
  }

  return { description, readme };
}

/**
 * Mengonversi data ke format YAML sederhana
 */
function toYaml(data) {
  let yaml = '';
  for (const item of data) {
    yaml += `- name: "${item.name.replace(/"/g, '\\"')}"\n`;
    yaml += `  url: "${item.url}"\n`;
    yaml += `  id: "${item.id}"\n`;
    yaml += `  author: "${item.author}"\n`;
    yaml += '  description: |\n';

    // Format description baris demi baris demi keamanan YAML
    const descLines = (item.description || '').split('\n');
    descLines.forEach((line) => {
      yaml += `    ${line}\n`;
    });

    yaml += '  readme: |\n';
    const readmeLines = (item.readme || '').split('\n');
    readmeLines.forEach((line) => {
      yaml += `    ${line}\n`;
    });
    yaml += '\n';
  }
  return yaml;
}

async function start() {
  console.log('Membaca data file Obtainium...');
  const rawData = await fs.readFile(INPUT_PATH, 'utf-8');
  const { apps } = JSON.parse(rawData);

  const result = [];

  for (let i = 0; i < apps.length; i++) {
    const app = apps[i];
    console.log(`[${i + 1}/${apps.length}] Memproses ${app.name} (${app.url})...`);

    const parsed = parseRepoUrl(app.url);
    let details = { description: '', readme: '' };

    if (parsed) {
      const { host, owner, repo } = parsed;
      if (host.includes('github.com')) {
        details = await fetchGithubRepo(owner, repo);
      } else if (host.includes('codeberg.org')) {
        details = await fetchCodebergRepo(owner, repo);
      }
    } else {
      console.warn(`[Skip] Format URL tidak didukung: ${app.url}`);
    }

    result.push({
      id: app.id,
      name: app.name,
      url: app.url,
      author: app.author,
      latestVersion: app.latestVersion,
      installedVersion: app.installedVersion,
      description: details.description,
      readme: details.readme
    });

    // Jeda 500ms antar request agar tidak diblokir API rate limits
    await delay(500);
  }

  // Simpan dalam format JSON
  console.log(`Menyimpan data JSON ke: ${OUTPUT_JSON}`);
  await fs.writeFile(OUTPUT_JSON, JSON.stringify(result, null, 2), 'utf-8');

  // Simpan dalam format YAML
  console.log(`Menyimpan data YAML ke: ${OUTPUT_YAML}`);
  await fs.writeFile(OUTPUT_YAML, toYaml(result), 'utf-8');

  console.log('Proses penarikan data selesai dengan sukses!');
}

start().catch((err) => {
  console.error('Terjadi kesalahan fatal:', err);
  process.exit(1);
});
