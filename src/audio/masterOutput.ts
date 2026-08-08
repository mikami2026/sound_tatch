// すべての発音の出口に置くマスター段（リミッター）。
//
// 各音の振幅は soundEngine 側で「1回のplayNotesにつき合計0.8」に収まるよう配分しているが、
// 独立した再生が時間的に重なるケース（練習モードで複数の鍵盤を続けて押す、
// 「もう一度聞く」を前の音の余韻中に押す、など）までは予算に含められない。
// そのまま合成すると振幅が1.0を超えてブラウザ側で頭が潰れ、バリバリと音割れする。
//
// そこで最終段にリミッターを1つ置き、閾値を「単音の通常ピーク（約0.85）」より上に
// 設定する。単音は素通りしてこれまでどおりの音のまま、重なって1.0を超えそうなときだけ
// 押さえ込まれるので、音色の聞き分け（本アプリの目的）に影響を与えずに音割れだけを防げる。
let limiter: DynamicsCompressorNode | null = null;
let limiterContext: AudioContext | null = null;

export function masterOutput(ctx: AudioContext): AudioNode {
  if (limiter && limiterContext === ctx) return limiter;

  const node = ctx.createDynamicsCompressor();
  node.threshold.value = -1; // ≒0.89。単音のピーク（約0.85）は超えない＝素通り
  node.knee.value = 0; // 閾値以下は完全に無加工（ハードニー）
  node.ratio.value = 20; // ほぼリミッター動作
  node.attack.value = 0.001;
  node.release.value = 0.25;
  node.connect(ctx.destination);

  limiter = node;
  limiterContext = ctx;
  return node;
}
