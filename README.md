<h1>
  <img src="images/timekeep.svg" width="100%" height="50">

</h1>

<center><p>Obsidianプラグイン - 時間管理・記録</p></center>

![License](https://img.shields.io/github/license/jacobtread/obsidian-timekeep?style=for-the-badge)
![Build](https://img.shields.io/github/actions/workflow/status/jacobtread/obsidian-timekeep/build.yml?style=for-the-badge)
![Tests](https://img.shields.io/github/actions/workflow/status/jacobtread/obsidian-timekeep/tests.yml?style=for-the-badge&label=Tests)

このプラグインは、様々なタスクに費やした時間を簡単に記録・管理できます。記録した時間は **Markdownテーブル**、**CSV**、**JSON**、または **PDF** 形式でエクスポートできます。

![トラッカー](images/tracker.png)

このプラグインには、時間トラッカーを挿入するコマンドが用意されています: `Timekeep: Insert Tracker`。または、以下のようなコードブロックを作成してタイムキープを作ることもできます:

````
```timekeep

```
````

## 🏷️ タグ

タグを時間エントリに付与して作業を分類できます（Toggl Trackに似た機能）。タグは開始フォームの専用 **タグ** フィールドに入力します（既存エントリの編集フォームでも設定可能）。カンマまたはスペース区切りで、`#` を付けても付けなくても構いません:

```
project-x, urgent
#project-x #urgent
```

**グループ**エントリに付与したタグは、集計時にすべてのサブエントリに継承されます。プロジェクトレベルで一度タグを設定するだけで、各サブエントリの時間も正しく集計されます。

タグはすべてのエクスポート形式（Markdown、CSV、PDF、JSON）に `Tags` 列として表示されます。

## ⚡ プリセット

毎回同じブロック名とタグを入力する手間を省くために、**プリセット**を定義できます。プリセットはブロック名とタグセットの組み合わせに名前を付けたものです。プラグイン設定の **プリセット** セクションで追加・編集・並べ替え・削除ができます。

各プリセットは開始フォームの上にあるクイックスタートバーにボタンとして表示されます。プリセットをクリックすると、設定されたブロック名とタグで即座に新しいエントリが開始されます（現在実行中のタイマーは一時停止）。よく使う作業はワンクリックで記録を開始できます。

プリセットで記録されたエントリは、設定された名前とタグを持つ通常のエントリです。そのため、既存のタグ集計機能で他のエントリと同様に集計されます。クイックスタートバーは設定の **プリセットバーを表示** トグルで非表示にできます。

## 🗒️ 説明

各時間エントリには、そのブロックで実際に行った作業内容を記録するためのオプションの **説明** を追加できます。説明はタイマー開始時（開始フォームの **説明** フィールド）に入力でき、後からエントリの編集フォームで変更することもできます。

説明はテーブル内のエントリ名の下に表示され、Markdown・CSV・PDFエクスポートでは `Description` 列として出力されます。またJSONにも保存されるため、`dataviewjs` で `entry.description` としてアクセスできます。説明はメモ用途であり、集計のキーとしては使用されません。

## ✏️ 編集と削除

ブロック名を間違えたり、タイマーの開始時刻が遅れたりした場合は、編集機能を使って保存済みのデータを更新したり、エントリを削除したりできます。

![編集](images/editing.png)

## 👀 データの保存方法

このプラグインは [ObsidianSimpleTimeTracker](https://github.com/Ellpeck/ObsidianSimpleTimeTracker) に大きなインスピレーションを受けています（ある程度の後方互換性あり。一部の simple-time-tracker ブロックは timekeep にリネームすることで利用可能）。時間記録のデータは `timekeep` コードブロック内にJSONとして保存されます。

タイムブロックの開始・終了時刻はタイムスタンプとして保存されるため、タイムトラッカーを開始してからObsidianを閉じても、次回起動時に記録が継続されます。

保存形式の例:

```json
{
    "entries": [
        {
            "name": "Example Time Block",
            "startTime": "2024-03-17T06:32:36.118Z",
            "endTime": "2024-03-17T06:32:37.012Z",
            "subEntries": null
        }
    ]
}
```

## 📝 エクスポート形式

以下は、タイムキープデータをエクスポートできる各形式です:

### Markdownテーブル

| Block              | Start time        | End time          | Duration |
| ------------------ | ----------------- | ----------------- | -------- |
| Example Time Block | 24-03-17 19:32:36 | 24-03-17 19:32:37 | 0s       |
| **Total**          |                   |                   | **0s**   |

```md
| Block              | Start time        | End time          | Duration |
| ------------------ | ----------------- | ----------------- | -------- |
| Example Time Block | 24-03-17 19:32:36 | 24-03-17 19:32:37 | 0s       |
| **Total**          |                   |                   | **0s**   |
```

### CSV

```csv
Block,Start time,End time,Duration
Example Time Block,24-03-17 19:32:36,24-03-17 19:32:37,0s
```

> [!NOTE]
> プラグイン設定で、列名を含む最初の行をCSVから省略するかどうかを選択できます。

### JSON

JSONエクスポートは、timekeep内に保存されているJSONをそのままコピーします:

```json
{"entries":[{"name":"Example Time Block","startTime":"2024-03-17T06:32:36.118Z","endTime":"2024-03-17T06:32:37.012Z","subEntries":null}]}
```

### 生成PDF

以下はTimekeepで生成されたPDFの例です。これらのPDFはpdfmakeを使用してローカルで生成されます。

![生成PDF](images/pdf.png)

## 🔣 テンプレートとの併用

テンプレートプラグインを通じてタイムキープを作成したい場合は、タイムキープのJSONを直接使用することができます。

よく使うエントリ名がある場合は、`startTime` と `endTime` の両方に `null` を指定してテンプレートに定義しておけます:

```json
{"entries":[{"name":"Example Time Block","startTime":null,"endTime":null,"subEntries":null}]}
```

これにより、未開始状態のエントリが作成されます。名前を入力せずに再生ボタンをクリックするだけで開始できます。

## 👀 ステータスバーアイコン

Timekeepは実行中のタイマーをObsidianのステータスバーに表示します。一目で状況を把握でき、ステータスバーから直接ファイルを開いたりタイマーを停止したりできます。

![ステータスバー](images/status_bar.png)

*ステータスバーアイコンはレジストリ設定とステータスバー設定の両方が有効な場合のみ利用できます。*

## 🦾 API

TimekeepはJavaScript APIを公開しており、[Dataview](https://blacksmithgu.github.io/obsidian-dataview/api/intro/) などの他のスクリプトから利用できます。

プラグインAPIへのアクセス方法:

```js
// タイムキーププラグインAPIを取得
const timekeepPlugin = this.app.plugins.plugins.timekeep.api;

// ファイルテキストからタイムキープを抽出
const timekeeps = timekeepPlugin.parser.extractTimekeepCodeblocks(text);
```

以下は、現在のファイル内のすべてのタイムキープの合計経過時間を表示するDataviewの例です:

````
```dataviewjs
// 現在開いているファイルを取得
const activeFile = this.app.workspace.getActiveFile();
if(!activeFile || !activeFile.name) return;

// ファイルを読み込む
const text = await this.app.vault.read(activeFile);

// タイムキーププラグインAPIを取得
const timekeepPlugin = this.app.plugins.plugins.timekeep.api;

// ファイルテキストからタイムキープを抽出
const timekeeps = timekeepPlugin.parser.extractTimekeepCodeblocks(text);

// 未終了エントリには現在時刻が必要
const currentTime = moment();

let totalRunningDuration = 0;

for (const timekeep of timekeeps) {
  totalRunningDuration += timekeepPlugin.queries.getTotalDuration(timekeep.entries, currentTime);
}

// 合計実行時間はミリ秒単位
dv.span(totalRunningDuration);
```
````

### タグ別の時間集計

`queries.getDurationByTag` を使って、ファイル内（またはVault全体）のすべてのタイムキープをタグ別に集計できます。親グループのタグはサブエントリに継承されるため、グループに設定したタグはその下のすべてのリーフエントリに自動的に反映されます。

````
```dataviewjs
const activeFile = this.app.workspace.getActiveFile();
if (!activeFile || !activeFile.name) return;

const text = await this.app.vault.read(activeFile);
const timekeepPlugin = this.app.plugins.plugins.timekeep.api;
const timekeeps = timekeepPlugin.parser.extractTimekeepCodeblocks(text);

const currentTime = moment();
const totals = {};

for (const timekeep of timekeeps) {
  const byTag = timekeepPlugin.queries.getDurationByTag(timekeep.entries, currentTime);
  for (const [tag, ms] of Object.entries(byTag)) {
    totals[tag] = (totals[tag] ?? 0) + ms;
  }
}

// タグなし時間を表示したくない場合は空文字列キーを削除
delete totals[""];

const rows = Object.entries(totals)
  .sort((a, b) => b[1] - a[1])
  .map(([tag, ms]) => [
    `#${tag}`,
    moment.duration(ms).format("h[h] m[m] s[s]", { trim: "both" }),
  ]);

dv.table(["Tag", "Duration"], rows);
```
````

Vault内の**すべての**タイムキープをタグ別に集計するには、`extractTimekeepCodeblocks` の代わりに `getTimekeepsWithinVault` を使用します。レジストリエントリには2種類の形式があります — 専用の `.timekeep` ファイル用の `.timekeep` と、Markdownファイル内のコードブロック用の `.timekeeps[]` — のでそれぞれを反復処理します:

````
```dataviewjs
const timekeepPlugin = this.app.plugins.plugins.timekeep.api;
const registryEntries = await timekeepPlugin.getTimekeepsWithinVault(this.app.vault);

const currentTime = moment();
const totals = {};

const addEntries = (entries) => {
  const byTag = timekeepPlugin.queries.getDurationByTag(entries, currentTime);
  for (const [tag, ms] of Object.entries(byTag)) {
    totals[tag] = (totals[tag] ?? 0) + ms;
  }
};

for (const entry of registryEntries) {
  if (entry.timekeep) {
    addEntries(entry.timekeep.entries);
  } else if (entry.timekeeps) {
    for (const tk of entry.timekeeps) {
      addEntries(tk.timekeep.entries);
    }
  }
}

delete totals[""];

const rows = Object.entries(totals)
  .sort((a, b) => b[1] - a[1])
  .map(([tag, ms]) => [`#${tag}`, moment.duration(ms).humanize()]);

dv.table(["Tag", "Duration"], rows);
```
````

## 既知の問題

### 変更時の描画のちらつき

リストが長くなると、変更時（追加・保存・削除・折りたたみ・展開）にTimekeepの描画がちらつく場合があります。これはObsidianのアプリ再レンダリング方法に起因する制限です。

コードブロックが変更されるとObsidianはアプリ全体を再作成します（タイムキープデータはコードブロックに保存されているため、変更のたびにこれが発生します。DOMが破棄されて完全な再レンダリングが行われます）。この問題により、変更時にローカルの状態もすべて失われます（折りたたみ状態をタイムキープに永続化しなければならない理由もここにあります）。

この問題は修正できないと考えていますが、修正方法をご存知の方はPRを歓迎します。

## 📄 ライセンス

このプロジェクトは [MITライセンス](./LICENSE.md) の下でライセンスされています。
