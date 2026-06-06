import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root path of the project (assuming this script is in src/scripts/)
const projectRoot = path.resolve(__dirname, '../../');
const basePath = path.join(projectRoot, 'node_modules/play-dl/dist');
const files = ['index.js', 'index.mjs'];

const modernUserAgents = '["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"]';

console.log('[Patch Play-DL] Starting patching process...');

files.forEach(file => {
  const filePath = path.join(basePath, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. Replace te array (User-Agents) in index.js (since it's not present in index.mjs usually)
    const teRegex = /var te=\[.*?\];/;
    if (teRegex.test(content)) {
      content = content.replace(teRegex, `var te=${modernUserAgents};`);
      console.log(`[Patch Play-DL] Patched te (User-Agents) in ${file}`);
      modified = true;
    }

    // 2. Replace Android clientVersion "16.49" with "19.11.38"
    if (content.includes('clientVersion:"16.49"')) {
      content = content.replaceAll('clientVersion:"16.49"', 'clientVersion:"19.11.38"');
      console.log(`[Patch Play-DL] Patched Android clientVersion in ${file}`);
      modified = true;
    }

    // 3. Safety check for streamingData.formats in getAndroidFormats (ut)
    const targetSafety = 'JSON.parse(s).streamingData.formats';
    const replacementSafety = 'JSON.parse(s).streamingData?.formats||[]';
    if (content.includes(targetSafety)) {
      content = content.replaceAll(targetSafety, replacementSafety);
      console.log(`[Patch Play-DL] Patched safety check in ${file}`);
      modified = true;
    }

    // 4. Patch parseAudioFormats (O) to filter out formats without urls and fallback to itag 18
    const targetO = 'function O(i){let e=[];return i.forEach(t=>{let r=t.mimeType;r.startsWith("audio")&&(t.codec=r.split(\'codecs="\')[1].split(\'"\')[0],t.container=r.split("audio/")[1].split(";")[0],e.push(t))}),e}a(O,"parseAudioFormats");';
    const replacementO = 'function O(i){let e=[];i.forEach(t=>{let r=t.mimeType;r.startsWith("audio")&&(t.url||t.signatureCipher||t.cipher)&&(t.codec=r.split(\'codecs="\')[1].split(\'"\')[0],t.container=r.split("audio/")[1].split(";")[0],e.push(t))});if(e.length===0){let t=i.find(f=>f.itag===18&&(f.url||f.signatureCipher||f.cipher));if(t){let r=t.mimeType;t.codec=r.includes(\'codecs="\')?r.split(\'codecs="\')[1].split(\'"\')[0]:"mp4a.40.2";t.container="mp4";e.push(t)}}return e}a(O,"parseAudioFormats");';
    if (content.includes(targetO)) {
      content = content.replaceAll(targetO, replacementO);
      console.log(`[Patch Play-DL] Patched parseAudioFormats in ${file}`);
      modified = true;
    }

    // 5. Patch retry url access in stream logic to be safe
    const targetRetry = 'this.url=t[this.quality].url';
    const replacementRetry = 'this.url=t[this.quality]?.url||t[0]?.url||""';
    if (content.includes(targetRetry)) {
      content = content.replaceAll(targetRetry, replacementRetry);
      console.log(`[Patch Play-DL] Patched retry url access in ${file}`);
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[Patch Play-DL] Successfully updated ${file}`);
    }
  } else {
    console.log(`[Patch Play-DL] ${file} does not exist at ${filePath}`);
  }
});
