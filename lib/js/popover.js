/* popover.js — シミュレーションのパラメータ設定を、本文の設定値テキストのクリックで
   その場に小さなポップオーバーとして開く。スライダ・セレクトは文字をクリックするまで
   本文に出さず、本文にはラベルと設定値（本文フォント）だけを表示する。
   元リポジトリから抽出し、対象を汎用の.sim-controlsに変更。依存なし。 */
(() => {
  const CTL = ".sim-controls";
  const sync = (src, dst) => new MutationObserver(() => { dst.textContent = src.textContent; })
    .observe(src, { childList: true, characterData: true, subtree: true });
  let openPop = null, openHost = null;

  function closePop() {
    if (!openPop) return;
    openPop.remove();
    if (openHost) {
      openHost.classList.remove("is-open"); openHost.setAttribute("aria-expanded", "false");
      if (openHost.closest(".slide")?.classList.contains("is-current")
        && !document.documentElement.classList.contains("overview")) openHost.focus({ preventScroll: true });
    }
    openPop = openHost = null;
  }
  function open(host, pop) {
    if (document.documentElement.classList.contains("overview")) return;
    closePop();
    const slide = host.closest(".slide");
    if (!slide) return;
    pop.classList.add("sim-pop", "interactive");
    slide.append(pop);
    const bounds = slide.getBoundingClientRect(), rect = host.getBoundingClientRect(), scale = bounds.width / slide.offsetWidth;
    pop.style.left = Math.max(8, Math.min((rect.left - bounds.left) / scale, slide.clientWidth - pop.offsetWidth - 8)) + "px";
    const limit = slide.clientHeight - 28;
    const below = (rect.bottom - bounds.top) / scale + 6, above = (rect.top - bounds.top) / scale - pop.offsetHeight - 6;
    pop.style.top = Math.max(8, Math.min(below + pop.offsetHeight > limit ? above : below, limit - pop.offsetHeight)) + "px";
    openPop = pop; openHost = host;
    host.classList.add("is-open"); host.setAttribute("aria-expanded", "true");
    pop.querySelector("input, select")?.focus({ preventScroll: true });
  }
  window.simPopover = { open, close: closePop };   // 独自の入力も共通の配置・開閉処理を使用する
  document.addEventListener("pointerdown", (e) => {
    if (openPop && !openPop.contains(e.target) && !openHost.contains(e.target)) closePop();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePop(); });

  addEventListener("hashchange", closePop);
  // show()はreplaceStateを使うため、クラス変更も監視して移動時に閉じる。
  new MutationObserver(() => {
    if (openHost && (!openHost.closest(".slide").classList.contains("is-current")
      || document.documentElement.classList.contains("overview"))) closePop();
  }).observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ["class"] });

  document.querySelectorAll(CTL).forEach((ctl) => {
    ctl.classList.add("sim-ctl");                        // 本文に残る「設定値」表示のスタイル

    // ラベル名：本文側 label の先頭の子（span などはそのまま）。無ければ aria-label
    const nameNode = (lab, el) => {
      const n = lab && lab.firstChild;
      if (n && n.nodeType === 1) return n.cloneNode(true);
      return document.createTextNode(((n ? n.textContent : "") || el.getAttribute("aria-label") || "").trim());
    };

    ctl.querySelectorAll("input, select").forEach((w) => {
      const lab = w.closest("label");
      const host = lab || ctl;                           // クリックで開く本文側のテキスト
      const vals = lab ? [...lab.querySelectorAll("b, output")] : [];

      if (w.tagName === "SELECT") {                      // 選択中の値を本文側に表示（元の位置に差し込む）
        const anchor = w.nextSibling;
        const b = document.createElement("b"); b.className = "sim-val";
        b.textContent = w.selectedOptions[0].textContent;
        w.addEventListener("input", () => { b.textContent = w.selectedOptions[0].textContent; });
        (lab || ctl).insertBefore(b, lab ? anchor : null);
      }

      // ポップオーバー：設定名＋ウィジェット（＋本文の値表示の複製をライブ同期）
      const pop = document.createElement("div");
      pop.className = "sim-pop interactive";
      const nm = document.createElement("span"); nm.className = "sim-pop__name";
      nm.append(nameNode(lab, w));
      pop.append(nm, w);
      vals.forEach((v) => {
        const c = v.cloneNode(true); c.removeAttribute("id"); pop.append(c); sync(v, c);
      });

      host.classList.add("sim-src");
      host.setAttribute("role", "button");
      host.setAttribute("aria-haspopup", "true");
      host.setAttribute("aria-expanded", "false");
      host.tabIndex = 0;
      host.addEventListener("click", (e) => {
        e.preventDefault();
        if (openPop === pop) closePop(); else open(host, pop);
      });
      host.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); open(host, pop); }
      });
    });
    // 一時停止・再生成などのボタンは本文にそのまま残す
  });
})();
