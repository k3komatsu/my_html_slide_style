#!/bin/sh
# 本文はparts/で編集する。index.htmlは生成物。
# --singleを付けると、すべてを埋め込んだ1ファイルもdist/slide.htmlに生成する。
set -eu
cd "$(dirname "$0")"
cat parts/*.html > index.html
cat <<'HTML' >> index.html
</main>
<!-- deck.jsによるページ番号生成の後でMathJaxを読み込む。 -->
<script src="lib/js/deck.js"></script>
<script src="js/demo.js"></script>
<script src="lib/js/popover.js"></script>
<script src="lib/js/tex-svg.js"></script>
</body>
</html>
HTML
if [ "${1:-}" = "--single" ]; then
  node scripts/bundle-single.mjs
fi
