/* スライド番号：表紙・章扉を除いた連番／総数をMathJaxの分数で表示する。 */
(() => {
  let n = 0;
  const total = slides.filter(s => !s.classList.contains("slide--cover") && !s.classList.contains("slide--section")).length;
  for (const s of slides) {
    if (s.classList.contains("slide--cover") || s.classList.contains("slide--section")) s.removeAttribute("data-no");
    else {
      s.dataset.no = ++n;   // 扉は番号を消費しない
      const page = document.createElement("span"); page.className = "slide-page";
      page.textContent = `\\(\\frac{${n}}{${total}}\\)`;
      page.setAttribute("role", "img"); page.setAttribute("aria-label", `全${total}ページ中${n}ページ`);
      s.append(page);   // 本文と同じMathJaxの初期タイプセットで描画する
    }
  }
})();
