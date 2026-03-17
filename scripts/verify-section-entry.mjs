import fs from 'fs';
import path from 'path';

const target = process.argv[2];

if (!target) {
  console.error('Usage: node scripts/verify-section-entry.mjs <docs-section-dir>');
  process.exit(1);
}

const sectionDir = path.resolve(process.cwd(), target);
const allowedEntries = ['README.md', 'index.md'];
const presentEntry = allowedEntries.find((name) => fs.existsSync(path.join(sectionDir, name)));

if (!fs.existsSync(sectionDir) || !fs.statSync(sectionDir).isDirectory()) {
  console.error(`Section directory not found: ${target}`);
  process.exit(1);
}

if (!presentEntry) {
  console.error(
    `Missing section entry file in ${target}. Add one of: ${allowedEntries.join(', ')}`
  );
  process.exit(1);
}

console.log(`${target} has section entry: ${presentEntry}`);
