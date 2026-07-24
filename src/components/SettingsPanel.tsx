import type { GameSettings } from '../hooks/useGameSequence';
import { INSTRUMENTS, type InstrumentId } from '../audio/instruments';
import styles from '../styles/SettingsPanel.module.css';

interface SettingsPanelProps {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  disabled: boolean;
  fiveNoteUnlocked: boolean;
}

const NOTE_COUNT_OPTIONS = [1, 2, 3, 'random'] as const;
const INSTRUMENT_OPTIONS = [...Object.values(INSTRUMENTS), { id: 'random' as const, label: 'ランダム' }];
const MODE_OPTIONS: { id: GameSettings['mode']; label: string }[] = [
  { id: 'listen', label: 'きく（自動）' },
  { id: 'challenge', label: '挑戦者' },
];

export function SettingsPanel({ settings, onChange, disabled, fiveNoteUnlocked }: SettingsPanelProps) {
  // 「5音」は隠し要素。解放済みのときだけ 3音 とランダムの間に差し込む。
  const noteCountOptions = fiveNoteUnlocked
    ? ([1, 2, 3, 5, 'random'] as const)
    : NOTE_COUNT_OPTIONS;

  return (
    <div className={styles.panel}>
      <div className={styles.noteCountRow}>
        <span className={styles.noteCountLabel}>モード</span>
        <div className={styles.segmented}>
          {MODE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={option.id === settings.mode ? styles.segmentActive : styles.segment}
              disabled={disabled}
              onClick={() => onChange({ ...settings, mode: option.id })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <label className={styles.toggleRow}>
        <input
          type="checkbox"
          checked={settings.referenceEnabled}
          disabled={disabled}
          onChange={(e) => onChange({ ...settings, referenceEnabled: e.target.checked })}
        />
        基準音（ド）を鳴らす
      </label>

      <label className={styles.toggleRow}>
        <input
          type="checkbox"
          checked={settings.includeBlackKeys}
          disabled={disabled}
          onChange={(e) => onChange({ ...settings, includeBlackKeys: e.target.checked })}
        />
        黒鍵（半音）も出題する
      </label>

      <div className={styles.noteCountRow}>
        <span className={styles.noteCountLabel}>同時に鳴らす音の数</span>
        <div className={styles.segmented}>
          {noteCountOptions.map((count) => (
            <button
              key={count}
              type="button"
              className={count === settings.noteCount ? styles.segmentActive : styles.segment}
              disabled={disabled}
              onClick={() => onChange({ ...settings, noteCount: count })}
            >
              {count === 'random' ? 'ランダム' : `${count}音`}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.noteCountRow}>
        <span className={styles.noteCountLabel}>音色</span>
        <div className={styles.segmented}>
          {INSTRUMENT_OPTIONS.map((instrument) => (
            <button
              key={instrument.id}
              type="button"
              className={
                instrument.id === settings.instrument ? styles.segmentActive : styles.segment
              }
              disabled={disabled}
              onClick={() =>
                onChange({ ...settings, instrument: instrument.id as InstrumentId | 'random' })
              }
            >
              {instrument.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
