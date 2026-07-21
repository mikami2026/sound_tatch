import type { Phase } from '../hooks/useGameSequence';
import type { NoteName } from '../audio/notes';
import styles from '../styles/StatusText.module.css';

interface StatusTextProps {
  phase: Phase;
  questionNotes: NoteName[];
}

const DISPLAY_LABEL: Record<NoteName, string> = {
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
  ド2: 'ド（高）',
};

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
      return `正解：${questionNotes.map((n) => DISPLAY_LABEL[n]).join('・')}`;
    default:
      return '';
  }
}

export function StatusText({ phase, questionNotes }: StatusTextProps) {
  return <p className={styles.status}>{messageFor(phase, questionNotes)}</p>;
}
