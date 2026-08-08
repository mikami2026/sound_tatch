import { useCallback, useEffect, useRef, useState } from 'react';
import type { NoteName } from '../audio/notes';
import { playNotes } from '../audio/soundEngine';
import { INSTRUMENTS, type InstrumentId } from '../audio/instruments';
import type { GameSettings } from './useGameSequence';

// 練習モードで鍵盤を1回押したときに鳴らす長さ。
// ゲームの問題音（QUESTION_DURATION_MS）と同じにして、聞こえ方を揃える。
const PRACTICE_DURATION_MS = 900;

const INSTRUMENT_CHOICES = Object.keys(INSTRUMENTS) as InstrumentId[];

/**
 * 練習モード（自由に鍵盤を押して音を確かめるモード）の状態。
 * ゲーム進行（出題・判定）は一切持たず、押された鍵盤を鳴らして光らせるだけ。
 * 素早く続けて押すと複数の鍵盤が同時に光る（和音を作れる）ので、
 * 光っている音は「押した鍵盤」ごとに個別のタイマーで消す。
 */
export function usePracticeKeyboard(settings: GameSettings) {
  const [litNotes, setLitNotes] = useState<NoteName[]>([]);
  // 直近に押した音（ステータス表示用。オクターブ付きのラベルを出す）。
  const [lastNote, setLastNote] = useState<NoteName | null>(null);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const litTimers = useRef(new Map<NoteName, ReturnType<typeof setTimeout>>());

  const clearLitTimers = useCallback(() => {
    litTimers.current.forEach(clearTimeout);
    litTimers.current.clear();
  }, []);

  useEffect(() => clearLitTimers, [clearLitTimers]);

  const playNote = useCallback((note: NoteName) => {
    const current = settingsRef.current;
    // 「ランダム」音色は押すたびに引き直す（毎回ちがう楽器で同じ音を聞ける）。
    const instrument =
      current.instrument === 'random'
        ? INSTRUMENT_CHOICES[Math.floor(Math.random() * INSTRUMENT_CHOICES.length)]
        : current.instrument;

    playNotes([note], instrument, PRACTICE_DURATION_MS);
    setLastNote(note);
    setLitNotes((prev) => (prev.includes(note) ? prev : [...prev, note]));

    // 同じ鍵盤を連打したときは前回の消灯タイマーを捨てて延長する。
    const running = litTimers.current.get(note);
    if (running) clearTimeout(running);
    litTimers.current.set(
      note,
      setTimeout(() => {
        litTimers.current.delete(note);
        setLitNotes((prev) => prev.filter((n) => n !== note));
      }, PRACTICE_DURATION_MS),
    );
  }, []);

  // モードを抜けたときなどに光りっぱなしを残さないためのリセット。
  const reset = useCallback(() => {
    clearLitTimers();
    setLitNotes([]);
    setLastNote(null);
  }, [clearLitTimers]);

  return { litNotes, lastNote, playNote, reset };
}
