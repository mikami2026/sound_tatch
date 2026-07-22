import { useEffect, useMemo, useState } from 'react';
import { BackgroundNotes } from './components/BackgroundNotes';
import { Footer } from './components/Footer';
import { Keyboard, type ActiveKey } from './components/Keyboard';
import { StatusText } from './components/StatusText';
import { NextButton } from './components/NextButton';
import { SettingsPanel } from './components/SettingsPanel';
import { useGameSequence, type GameSettings, type Phase } from './hooks/useGameSequence';
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
    start,
    stop,
    answerNote,
    replay,
  } = useGameSequence(settings);

  const activeKeys = useMemo(
    () => buildActiveKeys(phase, questionNotes, selectedNotes, wrongNote),
    [phase, questionNotes, selectedNotes, wrongNote],
  );

  const isIdle = phase === 'idle';
  const isGameOver = phase === 'gameover';
  const isRunning = !isIdle && !isGameOver;

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
        <SettingsPanel settings={settings} onChange={setSettings} disabled={isRunning} />

        <StatusText
          phase={phase}
          questionNotes={questionNotes}
          selectedNotes={selectedNotes}
          mode={settings.mode}
          streak={streak}
        />

        <Keyboard
          activeKeys={activeKeys}
          includeBlackKeys={settings.includeBlackKeys}
          onNoteClick={phase === 'answering' ? answerNote : undefined}
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

        <NextButton
          label={isIdle ? 'スタート' : isGameOver ? 'もう一度' : 'とめる'}
          disabled={false}
          onClick={isIdle || isGameOver ? start : stop}
        />
      </div>

      <Footer />
    </div>
  );
}

export default App;
