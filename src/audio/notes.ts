export type NoteName =
  | 'ド'
  | 'ド♯'
  | 'レ'
  | 'レ♯'
  | 'ミ'
  | 'ファ'
  | 'ファ♯'
  | 'ソ'
  | 'ソ♯'
  | 'ラ'
  | 'ラ♯'
  | 'シ'
  | 'ド2';

// 半音階（クロマチック）順。黒鍵を含めた出題ではこの並びから選ぶ。
export const NOTE_ORDER: NoteName[] = [
  'ド',
  'ド♯',
  'レ',
  'レ♯',
  'ミ',
  'ファ',
  'ファ♯',
  'ソ',
  'ソ♯',
  'ラ',
  'ラ♯',
  'シ',
  'ド2',
];

// 白鍵（ドレミファソラシド）のみの並び。黒鍵を含めない出題ではこちらから選ぶ。
export const WHITE_NOTE_ORDER: NoteName[] = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド2'];

const A4_FREQUENCY = 440;
const SEMITONE_RATIO = Math.pow(2, 1 / 12);
// C4はA4の9半音下（平均律）
const C4_FREQUENCY = A4_FREQUENCY / Math.pow(SEMITONE_RATIO, 9);

export const NOTE_FREQUENCIES: Record<NoteName, number> = NOTE_ORDER.reduce(
  (acc, note, semitoneIndex) => {
    acc[note] = Math.round(C4_FREQUENCY * Math.pow(SEMITONE_RATIO, semitoneIndex) * 100) / 100;
    return acc;
  },
  {} as Record<NoteName, number>,
);

export function sortByPitch(notes: NoteName[]): NoteName[] {
  return [...notes].sort((a, b) => NOTE_ORDER.indexOf(a) - NOTE_ORDER.indexOf(b));
}

export function pickRandomNotes(count: number, sourcePool: NoteName[] = NOTE_ORDER): NoteName[] {
  const pool = [...sourcePool];
  const picked: NoteName[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const index = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }
  return sortByPitch(picked);
}
