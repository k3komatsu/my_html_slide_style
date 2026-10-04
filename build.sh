#!/bin/sh
# 本文はparts/で編集する。index.htmlは生成物。
# --cdn: MathJaxをCDNから読み込む（既定は同梱のlib/js/tex-svg.js）
# --single: すべてを埋め込んだ1ファイルもdist/slide.htmlに生成する
# --site: 公開用のファイル一式をdist/にコピーする
set -eu
cd "$(dirname "$0")"

mathjax='<script src="lib/js/tex-svg.js"></script>'
single=0
site=0
cdn=0
for arg in "$@"; do
  case "$arg" in
    --cdn) cdn=1; mathjax='<script src="https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg.js"></script>' ;;
    --single) single=1 ;;
    --site) site=1 ;;
    *) echo "build.sh: 不明なオプション: $arg" >&2; exit 1 ;;
  esac
done

cat parts/*.html > index.html
cat <<'HTML' >> index.html
</main>
<!-- deck.jsによるページ番号生成の後でMathJaxを読み込む。 -->
<script src="lib/js/deck.js"></script>
<script src="js/demo.js"></script>
<script src="lib/js/popover.js"></script>
HTML
printf '%s\n' "$mathjax" >> index.html
cat <<'HTML' >> index.html
</body>
</html>
HTML

if [ "$single" = 1 ]; then
  node scripts/bundle-single.mjs
fi

if [ "$site" = 1 ]; then
  mkdir -p dist
  rm -rf dist/css dist/js dist/figures dist/lib
  cp index.html dist/
  cp -R css js figures lib dist/
  find dist -name .DS_Store -delete
  if [ "$cdn" = 1 ]; then
    rm -f dist/lib/js/tex-svg.js
  fi
  echo "dist/ に公開用ファイルをコピーしました"
fi
