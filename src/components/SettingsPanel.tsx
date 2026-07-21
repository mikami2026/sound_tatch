import type { GameSettings } from '../hooks/useGameSequence';
import { INSTRUMENTS, type InstrumentId } from '../audio/instruments';
import styles from '../styles/SettingsPanel.module.css';

interface SettingsPanelProps {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  disabled: boolean;
}

const NOTE_COUNT_OPTIONS = [1, 2, 3, 'random'] as const;
const INSTRUMENT_OPTIONS = [...Object.values(INSTRUMENTS), { id: 'random' as const, label: 'ランダム' }];

export function SettingsPanel({ settings, onChange, disabled }: SettingsPanelProps) {
  return (
    <div className={styles.panel}>
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
          {NOTE_COUNT_OPTIONS.map((count) => (
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
