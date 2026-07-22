import type { NoteName } from './notes';

export type InstrumentId = 'triangle' | 'piano' | 'organ' | 'violin' | 'flute' | 'trumpet';

export interface EnvelopeDef {
  attackMs: number;
  decayMs: number;
  sustainLevel: number; // 0..1 : ピーク音量に対する、減衰後に持続する音量の割合
  releaseMs: number;
}

export interface HarmonicDef {
  ratio: number;
  gain: number;
  // 倍音ごとの減衰速度の倍率。1未満にすると、その倍音だけ基音より速く減衰する
  // （ピアノの「アタックは明るく、余韻は丸くなる」特性を近似するため）。
  decayMultiplier?: number;
}

export interface SampleDef {
  note: NoteName; // この録音がどの音高かを示す。他の音はここからの半音差でピッチシフトする
  url: string;
}

interface InstrumentBase {
  id: InstrumentId;
  label: string;
}

// waveform: OscillatorTypeによるプログラム合成の楽器
export interface SynthInstrumentDef extends InstrumentBase {
  kind: 'synth';
  waveform: OscillatorType;
  envelope: EnvelopeDef;
  harmonics?: HarmonicDef[];
}

// 実際に録音されたサンプル音源を再生する楽器（音源ファイルが少数でも
// 半音単位のピッチシフト再生で全音域をカバーする）
export interface SampledInstrumentDef extends InstrumentBase {
  kind: 'sample';
  samples: SampleDef[];
  attackMs: number;
  releaseMs: number;
}

export type InstrumentDef = SynthInstrumentDef | SampledInstrumentDef;

export const INSTRUMENTS: Record<InstrumentId, InstrumentDef> = {
  triangle: {
    id: 'triangle',
    label: '基本',
    kind: 'synth',
    waveform: 'triangle',
    envelope: { attackMs: 10, decayMs: 0, sustainLevel: 1, releaseMs: 150 },
  },
  piano: {
    id: 'piano',
    label: 'ピアノ風',
    kind: 'sample',
    // Salamander Grand Piano by Alexander Holm (CC BY 3.0)
    // https://archive.org/details/SalamanderGrandPianoV3
    // 経由: https://github.com/Tonejs/audio (Tone.js公式サンプル配布)
    samples: [
      { note: 'ド', url: '/samples/piano/C4.mp3' },
      { note: 'レ♯', url: '/samples/piano/Ds4.mp3' },
      { note: 'ファ♯', url: '/samples/piano/Fs4.mp3' },
      { note: 'ラ', url: '/samples/piano/A4.mp3' },
      { note: 'ド2', url: '/samples/piano/C5.mp3' },
    ],
    attackMs: 5,
    releaseMs: 300,
  },
  organ: {
    id: 'organ',
    label: 'オルガン風',
    kind: 'synth',
    waveform: 'sine',
    // オルガンは鍵盤を押している間、音量が一定に持続する（減衰しない）。
    envelope: { attackMs: 20, decayMs: 0, sustainLevel: 1, releaseMs: 50 },
    harmonics: [
      { ratio: 2, gain: 0.5 },
      { ratio: 4, gain: 0.25 },
    ],
  },
  violin: {
    id: 'violin',
    label: 'バイオリン風',
    kind: 'sample',
    // VSCO2 (Versilian Studios Chamber Orchestra, Community Edition) 由来の録音。
    // 経由: https://github.com/nbrosowsky/tonejs-instruments (CC BY 3.0)
    samples: [
      { note: 'ド', url: '/samples/violin/C4.mp3' },
      { note: 'ミ', url: '/samples/violin/E4.mp3' },
      { note: 'ソ', url: '/samples/violin/G4.mp3' },
      { note: 'ラ', url: '/samples/violin/A4.mp3' },
      { note: 'ド2', url: '/samples/violin/C5.mp3' },
    ],
    attackMs: 15,
    releaseMs: 200,
  },
  flute: {
    id: 'flute',
    label: 'フルート風',
    kind: 'sample',
    // VSCO2 (Versilian Studios Chamber Orchestra, Community Edition) 由来の録音。
    // 経由: https://github.com/nbrosowsky/tonejs-instruments (CC BY 3.0)
    samples: [
      { note: 'ド', url: '/samples/flute/C4.mp3' },
      { note: 'ミ', url: '/samples/flute/E4.mp3' },
      { note: 'ラ', url: '/samples/flute/A4.mp3' },
      { note: 'ド2', url: '/samples/flute/C5.mp3' },
    ],
    attackMs: 15,
    releaseMs: 200,
  },
  trumpet: {
    id: 'trumpet',
    label: 'トランペット風',
    kind: 'sample',
    // VSCO2 (Versilian Studios Chamber Orchestra, Community Edition) 由来の録音。
    // 経由: https://github.com/nbrosowsky/tonejs-instruments (CC BY 3.0)
    samples: [
      { note: 'ド', url: '/samples/trumpet/C4.mp3' },
      { note: 'レ♯', url: '/samples/trumpet/Ds4.mp3' },
      { note: 'ファ', url: '/samples/trumpet/F4.mp3' },
      { note: 'ソ', url: '/samples/trumpet/G4.mp3' },
      { note: 'ラ♯', url: '/samples/trumpet/As4.mp3' },
    ],
    attackMs: 10,
    releaseMs: 150,
  },
};
