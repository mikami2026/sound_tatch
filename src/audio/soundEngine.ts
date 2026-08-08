import { NOTE_FREQUENCIES, type NoteName } from './notes';
import { INSTRUMENTS, type InstrumentId, type EnvelopeDef } from './instruments';
import { playSampledNote, preloadSamples } from './sampleEngine';
import { masterOutput } from './masterOutput';

let audioContext: AudioContext | null = null;

export function ensureAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }
  return audioContext;
}

// サンプル音源を使う楽器は、実際に鳴らす前にネットワーク読み込み＋デコードが必要。
// ゲーム開始を待たせないよう、ページ表示後すぐに裏で読み込みを始めておく。
export function preloadAllSamples(): void {
  const ctx = ensureAudioContext();
  for (const instrument of Object.values(INSTRUMENTS)) {
    if (instrument.kind === 'sample') {
      preloadSamples(ctx, instrument);
    }
  }
}

function scheduleTone(
  ctx: AudioContext,
  frequency: number,
  peakGain: number,
  waveform: OscillatorType,
  envelope: EnvelopeDef,
  startTime: number,
  durationSec: number,
) {
  const oscillator = ctx.createOscillator();
  oscillator.type = waveform;
  oscillator.frequency.value = frequency;

  const gainNode = ctx.createGain();
  const attackSec = envelope.attackMs / 1000;
  const decaySec = envelope.decayMs / 1000;
  const releaseSec = envelope.releaseMs / 1000;
  const sustainGain = peakGain * envelope.sustainLevel;
  const stopTime = startTime + durationSec;
  const decayEndTime = startTime + attackSec + decaySec;
  const releaseStartTime = Math.max(decayEndTime, stopTime - releaseSec);

  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(peakGain, startTime + attackSec);
  gainNode.gain.linearRampToValueAtTime(sustainGain, decayEndTime);
  gainNode.gain.setValueAtTime(sustainGain, releaseStartTime);
  gainNode.gain.linearRampToValueAtTime(0, stopTime + releaseSec);

  oscillator.connect(gainNode);
  gainNode.connect(masterOutput(ctx));

  oscillator.start(startTime);
  oscillator.stop(stopTime + releaseSec + 0.02);
}

export function playNotes(
  noteNames: NoteName[],
  instrumentId: InstrumentId,
  durationMs: number,
): void {
  if (noteNames.length === 0) return;

  const ctx = ensureAudioContext();
  const instrument = INSTRUMENTS[instrumentId];
  const durationSec = durationMs / 1000;
  const startTime = ctx.currentTime + 0.02;
  const noteBudget = 0.8 / noteNames.length;

  if (instrument.kind === 'sample') {
    for (const noteName of noteNames) {
      playSampledNote(ctx, instrument, noteName, noteBudget, startTime, durationSec);
    }
    return;
  }

  // 1音あたりの振幅予算。倍音を足すほど合計振幅が予算を超えないよう、
  // 倍音分を含めた重み合計で割ってから基音のgainを決める（音割れ防止）。
  // ピーク音量（アタック直後）の合計が予算を超えなければよいので、
  // 減衰の速さ（decayMultiplier）はこの正規化には影響しない。
  const harmonicWeightSum = 1 + (instrument.harmonics ?? []).reduce((sum, h) => sum + h.gain, 0);
  const fundamentalGain = noteBudget / harmonicWeightSum;

  for (const noteName of noteNames) {
    const fundamental = NOTE_FREQUENCIES[noteName];

    scheduleTone(ctx, fundamental, fundamentalGain, instrument.waveform, instrument.envelope, startTime, durationSec);

    for (const harmonic of instrument.harmonics ?? []) {
      const harmonicEnvelope: EnvelopeDef = {
        ...instrument.envelope,
        decayMs: instrument.envelope.decayMs * (harmonic.decayMultiplier ?? 1),
      };
      scheduleTone(
        ctx,
        fundamental * harmonic.ratio,
        fundamentalGain * harmonic.gain,
        instrument.waveform,
        harmonicEnvelope,
        startTime,
        durationSec,
      );
    }
  }
}
