import styles from '../styles/BackgroundNotes.module.css';

interface NoteSpec {
  symbol: string;
  top: string;
  left: string;
  size: number;
  rotate: number;
  color: string;
}

// 画面全体に音符・ト音記号を散らす装飾用の固定レイアウト
// （毎回ランダムだと配置が偏って見苦しくなることがあるため、手動で位置を決め打ちしている）。
const NOTES: NoteSpec[] = [
  { symbol: '𝄞', top: '1%', left: '22%', size: 60, rotate: -6, color: '#7c3aed' },
  { symbol: '♪', top: '7%', left: '8%', size: 44, rotate: -18, color: '#ff63b0' },
  { symbol: '♫', top: '12%', left: '84%', size: 52, rotate: 14, color: '#ff9f43' },
  { symbol: '♬', top: '28%', left: '3%', size: 38, rotate: 20, color: '#3b82f6' },
  { symbol: '♯', top: '20%', left: '95%', size: 34, rotate: 10, color: '#06b6d4' },
  { symbol: '♩', top: '10%', left: '65%', size: 30, rotate: 22, color: '#ff63b0' },
  { symbol: '♪', top: '46%', left: '2%', size: 34, rotate: 8, color: '#ff9f43' },
  { symbol: '♫', top: '55%', left: '93%', size: 46, rotate: -20, color: '#7c3aed' },
  { symbol: '♩', top: '66%', left: '91%', size: 40, rotate: -10, color: '#3b82f6' },
  { symbol: '♭', top: '88%', left: '62%', size: 40, rotate: -8, color: '#06b6d4' },
  { symbol: '♪', top: '84%', left: '9%', size: 48, rotate: 18, color: '#ff63b0' },
  { symbol: '♬', top: '90%', left: '36%', size: 36, rotate: -14, color: '#ff9f43' },
];

export function BackgroundNotes() {
  return (
    <div className={styles.layer} aria-hidden="true">
      {NOTES.map((note, index) => (
        <span
          key={index}
          className={styles.note}
          style={{
            top: note.top,
            left: note.left,
            fontSize: note.size,
            color: note.color,
            transform: `rotate(${note.rotate}deg)`,
          }}
        >
          {note.symbol}
        </span>
      ))}
    </div>
  );
}
