#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build, exportSite } from './build.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const run = (script, parameters = []) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [script, ...parameters], { cwd: root, stdio: 'inherit' });
  child.on('error', reject);
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${script} exited with ${code}`)));
});
const help = `Usage: node tools/slide.mjs <command>
  build [--cdn] [--single] [--site]
  export single [output] [--cdn]
  export site [--cdn]
  export pdf [output] [--cdn]
  test [HTML]             core/fixture/sample tests; HTML limits to sample test
  clean                  remove dist/ only
  serve                  watch, rebuild and browser reload
  check [HTML] [--allow-external]   validate any deck`;

try {
  const [command, format] = args;
  const cdn = args.includes('--cdn');
  if (!command || ['help', '--help', '-h'].includes(command)) console.log(help);
  else if (command === 'build') {
    if (args.slice(1).some(a => !['--cdn', '--single', '--site'].includes(a))) throw new Error(help);
    const config = await build(root, { cdn });
    if (args.includes('--single')) await run('scripts/bundle-single.mjs');
    if (args.includes('--site')) console.log(await exportSite(root, config, true));
    console.log('Built index.html');
  } else if (command === 'export') {
    const options = args.slice(2).filter(a => a !== '--cdn');
    if (!['single', 'site', 'pdf'].includes(format) || options.length > (format === 'site' ? 0 : 1) || options.some(a => a.startsWith('--'))) throw new Error(help);
    const config = await build(root, { cdn });
    if (format === 'single') await run('scripts/bundle-single.mjs', ['index.html', options[0] ?? 'dist/slide.html']);
    if (format === 'site') console.log(await exportSite(root, config));
    if (format === 'pdf') await run('scripts/export-pdf.mjs', ['index.html', options[0] ?? 'dist/slide.pdf']);
  } else if (command === 'serve' && args.length === 1) {
    const { serve } = await import('./serve.mjs');
    const server = await serve(root);
    const stop = async () => { await server.close(); };
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
  } else if (command === 'check') {
    const options = args.slice(1).filter(a => a !== '--allow-external');
    if (options.length > 1 || options.some(a => a.startsWith('--'))) throw new Error(help);
    if (!options.length) await build(root);
    const { check, printReport } = await import('./check.mjs');
    process.exitCode = printReport(await check(path.resolve(root, options[0] ?? 'index.html'), { allowExternal: args.includes('--allow-external') }));
  } else if (command === 'test' && args.length <= 2) {
    if (!format) {
      await build(root);
      for (const test of ['tests/integration/tooling.mjs', 'tests/integration/check.mjs', 'tests/core/runtime.mjs', 'tests/timer-demo.mjs']) await run(test);
    }
    await run('tests/browser-smoke.mjs', format ? [format] : []);
  } else if (command === 'clean' && args.length === 1) await rm(path.join(root, 'dist'), { recursive: true, force: true });
  else throw new Error(help);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
