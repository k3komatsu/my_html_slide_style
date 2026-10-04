# HTMLスライド テンプレート

「実験e ディジタル無線通信の基礎」のHTMLスライドから、共通の見た目と操作を取り出したテンプレートです。このリポジトリをcloneまたはコピーして、別の授業・研究発表・説明資料を作れます。元のスライドや親ディレクトリのファイルは必要ありません。

白い背景、青い上端バーと見出し、灰色のフッタ、右下の丸い分数ページ番号を引き継いでいます。レイアウトは960 × 540px（16:9）で固定し、表示する画面に合わせて全体を拡大・縮小します。著者名・授業名・大学ロゴは固定せず、発表ごとに設定できます。

## 1. まず動かす

発表ごとに、このリポジトリをcloneし、編集用のブランチを切ります。

```sh
git clone git@github.com:k3komatsu/my_html_slide_style.git my-slides
cd my-slides
git switch -c talk/2026-04-my-talk
sh build.sh
open index.html
```

`main`はテンプレート本体のブランチなので、発表の編集は必ずclone直後に切ったブランチで行います。ブランチ名の付け方や、共通の改善を後からテンプレート本体へ還元する運用は「15. Gitでの運用」にまとめています。Gitを使わない場合は、このディレクトリを`my-slides`などに丸ごとコピーしても同じように動きます。

`open`はmacOSのコマンドです。他のOS環境では、ブラウザで直接`index.html`を開いてください。検証用ブラウザにはChromeを推奨します。サンプルスライドは全9枚で構成され、表紙と章扉を除いた7枚にページ番号が表示されます。

表示するだけならWebサーバーもNode.jsも不要です。CSS・JavaScript・数式描画を同梱しているので、サンプルは`file://`でもインターネット接続なしで動きます。外部パッケージのインストールや`npm install`は不要です。

本文を編集したら、毎回`sh build.sh`を実行してブラウザを再読み込みしてください。ビルド前の編集は生成HTMLに反映されません。

## 2. ファイル構成

```text
template/
├── README.md
├── build.sh                  # partsを連結してindex.htmlを生成
├── index.html                # 生成済みのサンプル
├── parts/
│   ├── 00_head.html          # HTML冒頭、タイトル、CSS、MathJax設定
│   └── 01_slides.html        # 表紙・章扉・本文のサンプル
├── lib/                     # 発表間で共用するライブラリ
│   ├── css/theme.css        # 色・フォント・寸法の既定値
│   ├── css/slide.css        # レイアウト・部品・操作UI・印刷
│   ├── js/deck.js           # ページ送り・一覧・メニューなど
│   ├── js/popover.js        # 設定値のポップアップ
│   ├── js/tex-svg.js        # 同梱MathJax
│   ├── figures/menu.svg     # 右上のメニューアイコン
│   └── MathJax-LICENSE.txt  # 同梱MathJaxのライセンス
├── css/custom.css           # 発表ごとの設定・追加スタイル
├── js/demo.js               # サンプル固有の処理
├── figures/process.svg      # サンプル固有の図
├── scripts/
│   ├── export-pdf.mjs       # アニメーションを静止してPDF出力
│   └── bundle-single.mjs    # すべてを埋め込んだ1ファイルHTMLを出力
└── tests/browser-smoke.mjs  # サンプル用のブラウザテスト
```

スライド本文のソース編集は`parts/*.html`で行います。`index.html`は生成物なので、直接編集しないでください。`build.sh`がファイル名順に連結し、末尾に`</main>`、スクリプトの読み込み、HTMLの終了タグを追加します。

複数ファイルに分ける場合は`02_topic.html`、`03_summary.html`のように、先頭に桁数をそろえた番号を付けてください。`parts/`に終了タグやスクリプトの読み込みを重複して書く必要はありません。

共通ライブラリの既定値は`css/custom.css`で上書きします。読み込み順は`theme.css` → `slide.css` → `custom.css`です。新しい発表では通常、`lib/`を編集せずに済みます。

## 3. 新しい発表に置き換える

1. `parts/00_head.html`の`<title>`タグの内容を書き換えます。
2. `parts/01_slides.html`の表紙の題名・所属・発表者名を変更します。
3. `css/custom.css`の`--footer-text`を変更します。
4. サンプルの本文を、自分の発表内容に置き換えます。
5. 図は`figures/`、独自の処理は`js/`に追加します。
6. `sh build.sh`を実行し、ブラウザで確認します。

棒グラフのデモを使わない場合は、本文の`.sample-demo`を含むスライドと`build.sh`の`js/demo.js`の読み込みを削除できます。ポップアップを使わない場合は`lib/js/popover.js`の読み込みも省略できます。

MathJaxは本文の数式だけでなく、右下の分数ページ番号にも使います。通常は`lib/js/tex-svg.js`の読み込みを残してください。

## 4. 表紙・章扉・通常スライド

各スライドを`<section class="slide">`で囲み、`<main class="slides">`の中に並べます。

### 表紙

```html
<section class="slide slide--cover">
  <h1 class="cover-title" style="top:180px">発表タイトル</h1>
  <p class="author-line center" style="top:285px">所属　発表者名</p>
</section>
```

### 章扉

```html
<section class="slide slide--section">
  <h1 class="section-title" style="top:215px">第1章　基本事項</h1>
</section>
```

長い章題には`class="section-title sm"`を使うと、60pxから48pxに縮小できます。改行位置は`<br>`で指定します。

### 通常スライド

```html
<section class="slide">
  <h1 class="slide__title">このページの見出し</h1>
  <ul class="box" style="--y:80px; --w:814px">
    <li>最初の説明</li>
    <li class="gap">次の説明</li>
  </ul>
</section>
```

通常スライドにはフッタ・ページ番号・右上のメニューボタンが自動で追加されます。付与される番号は、表紙および章扉を除外したスライドの通し番号と総ページ数です。`data-no`やページ番号を手で書く必要はありません。

表紙・章扉にはフッタの文字とページ番号を表示せず、メニューボタンも隠します。Mキーではメニューを開けます。

## 5. 座標と文字サイズ

座標の原点はスライド左上です。画面に表示した後の寸法ではなく、960 × 540pxの座標で記述します。

| 指定 | 意味 | 例 |
| --- | --- | --- |
| `.box` | 文章を絶対配置 | `class="box"` |
| `--x` | 左位置。`.box`の既定値は73px | `--x:470px` |
| `--y` | 上位置。既定値は0 | `--y:100px` |
| `--w` | 幅。自動改行の範囲 | `--w:350px` |
| `.fig` | 図を絶対配置。既定の左・上位置は0 | `class="fig"` |
| `.center` | スライド全幅で中央揃え | `class="box center"` |
| `.fs-1` | 28px | 本文 |
| `.fs-2` | 24px | 補足 |
| `.fs-3`、`.small` | 20px | 詳細 |

通常の本文領域は、おおむね左73px・右887px、上65pxから下490pxまでを使います。上の見出し・下のフッタ・右下の番号に重ならないように配置してください。幅を指定しない`.box`は内容に応じた幅になるので、文章には`--w`を付けると改行を調整しやすくなります。

自動で内容を縮めたり、次のスライドへ送ったりする機能はありません。文字数の長い見出し要素も自動では改行されません。はみ出す場合は、文章を分ける、明示的に改行する、文字サイズや位置を調整する、のいずれかで修正します。

### 箇条書きと強調

```html
<ul class="box" style="--y:80px; --w:814px">
  <li><span class="blue">要点</span>を説明する
    <ul>
      <li>第2階層の補足
        <ul><li>第3階層の詳細</li></ul>
      </li>
    </ul>
  </li>
  <li class="gap"><span class="red">注意する値</span>を示す</li>
  <li class="nobullet">この行には箇条書きの点を付けない</li>
</ul>
```

第1・第2・第3階層は28px・24px・20pxです。`gap`は上余白を1.4em、`gap-2`は2.7emにします。`sp`は上余白を0.33emにします。`tight`をリストに付けると、各項目の上余白をなくします。

`blue`、`red`、`dred`、`gray`で文字色を切り替えます。`bold`または`<b>`は太字、`u`は下線、`mono`または`<code>`は等幅フォントです。改行・空白をそのまま表示するコードには`<pre class="pre">`を使います。

## 6. 図・リンク・枠付きの説明

### 図

```html
<figure class="fig" style="--x:470px; --y:100px">
  <img src="figures/my-figure.svg" width="400" height="250" alt="図の内容">
  <figcaption class="fs-3" style="margin-top:16px">図の説明</figcaption>
</figure>
```

図のファイルは`figures/`に置きます。パスは`parts/`からではなく、出力される`index.html`からの相対パスです。SVG・PNG・JPEGを使えます。画像には幅と高さを指定し、内容がわかる`alt`を付けてください。インラインSVGやCanvasも`.fig`内に配置できます。

図にHTMLの文字や数式を重ねる場合は、`.lbl`、`.ml`、`.mlc`を使えます。`.lbl`は文字の左上、`.ml`は左位置と数式の基線、`.mlc`は数式の中心を`--x`・`--y`で指定します。

### リンク

```html
<a class="interactive" href="https://example.com/" target="_blank"
   rel="noopener noreferrer">参考資料</a>
```

リンクをクリックしてもページは進みません。独自のクリック操作を持つ図や領域には`.interactive`を付けてください。

### 青枠と赤枠

```html
<div class="callout" style="left:73px; top:80px; width:814px; height:140px">
  <div class="callout__head">要点</div>
  <p class="callout__body" style="padding-left:20px">説明を書く</p>
</div>
<div class="note-box" style="left:73px; top:260px; width:814px; height:120px; padding:20px">
  <p class="red">注意点を書く</p>
</div>
```

これらの枠には`--x`・`--y`ではなく、通常の`left`・`top`・`width`・`height`を指定します。`callout__body`は上端から53pxの位置に置かれます。文章が枠の高さに収まるか確かめてください。

見出しを左に置く場合は、`.callout`に`callout--row`を足します。見出しは縦・横とも中央にそろい、本文は残りの領域の中央に配置されます。見出しの幅は既定で140pxで、`--callout-head-w`で変更できます。

```html
<div class="callout callout--row" style="left:73px; top:80px; width:814px; height:110px">
  <div class="callout__head">理由 1</div>
  <p class="callout__body">見出しを左、本文を右に置く</p>
</div>
```

## 7. 数式

文中の数式は`\( ... \)`、行を分ける数式は`\[ ... \]`で囲みます。

```html
<p class="box" style="--y:90px; --w:814px">エネルギーは \(E = mc^2\) で表す</p>
<div class="box" style="--y:180px; --w:814px">
  \[ y = \frac{a}{b} + \sqrt{x} \]
</div>
```

HTML本文のバックスラッシュはそのまま1個ずつ書きます。JavaScriptの文字列内にTeXを書く場合は、バックスラッシュをエスケープする必要があります。

MathJaxの設定は`parts/00_head.html`にあります。数式描画はSVG出力で、フォントのキャッシュは各数式内に保持します。`build.sh`は`deck.js`でページ番号を生成した後にMathJaxを読み込むため、本文と番号が同じ初回の処理で描画されます。

`sh build.sh --cdn`でビルドすると、同梱ファイルの代わりにCDNのMathJax 3.2.2（`tex-svg.js`）を読み込みます。表示にインターネット接続が必要になるため、配布するスライドは既定の同梱版でビルドしてください。

同梱しているのは`tex-svg.js`のみです。追加のTeX拡張は同梱していないので、拡張の自動読み込みや`\require`が必要な式までオフラインで動くとは限りません。追加する場合は必要な拡張も同梱し、ブラウザのコンソールで読み込みエラーがないか確認してください。

## 8. 配色・フォント・フッタ・ロゴの変更

発表ごとの変更は`css/custom.css`に書きます。

```css
:root {
  --footer-text: "所属・発表者名　　発表タイトル";
  --c-accent: #185ab3;
  --c-alert: #da3c3e;
  --c-footer: #505050;
  --font-sans: "Hiragino Sans", "Noto Sans JP", sans-serif;
  --slide-logo: url("../figures/my-logo.svg");
}
```

`--footer-text`は引用符で囲むCSS文字列です。空文字列`""`にするとフッタの文字だけを消せます。バーとページ番号は残ります。

`--slide-logo`は右上の49 × 45pxの領域に表示します。初期値は汎用のメニューアイコンです。画像を変更しても、その領域をクリックすると表示メニューが開きます。画像を消すときは`--slide-logo: none`と書けますが、押しボタンが見えなくなるためMキーで開いてください。

CSS内の画像パスは、その記述を書いたCSSファイルからの相対パスです。上の例は`css/custom.css`から`figures/my-logo.svg`を参照しています。

表紙にロゴを置く場合は、表紙のセクション内に追加します。標準では右上に配置され、各画像の最大寸法は300 × 70pxです。

```html
<div class="slide__logos">
  <img src="figures/my-logo.svg" alt="所属のロゴ">
</div>
```

標準フォントはmacOSのヒラギノ、等幅はConsolas、なければMenloです。フォントファイルは同梱していません。WindowsやLinuxでは別の書体で代用されるため、改行や図の中の文字、枠の横幅を確かめてください。

寸法の変数`--slide-w`・`--slide-h`もありますが、ページ操作・タイトル罫線・印刷寸法などには960 × 540pxの値を使っています。縦横の比率を変える場合は変数の変更だけで済ませず、CSS、`deck.js`、印刷設定、本文の配置位置をまとめて直す必要があります。

## 9. 操作方法

| 操作 | キー・クリック |
| --- | --- |
| 次へ | →、↓、PageDown、Space、Enter、スライドの左端5%以外をクリック |
| 前へ | ←、↑、PageUp、Backspace、スライドの左端5%をクリック |
| 最初／最後 | Home／End |
| メニューを開閉 | M、通常スライド右上のアイコン |
| 一覧を開閉 | O |
| 全画面へ | F、またはメニュー |
| メニュー・ポップアップを閉じる | Esc |
| 全画面を終了 | メニュー、またはブラウザのEsc操作 |
| Chromeで最新版を読み込む | ⌘ / Ctrl + Shift + R |

O・F・Mは小文字でも大文字でも動きます。Ctrl・Cmd・Altとの組み合わせは処理しません。Fキーは全画面にする操作です。戻すときはメニューかEscを使います。

通常表示ではスライドの下にキー一覧を表示します。全画面、一覧、印刷では隠します。一覧画面では押したスライドを選んで通常の画面に戻ります。右端のミニマップからもスライドを選べます。

メニューの「レーザーポインター表示」で赤いマーカーを切り替えます。初期値はOffです。目印を出しても操作の邪魔にはならず、スライドの外や一覧、印刷では表示されません。

URLの終わりの`#3`は、表紙や章の扉を含めた3枚目を指します。右下の本文の番号とは違います。

入力欄・ボタン・独自操作部品の操作中はキーによるページ送りを止めます。ウィンドウにフォーカスがない場合も、右下に停止理由を表示します。「ページ送りに戻る」でメニューとポップアップを閉じ、ページを進めずに現在のスライドへフォーカスを戻します。

## 10. 設定ポップアップを使う

常時入力部品を並べず、本文の下線付き設定値をクリックすると入力を開く方式です。サンプルでは倍率・色を変更できます。

```html
<div class="sim-controls interactive">
  <label><span>倍率</span><input id="scale" type="range" min="1" max="5"
    step="1" value="3" aria-label="倍率"><output id="value" class="sim-val">3</output></label>
</div>
```

```javascript
const input = document.querySelector('#scale');
const output = document.querySelector('#value');
input.addEventListener('input', () => { output.textContent = input.value; });
```

`js/demo.js`のように、発表固有の処理を`popover.js`より先に読み込みます。`popover.js`は`.sim-controls`内の`input`・`select`をポップアップへ移し、元の`label`をクリック可能にします。入力要素そのものを移動するため、事前に登録したイベントは残ります。

各`label`には入力部品を1個だけ置き、最初の子要素に設定項目名の`span`を置いてください。数値は同じ`label`内の`b`または`output`に表示し、入力の`input`イベントで更新します。本文の表示値とポップアップ内の複製は同期されます。`select`の選択名はライブラリが表示します。

入力がDOM上で移動するため、初期化時に要素の参照を取得してください。移動した後に元の親要素から`querySelector('input')`で探しても見つかりません。IDや保持した参照から操作できます。

JavaScriptで値を変更する場合は、`.value`を代入した後で`input`イベントも送ってください。値を入れるだけでは画面の表示や図が書き換わりません。

```javascript
input.value = '4';
input.dispatchEvent(new Event('input'));
```

EnterやSpaceでも設定画面を開けます。Escまたはポップアップ外のクリックで閉じます。ページを移動したり一覧画面へ切り替えたりしても閉じます。

独自の座標入力などには、`window.simPopover.open(host, pop)`と`window.simPopover.close()`を使えます。`host`はスライド内の基準となる要素、`pop`は表示する要素です。共通の見た目と配置の調整が働きます。小窓の幅や高さは発表側のCSSで決め、スライドの中に収まるようにしてください。

## 11. 独自のJavaScript・デモを追加する

独自処理を`js/`に置き、`build.sh`の末尾のスクリプト一覧に追加します。入力イベントを登録する処理は`popover.js`より前に読み込みます。数式描画を必要とする処理は`tex-svg.js`の後に読み込み、`MathJax.startup.promise`を待つ形で書きます。

`deck.js`はグローバル変数への干渉を避けるため、内部を関数で囲んでいます。公開APIは次のとおりです。

| API | 内容 |
| --- | --- |
| `SlideDeck.show(i)` | 0始まりの整数で表示するスライドを指定。範囲外は先頭・末尾に収める |
| `SlideDeck.toggleOverview()` | 一覧を切り替える |
| `SlideDeck.current` | 現在の0始まりのスライド番号 |
| `SlideDeck.slides` | スライド要素の配列。取得ごとに配列をコピーする |

スライドは初期化時に読み取ります。追加・削除はHTMLで行い、再ビルドしてページを再読み込みしてください。

独自操作の領域に`.interactive`を付けると、そのクリックでページが進むのを防げます。独自のキーボード操作部品には`data-slide-control`を付けると、操作中にキーによるページ送りが止まります。標準の入力欄・ボタンと`role="button"`の要素は自動で対象になります。

アニメーションを追加する場合は、各フレームで親の`.slide`に`.is-current`があるか確認し、表示中のページだけ描画する構成にできます。PDF出力では全スライドを描画対象にします。

## 12. 印刷とPDF

静的なページはメニューの「印刷」で出力できます。背景を含めて印刷し、ブラウザのヘッダー・フッターは無効にしてください。印刷CSSは1スライド＝1ページの960 × 540pxを指定しています。

Canvasやアニメーションを含む発表には、専用のPDF出力スクリプトを使います。Node.js 22.4以降とGoogle Chromeが必要です。

```sh
sh build.sh
node scripts/export-pdf.mjs index.html dist/presentation.pdf
```

Chromeが標準のmacOSの場所にない場合は、実行ファイルを指定します。

```sh
CHROME_PATH='/path/to/chrome' node scripts/export-pdf.mjs index.html dist/presentation.pdf
```

出力先の`dist/`はGitの管理対象外です。生成PDFは`dist/`にまとめておくと、本文の元データと混ざりません。

このスクリプトは専用のChrome一時プロファイルを作り、数式・フォント・画像を待ちます。全スライドを描画対象にし、`requestAnimationFrame`によるデモを180フレーム（約3秒相当）進め、以後のフレームを止めて印刷します。乱数は固定シードで生成します。元のHTML・CSS・JSや普段のブラウザのプロファイルは変更しません。

すでにあるPDFは上書きしません。同名ファイルがある場合は別名を指定してください。

PDFは静止画です。動画・CSSアニメーション・タイマー・非同期通信を使う新しいデモを追加した場合は、スクリプト側でも静止状態の指定を追加してください。Canvas検査は2D描画の不透明画素と色つき画素の存在を確認するため、WebGLや白黒・濃淡だけの図には検査の調整が必要です。

一時プロファイルと`validation.json`は`~/.cache/b3exp_wireless_slide/pdf-chrome-*/`に保存します。標準出力にスライド数・数式数・検査結果と保存先を表示します。PDFのページ数がスライド数に一致することと、図・数式・改行・空白ページの有無を目視で確認してください。

## 13. 確認用のコマンド

cloneまたはコピーしたテンプレートのルートで実行します。

```sh
sh build.sh
node tests/browser-smoke.mjs
```

Chromeの場所を変更する場合はPDF出力と同様に`CHROME_PATH`を指定します。対象のHTMLを差し替える場合は、`node tests/browser-smoke.mjs dist/slide.html`のようにパスを指定します。`--cdn`でビルドしたHTMLは外部通信を前提とするため、この検査は既定のビルドで行います。外部のHTTP通信をブロックした状態でサンプルを開き、数式・ページ番号・フッタ・画面サイズごとの配置・ポップアップの値同期・ページ送り停止・メニュー・一覧・全画面・印刷を検査します。

検証画像は`~/.cache/b3exp_wireless_slide/template-smoke-*/`に保存します。テストはサンプルの8枚・番号付き6枚と部品名を前提にしているため、自分の発表に置き換えた後は必要に応じて期待値や対象を更新してください。全ページの文字の重なりまで保証するものではありません。

## 14. 配布・保守

Webで表示するために必要なのは`index.html`と`lib/`・`css/`・`js/`・`figures/`です。HTMLだけを渡すと、CSS・数式・図・操作が欠けます。編集できる状態で渡す場合は、このディレクトリ全体を渡してください。

1ファイルにまとめて配布する場合は、ビルドに`--single`を付けます。CSS・JavaScript・数式描画・図をすべて埋め込んだ`dist/slide.html`ができ、ファイル1つで開けます。

```sh
sh build.sh --single
```

`dist/`はGitの管理対象外です。出力先を変える場合は`node scripts/bundle-single.mjs index.html my-slides.html`のように指定します。MathJaxを含むため数MBになります。`sh build.sh --single --cdn`にすると、MathJaxをCDNから読み込む小さな1ファイルになります（表示にインターネット接続が必要です）。元のファイルを更新したら作り直してください。

公開先や認証設定は含めていません。元の授業スライドの公開サーバー・Basic認証・実験固有のシミュレーションや履歴保存も含めていません。

テンプレートのライブラリは元リポジトリのコードを独立したファイルとして抽出したものです。元のCSS・JSを更新しても自動で同期されません。共通機能を更新する場合は両方の変更内容を確認し、サンプルのブラウザテストを再実行してください。

`lib/js/tex-svg.js`は元リポジトリに同梱されていたMathJax 3.2.2をそのままコピーしています。[MathJaxの公式ライセンス](https://github.com/mathjax/MathJax/blob/3.2.2/LICENSE)の写しを`lib/MathJax-LICENSE.txt`に同梱しています。ライブラリをコピー・配布する際も一緒に保持してください。

本文・図・CSS・JSと、ビルド後の`index.html`を一緒に管理すると再現しやすくなります。生成PDFは`dist/`に出力され、検証画像もキャッシュディレクトリに保存されるため、本文の元データとは混ざりません。配布用に確定したPDFを残したい場合は、`dist/`の外に置いて管理してください。

## 15. Gitでの運用（発表ごとのcloneとテンプレートへの還元）

発表ごとにこのリポジトリをcloneし、`talk/日付-名前`のようなブランチを切って編集します。発表を通して見つかった共通の改善は、後からテンプレート本体の`main`へ還元します。そのために、還元したい変更と発表固有の変更を最初から分けてコミットしておきます。テンプレートのリポジトリには`main`（テンプレート本体）と`talk/...`（各発表）のブランチが同居し、`main`に入るのは還元済みの変更だけです。

### 発表を始める

```sh
git clone git@github.com:k3komatsu/my_html_slide_style.git my-talk
cd my-talk
git switch -c talk/2026-04-my-talk
```

### コミットを分ける

還元の対象は共有部分への変更です。`lib/`、`scripts/`、`build.sh`、`tests/`、`README.md`への変更は1機能1コミットにし、`deck:`（操作・描画）、`style:`（見た目）、`fix:`（不具合）などのprefixを付けます。発表固有のファイル（`index.html`、`parts/`、`css/custom.css`、`js/`、`figures/`）は通常のメッセージで構いません。

```sh
git add lib/js/deck.js
git commit -m "deck: Oキーで一覧を開けるようにする"

git add parts/01_slides.html css/custom.css
git commit -m "talk: スライド本体を書く"
```

区切りごとにブランチをpushしておくと、バックアップと還元の両方に使えます。`main`へはpushしません。

```sh
git push -u origin talk/2026-04-my-talk
```

### 還元する

テンプレート本体のcloneで発表のブランチを取り込み、還元するコミットだけをcherry-pickします。prefixを目印に選んでください。発表のブランチをpushしていない場合は、`git remote add my-talk ~/work/my-talk`のようにclone先を直接remoteに指定しても同じです。

```sh
# テンプレート本体のcloneで
git fetch origin
git log --oneline main..origin/talk/2026-04-my-talk
git cherry-pick <コミット>
sh build.sh
node tests/browser-smoke.mjs
git push origin main
```

還元後は`git push origin --delete talk/2026-04-my-talk`で発表のブランチを消しても構いません。発表の作成中にテンプレートの更新を取り込む場合は、`git fetch origin`の後に`git merge origin/main`（または`git rebase origin/main`）を使います。還元は発表当日でなくてよく、次の発表を作り始める前に忘れないうちに済ませておくと、改善が引き継がれます。

### 発表を独立したリポジトリとして公開する

発表だけを配布する場合は、空のリポジトリへブランチを`main`としてpushできます。テンプレートの履歴ごと移ります。

```sh
git push git@github.com:k3komatsu/my-talk.git talk/2026-04-my-talk:main
```

以後テンプレートの更新を追う場合は、clone時に`origin`を発表用リポジトリ、テンプレートを`upstream`に分けると管理しやすくなります。
