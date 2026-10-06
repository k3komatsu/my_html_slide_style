/* 発表時間：全画面で表紙から次へ進むと開始する */
(() => {
  const deck = window.SlideDeck;
  if (!deck) return;
  const times = { duration: 10 * 60_000, redAfter: 9 * 60_000 };
  let startedAt = null;
  const rings = [], settings = { duration: [], redAfter: [] }, remaining = [];

  for (const page of document.querySelectorAll('.slide-page')) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 60 60');
    svg.setAttribute('class', 'slide-timer');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<circle cx="30" cy="30" r="26" pathLength="100" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="100" stroke-dashoffset="100" transform="rotate(-90 30 30)" />';
    page.append(svg);
    rings.push(svg);
  }

  function render() {
    const elapsed = startedAt === null ? 0 : Math.max(0, Date.now() - startedAt);
    const progress = Math.min(1, elapsed / times.duration);
    for (const ring of rings) {
      ring.classList.toggle('is-overdue', elapsed >= times.redAfter);
      ring.style.opacity = progress > 0 ? '1' : '0';
      ring.firstElementChild.setAttribute('stroke-dashoffset', String(100 * (1 - progress)));
    }
    const seconds = Math.ceil(Math.max(0, times.duration - elapsed) / 1000);
    const text = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    for (const output of remaining) output.textContent = text;
  }

  for (const menu of document.querySelectorAll('.menu')) {
    const controls = document.createElement('div');
    controls.className = 'menu__timer';
    controls.innerHTML = '<label>発表時間 <input class="timer-duration" type="number" min="1" max="180" step="1" value="10" required> 分</label>'
      + '<label>赤色切替 <input class="timer-red-after" type="number" min="1" max="180" step="1" value="9" required> 分経過</label>'
      + '<div>残り <output class="timer-remaining">10:00</output></div>'
      + '<button type="button" class="menu__item timer-reset">タイマーをリセット</button>'
      + '<p>全画面で表紙を送ると開始</p>';
    remaining.push(controls.querySelector('output'));
    for (const input of controls.querySelectorAll('input')) {
      const key = input.classList.contains('timer-duration') ? 'duration' : 'redAfter';
      settings[key].push(input);
      input.addEventListener('change', () => {
        if (!input.checkValidity()) {
          input.reportValidity();
          input.value = String(times[key] / 60_000);
          return;
        }
        times[key] = input.valueAsNumber * 60_000;
        for (const setting of settings[key]) setting.value = input.value;
        render();
      });
    }
    controls.querySelector('button').addEventListener('click', () => {
      startedAt = null;
      render();
    });
    menu.append(controls);
  }

  deck.on('slidechange', ({ previous, index }) => {
    if (startedAt === null && document.fullscreenElement && index === previous + 1
        && deck.slides[previous].classList.contains('slide--cover')) {
      startedAt = Date.now();
    }
    render();
  });
  render();
  setInterval(() => { if (startedAt !== null) render(); }, 250);
})();
