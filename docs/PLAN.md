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
scripts/e2e.mjs    公式リポジトリを固定コミットで取得し、test-app とアダプタを組み込んで Playwright を実行する
docs/PLAN.md       本ドキュメント
```

## フェーズと進捗

凡例: ✅ 完了 / 🚧 作業中 / ⬜ 未着手

| # | フェーズ | 状態 |
| --- | --- | --- |
| 0 | リポジトリ初期化・計画 | 🚧 |
| 1 | アダプタ基盤: `createInertiaApp`・`App`・ページ/レイアウト・`usePage`・`Head`・`Link`・SSR エントリ | ⬜ |
| 2 | フォーム: ストア・`useForm`・`<Form>`・Precognition・`useHttp`・`useRemember` | ⬜ |
| 3 | その他の機能: `Deferred`・`WhenVisible`・`WhenMounted`・`InfiniteScroll`・`usePoll`・`usePrefetch` | ⬜ |
| 4 | test-app (Preact) と E2E ハーネス | ⬜ |
| 5 | 公式 E2E スイート (Chromium) の全件実行と修正 | ⬜ |
| 6 | SSR (公式 SSR E2E) と Vite プラグイン用設定 | ⬜ |
| 7 | 単体テスト | ⬜ |
| 8 | 追加検証 (axios クライアント、他ブラウザ、Preact 11) | ⬜ |
| 9 | README・API ドキュメント・CI | ⬜ |

## 進捗ログ

### フェーズ 0

- 一度 React アダプタの API を再現する方針で着手したが、「参考にする」ことと「同じ API にする」ことは別であり、
  React の API を Preact 上に再現する必要はなかった。その成果物と履歴はすべて破棄し、上記の方針でやり直している。

## スキップ・既知の差異

(E2E 実行後に記載)
