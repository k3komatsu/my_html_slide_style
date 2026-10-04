# HTMLスライド テンプレート

「実験e ディジタル無線通信の基礎」のHTMLスライドから、共通の見た目と操作を取り出したテンプレートです。このリポジトリをcloneまたはコピーして、別の授業・研究発表・説明資料を作れます。元のスライドや親ディレクトリのファイルは必要ありません。

白い背景、青い上端バーと見出し、灰色のフッタ、右下の丸い分数ページ番号を引き継いでいます。レイアウトは960 × 540px（16:9）で固定し、表示する画面に合わせて全体を拡大・縮小します。著者名・授業名・大学ロゴは固定せず、発表ごとに設定できます。

## 1. まず動かす

発表ごとに本リポジトリをcloneし、編集用ブランチを作成します。

```sh
git clone git@github.com:k3komatsu/my_html_slide_style.git my-slides
cd my-slides
git switch -c talk/2026-04-my-talk
sh build.sh
open index.html
```

`main`はテンプレート本体のブランチであるため、スライドの編集は必ずclone直後に切ったブランチ上で行ってください。ブランチの命名規則や、共通の改善内容を後からテンプレート本体へ反映する手順は「15. Gitでの運用」に記載しています。Gitを使用しない場合は、本ディレクトリを`my-slides`等へディレクトリごとコピーしても同様に動作します。

`open`はmacOSのコマンドです。他のOS環境では、ブラウザで直接`index.html`を開いてください。動作確認用ブラウザにはChromeを推奨します。サンプルスライドは全9枚で構成され、表紙と章扉を除いた7枚にページ番号が表示されます。

表示するだけであればWebサーバーやNode.jsは不要です。CSS・JavaScript・数式描画ライブラリを内包しているため、サンプルは`file://`経由かつオフライン環境で動作します。外部パッケージの導入や`npm install`の実行は不要です。

ビルド・検証・開発サーバー・エクスポートにはNode.js 22.4以降を使用します。生成済みHTMLの閲覧にはNode.jsもWebサーバーも不要です。

```sh
node tools/slide.mjs build
node tools/slide.mjs serve
node tools/slide.mjs check
node tools/slide.mjs test
node tools/slide.mjs export single
node tools/slide.mjs export site
node tools/slide.mjs export pdf
node tools/slide.mjs clean
```

`serve`は空きポートでローカルサーバーを起動し、URLを出力します。スライド本文・CSS・JS・図・設定・共通ライブラリの変更を検知して自動ビルドを実行し、ブラウザをリロードします。ビルドエラーはターミナルに出力され、ブラウザには直近で成功したHTMLが表示され続けます。終了するにはCtrl+Cを押下します。自動リロード用のスクリプトはサーバー応答時のみ注入され、配布用HTMLには含まれません。

従来の`sh build.sh`およびオプション（`--single`・`--site`・`--cdn`）も使用可能です。`build.sh`はCLIへのラッパーです。手動ビルド時は、実行後にブラウザを手動でリロードしてください。

## 2. ファイル構成

```text
template/
├── README.md
├── slide.config.mjs          # 発表のメタデータ・追加CSS/JS・任意機能
├── tools/                   # CLI・build・serve・check・Chrome接続
├── docs/                    # 作成手順・レイアウト部品・AI編集ルール
├── build.sh                  # CLI buildへの互換入口
├── index.html                # 生成済みのサンプル
├── parts/
│   ├── 00_head.html          # HTML冒頭、タイトル、CSS、MathJax設定
│   └── 01_slides.html        # 表紙・章扉・本文のサンプル
├── lib/                     # 発表間で共用するライブラリ
│   ├── css/theme.css        # 色・フォント・寸法の既定値
│   ├── css/slide.css        # レイアウト・部品・操作UI・印刷
│   ├── runtime/             # 責務ごとのソース（通常のJSとして結合）
│   ├── js/deck.js           # runtimeから生成したページ操作コード
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
└── tests/                   # core・fixtures・integration・サンプル回帰テスト
```

スライド本文のソース編集は`parts/*.html`で行います。`index.html`はビルド成果物であるため、直接編集しないでください。`tools/slide.mjs build`が各ファイルを辞書順に結合し、末尾に`</main>`、スクリプト読み込みタグ、HTML終了タグを付加します。`lib/js/deck.js`も成果物です。共通機能の改修は`lib/runtime/`配下で行います。ブラウザには従来通り通常のscriptタグで読み込ませるため、ES Modulesのロード機能に依存しません。

複数ファイルに分ける場合は`02_topic.html`、`03_summary.html`のように、先頭に桁数をそろえた番号を付けてください。`parts/`側のファイルに終了タグやスクリプト読み込みタグを重複して記述する必要はありません。

共通ライブラリの既定値は`css/custom.css`で上書きします。CSSの読み込み順序は`theme.css` → `slide.css` → `custom.css`です。通常の新規発表作成において、`lib/`を編集する必要はありません。

## 3. 新しい発表に置き換える

1. `slide.config.mjs`の`title`・`lang`・`author`・`affiliation`・`footer`を書き換えます。
2. `parts/01_slides.html`内のスライド本文を発表内容に置き換えます。
3. 画像ファイルは`figures/`または`assets/`へ配置し、独自スクリプトは`js/`等へ追加します。
4. 追加するCSSおよびJSは、configの`styles`・`scripts`へ読み込み順に指定します。
5. `node tools/slide.mjs build`および`node tools/slide.mjs check`を実行して動作を確認します。

本文およびhead内で使用される`{{title}}`・`{{lang}}`・`{{author}}`・`{{affiliation}}`は、ビルド時にconfigの設定値へ置換されます。値はHTMLエスケープ処理されます。スライドの配置情報はconfigには記述しません。

```js
export default {
  title: "発表タイトル",
  lang: "ja",
  author: "発表者名",
  affiliation: "所属",
  footer: "発表者名　　発表タイトル",
  mathjax: { mode: "local" },
  features: { overview: true, menu: true, laser: true, popover: true },
  styles: ["css/custom.css"],
  scripts: ["js/demo.js"],
};
```

サンプルデモが不要な場合は、該当スライドを削除し、configの`scripts`から`js/demo.js`を除外してください。ポップアップ機能が不要な場合は`features.popover`を`false`に設定します。`overview`・`menu`・`laser`も個別に無効化可能です。

config内のパスはプロジェクトルートからの相対パスで指定します。ローカルのCSS・JSファイルは事前に存在確認が行われます。`mathjax.mode`の指定値は`local`または`cdn`です。configはJavaScriptとして実行されるため、信頼できる設定ファイルのみを使用してください。`serve`はconfig本体を再読み込みしますが、configがimportした補助モジュールはNode.jsのキャッシュに残ります。補助モジュールを変更したときはサーバーを再起動してください。

MathJaxは本文中の数式に加え、右下の分数ページ番号の描画にも利用されます。通常は`lib/js/tex-svg.js`の読み込み設定を維持してください。

## 4. 表紙・章扉・通常スライド

各スライドを`<section class="slide">`で囲み、`<main class="slides">`の中に並べます。

### 表紙

```html
<section class="slide slide--cover">
  <h1 class="cover-title" style="top:180px">{{title}}</h1>
  <p class="author-line center" style="top:285px">{{affiliation}}　{{author}}</p>
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

### Flow Layout

定型的な文章や図は`.content`内に配置することで、本文セーフエリアに収まるレイアウト枠を利用できます。各要素の絶対座標を記述する必要はありません。

```html
<section class="slide">
  <h1 class="slide__title">System Model</h1>
  <div class="content cols-2">
    <div class="stack">
      <p>受信機のモデル</p>
      <ul><li>非線形チャネル</li><li>自己干渉の除去</li></ul>
    </div>
    <figure><img src="figures/system.svg" alt="受信機の構成"></figure>
  </div>
</section>
```

`.stack`は垂直方向の整列、`.row`は水平方向の整列、`.cols-2`・`.cols-3`は等幅カラムレイアウトを構成します。`.columns`・`.grid`では`--columns`により列数を指定可能です。`.center-content`は中央揃えを適用します。間隔は`--layout-gap`で調整します。図の左右配置はDOMツリー上の記述順序に従うため、専用の左右配置クラスは定義されていません。

本文セーフエリアの定義元は`--safe-left`・`--safe-right`・`--safe-top`・`--safe-bottom`です。既定値はそれぞれ73px・73px・65px・50pxです。コンテンツが領域を超過しても自動改ページは行われません。`check`で確認し、文章や図を分けてください。数式や図への注釈などの精密配置には、従来の`.box`・`.fig`を使えます。

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
  --c-accent: #185ab3;
  --c-alert: #da3c3e;
  --c-footer: #505050;
  --font-sans: "Hiragino Sans", "Noto Sans JP", sans-serif;
  --slide-logo: url("../figures/my-logo.svg");
}
```

フッタの文字は`slide.config.mjs`の`footer`で設定します。空文字列`""`にすると文字だけを消せます。バーとページ番号は残ります。生成されたCSS変数`--footer-text`は直接編集しません。

`--slide-logo`は右上の49 × 45pxの領域に表示します。初期値は汎用のメニューアイコンです。画像を変更しても、その領域をクリックすると表示メニューが開きます。画像を消すときは`--slide-logo: none`と書けますが、押しボタンが見えなくなるためMキーで開いてください。

CSS内の画像パスは、その記述を書いたCSSファイルからの相対パスです。上の例は`css/custom.css`から`figures/my-logo.svg`を参照しています。

表紙にロゴを置く場合は、表紙のセクション内に追加します。標準では右上に配置され、各画像の最大寸法は300 × 70pxです。

```html
<div class="slide__logos">
  <img src="figures/my-logo.svg" alt="所属のロゴ">
</div>
```

標準フォントはmacOSのヒラギノ、等幅はConsolas、なければMenloです。フォントファイルは同梱していません。WindowsやLinuxでは別の書体で代用されるため、改行や図の中の文字、枠の横幅を確かめてください。

スライド寸法は`theme.css`の`--slide-w`・`--slide-h`が正本です。`--slide-width`・`--slide-height`はその別名で、表示の拡大縮小、一覧、印刷、PDFは同じ値を参照します。本テンプレートのデザインは960 × 540pxを前提とします。別の縦横比を使う場合は、装飾や本文の座標も含めて確認が必要です。

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

独自処理を`js/`などに置き、configの`scripts`へ追加します。読み込み順は`deck.js` → configのJS → `popover.js`（有効な場合）→ MathJaxです。入力イベントはpopover初期化前に登録できます。数式描画後の処理は`load`イベント内で`MathJax.startup.promise`を待ちます。

`deck.js`はグローバル変数への干渉を避けるため、内部を関数で囲んでいます。公開APIは次のとおりです。

| API | 内容 |
| --- | --- |
| `SlideDeck.show(i)` | 0始まりの整数で表示するスライドを指定。範囲外は先頭・末尾に収める |
| `SlideDeck.toggleOverview()` | 一覧を切り替える |
| `SlideDeck.on(name, listener)` | イベント購読。戻り値の関数で購読を解除 |
| `SlideDeck.geometry` | CSSから取得した`width`・`height` |
| `SlideDeck.current` | 現在の0始まりのスライド番号 |
| `SlideDeck.slides` | スライド要素の配列。取得ごとに配列をコピーする |

`slidechange`は`{ index, slide, previous }`、`overviewchange`と`fullscreenchange`は`{ enabled }`を渡します。`beforeprint`は印刷前に通知します。同じページを再指定した場合は`slidechange`を通知しません。購読前の初期表示は通知されないので、初期化には`SlideDeck.current`を参照します。

```js
const unsubscribe = SlideDeck.on("slidechange", ({ index, slide }) => {
  // 表示中のデモを更新する
});
```

スライドは初期化時に読み取ります。追加・削除はHTMLで行い、再ビルドしてページを再読み込みしてください。

独自操作の領域に`.interactive`を付けると、そのクリックでページが進むのを防げます。独自のキーボード操作部品には`data-slide-control`を付けると、操作中にキーによるページ送りが止まります。標準の入力欄・ボタンと`role="button"`の要素は自動で対象になります。

アニメーションを追加する場合は、各フレームで親の`.slide`に`.is-current`があるか確認し、表示中のページだけ描画する構成にできます。PDF出力では全スライドを描画対象にします。

## 12. 印刷とPDF

静的なページはメニューの「印刷」で出力できます。背景を含めて印刷し、ブラウザのヘッダー・フッターは無効にしてください。印刷CSSは1スライド＝1ページの960 × 540pxを指定しています。

Canvasやアニメーションを含む発表には、専用のPDF出力スクリプトを使います。Node.js 22.4以降とGoogle Chromeが必要です。

```sh
sh build.sh
node tools/slide.mjs export pdf dist/presentation.pdf
```

Chromeが標準のmacOSの場所にない場合は、実行ファイルを指定します。

```sh
CHROME_PATH='/path/to/chrome' node tools/slide.mjs export pdf dist/presentation.pdf
```

出力先の`dist/`はGitの管理対象外です。生成PDFは`dist/`にまとめておくと、本文の元データと混ざりません。

このスクリプトは専用のChrome一時プロファイルを作り、数式・フォント・画像を待ちます。全スライドを描画対象にし、`requestAnimationFrame`によるデモを180フレーム（約3秒相当）進め、以後のフレームを止めて印刷します。乱数は固定シードで生成します。元のHTML・CSS・JSや普段のブラウザのプロファイルは変更しません。

すでにあるPDFは上書きしません。同名ファイルがある場合は別名を指定してください。

PDFは静止画です。動画・CSSアニメーション・タイマー・非同期通信を使う新しいデモを追加した場合は、スクリプト側でも静止状態の指定を追加してください。Canvas検査は2D描画の不透明画素と色つき画素の存在を確認するため、WebGLや白黒・濃淡だけの図には検査の調整が必要です。

一時プロファイルと`validation.json`は`~/.cache/html-slide/pdf-chrome-*/`に保存します。標準出力にスライド数・数式数・検査結果と保存先を表示します。PDFのページ数がスライド数に一致することと、図・数式・改行・空白ページの有無を目視で確認してください。

## 13. 確認用のコマンド

cloneまたはコピーしたテンプレートのルートディレクトリで実行します。

```sh
node tools/slide.mjs test
node tools/slide.mjs check
```

Chromeのバイナリパスを変更する場合は、PDFエクスポートと同様に環境変数`CHROME_PATH`を指定します。検証対象のHTMLファイルを切り替える場合は、`node tests/browser-smoke.mjs dist/slide.html`のように引数でパスを渡します。`--cdn`指定でビルドしたHTMLは外部ネットワーク通信に依存するため、本検証は既定のローカルビルド成果物に対して実行してください。外部のHTTP通信をブロックした状態でサンプルを開き、数式・ページ番号・フッタ・画面サイズごとの配置・ポップアップの値同期・ページ送り停止・メニュー・一覧・全画面・印刷を検査します。

`test`はコア機能、正常系・異常系fixture、ビルドパイプライン、開発サーバー、およびサンプルのリグレッションテストを一括実行します。検証時に取得されたスナップショット画像は`~/.cache/html-slide/sample-*/`へ保存されます。`tests/browser-smoke.mjs`はサンプルのスライド構成（全9枚・番号付き7枚）および特定UIコンポーネントの存在を前提としたテストコードです。

実際の発表資料には`check`を使います。枚数やサンプルの部品名に依存せず、JavaScript例外、MathJaxエラー、画像・ローカルアセットの読み込み失敗、外部通信、重複ID、不正なページ内リンク、alt属性欠落、はみ出し、フッタ・ページ番号への重なり、標準popoverのはみ出しを検査します。

```sh
node tools/slide.mjs check
node tools/slide.mjs check dist/slide.html
node tools/slide.mjs check dist/site/index.html
```

エラーを検出した場合の終了コードは1となります。配置警告やalt属性欠落警告のみの場合は終了コード0で復帰します。必要に応じて警告内容を精査してください。本検証はDOM描画後のバウンディングボックスおよびリソース取得結果に基づく幾何学的検査です。文字同士のすべての重なり、任意の独自操作、異なるOSのフォント差までは保証しないため、発表前に目視でも確認してください。オフライン検査処理では外部HTTP通信を遮断します。CDN利用等を意図したスライドを検証する場合にのみ、`--allow-external`フラグを付与してください。

## 14. 配布・保守

Webで表示するために必要なのは`index.html`と`lib/`・`css/`・`js/`・`figures/`です。HTMLだけを渡すと、CSS・数式・図・操作が欠けます。編集できる状態で渡す場合は、このディレクトリ全体を渡してください。

Webサーバーで公開する場合は、`export site`を使います。表示に必要なファイル一式が`dist/site/`にコピーされるので、このディレクトリを公開します。`dist/site/`は毎回置き換わります。

```sh
node tools/slide.mjs export site
```

従来の`sh build.sh --site`は互換性のため、引き続き`dist/`直下へ出力します。他の単一HTMLやPDFは残るため、公開用には`export site`を使ってください。`clean`は`dist/`全体を削除し、ソースとルートの生成HTMLは残します。

`--cdn`と組み合わせると、同梱MathJax（約2MB）を除いた一式になります。

1ファイルにまとめて配布する場合は、`export single`を使います。CSS・JavaScript・数式描画・図をすべて埋め込んだ`dist/slide.html`ができ、ファイル1つで開けます。

```sh
node tools/slide.mjs export single
```

`dist/`はGitの管理対象外です。出力先を変える場合は`node scripts/bundle-single.mjs index.html my-slides.html`のように指定します。MathJaxを含むため数MBになります。`sh build.sh --single --cdn`にすると、MathJaxをCDNから読み込む小さな1ファイルになります（表示にインターネット接続が必要です）。元のファイルを更新したら作り直してください。単一HTML化は通常のローカルCSS・JS・画像・CSSの`url()`を埋め込みます。`@import`・`srcset`・外部フォントなどは対象外です。出力後にも`check`で確認してください。

公開先や認証設定は含めていません。元の授業スライドの公開サーバー・Basic認証・実験固有のシミュレーションや履歴保存も含めていません。

テンプレートのライブラリは元リポジトリのコードを独立したファイルとして抽出したものです。元のCSS・JSを更新しても自動で同期されません。共通機能の改善はテンプレートの`main`で行い、core・fixture・サンプルのテストを再実行してください。過去の発表branchは更新しません。

`lib/js/tex-svg.js`は元リポジトリに同梱されていたMathJax 3.2.2をそのままコピーしています。[MathJaxの公式ライセンス](https://github.com/mathjax/MathJax/blob/3.2.2/LICENSE)の写しを`lib/MathJax-LICENSE.txt`に同梱しています。ライブラリをコピー・配布する際も一緒に保持してください。

本文・図・CSS・JSと、ビルド後の`index.html`を一緒に管理すると再現しやすくなります。生成PDFは`dist/`に出力され、検証画像もキャッシュディレクトリに保存されるため、本文の元データとは混ざりません。配布用に確定したPDFを残したい場合は、`dist/`の外に置いて管理してください。

## 15. Gitでの運用（発表ごとのcloneとテンプレートへの還元）

本リポジトリは継続的に改善されるスライドテンプレートです。発表ごとにこのリポジトリをcloneし、その時点の`main`から`talk/日付-名前`のようなブランチを切って編集します。発表を通して見つかった共通の改善は、後からテンプレート本体の`main`へ還元します。円滑な運用のために、テンプレート本体へ還元すべきコミットと発表固有のコンテンツコミットは、作業初期から厳密に分離して記録してください。テンプレートのリポジトリには`main`（テンプレート本体）と`talk/...`（各発表）のブランチが同居し、`main`に入るのは還元済みの変更だけです。

### 発表を始める

```sh
git clone git@github.com:k3komatsu/my_html_slide_style.git my-talk
cd my-talk
git switch -c talk/2026-04-my-talk
```

### コミットを分ける

本体への還元対象となるのは共有モジュールへの変更のみです。`lib/`、`tools/`、各種エクスポートスクリプト、`build.sh`、`tests/`、ドキュメント類に対する改修は1機能1コミットを徹底し、コミットメッセージに`deck:`（ナビゲーション・描画系）、`style:`（デザイン・レイアウト）、`fix:`（バグ修正）等のプレフィックスを付与します。スライド固有の設定・本文テキスト・カスタムCSS/JS・画像ファイル等のコミットには任意のメッセージを使用して差し支えありません。

```sh
git add lib/runtime/ lib/js/deck.js
git commit -m "deck: Oキーで一覧を開けるようにする"

git add parts/01_slides.html css/custom.css
git commit -m "talk: スライド本体を書く"
```

作業の区切りごとにトピックブランチをリモートへpushしておくことで、作業データのバックアップおよび後続のパッチ還元の両用途に活用できます。`main`ブランチへ直接pushしてはいけません。

```sh
git push -u origin talk/2026-04-my-talk
```

### 還元する

テンプレート本体のリポジトリ側で発表ブランチの変更を取得し、本体へ還元すべきコミットのみを選択的にcherry-pickします。コミットメッセージのプレフィックスを目印に対象を抽出してください。発表ブランチをリモートへpushしていないローカル環境下であっても、`git remote add my-talk ~/work/my-talk`のようにローカルの作業リポジトリを直接リモート登録することで同様にコミットを取り込めます。

```sh
# テンプレート本体のcloneで
git fetch origin
git log --oneline main..origin/talk/2026-04-my-talk
git cherry-pick <コミット>
sh build.sh
node tests/browser-smoke.mjs
git push origin main
```

還元後も、発表branchはsnapshotとして保存します。共通機能の改善を還元しただけで発表branchを削除しません。発表branchは本文・共通コード・ツール・同梱依存を含む完全なsnapshotです。発表終了後のブランチは原則としてfreeze（凍結）し、後から更新されたテンプレート本体の`main`を過去の発表ブランチへマージしてはいけません。共通機能の還元は発表当日に行う必要はなく、次回の発表スライド作成を開始する前に適宜完了させておくことで、共通の改善資産が確実に次世代へ引き継がれます。

### 発表を独立したリポジトリとして公開する

発表だけを配布する場合は、空のリポジトリへブランチを`main`としてpushできます。テンプレートの全履歴を含んだ状態で移行されます。

```sh
git push git@github.com:k3komatsu/my-talk.git talk/2026-04-my-talk:main
```

公開した発表リポジトリもsnapshotとして保存します。次の発表は、更新済みテンプレートの`main`から新しいbranchを作って始めます。

coreの出自はGit履歴だけで追跡します。個別のVERSIONファイル、coreVersionフィールド、lock file、自動アップデート機構、移行マイグレーションスクリプト等の追加管理体系は一切導入しません。派生元の共通祖先は`git merge-base main talk/my-talk`で確認でき、当時のファイルは`git show <commit>:lib/js/deck.js`で復元できます。生成HTMLと同梱依存を保存することで、過去の資料をその時点のコードで保持します。ただし、これは将来におけるクライアントブラウザの仕様変更やOS内蔵フォントの描画差異までを不変に固定するものではありません。

詳細なスライド記述仕様は[AUTHORING](docs/AUTHORING.md)、利用可能なコンポーネント仕様は[COMPONENTS](docs/COMPONENTS.md)、AIコーディング時の境界条件は[AI_GUIDE](docs/AI_GUIDE.md)を参照してください。presenter viewや複数テーマは、実際に必要になった時点で検討します。
