import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fixture } from '../fixture.mjs';
import { openBrowser } from '../../tools/browser.mjs';

for (const enabled of [true, false]) {
  const { root } = await fixture('basic', { overview: enabled, menu: enabled, laser: enabled, popover: enabled });
  const browser = await openBrowser({ label: 'core' });
  const { cdp, evaluate } = browser;
  try {
    await browser.load(path.join(root, 'index.html'));
    assert.deepEqual(await evaluate('SlideDeck.geometry'), { width: 960, height: 540 });
    await evaluate(`(() => {
      window.changes = [];
      window.unsubscribe = SlideDeck.on('slidechange', event => changes.push(event.index));
      SlideDeck.show(1); SlideDeck.show(1); SlideDeck.show(999);
    })()`);
    assert.deepEqual(await evaluate('changes'), [1, 2]);
    await evaluate('unsubscribe(); SlideDeck.show(0)');
    assert.deepEqual(await evaluate('changes'), [1, 2]);
    await evaluate(`SlideDeck.show(1); document.querySelector('a[href="#result"]').click();`);
    await evaluate('new Promise(resolve => setTimeout(resolve, 0))');
    assert.equal(await evaluate('SlideDeck.current'), 2);
    assert.equal(await evaluate(`(() => { try { SlideDeck.show(NaN); } catch { return true; } return false; })()`), true);
    await evaluate(`(() => {
      window.overviewChanges = [];
      SlideDeck.on('overviewchange', event => overviewChanges.push(event.enabled));
      SlideDeck.toggleOverview();
    })()`);
    assert.equal(await evaluate(`document.documentElement.classList.contains('overview')`), enabled);
    if (enabled) {
      await evaluate('SlideDeck.slides[1].click()');
      assert.deepEqual(await evaluate('overviewChanges'), [true, false]);
      assert.equal(await evaluate('SlideDeck.current'), 1);
      await evaluate('SlideDeck.show(2); document.querySelector(".sim-src").click()');
      assert.equal(await evaluate('!!document.querySelector(".sim-pop")'), true);
      await evaluate('SlideDeck.show(1)');
      assert.equal(await evaluate('!!document.querySelector(".sim-pop")'), false);
      await evaluate(`document.querySelector('.slide.is-current .menu__item--laser').click()`);
      const point = await evaluate(`(() => {const r=SlideDeck.slides[1].getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
      assert.equal(await evaluate(`document.querySelector('.laser-pointer').hidden`), false);
      await evaluate('SlideDeck.toggleOverview()');
      assert.equal(await evaluate(`document.querySelector('.laser-pointer').hidden`), true);
      await evaluate('SlideDeck.toggleOverview()');
    } else {
      assert.deepEqual(await evaluate('overviewChanges'), []);
      assert.equal(await evaluate('document.querySelectorAll(".menu, .minimap, .sim-src").length'), 0);
    }
    await evaluate(`SlideDeck.show(0); SlideDeck.slides[0].focus()`);
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' });
    assert.equal(await evaluate('SlideDeck.current'), 1);
    await evaluate(`window.fullscreenChanges=[]; SlideDeck.on('fullscreenchange', e=>fullscreenChanges.push(e.enabled))`);
    const result = await cdp('Runtime.evaluate', { expression: 'document.documentElement.requestFullscreen()', userGesture: true, awaitPromise: true });
    assert(!result.exceptionDetails);
    await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    assert.equal(await evaluate('fullscreenChanges.at(-1)'), true);
    await evaluate('document.exitFullscreen()');
    await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    assert.equal(await evaluate('fullscreenChanges.at(-1)'), false);
    await evaluate(`window.prints=0; SlideDeck.on('beforeprint',()=>prints++); dispatchEvent(new Event('beforeprint'));`);
    assert.equal(await evaluate('prints'), 1);
    assert.deepEqual(browser.errors, []); assert.deepEqual(browser.failed, []); assert.deepEqual(browser.external, []);
  } finally { browser.close(); await rm(root, { recursive: true, force: true }); }
}
console.log('PASS runtime, events, feature flags, laser, fullscreen, file:// offline');
