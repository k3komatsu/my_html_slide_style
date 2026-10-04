# 発表資料の作成

発表ごとに、その時点の`main`からbranchを作成します。発表branchには本文・共通コード・ツール・同梱依存がすべて含まれます。発表終了後は原則freezeとし、過去のbranchへ`main`をmergeしません。

1. `slide.config.mjs`を編集し、題名、言語、著者、所属、フッタ、追加CSS/JS、任意機能を設定します。
2. `parts/01_slides.html`を編集します。必要に応じて番号付きのHTMLファイルを追加します。
3. 図を`figures/`または`assets/`へ配置し、画像には`alt`を付与します。
4. `node tools/slide.mjs serve`を実行して編集結果を確認します。
5. `node tools/slide.mjs check`を実行して資料を検査します。
6. `export single`、`export site`、`export pdf`を実行して配布用ファイルを作成します。

各コマンドは`node tools/slide.mjs`に続けて実行します。出力先の既定値は`dist/slide.html`・`dist/site/`・`dist/slide.pdf`です。PDFは既存ファイルを上書きしません。生成済みの`index.html`は`file://`で開けます。表示にNode.jsやサーバーは不要です。

通常の本文には`.content`とFlow Layoutを使用します。数式や図への注釈を精密に配置する場合は`.box`・`.fig`を使用します。本文の座標はconfigへ入れません。部品については[COMPONENTS](COMPONENTS.md)を参照してください。

検査でエラーが出た場合は修正し、警告については意図した配置になっているか確認します。検査を通過した場合も、発表で使用する環境で改行・重なり・図を目視確認してください。

テンプレートへの改善は`main`へ戻します。発表固有の変更と共通機能の改善を分けてコミットしておけば、必要な改善のみをcherry-pickできます。出自の正本はGit履歴です。
