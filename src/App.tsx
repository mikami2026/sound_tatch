import { useEffect, useMemo, useState } from 'react';
import { BackgroundNotes } from './components/BackgroundNotes';
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
};

function buildActiveKeys(phase: Phase, questionNotes: NoteName[]): ActiveKey[] {
  switch (phase) {
    case 'reference':
      return [{ note: 'ド', color: 'yellow', label: 'ド' }];
    case 'question':
    case 'countdown':
      // 鍵盤にヒントを出さない（光らせると答えが分かってしまうため）
      return [];
    case 'reveal':
      return questionNotes.map((note) => ({
        note,
        color: 'green',
        label: baseDegreeLabel(note),
      }));
    default:
      return [];
  }
}

function App() {
  const [settings, setSettings] = useState<GameSettings>(INITIAL_SETTINGS);
  const { phase, questionNotes, start, stop } = useGameSequence(settings);

  const activeKeys = useMemo(() => buildActiveKeys(phase, questionNotes), [phase, questionNotes]);

  const isRunning = phase !== 'idle';

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

        <StatusText phase={phase} questionNotes={questionNotes} />

        <Keyboard activeKeys={activeKeys} includeBlackKeys={settings.includeBlackKeys} />

        <NextButton
          label={isRunning ? 'とめる' : 'スタート'}
          disabled={false}
          onClick={isRunning ? stop : start}
        />
      </div>
    </div>
  );
}

export default App;
