// 「2」は1オクターブ上（C5〜B5）、「3」は2オクターブ上の境界音（C6）を表す
// （末尾に何もなければオクターブ4＝C4〜B4）。
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
  | 'ド2'
  | 'ド♯2'
  | 'レ2'
  | 'レ♯2'
  | 'ミ2'
  | 'ファ2'
  | 'ファ♯2'
  | 'ソ2'
  | 'ソ♯2'
  | 'ラ2'
  | 'ラ♯2'
  | 'シ2'
  | 'ド3';

// 半音階（クロマチック）順。黒鍵を含めた出題ではこの並びから選ぶ。C4〜C6の2オクターブ。
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
  'ド♯2',
  'レ2',
  'レ♯2',
  'ミ2',
  'ファ2',
  'ファ♯2',
  'ソ2',
  'ソ♯2',
  'ラ2',
  'ラ♯2',
  'シ2',
  'ド3',
];

// 白鍵（ドレミファソラシド）のみの並び。黒鍵を含めない出題ではこちらから選ぶ。
export const WHITE_NOTE_ORDER: NoteName[] = [
  'ド',
  'レ',
  'ミ',
  'ファ',
  'ソ',
  'ラ',
  'シ',
  'ド2',
  'レ2',
  'ミ2',
  'ファ2',
  'ソ2',
  'ラ2',
  'シ2',
  'ド3',
];

// 鍵盤上の表示ラベル用: オクターブを表す末尾の数字を取り除き、音名だけを返す
// （鍵盤は位置で高低が視覚的に分かるため、ラベルはオクターブを区別しない）。
export function baseDegreeLabel(note: NoteName): string {
  return note.replace(/\d+$/, '');
}

// テキスト表示（正解発表など）用: 音名だけでは高低が区別できないため、
// 1オクターブ上には「（高）」、2オクターブ上の境界音には「（最高）」を付ける。
const OCTAVE_SUFFIX_ANNOTATION: Record<string, string> = { '': '', '2': '（高）', '3': '（最高）' };
export function displayLabel(note: NoteName): string {
  const [, base, suffix] = note.match(/^(.*?)(\d*)$/) ?? [note, note, ''];
  return base + (OCTAVE_SUFFIX_ANNOTATION[suffix] ?? '');
}

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
