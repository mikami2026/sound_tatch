import { useCallback, useEffect, useRef, useState } from 'react';
import { pickRandomNotes, NOTE_ORDER, WHITE_NOTE_ORDER, type NoteName } from '../audio/notes';
import { playNotes } from '../audio/soundEngine';
import { INSTRUMENTS, type InstrumentId } from '../audio/instruments';

export type Phase = 'idle' | 'reference' | 'gap' | 'question' | 'countdown' | 'reveal';

const NOTE_COUNT_CHOICES = [1, 2, 3] as const;
const INSTRUMENT_CHOICES = Object.keys(INSTRUMENTS) as InstrumentId[];

export interface GameSettings {
  referenceEnabled: boolean;
  includeBlackKeys: boolean;
  noteCount: 1 | 2 | 3 | 'random';
  instrument: InstrumentId | 'random';
}

const REFERENCE_NOTE: NoteName = 'ド';
const REFERENCE_DURATION_MS = 900;
const GAP_DURATION_MS = 300;
const QUESTION_DURATION_MS = 900;
const THINKING_DURATION_MS = 1000;
const REVEAL_DISPLAY_MS = 2000;

function pickFrom<T>(choices: readonly T[]): T {
  return choices[Math.floor(Math.random() * choices.length)];
}

export function useGameSequence(settings: GameSettings) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [questionNotes, setQuestionNotes] = useState<NoteName[]>([]);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const schedule = useCallback((fn: () => void, delayMs: number) => {
    const id = setTimeout(fn, delayMs);
    timers.current.push(id);
  }, []);

  // startRoundは自分自身を再帰的にスケジュールするが、useCallback同士の循環参照を
  // 避けるためrefで最新の関数を保持し、reveal完了後はref経由で呼び出す。
  const startRoundRef = useRef<() => void>(() => {});

  const startRound = useCallback(() => {
    clearTimers();
    const current = settingsRef.current;

    // 「ランダム」設定はラウンド開始時に1回だけ解決し、基準音・問題音の両方で
    // 同じ音色を使う（ラウンドの途中で音色が変わると比較にならないため）。
    const noteCount = current.noteCount === 'random' ? pickFrom(NOTE_COUNT_CHOICES) : current.noteCount;
    const instrument =
      current.instrument === 'random' ? pickFrom(INSTRUMENT_CHOICES) : current.instrument;
    const pool = current.includeBlackKeys ? NOTE_ORDER : WHITE_NOTE_ORDER;

    const notes = pickRandomNotes(noteCount, pool);
    setQuestionNotes(notes);

    const beginQuestion = () => {
      setPhase('question');
      playNotes(notes, instrument, QUESTION_DURATION_MS);
      schedule(() => {
        setPhase('countdown');
        schedule(() => {
          setPhase('reveal');
          // ユーザー操作を待たず、一定時間表示したら自動で次のラウンドへ進む
          schedule(() => startRoundRef.current(), REVEAL_DISPLAY_MS);
        }, THINKING_DURATION_MS);
      }, QUESTION_DURATION_MS);
    };

    if (current.referenceEnabled) {
      setPhase('reference');
      playNotes([REFERENCE_NOTE], instrument, REFERENCE_DURATION_MS);
      schedule(() => {
        setPhase('gap');
        schedule(beginQuestion, GAP_DURATION_MS);
      }, REFERENCE_DURATION_MS);
    } else {
      beginQuestion();
    }
  }, [clearTimers, schedule]);

  useEffect(() => {
    startRoundRef.current = startRound;
  }, [startRound]);

  const stop = useCallback(() => {
    clearTimers();
    setPhase('idle');
  }, [clearTimers]);

  return { phase, questionNotes, start: startRound, stop };
}
