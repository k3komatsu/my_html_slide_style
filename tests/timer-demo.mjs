import assert from 'node:assert/strict';
import { writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { openBrowser } from '../tools/browser.mjs';
import { fixture } from './fixture.mjs';

const sample = process.argv[2] ? null : await fixture();
const browser = await openBrowser({ label: 'timer' });
const { evaluate, cdp } = browser;
const tick = () => evaluate('new Promise(resolve => setTimeout(resolve, 300))');
const ring = () => evaluate(`(() => {
  const r = document.querySelector('.slide.is-current .slide-timer');
  return { offset: Number(r.firstElementChild.getAttribute('stroke-dashoffset')),
    overdue: r.classList.contains('is-overdue'), color: getComputedStyle(r).color,
    opacity: r.style.opacity, remaining: document.querySelector('.slide.is-current .timer-remaining').textContent };
})()`);
const changeDuration = (value, selector = '.timer-duration') => evaluate(`(() => {
  const input = document.querySelector('.slide.is-current ${selector}');
  input.value = ${JSON.stringify(value)};
  input.dispatchEvent(new Event('change', { bubbles: true }));
})()`);
try {
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: 'window.timerNow = Date.now(); Date.now = () => window.timerNow;' });
  await cdp('Emulation.setDeviceMetricsOverride', { width: 980, height: 876, deviceScaleFactor: 1, mobile: false });
  await browser.load(process.argv[2] ?? path.join(sample.root, 'index.html'));
  await evaluate('SlideDeck.show(0); SlideDeck.show(1); timerNow += 60_000;');
  await tick();
  assert.equal((await ring()).opacity, '0', 'Normal page navigation does not start the timer');
  await evaluate(`document.querySelector('.slide.is-current .logo-btn').click()`);
  await changeDuration('12');
  assert.equal((await ring()).remaining, '12:00');
  assert(await evaluate(`[...document.querySelectorAll('.timer-duration')].every(i => i.value === '12')`));
  await changeDuration('9', '.timer-red-after');
  assert(await evaluate(`[...document.querySelectorAll('.timer-red-after')].every(i => i.value === '9')`));
  for (const invalid of ['', '0', '181', '1.5']) {
    await changeDuration(invalid);
    assert.equal((await ring()).remaining, '12:00', 'Invalid duration does not corrupt the timer');
    await changeDuration(invalid, '.timer-red-after');
    assert.equal(await evaluate(`document.querySelector('.slide.is-current .timer-red-after').value`), '9');
  }
  await evaluate(`document.querySelector('.slide.is-current .timer-duration').focus()`);
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' });
  assert.equal(await evaluate('SlideDeck.current'), 1, 'Timer input does not advance slides');

  const fs = await cdp('Runtime.evaluate', { expression: 'document.documentElement.requestFullscreen()', userGesture: true, awaitPromise: true });
  assert(!fs.exceptionDetails);
  await evaluate('SlideDeck.show(2); timerNow += 60_000;');
  await tick();
  assert.equal((await ring()).opacity, '0', 'Fullscreen on a content slide does not start the timer');
  await evaluate('SlideDeck.show(0); SlideDeck.show(1); timerNow += 360_000;');
  await tick();
  const halfway = await ring();
  assert.equal(halfway.offset, 50, 'Half of the allotted time draws half a circle');
  assert.equal(halfway.remaining, '6:00');
  assert.equal(halfway.overdue, false);
  assert.equal(halfway.color, 'rgb(24, 90, 179)');
  await evaluate('SlideDeck.show(2);');
  assert.equal((await ring()).offset, 50, 'Slide changes preserve elapsed time');
  await evaluate('document.exitFullscreen(); timerNow += 180_000;');
  await tick();
  assert.equal((await ring()).offset, 25, 'Leaving fullscreen keeps the running timer');
  assert.equal((await ring()).remaining, '3:00');
  assert.equal((await ring()).overdue, true, 'The independently configured red threshold works before the duration ends');
  await changeDuration('15', '.timer-red-after');
  assert.equal((await ring()).overdue, false, 'Changing the red threshold recalculates color without changing progress');
  await evaluate('timerNow += 180_001;');
  await tick();
  const overdue = await ring();
  assert.equal(overdue.offset, 0);
  assert.equal(overdue.remaining, '0:00');
  assert.equal(overdue.color, 'rgb(24, 90, 179)');
  assert.equal(overdue.overdue, false, 'The duration ending does not change color before the independent threshold');
  await changeDuration('9', '.timer-red-after');
  assert.equal((await ring()).color, 'rgb(218, 60, 62)');
  await changeDuration('20');
  assert.equal((await ring()).overdue, true, 'Changing duration leaves the red threshold independent');
  await evaluate(`document.querySelector('.slide.is-current .timer-reset').click(); timerNow += 60_000;`);
  await tick();
  assert.equal((await ring()).opacity, '0');
  assert.equal((await ring()).overdue, false);
  assert.equal((await ring()).remaining, '20:00', 'Reset stops and rearms the timer');
  await changeDuration('12');
  const fsAgain = await cdp('Runtime.evaluate', { expression: 'document.documentElement.requestFullscreen()', userGesture: true, awaitPromise: true });
  assert(!fsAgain.exceptionDetails);
  await evaluate('SlideDeck.show(0); SlideDeck.show(1); timerNow += 360_000;');
  await tick();
  assert.equal((await ring()).offset, 50, 'The cover transition starts a reset timer again');

  await evaluate('document.exitFullscreen()');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 980, height: 876, deviceScaleFactor: 1, mobile: false });
  await evaluate("document.querySelector('.slide.is-current').focus(); window.scrollTo(0, 0);");
  await tick();
  const screenshot = await cdp('Page.captureScreenshot', { format: 'png' });
  await writeFile(path.join(browser.profile, 'halfway.png'), Buffer.from(screenshot.data, 'base64'));
  await evaluate(`document.querySelector('.slide.is-current .logo-btn').click()`);
  assert(await evaluate(`(() => {
    const menu = document.querySelector('.slide.is-current .menu');
    return menu.lastElementChild.getBoundingClientRect().bottom <= menu.getBoundingClientRect().bottom;
  })()`), 'Timer controls fit in the menu');
  await tick();
  const menuShot = await cdp('Page.captureScreenshot', { format: 'png' });
  await writeFile(path.join(browser.profile, 'menu.png'), Buffer.from(menuShot.data, 'base64'));
  await cdp('Emulation.setEmulatedMedia', { media: 'print' });
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.slide-timer')).display`), 'none', 'Printing omits the timer');
  assert.deepEqual(browser.errors, []);
  assert.deepEqual(browser.failed, []);
  assert.deepEqual(browser.external, []);
  console.log(`PASS timer start, duration, progress, independent red threshold, reset, input, print and offline\n${browser.profile}`);
} finally {
  browser.close();
  if (sample) await rm(sample.root, { recursive: true, force: true });
}
