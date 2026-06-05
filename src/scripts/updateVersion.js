import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '../..');

// Read VERSION from root
const versionFilePath = path.join(rootDir, 'VERSION');
let semVer = '1.5.0';
if (fs.existsSync(versionFilePath)) {
  semVer = fs.readFileSync(versionFilePath, 'utf8').trim();
} else {
  fs.writeFileSync(versionFilePath, semVer + '\n', 'utf8');
}

// Update package.json
const packageJsonPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
pkg.version = semVer;
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');

// Update src/version.js
const versionJsPath = path.join(rootDir, 'src/version.js');
fs.writeFileSync(versionJsPath, `export const VERSION = '${semVer}';\n`);

console.log(`[Version] Updated all files to version: ${semVer}`);
