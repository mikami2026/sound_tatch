import type { GameMode, Phase } from '../hooks/useGameSequence';
import { displayLabel, type NoteName } from '../audio/notes';
import styles from '../styles/StatusText.module.css';

interface StatusTextProps {
  phase: Phase;
  questionNotes: NoteName[];
  selectedNotes: NoteName[];
  mode: GameMode;
  streak: number;
  bestStreak: number;
  totalCorrect: number;
  totalGames: number;
  difficultyLabel: string;
  beatBest: boolean;
  gameoverMessage: string;
}

// 連続正解数に応じた称号。3連続からだんだん上のランクになる。
function rankLabel(streak: number): string | null {
  if (streak >= 20) return '👑 神耳';
  if (streak >= 10) return '🏆 達人';
  if (streak >= 5) return '✨ 上級者';
  if (streak >= 3) return '👂 いい耳！';
  return null;
}

function messageFor(
  phase: Phase,
  questionNotes: NoteName[],
  selectedNotes: NoteName[],
  gameoverMessage: string,
): string {
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
      // 状況に応じて言い分けた文言はフックで生成済み（空なら従来文言にフォールバック）。
      return (
        gameoverMessage ||
        `残念…正解は「${questionNotes.map(displayLabel).join('・')}」でした`
      );
    default:
      return '';
  }
}

export function StatusText({
  phase,
  questionNotes,
  selectedNotes,
  mode,
  streak,
  bestStreak,
  totalCorrect,
  totalGames,
  difficultyLabel,
  beatBest,
  gameoverMessage,
}: StatusTextProps) {
  const isChallenge = mode === 'challenge';
  const rank = rankLabel(streak);
  // ゲーム進行中（idle以外）はその挑戦の連続正解と自己ベストを、
  // 開始前（idle）は「今の難易度」の成績サマリーを見せる（記録は難易度ごとに別）。
  const showRecordSummary = isChallenge && phase === 'idle';

  return (
    <div className={styles.wrapper}>
      {isChallenge && phase !== 'idle' && (
        <p className={styles.streak}>
          連続正解：{streak}
          {rank && <span className={styles.rank}>{rank}</span>}
          <span className={styles.best}>自己ベスト：{bestStreak}</span>
          {beatBest && phase !== 'gameover' && (
            <span className={styles.newBest}>🔥 更新中！</span>
          )}
        </p>
      )}

      {showRecordSummary && (
        <p className={styles.record}>
          <span className={styles.difficulty}>【{difficultyLabel}】</span>
          自己ベスト {bestStreak}連続 ・ 累計正解 {totalCorrect} ・ 挑戦 {totalGames}回
        </p>
      )}

      <p className={styles.status}>
        {messageFor(phase, questionNotes, selectedNotes, gameoverMessage)}
      </p>
    </div>
  );
}
