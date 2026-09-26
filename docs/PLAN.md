# Inertia.js Preact アダプタ 開発計画・進捗

Preact 向けの Inertia.js アダプタ `inertia-preact` を新規に開発する。

- 参考: 公式 React アダプタ https://github.com/inertiajs/inertia/tree/3.x/packages/react
  (Vue / Svelte アダプタも挙動の比較対象として参照する)
- 参照コミット: `1ca37df4b9bb42b207796cdabc8bf865782afa0c` (3.x、`v3.7.1` 相当)
- 依存する core: `@inertiajs/core` `^3.7.1` (npm 公開版)

## 基本方針

**Preact のアダプタとして自然な設計にする。React アダプタの API を再現することは目的にしない。**

React アダプタから参考にするのは、`@inertiajs/core` との連携方法 (ルーターの初期化、ページ差し替え、
ヘッド管理、レイアウト、フォーム送信やバリデーションの流れ)、挙動、エッジケースへの対処である。
API の形は Preact の仕組みに合わせて決め、Preact に存在しない React の API
(`forwardRef`、`useSyncExternalStore`、`flushSync`、`memo`、`startTransition`、`StrictMode` など) は再現しない。

具体的には次の点を守る。

1. **依存は `preact` と `@inertiajs/core` (+ core と同じユーティリティ) のみ。** `preact/compat` は使わない。
   Preact の `options` フックなど、アプリ全体に影響するグローバルな変更もしない。
2. **Preact の仕組みをそのまま使う。**
   - 描画完了を待つ必要がある箇所 (ページ差し替え) は、クラスコンポーネントの `setState` のコールバックを使う。
     このコールバックは更新がコミットされた後に呼ばれることが Preact の仕様で保証されている。
   - コンポーネントの命令的な操作 (`<Form>` の `submit()`、`<InfiniteScroll>` の `fetchNext()` など) は、
     クラスコンポーネントのインスタンスを `ref` で受け取る形で提供する。Preact 10 / 11 のどちらでも
     `ref` がインスタンスを指すのは標準の挙動で、`forwardRef` のような仕組みが要らない。
   - DOM イベントはネイティブイベントのまま扱う (`onInput`、`event.submitter` 等)。属性は `class` / `for` を使う。
3. **状態はフレームワーク非依存のストアに寄せる。** `useForm` / `useHttp` / `<Form>` の状態と操作は
   素の TypeScript のストアクラスに実装し、フックやクラスコンポーネントはそれを購読するだけにする。
   メソッドの参照が常に安定し、古いクロージャを掴む問題が起きない。ストアは単体テストもしやすい。
4. **小さく保つ。** Preact を選ぶ理由の一つはサイズなので、不要な抽象や重複を持ち込まない。
   ビルド後のサイズ (gzip) を計測して記録する。
5. **Preact Signals には依存しない。** Signals は Preact の代表的な状態管理だが、別パッケージであり、
   アダプタが依存すると利用者に特定の状態管理を強制することになる。フックで実装し、Signals の有無に関係なく使えるようにする。

## 品質の根拠

1. **公式 E2E スイート**: Inertia 公式リポジトリの Playwright テスト (約 18,000 行) を、Preact で書いた test-app に対して実行する。
   テストは DOM とネットワークの挙動を検証しているので、ページを Preact の API で書いても挙動の仕様として使える。
   React 固有の API を前提にしたページは、同じ挙動を Preact の API で書き直す。書き直せないテストはスキップし、理由を記録する。
2. **単体テスト**: フレームワーク非依存のストアや `<Head>` のシリアライズ処理など、ロジックの中心部分を vitest で検証する。
3. **型**: `strict` な TypeScript。test-app の型テスト用ページも型チェックを通す。
4. **SSR**: `preact-render-to-string` による SSR と、公式 SSR E2E スイート。`@inertiajs/vite` 用の framework 設定も提供する。

## リポジトリ構成

```
packages/preact/   アダプタ本体 (npm パッケージ inertia-preact)
test-app/          E2E 用のページ群 (Preact で記述)
scripts/e2e.mjs    公式リポジトリを固定コミットで e2e/ に取得し、test-app とアダプタを組み込んで Playwright を実行する
docs/PLAN.md       本ドキュメント
```

## フェーズと進捗

凡例: ✅ 完了 / 🚧 作業中 / ⬜ 未着手

| # | フェーズ | 状態 |
| --- | --- | --- |
| 0 | リポジトリ初期化・計画 | ✅ |
| 1 | アダプタ基盤: `createInertiaApp`・`App`・ページ/レイアウト・`usePage`・`Head`・`Link`・SSR エントリ | ✅ |
| 2 | フォーム: ストア・`useForm`・`<Form>`・Precognition・`useHttp`・`useRemember` | ✅ |
| 3 | その他の機能: `Deferred`・`WhenVisible`・`WhenMounted`・`InfiniteScroll`・`usePoll`・`usePrefetch` | ✅ |
| 4 | test-app (Preact) と E2E ハーネス | ✅ |
| 5 | 公式 E2E スイート (Chromium) の全件実行と修正 | ✅ |
| 6 | SSR (公式 SSR E2E) と Vite プラグイン用設定 | ✅ |
| 7 | 単体テスト | ✅ |
| 8 | 追加検証 (axios クライアント、preact/debug、Preact 11 / 最小対応バージョン、preact/compat 併用) | ✅ |
| 9 | README・API ドキュメント・CI | ⬜ |

## 進捗ログ

### フェーズ 0

- 一度 React アダプタの API を再現する方針で着手したが、「参考にする」ことと「同じ API にする」ことは別であり、
  React の API を Preact 上に再現する必要はなかった。その成果物と履歴はすべて破棄し、上記の方針でやり直している。

### フェーズ 1: アダプタ基盤

- `App` はクラスコンポーネント。ページ差し替えは `setState` のコールバック (コミット後に呼ばれる) で完了を通知する。
  - ルーターはシングルトンなので、マウント中の `App` を指すモジュール変数経由で差し替えを依頼する。
    マウント前に届いた差し替え (履歴からの復元など) と `router.flash()` はキューに入れ、マウント時に処理する。
  - アンマウント時は待機中の差し替えを解放し、ルーターが待ち続けないようにする。
  - ページの `key` は単調増加のカウンタ (`preserveState` でない遷移ごとに増やし、ページを再マウントさせる)。
  - ルーターの初期化はクライアントでのみ行う (SSR では不要)。
  - ハイドレーション中はレイアウト props を適用しない (サーバーの出力と一致させる)。マウント後に適用する。
- コンテキストは、遷移ごとに変わる `PageContext` と、アプリ生成後は変わらない `AppContext` (ヘッドマネージャー・ハイドレーション状態) に分けた。
- `config` は core の `config` をそのまま公開する (React アダプタの `config.extend()` は同じインスタンスを返すだけで、Preact 固有の設定もないため)。
- `createInertiaApp`: クライアント / サーバー / 両用 (Vite の SSR 変換用に描画関数を返す) の 3 形態。
  サーバーでは `setup` を省略でき、その場合は `App` をそのまま (または `withApp` で包んで) 描画する。
- `<Head>`: 子要素を core のヘッドマネージャー向けの HTML 文字列にするシリアライザを `renderHead.ts` に実装。
  - 既存アダプタとの互換: 属性値は `undefined` / `null` / 真偽値も文字列化、空文字は値なし属性、`head-key` を `data-inertia` に。
  - 改善点: テキストの子要素を HTML エスケープする (`script` / `style` 以外。DOM の直列化と同じ規則)。
    既存アダプタはエスケープしないため `<title>{ユーザー入力}</title>` が HTML として解釈されうる。
    フラグメントの展開、配列・数値の子要素、`className` / `htmlFor` / `httpEquiv` の属性名変換にも対応。
  - 更新は内容 (HTML 文字列) かページが変わったときだけ行う (既存アダプタは再描画のたびに更新していた)。
- `<Link>`: 関数コンポーネント。`ref` は受け付けない (Preact 10 では関数コンポーネントに `ref` が渡らないため)。
  Preact 11 では `ref` が props として渡るので、そのまま要素に展開される。
- 単体テスト (vitest): ヘッドのシリアライズ 9 件、SSR (レイアウト各形式・タイトルコールバック・Vite 用描画関数) 5 件。

### フェーズ 2: フォーム

- `FormStore` (`src/formStore.ts`): Preact に依存しないフォームの状態クラス。`useForm` / `useHttp` / `<Form>` の共通基盤。
  - 状態は不変更新 (変更のたびに新しい `data` / `errors`)。スナップショットは変更があったときだけ作り直すので、
    子コンポーネントのメモ化も効く。メソッドはストアの生存期間中同一参照 (古いクロージャ問題が起きない)。
  - 購読者への通知はマイクロタスクで 1 tick に 1 回にまとめる。
  - `rememberKey` の履歴状態への保存は購読中 (マウント中) のみ行う。送信完了がページ遷移後になっても、
    遷移先ページの履歴状態に書き込まない。
  - Precognition のバリデータはストアごとに 1 つ。
- `InertiaFormStore` (`useForm`) はルーター経由の visit、`HttpFormStore` (`useHttp`) は core の HTTP クライアントで送信する。
- `useStore`: ストアをコンポーネントごとに 1 回生成して購読するフック (描画から購読までの間の変更も取りこぼさない)。
- `<Form>` はクラスコンポーネント。インスタンスが core の `FormComponentRef` を実装しているので、
  `ref` でそのまま `submit()` / `reset()` 等を呼べる。状態と操作は children 関数・`useFormContext()` にも渡す。
  - dirty 判定はイベント時に同期的に計算 (React 版は `startTransition` で遅延させていたが、Preact の描画は元々バッチされる)。
- `setData(object)` は現在のデータへのマージ (型の `Partial<TForm>` と一致。Vue / Svelte アダプタと同じ。React 版は置き換えだった)。
- `useRemember(initialState, key)`: `useState` と同じ形。初期値に関数も渡せる。
- 単体テスト: フォームストア 15 件、`useHttp` ストア 8 件を追加 (計 37 件)。

### フェーズ 3: その他の機能

- `<InfiniteScroll>` はクラスコンポーネント。インスタンスが core の `InfiniteScrollRef` (`fetchNext()` 等) を実装する。
  - core の `useInfiniteScroll` のインスタンスはマウント時 (ブラウザのみ) に生成する。core はルーターのイベントリスナーを
    登録するため、アンマウントのない SSR で生成するとリークする。SSR では初期状態をページの `scrollProps` から作る。
  - トリガー要素が変わったとき (カスタム要素の差し替え等) と `data` が変わったときに作り直す。
  - マウント時の自動読み込みの有効・無効は、履歴から復元されたリクエスト数で判定する (state の反映を待たない)。
  - 並び替え (`reverse`) に備えて、描画する 3 要素に key を付けた。
- `<Deferred>` / `<WhenVisible>` / `<WhenMounted>` / `usePoll` / `usePrefetch` はフック。
  - `usePoll`: リクエストオプションは毎回最新の値を使う (React 版はオブジェクトを渡すとマウント時の値に固定されていた)。
  - `<WhenMounted>`: `AppContext` のハイドレーション状態を見て、SSR とハイドレーション中だけフォールバックを出す。
- ビルドサイズ: `dist/index.js` 62 KB (未圧縮・未 minify)、gzip 15 KB。

### フェーズ 4: test-app と E2E ハーネス

- test-app: 公式 React test-app (約 430 ファイル) を出発点に、Preact の書き方に変換した。
  - 機械的な変換: `react` → `preact` / `preact/hooks`、ネイティブ要素の `onChange` → `onInput`
    (React の `onChange` は input イベント相当のため)、`e.target.value` → `e.currentTarget.value`、
    `className` → `class`、`htmlFor` → `for`、React の型 (`React.MouseEvent` 等) → DOM / Preact の型。
  - `<select defaultValue>` は Preact にないため、既定の `<option>` に `selected` を付けた。
  - `memo()` を使うページは `shouldComponentUpdate` を持つクラスコンポーネントに書き換えた。
  - `flushSync` を使うページ (InfiniteScroll のマウント直後のアンマウント) は、レイアウトエフェクトで
    マウント直後の描画でアンマウントする形にした (Preact で可能な最短のサイクル)。
  - `<Form>` / `<InfiniteScroll>` の `ref` を使うページは、クラスコンポーネントのインスタンスを受け取る形でそのまま動く。
  - `preact/compat` のエイリアスは無効化 (`@preact/preset-vite` の `reactAliasesEnabled: false`)。
- `scripts/e2e.mjs`: 公式リポジトリを固定コミットで `e2e/inertia` に取得し、`packages/react` をアダプタと test-app で置き換える。
  - 取得先はドット始まりのディレクトリにしない (テストサーバーの Express が、パスにドットディレクトリを含む
    ファイルを配信しないため。`.e2e` では全アセットが 404 になった)。
  - テストサーバー (と SSR サーバー) はハーネスが起動・停止し、Playwright には既存サーバーを再利用させる。
    Playwright に pnpm 経由で起動させると、終了時にサーバーを止められず Playwright が終了しなかったため。
  - test-app のビルドもハーネスが行う (Playwright は既存サーバーを再利用するときビルドを省略するため)。
  - 適用対象外のテストは `NOT_APPLICABLE` に理由付きで列挙し、`--grep-invert` で除外する。

### フェーズ 5: 公式 E2E スイート (Chromium)

- 初回: 1,199 件成功、2 件失敗。
  - `<Head>` の遷移時の重複防止テスト: 戻る遷移で、一瞬 Inertia 管理の `<title>` が存在しない状態があった。
    旧ページの `<Head>` はアンマウント (コミット中) に登録解除されるが、新ページの登録は `useEffect` (描画後) だったため。
    `useLayoutEffect` に変更し、同じコミット内で入れ替わるようにした。
  - React の `StrictMode` のテスト: 対象外として除外 (下記)。
- フォームのイベント記録テストの不安定さ: テストページが `useEffect` で状態の変化を記録しており、Preact の
  エフェクトは次のフレームの後に実行されるため、テストが記録を読む時点に間に合わないことがあった。
  テストは「描画後のタスクで記録される」(React のエフェクトのタイミング) ことを前提にしているので、
  ページ側でレイアウトエフェクトから `setTimeout` で記録するようにした。アダプタの挙動の問題ではない。
- 最終結果: 全件を 3 回繰り返し実行して 3,597 件成功、失敗 0 (Chromium)。
  スキップ 72 件は、Vue / Svelte 専用テスト (1 回あたり 22 件) と下記の対象外 2 件の 3 回分。

### フェーズ 6: SSR

- 公式 SSR スイート (`SSR=true`、`tests/ssr.spec.ts`) を `node scripts/e2e.mjs --ssr` で実行。
  SSR サーバー 2 つ (`ssr.tsx` による手動構成と、`@inertiajs/vite` の SSR 変換による自動構成) もハーネスが起動する。
- 結果: 25 件成功、スキップ 2 件 (Svelte の async コンパイラ専用)。5 回繰り返しても失敗 0 (125 件成功)。
  - ハイドレーション (レイアウト props・レイアウトコールバック・`WhenMounted`)、`<Head>` のタイトルのエスケープ、
    サーバー提供のヘッド要素、`withApp`、Vite の SSR 自動変換 (`inertia-preact/vite` の framework 設定) を含む。

### フェーズ 7: 単体テスト

- vitest で計 47 件。E2E では観察しにくいロジックと、Preact 固有の設計判断を固定する目的。
  - `renderHead` (9): 属性の直列化・エスケープ・`head-key`・フラグメント・コンポーネントの除外など。
  - SSR (5): レイアウトの各形式、タイトルコールバック、Vite 用の描画関数モード。
  - フォームストア (15) / `useHttp` ストア (8): データ・エラー・デフォルト・送信ライフサイクル・楽観的更新・キャンセル。
  - コンポーネント (10、happy-dom): `<Form>` の `ref` がインスタンスであること、dirty 判定とリセット、
    children 関数と `useFormContext()`、`useForm()` のスナップショットの同一性、`<WhenMounted>` の SSR /
    ハイドレーション / 通常描画、`<Link>` の要素選択と URL へのデータ結合。

### フェーズ 8: 追加検証

ハーネスにオプションを追加し、公式スイート全体を条件を変えて実行した (いずれも Chromium)。

| 条件 | 結果 |
| --- | --- |
| 通常 (Preact 10.29.8) | 1,199 件成功 / 失敗 0 (SSR 25 件成功) |
| `PREACT_VERSION=11.0.0-rc.2` | 1,199 件成功 / 失敗 0 (SSR 25 件成功) ※下記の修正後 |
| `PREACT_VERSION=10.27.2` (peerDependencies の下限) | 1,199 件成功 / 失敗 0 (SSR 25 件成功) |
| `--debug` (preact/debug を有効化) | アダプタに起因する警告・エラー 0 件 (報告は core が意図的に出すエラー 1 種のみ) |
| `VITE_HTTP_CLIENT=axios` | 1,197 件成功、Precognition の自動キャンセルのテスト 2 件が不安定 (下記) |
| `VITE_PREACT_COMPAT=true` (preact/compat を読み込んだアプリ) | 1,197 件成功、`<Head>` の 1 件は compat による既知の差異 (下記)、1 件は不安定なテスト (下記) |

- **Preact 11 対応の修正**: Preact 11 (RC) は `ref` をクラスコンポーネントにも通常の props として渡し、インスタンスを
  指さなくなった。`<Form>` / `<InfiniteScroll>` の `ref` テスト 17 件が失敗したため、コンポーネント自身が
  `props.ref` を自分のインスタンスに向けるようにした (`src/ref.ts` の `InstanceRef`。コールバック ref の
  クリーンアップ関数にも対応)。Preact 10 では `ref` は props に来ない (Preact がインスタンスに向ける) ので何もしない。
- **preact/debug**: test-app をビルド時に切り替えられるようにし (`test-app/tools`、仮想モジュール `virtual:test-tools`)、
  Chromium のログ出力 (`--enable-logging`) からマーカー付きのメッセージを集計する。ネットワークを使わないので
  リクエスト数を数えるテストに影響しない。
- **テストページの修正**: `Dump` / `Visits/PartialReloads` がテスト用のデータを `useEffect` で公開していたため、
  URL の変更直後に読むテストが負荷の高い状況で失敗した。core は URL を先に更新してからページを差し替える。
  React は `flushSync` で描画したときエフェクトも同期的に実行するので間に合うが、Preact のエフェクトは次の描画後に
  実行される。Preact で同等のタイミングになる `useLayoutEffect` にした。

## スキップ・既知の差異

### E2E で対象外として除外しているテスト

| テスト | 理由 |
| --- | --- |
| `createInertiaApp it wraps the app in StrictMode when enabled` | React の `<StrictMode>` の機能。Preact には存在せず、`strictMode` オプションも提供しない |
| `createInertiaApp it does not wrap the app in StrictMode by default` | 同上 |

### React アダプタとの API の違い

| 項目 | Preact アダプタ | 理由 |
| --- | --- | --- |
| `<Form>` / `<InfiniteScroll>` の `ref` | クラスコンポーネントのインスタンスを受け取る (API は同じ `FormComponentRef` / `InfiniteScrollRef`) | Preact でコンポーネントの命令的 API を公開する標準の方法 |
| `<Link>` の `ref` | 受け付けない (Preact 11 では props として要素に渡る) | Preact 10 は関数コンポーネントに `ref` を渡さない |
| `strictMode` オプション | なし | Preact に StrictMode がない |
| `setData(object)` | 現在のデータにマージ | 型 (`Partial<TForm>`) と一致させた。Vue / Svelte と同じ |
| `ResolvedComponent` / `InertiaFormProps` 型 | `PageComponent` / `InertiaForm` | 名前を内容に合わせた |
| `<Head>` のテキスト子要素 | HTML エスケープする (`script` / `style` を除く) | `<title>{入力値}</title>` を安全にするため |
| `useRemember` | 初期値に関数も渡せる | `useState` と同じ形にした |

### 不安定なテスト (公式 React アダプタでも同じ頻度で失敗することを確認済み)

| テスト | 状況 | React アダプタでの結果 |
| --- | --- | --- |
| `precognition` の「automatically cancels previous validation when new validation starts」(2 件) | axios クライアントでのみ、20 回中 8 回失敗 | 同条件で 20 回中 10 回失敗 |
| `poll` の「it cancels in-flight requests on each tick with mode: cancel」 | 2 秒の時間枠で数えるため、40 回中 1 回程度失敗 | 同条件で 40 回中 1 回失敗 |

### 環境の負荷に敏感なテスト

- `form-component` の「invalidate prefetch cache using tags」、`prefetch` の「can use useForm with invalidate option」:
  CPU 負荷が非常に高いとき (load average 約 20) に失敗することがある。
  原因: 戻る遷移で、静止しているマウスポインタの下にリンクが再描画されると、Chrome はネイティブの `mouseenter` を
  発火する。次のクリックまでにホバー判定の遅延 (75ms) を超えると、ホバーによるプリフェッチが走り、テストが数える
  リクエストが 1 件増える。React は enter/leave を `mouseover` / `mouseout` から合成するため、この場合に発火しない。
  ポインタがリンク上にあるときにプリフェッチするのは本来の意図どおりの動作で、Vue / Svelte アダプタもネイティブ
  イベントを使う。通常の負荷では全件成功している。

### preact/compat を併用した場合の差異

- `<Head>` の要素に `content={null}` のような値を渡すと、compat が `null` の DOM 属性を `undefined` に変換するため、
  `content="undefined"` になる (compat なしでは `"null"`)。どちらも文字列以外を渡す後方互換のための挙動で、
  アダプタが compat 適用前の値を知る方法はない。
