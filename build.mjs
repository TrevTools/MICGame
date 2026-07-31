import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src');
const distDir = path.join(root, 'dist');
const templatePath = path.join(srcDir, 'index.template.html');
const cssPath = path.join(srcDir, 'styles.css');
const outputPath = path.join(distDir, 'index.html');
const scriptFiles = [
  'common.js',
  'afterburn.js',
  'radar.js',
  'main.js'
];

await import('node:fs/promises').then(({ mkdir }) => mkdir(distDir, { recursive: true }));

const [template, styles, ...scripts] = await Promise.all([
  readFile(templatePath, 'utf8'),
  readFile(cssPath, 'utf8'),
  ...scriptFiles.map((fileName) => readFile(path.join(srcDir, fileName), 'utf8'))
]);

const inlineScript = scripts.join('\n\n');
const output = template
  .replace('/*INLINE_STYLES*/', styles)
  .replace('/*INLINE_SCRIPT*/', inlineScript);

await writeFile(outputPath, output, 'utf8');
console.log(`Wrote ${outputPath}`);
