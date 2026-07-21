import { NOTE_ORDER, type NoteName } from './notes';
import type { SampledInstrumentDef } from './instruments';

const bufferCache = new Map<string, Promise<Map<NoteName, AudioBuffer>>>();

function loadBuffers(
  ctx: AudioContext,
  instrument: SampledInstrumentDef,
): Promise<Map<NoteName, AudioBuffer>> {
  const cached = bufferCache.get(instrument.id);
  if (cached) return cached;

  const promise = Promise.all(
    instrument.samples.map(async ({ note, url }) => {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      return [note, audioBuffer] as const;
    }),
  ).then((entries) => new Map(entries));

  bufferCache.set(instrument.id, promise);
  return promise;
}

// ページ読み込み後すぐに裏で読み込みを開始しておき、実際の再生タイミングでは
// キャッシュ済みのバッファをほぼ即座に使えるようにする（ゲーム開始を待たせないため）。
export function preloadSamples(ctx: AudioContext, instrument: SampledInstrumentDef): void {
  void loadBuffers(ctx, instrument);
}

function nearestSample(
  noteName: NoteName,
  buffers: Map<NoteName, AudioBuffer>,
): { buffer: AudioBuffer; semitoneOffset: number } | null {
  const targetIndex = NOTE_ORDER.indexOf(noteName);
  let best: { buffer: AudioBuffer; semitoneOffset: number } | null = null;

  for (const [sampleNote, buffer] of buffers) {
    const sampleIndex = NOTE_ORDER.indexOf(sampleNote);
    const semitoneOffset = targetIndex - sampleIndex;
    if (!best || Math.abs(semitoneOffset) < Math.abs(best.semitoneOffset)) {
      best = { buffer, semitoneOffset };
    }
  }

  return best;
}

export function playSampledNote(
  ctx: AudioContext,
  instrument: SampledInstrumentDef,
  noteName: NoteName,
  peakGain: number,
  startTime: number,
  durationSec: number,
): void {
  void loadBuffers(ctx, instrument).then((buffers) => {
    const match = nearestSample(noteName, buffers);
    if (!match) return;

    const source = ctx.createBufferSource();
    source.buffer = match.buffer;
    source.playbackRate.value = Math.pow(2, match.semitoneOffset / 12);

    const gainNode = ctx.createGain();
    const attackSec = instrument.attackMs / 1000;
    const releaseSec = instrument.releaseMs / 1000;
    const stopTime = startTime + durationSec;

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(peakGain, startTime + attackSec);
    gainNode.gain.setValueAtTime(peakGain, stopTime);
    gainNode.gain.linearRampToValueAtTime(0, stopTime + releaseSec);

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(startTime);
    source.stop(stopTime + releaseSec + 0.02);
  });
}
