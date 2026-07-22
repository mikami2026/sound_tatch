import type { GameMode, Phase } from '../hooks/useGameSequence';
import { displayLabel, type NoteName } from '../audio/notes';
import styles from '../styles/StatusText.module.css';

interface StatusTextProps {
  phase: Phase;
  questionNotes: NoteName[];
  selectedNotes: NoteName[];
  mode: GameMode;
  streak: number;
}

function messageFor(phase: Phase, questionNotes: NoteName[], selectedNotes: NoteName[]): string {
  switch (phase) {
    case 'idle':
      return 'スタートを押して開始してください';
    case 'reference':
      return '基準音：ド';
    case 'gap':
      return '';
    case 'question':
      return '問題音を再生中…';
    case 'countdown':
      return '考えてください…';
    case 'reveal':
      return `正解：${questionNotes.map(displayLabel).join('・')}`;
    case 'answering': {
      const remaining = questionNotes.length - selectedNotes.length;
      return questionNotes.length > 1
        ? `鍵盤をクリックして答えてください（あと${remaining}音）`
        : '鍵盤をクリックして答えてください';
    }
    case 'correct':
      return '正解！';
    case 'gameover':
      return `残念…正解は「${questionNotes.map(displayLabel).join('・')}」でした`;
    default:
      return '';
  }
}

export function StatusText({ phase, questionNotes, selectedNotes, mode, streak }: StatusTextProps) {
  return (
    <div className={styles.wrapper}>
      {mode === 'challenge' && phase !== 'idle' && (
        <p className={styles.streak}>連続正解：{streak}</p>
      )}
      <p className={styles.status}>{messageFor(phase, questionNotes, selectedNotes)}</p>
    </div>
  );
}
