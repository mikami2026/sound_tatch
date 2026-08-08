import { useCallback, useEffect, useMemo, useState } from 'react';
import { BackgroundNotes } from './components/BackgroundNotes';
import { Footer } from './components/Footer';
import { Keyboard, type ActiveKey } from './components/Keyboard';
import { StatusText } from './components/StatusText';
import { NextButton } from './components/NextButton';
import { SettingsPanel } from './components/SettingsPanel';
import { useGameSequence, type GameSettings, type Phase } from './hooks/useGameSequence';
import { usePracticeKeyboard } from './hooks/usePracticeKeyboard';
import { preloadAllSamples } from './audio/soundEngine';
import { baseDegreeLabel, type NoteName } from './audio/notes';
import styles from './styles/App.module.css';

const INITIAL_SETTINGS: GameSettings = {
  referenceEnabled: true,
  includeBlackKeys: false,
  noteCount: 1,
  instrument: 'triangle',
  mode: 'listen',
};

function buildActiveKeys(
  phase: Phase,
  questionNotes: NoteName[],
  selectedNotes: NoteName[],
  wrongNote: NoteName | null,
): ActiveKey[] {
  switch (phase) {
    case 'reference':
      return [{ note: 'ド', color: 'yellow', label: 'ド' }];
    case 'question':
    case 'countdown':
      // 鍵盤にヒントを出さない（光らせると答えが分かってしまうため）
      return [];
    case 'reveal':
    case 'correct':
      return questionNotes.map((note) => ({
        note,
        color: 'green',
        label: baseDegreeLabel(note),
      }));
    case 'answering':
      // 挑戦者モード: これまでに正解した音だけを緑で表示（正解の進捗表示）
      return selectedNotes.map((note) => ({
        note,
        color: 'green',
        label: baseDegreeLabel(note),
      }));
    case 'gameover': {
      const keys: ActiveKey[] = questionNotes.map((note) => ({
        note,
        color: 'green',
        label: baseDegreeLabel(note),
      }));
      if (wrongNote) {
        keys.push({ note: wrongNote, color: 'red', label: baseDegreeLabel(wrongNote) });
      }
      return keys;
    }
    default:
      return [];
  }
}

function App() {
  const [settings, setSettings] = useState<GameSettings>(INITIAL_SETTINGS);
  const {
    phase,
    questionNotes,
    selectedNotes,
    wrongNote,
    streak,
    replayAvailable,
    fiveNoteUnlocked,
    justUnlocked,
    bestStreak,
    totalCorrect,
    totalGames,
    difficultyLabel,
    beatBest,
    gameoverMessage,
    start,
    stop,
    answerNote,
    replay,
    dismissUnlock,
  } = useGameSequence(settings);

  const {
    litNotes,
    lastNote: practiceNote,
    playNote: playPracticeNote,
    reset: resetPractice,
  } = usePracticeKeyboard(settings);

  const isPractice = settings.mode === 'practice';

  const gameActiveKeys = useMemo(
    () => buildActiveKeys(phase, questionNotes, selectedNotes, wrongNote),
    [phase, questionNotes, selectedNotes, wrongNote],
  );

  // 練習モードでは「自分が押した鍵盤」を青く光らせる（出題の緑/黄と区別する）。
  const practiceActiveKeys = useMemo<ActiveKey[]>(
    () => litNotes.map((note) => ({ note, color: 'blue', label: baseDegreeLabel(note) })),
    [litNotes],
  );

  const activeKeys = isPractice ? practiceActiveKeys : gameActiveKeys;

  const isIdle = phase === 'idle';
  const isGameOver = phase === 'gameover';
  const isRunning = !isPractice && !isIdle && !isGameOver;

  // モードを切り替えるときは、前のモードの残り状態（gameover表示・光ったままの鍵盤）を消す。
  const handleSettingsChange = useCallback(
    (next: GameSettings) => {
      if (next.mode !== settings.mode) {
        stop();
        resetPractice();
      }
      setSettings(next);
    },
    [settings.mode, stop, resetPractice],
  );

  useEffect(() => {
    // ピアノ音源（サンプル音声）はネットワーク読み込みが必要なため、
    // ゲーム開始を待たせないようページ表示直後から裏で読み込みを始めておく。
    preloadAllSamples();
  }, []);

  return (
    <div className={styles.app}>
      <BackgroundNotes />
      <h1 className={styles.title}>音あてゲーム</h1>

      <div className={styles.stage}>
        <SettingsPanel
          settings={settings}
          onChange={handleSettingsChange}
          disabled={isRunning}
          fiveNoteUnlocked={fiveNoteUnlocked}
        />

        <StatusText
          phase={phase}
          questionNotes={questionNotes}
          selectedNotes={selectedNotes}
          mode={settings.mode}
          streak={streak}
          bestStreak={bestStreak}
          totalCorrect={totalCorrect}
          totalGames={totalGames}
          difficultyLabel={difficultyLabel}
          beatBest={beatBest}
          gameoverMessage={gameoverMessage}
          practiceNote={practiceNote}
        />

        <Keyboard
          activeKeys={activeKeys}
          includeBlackKeys={settings.includeBlackKeys}
          onNoteClick={
            isPractice ? playPracticeNote : phase === 'answering' ? answerNote : undefined
          }
        />

        {settings.mode === 'challenge' && !isIdle && (
          <button
            type="button"
            className={styles.replayButton}
            disabled={!(phase === 'answering' && replayAvailable)}
            onClick={replay}
          >
            {phase === 'answering' && !replayAvailable ? '聞き直しは使用済み' : 'もう一度聞く'}
          </button>
        )}

        {/* 練習モードは開始・停止の概念がないため、スタートボタンは出さない */}
        {!isPractice && (
          <NextButton
            label={isIdle ? 'スタート' : isGameOver ? 'もう一度' : 'とめる'}
            disabled={false}
            onClick={isIdle || isGameOver ? start : stop}
          />
        )}
      </div>

      <Footer />

      {justUnlocked && (
        <div className={styles.unlockOverlay} role="dialog" aria-modal="true">
          <div className={styles.unlockCard}>
            <p className={styles.unlockEmoji}>🎉</p>
            <p className={styles.unlockTitle}>5音モード解放！</p>
            <p className={styles.unlockDesc}>
              3音・連続10回クリア達成！<br />
              「同時に鳴らす音の数」に <strong>5音</strong> が追加されました。
            </p>
            <button type="button" className={styles.unlockButton} onClick={dismissUnlock}>
              やった！
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
