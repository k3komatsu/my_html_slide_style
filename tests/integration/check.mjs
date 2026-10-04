import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fixture } from '../fixture.mjs';
import { check } from '../../tools/check.mjs';

for (const name of ['basic', 'invalid']) {
  const { root } = await fixture(name);
  try {
    const report = await check(path.join(root, 'index.html'));
    if (name === 'basic') {
      assert.equal(report.slides, 3);
      assert.deepEqual(report.issues, []);
    } else {
      const codes = new Set(report.issues.map(i => i.code));
      for (const code of ['duplicate-id', 'image-load', 'image-alt', 'internal-link', 'outside-slide', 'footer-overlap', 'page-overlap', 'javascript', 'external-network', 'asset-load', 'mathjax']) assert(codes.has(code), `missing diagnostic: ${code}`);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
}
console.log('PASS generic validator fixtures');
