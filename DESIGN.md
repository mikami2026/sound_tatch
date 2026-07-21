# 音あてゲーム 設計書

## 1. 概要

「ド」の基準音を鳴らした後に問題の音（ドレミファソラシド、設定により黒鍵＝半音も含む）
を鳴らし、1秒間のあいだプレイヤーが心の中で音名を推測し、1秒後に正解を自動表示する
聴音（音感）トレーニングアプリ。

- クリック等の入力操作は不要（推測 → 自動で答え合わせ）
- スコア機能なし。「出題 → 回答表示」のシンプルな繰り返し
- 「スタート」を押した後は「つぎへ」等の操作なしで自動的に次の問題へ進み続ける
  （止めたい時だけ「とめる」を押す）
- 視覚的なわかりやすさを重視（鍵盤ハイライト、カウントダウン演出、正解表示）

## 2. 技術スタック

| 項目 | 選定 |
|---|---|
| フレームワーク | React + TypeScript |
| ビルドツール | Vite |
| 音声生成 | Web Audio API（`OscillatorNode` によるプログラム合成） |
| スタイリング | 素のCSS（CSS Modules） |
| 状態管理 | React `useState`/`useReducer`（外部ライブラリ不要の規模） |

音源ファイルは使わず、オシレーターで周波数を直接生成する。
理由：追加アセット不要で軽量、音域・音色の拡張が容易。

## 3. 出題範囲・音声設計

### 3.0 難易度設定

「同時に複数音を鳴らして聞き取る」「基準音なし・楽器変更で難易度を上げる」を実現するため、
以下を `GameSettings` として独立したパラメータにする
（フェーズ遷移ロジックや鍵盤UIはこの設定値を見て振る舞いを変えるだけ）。

```ts
type InstrumentId = 'triangle' | 'piano' | 'organ'; // 音色（拡張可能なレジストリ）

interface GameSettings {
  referenceEnabled: boolean;            // 基準音「ド」を鳴らすか（false＝絶対音感モード）
  includeBlackKeys: boolean;            // 黒鍵（半音）も出題範囲に含めるか
  noteCount: 1 | 2 | 3 | 'random';      // 同時に鳴らす問題音の数（'random'は毎ラウンド抽選）
  instrument: InstrumentId | 'random';  // 音色プリセット（'random'は毎ラウンド抽選）
}
```

- `noteCount`は1〜3に限定する。白鍵だけで8音、黒鍵を含めても13音しかない音階で
  4音以上を同時に鳴らすとほぼ音のかたまり（クラスター）になり聞き分け不能になるため、
  「1音＝単音」「2音＝音程（インターバル）」「3音＝三和音（トライアド）」という
  聴音トレーニングとして意味のある区切りにとどめる。
- `noteCount`・`instrument`に`'random'`を選ぶと、**ラウンド開始時に1回だけ**実際の値
  （1〜3のいずれか／登録楽器のいずれか）を抽選する。ラウンドの途中（基準音→問題音）で
  値が変わると比較にならないため、`startRound`内で最初に解決した値を最後まで使い回す。
- `referenceEnabled`・`includeBlackKeys`・`noteCount`・`instrument`はすべて
  `SettingsPanel`から変更可能。
- `SettingsPanel`はゲーム実行中（`phase !== 'idle'`）は無効化し、ラウンドの途中で
  設定が変わってしまわないようにする。

### 3.1 音階と周波数

1オクターブ・半音階（C4〜C5、平均律 A4=440Hz基準）。周波数は
`C4 = 440 / 2^(9/12)` を起点に、半音ごとに `2^(1/12)` を掛けて算出する
（`notes.ts`でハードコードせずプログラム的に生成し、転記ミスや将来のオクターブ拡張に強くする）。

「ド（C4）」は常に基準音として使用する。出題音は `includeBlackKeys` の設定に応じて
以下いずれかのプールからランダムに選ぶ（基準音と同じ「ド」が出題される場合もあり）。

- `includeBlackKeys: false`（既定）→ 白鍵8音（`WHITE_NOTE_ORDER`）
- `includeBlackKeys: true` → 白鍵＋黒鍵の13音（`NOTE_ORDER`）

| 音名 | 種別 | 周波数(Hz) |
|---|---|---|
| ド (C4) | 白鍵 | 261.63 |
| ド♯ (C#4) | 黒鍵 | 277.18 |
| レ (D4) | 白鍵 | 293.66 |
| レ♯ (D#4) | 黒鍵 | 311.13 |
| ミ (E4) | 白鍵 | 329.63 |
| ファ (F4) | 白鍵 | 349.23 |
| ファ♯ (F#4) | 黒鍵 | 369.99 |
| ソ (G4) | 白鍵 | 392.00 |
| ソ♯ (G#4) | 黒鍵 | 415.30 |
| ラ (A4) | 白鍵 | 440.00 |
| ラ♯ (A#4) | 黒鍵 | 466.16 |
| シ (B4) | 白鍵 | 493.88 |
| ド (C5) | 白鍵 | 523.25 |

ミ→ファ、シ→ド の間には黒鍵が存在しない（実際の鍵盤配列と同じ）。

### 3.2 音色・エンベロープ

- 波形: `triangle`（サイン波より耳に残りやすく、聴音練習向き）
- エンベロープ: Attack 10ms → Sustain → Release 150ms（`GainNode`で急な立ち上がり/停止によるプチノイズを防止）
- 発音時間: 1音あたり 900ms

### 3.3 再生シーケンス（タイムライン）

```
[基準音「ド」再生] --900ms--> [無音 300ms] --> [問題音 再生] --900ms-->
   [1秒カウントダウン(視覚のみ・無音)] --1000ms--> [正解表示] --2000ms--> （次のラウンドへ自動で戻る）
```

`referenceEnabled: false` の場合は ①②を丸ごとスキップし、③QUESTIONから開始する
（フェーズ配列を可変にしておき、`['reference','gap','question','countdown','reveal']` から
 `['question','countdown','reveal']` へ設定に応じて切り替えるだけで対応できる設計とする）。

| フェーズ | 内容 | 時間 |
|---|---|---|
| ① REFERENCE | 「ド」を再生。画面に「基準音：ド」と表示（`referenceEnabled:false`ならスキップ） | 900ms |
| ② GAP | 無音の間（余韻）（同上） | 300ms |
| ③ QUESTION | 問題音（`noteCount`個、同時再生）を再生。鍵盤には一切ヒントを出さない | 900ms |
| ④ COUNTDOWN | 音は鳴らさず、ステータステキスト「考えてください…」のみ表示（数字表示なし）。鍵盤は引き続きヒントなし | 1000ms |
| ⑤ REVEAL | 正解の音名（複数の場合は音高順）を表示し、鍵盤に音名ラベルを表示 | 2000ms（表示後は入力不要） |

REVEALの表示時間（2000ms）が経過すると、ユーザー操作なしで自動的に①へ戻り、新しい問題
（`noteCount`個の重複なしランダム音の組）を生成して出題し続ける。プレイヤーが止めたい場合のみ
「とめる」ボタンを押す（このときタイマーを全て破棄し`idle`状態に戻る）。

### 3.4 複数音同時出題（2音・3音）の音生成ロジック

- 出題音は選択中のプール（白鍵8音、または黒鍵を含む13音）から重複なしで
  `noteCount`個をランダム抽出する。
- `soundEngine.playNotes(notes: NoteName[], instrument: InstrumentId, durationMs)` が
  各音について個別のOscillatorNodeを生成し、**同一の`startTime`**で`start()`することで同時再生する
  （各Oscillatorは共有の`AudioContext`上で独立したGainNode/エンベロープを持つ）。
- 音量は同時発音数が増えるほど1音あたりのgain予算を下げ、クリップ（音割れ）を防ぐ
  （`noteBudget = 0.8 / noteCount`）。さらに倍音を持つ楽器では、基音のgainを
  `noteBudget / (1 + Σ倍音gain)` として、基音＋全倍音の合計が`noteBudget`を
  超えないように正規化する（倍音を足しただけ音量が積み上がってクリップしないため）。

### 3.5 楽器（音色）の切り替え

音色をハードコードせず、`instruments.ts` にプリセットのレジストリを持つ。楽器ごとに
「オシレーターで合成する（synth）」か「録音済みサンプル音源を再生する（sample）」かが
異なるため、`InstrumentDef`はdiscriminated unionにしている。

```ts
interface EnvelopeDef {
  attackMs: number;
  decayMs: number;
  sustainLevel: number; // 0..1: ピーク音量に対する、減衰後に持続する音量の割合
  releaseMs: number;
}

interface HarmonicDef {
  ratio: number;
  gain: number;
  decayMultiplier?: number; // その倍音だけdecayMsを短縮/延長する倍率（既定1）
}

interface SampleDef {
  note: NoteName; // この録音がどの音高かを示す。他の音はここからの半音差でピッチシフトする
  url: string;
}

// waveform: OscillatorTypeによるプログラム合成の楽器
interface SynthInstrumentDef {
  id: InstrumentId;
  label: string;
  kind: 'synth';
  waveform: OscillatorType;
  envelope: EnvelopeDef;
  harmonics?: HarmonicDef[];
}

// 実際に録音されたサンプル音源を再生する楽器
interface SampledInstrumentDef {
  id: InstrumentId;
  label: string;
  kind: 'sample';
  samples: SampleDef[];
  attackMs: number;
  releaseMs: number;
}

type InstrumentDef = SynthInstrumentDef | SampledInstrumentDef;
```

**synth楽器**（`triangle`＝基本、`organ`＝オルガン風）はこれまで通りオシレーター加算合成。

- `triangle`: `envelope = { attackMs:10, decayMs:0, sustainLevel:1, releaseMs:150 }`、
  倍音なし。減衰せず一定音量を保つシンプルな単音。
- `organ`: `sustainLevel:1`（オルガンは鍵盤を押している間、音量が一定に持続し減衰しない
  楽器のため）。2倍音・4倍音を足して「リード感」を出す。

**sample楽器**（`piano`＝ピアノ風）は、ユーザーから「ピアノをもっと似せてほしい」との
要望を受け、倍音の足し引きによる近似ではなく**実際に録音されたピアノの音**を使う方式に
切り替えた。

- 音源: [Salamander Grand Piano](https://archive.org/details/SalamanderGrandPianoV3)
  （Alexander Holm制作、**CC BY 3.0**）を、Tone.jsが配布用に再エンコードした
  `github.com/Tonejs/audio` から取得。ライセンス上、由来の明記が必要
  （`instruments.ts`のコメントとこのDESIGN.mdに記載）。
- C4〜C5の1オクターブに対し、5つの録音（`C4`, `D#4`, `F#4`, `A4`, `C5`）のみを
  `public/samples/piano/`に配置。残りの8音は**再生速度（`playbackRate`）を
  半音差に応じて`2^(semitone/12)`倍する**ことでピッチシフトして代用する
  （`sampleEngine.ts`の`nearestSample`が音名ごとに一番近い録音を選ぶ）。
  全13音を録音するのではなく少数のサンプルからピッチシフトで賄うことで、
  ダウンロード容量（実測: 5ファイル合計 約350KB）を抑えている。
- 読み込み: `fetch` + `AudioContext.decodeAudioData`でmp3を`AudioBuffer`にデコードし、
  `instrumentId`ごとにモジュールスコープのPromiseとしてキャッシュする
  （`sampleEngine.ts`の`loadBuffers`。一度読み込めば再取得しない）。
  ページ表示直後（`App.tsx`の初回`useEffect`）に`preloadAllSamples()`を呼び、
  「スタート」を押す前から裏で読み込みを始めておくことで、実際の再生時には
  ほぼ即座にキャッシュ済みバッファを使える設計にしている。
- 再生: `AudioBufferSourceNode`に`playbackRate`を設定し、`GainNode`で
  アタック（5ms）と、発音時間終了時のリリース（300ms）だけを制御する。
  録音そのものに自然な減衰が含まれているため、synth楽器のような`decayMs`/
  `sustainLevel`の作り込みは不要。

いずれの方式でも呼び出し側（`playNotes`・フェーズ制御・UI）からは同じ
`playNotes(notes, instrumentId, durationMs)`シグネチャで呼べる。`soundEngine.playNotes`が
`instrument.kind`を見てsynth/sample双方の再生ロジックに振り分ける。

## 4. 状態遷移設計

```
        [「スタート」押下]
               │
               ▼
        ┌─────────────┐
        │ REFERENCE   │  「ド」再生
        └──────┬──────┘
               │ 900ms後
               ▼
        ┌─────────────┐
        │ GAP         │  無音
        └──────┬──────┘
               │ 300ms後
               ▼
        ┌─────────────┐
        │ QUESTION    │  問題音再生（音名は非表示）
        └──────┬──────┘
               │ 900ms後
               ▼
        ┌─────────────┐
        │ COUNTDOWN   │  1秒間の視覚カウントダウン
        └──────┬──────┘
               │ 1000ms後
               ▼
        ┌─────────────┐
        │ REVEAL      │  正解表示
        └──────┬──────┘
               │ 2000ms後（自動）
               └──────────────┐
                               ▼
                        （REFERENCEへ自動で戻る。ループし続ける）
```

どのフェーズにいても「とめる」ボタンを押すと即座に`idle`へ遷移し、ループを止められる。

state は `'idle' | 'reference' | 'gap' | 'question' | 'countdown' | 'reveal'` の
Union型で管理し、`setTimeout`の連鎖（もしくは`useEffect`＋タイマー）で遷移させる。
実際に辿るフェーズの並びは `GameSettings.referenceEnabled` に応じて
`buildPhaseSequence(settings)` のような関数で生成し、REFERENCE/GAPの有無を切り替える
（ハードコードした固定シーケンスにしない）。

## 5. UI設計（画面構成）

視覚的わかりやすさを重視し、以下の要素を1画面に集約する。

```
┌─────────────────────────────────────────┐
│               音あてゲーム                 │
│                                           │
│         ステータス表示エリア               │
│   「基準音：ド」/「問題音を再生中…」/       │
│   「考えてください…」/「正解：ソ」          │
│                                           │
│   ┌─┬─┬─┬─┬─┬─┬─┬─┐                    │
│   │ド│レ│ミ│ファ│ソ│ラ│シ│ド│  ← 鍵盤UI      │
│   └─┴─┴─┴─┴─┴─┴─┴─┘                    │
│    (基準音再生中・正解表示中のみ鍵盤が発光)   │
│                                           │
│           [ スタート / とめる ]            │
└─────────────────────────────────────────┘
```

「スタート」を押すとループが始まり、「とめる」に表示が変わる。押すと即座に停止して
`idle`に戻り、再度「スタート」で新しいループを開始できる。

### 5.1 鍵盤コンポーネント（視覚の中心）

- 白鍵8つを横並びで常時表示し、`includeBlackKeys`が有効なときは黒鍵5つを
  白鍵の間（境界の直上）に絶対配置で重ねる、実物のピアノに近いレイアウト。
  黒鍵は白鍵より幅・高さを小さくし、暗色の見た目で視覚的に区別する。
- `includeBlackKeys`が無効なときは黒鍵自体を描画しない（出題されない音を
  鍵盤上に表示しても紛らわしいだけのため）。
- REFERENCEフェーズ：「ド」の鍵盤が黄色く光り、ラベル「ド」を表示（`referenceEnabled:false`時はスキップ）。
- QUESTIONフェーズ：**鍵盤には一切ヒントを出さない**（全鍵盤とも通常表示のまま）。
  出題された鍵盤だけを光らせると、その位置だけで答えが分かってしまうため
  （音を聞き分けさせる練習にならない）。音は鳴らすが、視覚的な手がかりはゼロにする。
- COUNTDOWNフェーズ：QUESTIONと同様に鍵盤はヒントなし。数字やリングによる
  視覚的なカウントダウン表示は行わず、ステータステキスト「考えてください…」のみで
  「考え中」であることを伝える（1秒間だけの短い間なので、数字表示は不要と判断）。
- REVEALフェーズ：正解の鍵盤（複数可）が緑に光り、それぞれラベルに音名を表示。
  複数音の場合はステータステキストにも音高順で列挙（例:「正解：ミ・ソ・シ」）。
  不正解演出はなし（自己採点のため）。

`Keyboard`コンポーネントは常に「アクティブな鍵盤の配列」を受け取る設計にし
（`{ note: NoteName; color: 'yellow' | 'green' }[]`、QUESTIONフェーズは空配列を渡す）、
1音でも複数音でも同じpropsの形で扱えるようにする（noteCountが増えても`Keyboard`自体の変更は不要）。

### 5.2 ステータステキスト

フェーズごとに大きな文字でガイドを表示し、今何が起きているか常に言語化する
（音が聞き取れなくても状況を追えるように）。

### 5.3 配色・アニメーション方針

- 基準音＝黄色、正解＝緑、と色の意味を固定し一貫させる。問題音には色を割り当てない
  （鍵盤の色そのものが答えのヒントになってしまうため、QUESTION/COUNTDOWN中は
  全鍵盤を同じ見た目のままにする）。
- 基準音再生中は該当鍵盤に `scale(1.05)` + box-shadow のパルスアニメーション。

## 6. コンポーネント構成

```
src/
 ├─ main.tsx
 ├─ App.tsx                 … ゲーム全体の状態管理・タイマー制御
 ├─ audio/
 │   ├─ notes.ts             … 音名⇔周波数の対応表（白鍵/黒鍵の並びも含む）
 │   ├─ instruments.ts       … 音色プリセットのレジストリ（synth/sample双方のInstrumentDef）
 │   ├─ sampleEngine.ts      … サンプル音源の読み込み・キャッシュ・ピッチシフト再生
 │   └─ soundEngine.ts       … Web Audio APIラッパー（playNotes関数。synth/sample振り分け）
 ├─ hooks/
 │   └─ useGameSequence.ts   … フェーズ遷移＆タイマーを管理するカスタムフック
 ├─ components/
 │   ├─ SettingsPanel.tsx    … 基準音オン/オフ・黒鍵オン/オフ・音数・音色の設定UI
 │   │                          （音数/音色は「ランダム」選択も可能）
 │   ├─ StatusText.tsx       … フェーズごとの案内テキスト
 │   ├─ Keyboard.tsx         … 白鍵8＋黒鍵5の鍵盤表示（発光状態をpropsで受け取る）
 │   ├─ Key.tsx              … 鍵盤1つ分（白鍵/黒鍵のvariant・色・ラベル・アニメーション）
 │   └─ NextButton.tsx       … スタート/とめるボタン（常時活性、ループのON/OFFを切り替え）
 └─ styles/
     └─ *.module.css
```

### 6.1 主要な型定義（イメージ）

```ts
type NoteName =
  | 'ド' | 'ド♯' | 'レ' | 'レ♯' | 'ミ' | 'ファ' | 'ファ♯'
  | 'ソ' | 'ソ♯' | 'ラ' | 'ラ♯' | 'シ' | 'ド2';
type Phase = 'reference' | 'gap' | 'question' | 'countdown' | 'reveal';
type InstrumentId = 'triangle' | 'piano' | 'organ';

interface GameSettings {
  referenceEnabled: boolean;
  includeBlackKeys: boolean;
  noteCount: 1 | 2 | 3 | 'random';
  instrument: InstrumentId | 'random';
}

interface GameState {
  phase: Phase;
  questionNotes: NoteName[];  // 今回出題されている音（常に配列。1音でも長さ1）
}
```

### 6.2 soundEngine.ts / sampleEngine.ts の責務

- `AudioContext` の生成・再利用（ユーザー操作起点で `resume()`、ブラウザの自動再生制限に対応）。
- `playNotes(noteNames: NoteName[], instrument: InstrumentId, durationMs: number): void` を提供し、
  `INSTRUMENTS[instrument].kind`で処理を振り分ける。
  - `kind === 'synth'`: 各音ごとに基音＋倍音のOscillator + GainNodeを生成、
    同一`startTime`で同時発音する。倍音ごとの`decayMultiplier`（現在は未使用の
    プリセットのみだが、将来別のsynth楽器を追加する際に基音より速く/遅く減衰する
    倍音を作れるよう型として残してある）を反映したエンベロープを個別に組み立てる。
  - `kind === 'sample'`: `sampleEngine.playSampledNote`に委譲し、`AudioBufferSourceNode`
    で録音済みサンプルを再生する（詳細は3.5節）。
- `noteNames`の要素数（`noteCount`）が1でも3でも呼び出し側は同じシグネチャで済み、
  `soundEngine`側の変更は不要。
- ゲイン計算: 1音あたりの振幅予算`noteBudget = 0.8/noteCount`に対し、synth楽器は
  基音のgainを`noteBudget / (1 + Σ倍音gain)`として基音＋全倍音のピーク音量合計が
  予算を超えないよう正規化する（倍音を足しても音割れしないようにするため）。
  sample楽器は倍音を持たないため、`noteBudget`をそのままピーク音量として使う。
- `preloadAllSamples()`: `sample`楽器全てについて`sampleEngine.preloadSamples`を呼び、
  `App.tsx`マウント時に裏で読み込みを始めるためのエントリポイント。

### 6.3 SettingsPanel.tsx の責務

- `GameSettings`を受け取り、`referenceEnabled`・`includeBlackKeys`のチェックボックス、
  `noteCount`（1音/2音/3音/ランダム）と`instrument`（基本/ピアノ風/オルガン風/ランダム）の
  セグメントボタンを表示する。`instrument`の選択肢は`instruments.ts`の`INSTRUMENTS`
  レジストリから動的に生成するため、楽器を追加する際もこのコンポーネントの変更は不要。
- `phase !== 'idle'`のあいだは`disabled`にし、ラウンド進行中に設定が変わらないようにする。
- 変更は`onChange(next: GameSettings)`でApp.tsx側のstateに反映し、次回の`start()`から
  新しい設定が使われる。

### 6.4 Keyboard.tsx / Key.tsx の責務

- `Keyboard`は白鍵8つを`WHITE_NOTE_ORDER`で横並びに描画し、`includeBlackKeys`が
  真のときのみ黒鍵5つを絶対配置で重ねる。黒鍵の位置は「直前の白鍵インデックス」から
  ピクセル単位で計算する（白鍵幅・間隔を定数化し、境界の中央に配置）。
- `Key`は`variant: 'white' | 'black'`を受け取り、既定の見た目（白鍵は明るい枠、
  黒鍵は暗色＋影）を切り替える。`color`（'none'/'yellow'/'green'）は`variant`に関わらず
  共通のハイライト色として上書き適用される。

## 7. 非機能・注意点

- **自動再生制限**: ブラウザはユーザー操作なしの音声再生を制限するため、
  初回は「スタート」ボタン押下をトリガーに `AudioContext` を初期化する。
- **タイマーの正確性**: `setTimeout` の連鎖はタブが非アクティブ時に遅延しうるが、
  本アプリはシビアな精度を要求しないため許容する。
- **アクセシビリティ**: 色だけでなく鍵盤ラベル（ド/？/正解音名）とステータステキストで
  状態を二重に伝える（色覚多様性への配慮）。
- **自動ループの停止手段**: ユーザー操作なしで無限にラウンドが進むため、
  常に押下可能な「とめる」ボタンを表示し、いつでも即座に停止できるようにする
  （でなければページを閉じるまで止められなくなってしまう）。

## 8. 今後の拡張案（本設計のスコープ外）

`GameSettings`／`questionNotes`配列／`instruments.ts`レジストリという土台を用意しているため、
以下は構造変更なしに設定パネル拡張＋中身実装のみで対応できる想定。

- `organ`の倍音構成・エンベロープのさらなる音質チューニング（実際に聴いての微調整）。
- `piano`同様に`organ`もサンプル音源に切り替える（`InstrumentDef`が既にsynth/sample両対応の
  discriminated unionのため、`kind:'sample'`のプリセットを追加するだけで対応可能）。
- ピアノのベロシティ（強弱）レイヤーへの対応（現在のSalamanderサンプルはmf相当の
  単一強弱のみ使用。fp/ffレイヤーも配布されているため、将来的な拡張余地あり）。
- スコア・正答率・連続正解数の記録
- 出題音域の拡張（複数オクターブへの拡張。現状はC4〜C5の1オクターブ・半音階のみ）
- カウントダウン時間（Ver.1は1秒固定）や正解表示の秒数を難易度設定にする
- 効果音・BGMの追加
- 「ランダム」設定で実際に採用された音数・音色をREVEAL時に表示する
  （現状は非表示。何が鳴っていたか事後的に知りたいという要望が出れば追加）

---

この設計書をベースに実装を進めます。認識に相違がなければ、次にプロジェクトの雛形
（Vite + React + TypeScript）を作成し、実装に着手します。
