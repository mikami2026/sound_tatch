# 音あてゲーム

鳴った音（ドレミ）を鍵盤で当てる、耳のトレーニング用Webアプリです。React + TypeScript + Vite製。

🎮 **公開URL**: https://beamish-lamington-5a3357.netlify.app/

## 主な機能

- **音あてクイズ**: 基準音（ド）のあとに問題音が鳴り、どの音かを当てる
- **モード**
  - **きく（自動）**: 一定時間後に自動で答え合わせ
  - **挑戦者**: 鍵盤をクリックして回答。間違えたら終了、連続正解数を競う
- **難易度設定**: 同時に鳴らす音の数（1〜3音／ランダム）、黒鍵（半音）の有無、基準音の有無
- **音色**: 基本・ピアノ風・オルガン風・バイオリン風・フルート風・トランペット風（ランダムも可）
- **音域**: C4〜C6 の2オクターブ
- **隠し要素**: 挑戦者モードの「3音」で連続10回正解すると「5音」モードが解放される

## 開発

```bash
npm install      # 依存関係のインストール
npm run dev      # 開発サーバー起動
npm run build    # 本番ビルド（dist/ に出力）
npm run lint     # oxlint
npm run preview  # ビルド結果のローカルプレビュー
```

## デプロイ

`master` ブランチへの push で Netlify が自動ビルド・デプロイします。

- **Build command**: `npm run build`
- **Publish directory**: `dist`

## 使用音源クレジット（CC BY 3.0）

本アプリのサンプル音源は以下を利用しています（[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)）。

- **ピアノ音**: Salamander Grand Piano by Alexander Holm
  https://archive.org/details/SalamanderGrandPianoV3
- **バイオリン・フルート・トランペット音**: VSCO2 by Versilian Studios / 経由 [nbrosowsky/tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments)

> CC BY 3.0 は作者クレジットの表示を条件に、商用利用・改変・再配布を許可するライセンスです。
> 本アプリを紹介する動画等を公開する場合も、上記クレジットを表示すれば利用できます。

フォントは [Zen Maru Gothic](https://fonts.google.com/specimen/Zen+Maru+Gothic)（Google Fonts / SIL Open Font License）を使用しています。
