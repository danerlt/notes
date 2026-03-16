/**
 * 自动根据 docs 目录结构生成 rspress.config.ts 中的 nav 配置
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.join(__dirname, '..', 'docs');
const configPath = path.join(__dirname, '..', 'rspress.config.ts');

const SKIP_DIRS = new Set(['.ipynb_checkpoints', 'images', 'img', 'assets', '_backup']);

function cleanText(name) {
  return name.replace(/^\d+_/, '');
}

function getSubDirs(dirPath) {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .filter(e => e.isDirectory() && !SKIP_DIRS.has(e.name) && !e.name.startsWith('.'))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
      .map(e => e.name);
  } catch {
    return [];
  }
}

function buildNavItem(topDir) {
  const topDirPath = path.join(docsRoot, topDir);
  const subDirs = getSubDirs(topDirPath);
  const text = cleanText(topDir);
  const activeMatch = `/${topDir}/`;

  if (subDirs.length === 0) {
    return { text, link: `/${topDir}/`, activeMatch };
  }

  const items = subDirs.map(subDir => {
    const subDirPath = path.join(topDirPath, subDir);
    const subSubDirs = getSubDirs(subDirPath);
    const subText = cleanText(subDir);

    if (subSubDirs.length === 0) {
      return { text: subText, link: `/${topDir}/${subDir}/` };
    }

    return {
      text: subText,
      items: subSubDirs.map(sub3Dir => ({
        text: cleanText(sub3Dir),
        link: `/${topDir}/${subDir}/${sub3Dir}/`,
      })),
    };
  });

  return { text, activeMatch, items };
}

function generateNav() {
  const topDirs = fs.readdirSync(docsRoot, { withFileTypes: true })
    .filter(e => e.isDirectory() && !SKIP_DIRS.has(e.name) && !e.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
    .map(e => e.name);

  return topDirs.map(buildNavItem);
}

// 将 nav 对象序列化为 TS 对象字面量字符串
function serialize(value, indent = 6) {
  const pad = ' '.repeat(indent);
  const padInner = ' '.repeat(indent + 2);

  if (typeof value === 'string') {
    return `'${value}'`;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map(v => `${padInner}${serialize(v, indent + 2)}`).join(',\n');
    return `[\n${items},\n${pad}]`;
  }
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value)
      .map(([k, v]) => `${padInner}${k}: ${serialize(v, indent + 2)}`)
      .join(',\n');
    return `{\n${entries},\n${pad}}`;
  }
  return String(value);
}

function updateConfig(nav) {
  const config = fs.readFileSync(configPath, 'utf-8');

  const navStr = nav.map(item => `      ${serialize(item, 6)}`).join(',\n');
  const newNavBlock = `nav: [\n${navStr},\n    ]`;

  // 替换 nav: [...] 区块（支持多行）
  const updated = config.replace(/nav:\s*\[[\s\S]*?\n    \]/m, newNavBlock);

  if (updated === config) {
    console.log('nav 无变化，跳过更新');
    return false;
  }

  fs.writeFileSync(configPath, updated, 'utf-8');
  console.log('✓ rspress.config.ts nav 已更新');
  return true;
}

const nav = generateNav();
updateConfig(nav);
