import { WHITE_NOTE_ORDER, type NoteName } from '../audio/notes';
import { Key, type KeyColor } from './Key';
import styles from '../styles/Keyboard.module.css';

export interface ActiveKey {
  note: NoteName;
  color: KeyColor;
  label: string;
}

interface KeyboardProps {
  activeKeys: ActiveKey[];
  includeBlackKeys: boolean;
}

const KEY_NAME_LABEL: Record<NoteName, string> = {
  ド: 'ド',
  'ド♯': 'ド♯',
  レ: 'レ',
  'レ♯': 'レ♯',
  ミ: 'ミ',
  ファ: 'ファ',
  'ファ♯': 'ファ♯',
  ソ: 'ソ',
  'ソ♯': 'ソ♯',
  ラ: 'ラ',
  'ラ♯': 'ラ♯',
  シ: 'シ',
  ド2: 'ド',
};

// 黒鍵は「直前の白鍵（0始まりのインデックス）」の右側に配置する。
// ミ→ファ、シ→ド2 の間には黒鍵が存在しない（実際のピアノと同じ配列）。
const BLACK_KEYS: { note: NoteName; afterWhiteIndex: number }[] = [
  { note: 'ド♯', afterWhiteIndex: 0 },
  { note: 'レ♯', afterWhiteIndex: 1 },
  { note: 'ファ♯', afterWhiteIndex: 3 },
  { note: 'ソ♯', afterWhiteIndex: 4 },
  { note: 'ラ♯', afterWhiteIndex: 5 },
];

const WHITE_KEY_WIDTH = 56;
const WHITE_KEY_GAP = 8;
const WHITE_KEY_PITCH = WHITE_KEY_WIDTH + WHITE_KEY_GAP;
const BLACK_KEY_WIDTH = 32;

export function Keyboard({ activeKeys, includeBlackKeys }: KeyboardProps) {
  const findActive = (note: NoteName) => activeKeys.find((k) => k.note === note);

  return (
    <div className={styles.keyboard}>
      <div className={styles.whiteRow}>
        {WHITE_NOTE_ORDER.map((note) => {
          const active = findActive(note);
          return (
            <Key
              key={note}
              variant="white"
              color={active?.color ?? 'none'}
              displayLabel={active?.label ?? KEY_NAME_LABEL[note]}
            />
          );
        })}
      </div>

      {includeBlackKeys && (
        <div className={styles.blackRow}>
          {BLACK_KEYS.map(({ note, afterWhiteIndex }) => {
            const active = findActive(note);
            const left =
              afterWhiteIndex * WHITE_KEY_PITCH +
              WHITE_KEY_WIDTH +
              WHITE_KEY_GAP / 2 -
              BLACK_KEY_WIDTH / 2;
            return (
              <div key={note} className={styles.blackKeySlot} style={{ left }}>
                <Key
                  variant="black"
                  color={active?.color ?? 'none'}
                  displayLabel={active?.label ?? KEY_NAME_LABEL[note]}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
