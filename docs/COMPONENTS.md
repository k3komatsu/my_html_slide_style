# レイアウト部品

スライドは`<section class="slide">`で囲みます。表紙には`slide--cover`を、章扉には`slide--section`を追加します。通常スライドの見出しには`.slide__title`を使います。

| 部品 | 用途 |
| --- | --- |
| `.content` | safe areaを適用する本文領域。既定では縦並び |
| `.stack` | 縦並び配置 |
| `.row` | 等幅での横並び配置 |
| `.columns`・`.grid` | グリッド配置。`--columns`で列数を指定 |
| `.cols-2`・`.cols-3` | 等幅の列配置 |
| `.center-content` | 領域中央への配置 |
| `.box` | テキストの精密配置。`--x`・`--y`・`--w`で指定 |
| `.fig` | 図の精密配置。`--x`・`--y`で指定 |
| `.callout` | 青色の見出し付き枠 |
| `.callout--row` | 見出しを左側に配置する枠 |
| `.note-box` | 赤色の枠 |
| `.sim-controls` | 入力項目のpopover化 |
| `.interactive` | クリック時にページ遷移させない領域 |
| `[data-slide-control]` | キー操作時にページ遷移させない部品 |

Flow Layoutの余白は`--layout-gap`で指定します。図を左右どちらに配置するかはHTMLの記述順で指定します。

```html
<section class="slide">
  <h1 class="slide__title">モデル</h1>
  <div class="content cols-2">
    <div class="stack"><p>説明</p><p>\(E=mc^2\)</p></div>
    <figure><img src="figures/model.svg" alt="モデルの構成"></figure>
  </div>
</section>
```

safe areaは`--safe-left`・`--safe-right`・`--safe-top`・`--safe-bottom`で定義され、既定値は73px・73px・65px・50pxです。スライド寸法の正本は`--slide-w`・`--slide-h`であり、`--slide-width`・`--slide-height`はその別名です。配色やフォントを変更する場合は`css/custom.css`に記述します。

popoverの各`label`には入力を1個置きます。発表固有のJSはconfigの`scripts`で指定し、初期化時に入力イベントを登録します。popoverは入力要素を移動させるため、要素の参照を保持してください。

`SlideDeck.on`では`slidechange`・`overviewchange`・`fullscreenchange`・`beforeprint`を購読できます。購読の解除は戻り値の関数で行います。詳細と使用例については[README](../README.md)を参照してください。
