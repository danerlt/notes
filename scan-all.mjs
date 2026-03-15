import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.join(__dirname, 'docs');
const skipDirs = new Set(['.ipynb_checkpoints', 'images', 'img', 'assets']);

function printTree(dir, indent = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const dirs = entries.filter(e => e.isDirectory() && !skipDirs.has(e.name)).sort((a,b)=>a.name.localeCompare(b.name));
  const files = entries.filter(e => e.isFile() && e.name.endsWith('.md')).sort((a,b)=>a.name.localeCompare(b.name));
  dirs.forEach(d => {
    console.log(indent + '📁 ' + d.name);
    printTree(path.join(dir, d.name), indent + '  ');
  });
  files.forEach(f => {
    if (f.name !== 'index.md') console.log(indent + '📄 ' + f.name);
  });
}

printTree(docsRoot);
