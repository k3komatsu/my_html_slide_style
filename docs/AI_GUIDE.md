# AIによる編集

発表資料を作成する際は、次の対象範囲を編集してください。

- メタデータ、追加CSS/JS、任意機能は`slide.config.mjs`へ記述してください。
- 本文は`parts/*.html`で編集してください。
- 図は`figures/`または`assets/`へ追加し、画像には`alt`を付与してください。
- 発表固有のCSSは`css/custom.css`、JSは`js/`などへ配置してください。
- 通常のスライドには`.content`とFlow Layoutを使用してください。
- 精密な座標が必要な場合は`.box`・`.fig`を使用してください。
- 編集後は`node tools/slide.mjs check`を実行し、表示を確認してください。

共通コードの改造を明示的に依頼されていない限り、`lib/`・`tools/`を編集してはなりません。生成物である`index.html`・`lib/js/deck.js`・`dist/`は直接編集してはなりません。フッタのメタデータを本文やCSSへ重複して記述してはなりません。

共通機能を改造する場合は`lib/runtime/`などのソースを編集し、`node tools/slide.mjs test`を実行してください。Runtimeソースはビルド時に通常のscriptへ結合されます。ブラウザでのES Modulesの読み込みを必須にしてはいけません。

オフライン、`file://`、MathJax、単一HTML、PDF、精密配置を維持してください。外部依存は標準機能では足りない理由がある場合だけ検討してください。発表branchは完全なsnapshotであり、過去のbranchを更新・migration・同期する仕組みは作成してはなりません。coreの出自はGit履歴だけで追跡してください。
