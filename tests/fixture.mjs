import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from '../tools/build.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
export async function fixture(name = 'basic', features = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'html-slide-test-'));
  await mkdir(path.join(root, 'parts'));
  await cp(path.join(repo, 'lib'), path.join(root, 'lib'), { recursive: true });
  await cp(path.join(repo, 'parts/00_head.html'), path.join(root, 'parts/00_head.html'));
  await cp(path.join(repo, `tests/fixtures/${name}/slides.html`), path.join(root, 'parts/01_slides.html'));
  await writeFile(path.join(root, 'figure.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><rect width="200" height="120" fill="#185ab3"/></svg>');
  await writeFile(path.join(root, 'custom.js'), `const input = document.querySelector('#scale');
    input?.addEventListener('input', () => { document.querySelector('#value').textContent = input.value; });`);
  const config = { title: 'Fixture <&>', lang: 'en', author: 'Author', affiliation: 'Lab', footer: 'Fixture "footer"',
    mathjax: { mode: 'local' }, features, styles: [], scripts: ['custom.js'] };
  await writeFile(path.join(root, 'slide.config.mjs'), `export default ${JSON.stringify(config)};`);
  await build(root);
  return { root, config, html: await readFile(path.join(root, 'index.html'), 'utf8') };
}
