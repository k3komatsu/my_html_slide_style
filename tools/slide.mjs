#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { rm, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build, exportSite } from './build.mjs';
import { exportSelection, parseSelectionArgs } from './visibility.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const run = (script, parameters = []) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [script, ...parameters], { cwd: root, stdio: 'inherit' });
  child.on('error', reject);
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${script} exited with ${code}`)));
});
const help = `Usage: node tools/slide.mjs <command>
  build [--cdn] [--single] [--site]
  export single [output] [--cdn] [--mode MODE | --all-modes] [--settings JSON]
  export site [--cdn]
  export pdf [output] [--cdn] [--mode MODE | --all-modes] [--settings JSON]
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
    const { positional, options } = parseSelectionArgs(args.slice(2));
    if (!['single', 'site', 'pdf'].includes(format) || positional.length > (format === 'site' ? 0 : 1)
        || (format === 'site' && (options.mode !== undefined || options.allModes || options.settings))) throw new Error(help);
    const config = await build(root, { cdn: options.cdn });
    if (format === 'site') console.log(await exportSite(root, config));
    else {
      const output = positional[0] ?? (format === 'pdf' ? 'dist/slide.pdf' : 'dist/slide.html');
      const settingsArgs = options.settings ? ['--settings', options.settings] : [];
      const jobs = [];
      if (options.allModes) {
        const selection = await exportSelection(path.join(root, 'index.html'), { settings: options.settings, mode: 'all' });
        const parsed = path.parse(output), extension = parsed.ext || (format === 'pdf' ? '.pdf' : '.html');
        for (const mode of [{ id: 'all', name: 'all' }, ...selection.settings.modes]) {
          await exportSelection(path.join(root, 'index.html'), { settings: options.settings, mode: mode.id });
          const suffix = mode.name.replace(/[^\p{L}\p{N}_-]/gu, '_') || mode.id;
          jobs.push({ output: path.join(parsed.dir, `${parsed.name}-${suffix}${extension}`), mode: mode.id });
        }
        if (new Set(jobs.map(job => job.output.normalize('NFC').toLowerCase())).size !== jobs.length) throw new Error('表示モードの出力ファイル名が重複します。モード名を変更してください');
      } else jobs.push({ output, mode: options.mode });
      if (format === 'pdf') for (const job of jobs) {
        try { await access(path.resolve(root, job.output)); throw new Error(`PDFは上書きしません: ${job.output}`); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
      for (const job of jobs) await run(format === 'pdf' ? 'scripts/export-pdf.mjs' : 'scripts/bundle-single.mjs',
        ['index.html', job.output, ...settingsArgs, ...(job.mode !== undefined ? ['--mode', job.mode] : [])]);
    }
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
      for (const test of ['tests/integration/tooling.mjs', 'tests/integration/check.mjs', 'tests/core/runtime.mjs', 'tests/timer-demo.mjs', 'tests/visibility.mjs']) await run(test);
    }
    await run('tests/browser-smoke.mjs', format ? [format] : []);
  } else if (command === 'clean' && args.length === 1) await rm(path.join(root, 'dist'), { recursive: true, force: true });
  else throw new Error(help);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
