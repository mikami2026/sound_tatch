import type { Phase } from '../hooks/useGameSequence';
import { displayLabel, type NoteName } from '../audio/notes';
import styles from '../styles/StatusText.module.css';

interface StatusTextProps {
  phase: Phase;
  questionNotes: NoteName[];
}

function messageFor(phase: Phase, questionNotes: NoteName[]): string {
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
    default:
      return '';
  }
}

export function StatusText({ phase, questionNotes }: StatusTextProps) {
  return <p className={styles.status}>{messageFor(phase, questionNotes)}</p>;
}
