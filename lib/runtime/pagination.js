/* スライド番号：表紙・章扉を除いた連番／総数をMathJaxの分数で表示する。 */
function rebuildPagination() {
  let n = 0;
  const total = slides.filter(s => isVisible(s) && !s.matches('.slide--cover, .slide--section')).length;
  const changed = [];
  for (const s of slides) {
    if (s.classList.contains("slide--cover") || s.classList.contains("slide--section")) s.removeAttribute("data-no");
    else {
      let page = s.querySelector('.slide-page');
      if (!page) {
        page = document.createElement('span'); page.className = 'slide-page'; page.setAttribute('role', 'img');
        const number = document.createElement('span'); number.className = 'slide-page-number'; page.append(number); s.append(page);
      }
      page.hidden = !isVisible(s);
      if (!isVisible(s)) { s.removeAttribute('data-no'); continue; }
      s.dataset.no = ++n;
      const number = page.querySelector('.slide-page-number'), tex = `\\(\\frac{${n}}{${total}}\\)`;
      if (number.dataset.tex !== tex) {
        window.MathJax?.typesetClear?.([number]); number.textContent = tex; number.dataset.tex = tex; changed.push(number);
      }
      page.setAttribute('aria-label', `全${total}ページ中${n}ページ`);
    }
  }
  return changed;
}
function updatePagination(typeset = false) {
  if (!typeset || !window.MathJax?.startup?.promise) { rebuildPagination(); return; }
  paginationTypeset = paginationTypeset.then(async () => {
    await MathJax.startup.promise;
    const changed = rebuildPagination();
    if (changed.length) await MathJax.typesetPromise(changed);
  }).catch(error => console.error(error));
}
let paginationTypeset = Promise.resolve();
updatePagination();
