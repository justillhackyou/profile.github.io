import { readFileSync, writeFileSync } from 'node:fs';
import { renderPage, renderVCard } from '../src/page.mjs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const data = JSON.parse(read('../src/profile.json'));
const outputs = [
  ['../index.html', renderPage(data)],
  ['../assets/hikmatullo-gofurjonov.vcf', renderVCard(data)]
];

for (const [path, content] of outputs) {
  if (!process.argv.includes('--check')) {
    writeFileSync(new URL(path, import.meta.url), content);
    continue;
  }
  if (read(path) !== content) {
    console.error(`${path} is out of date. Run npm run build.`);
    process.exitCode = 1;
  }
}
