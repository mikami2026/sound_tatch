import { useCallback, useEffect, useRef, useState } from 'react';
import {
  pickRandomNotes,
  displayLabel,
  NOTE_ORDER,
  WHITE_NOTE_ORDER,
  type NoteName,
} from '../audio/notes';
import { playNotes } from '../audio/soundEngine';
import { INSTRUMENTS, type InstrumentId } from '../audio/instruments';
import {
  readAllChallengeStats,
  persistAllChallengeStats,
  statsFor,
  difficultyKey,
  difficultyLabel,
  type ChallengeStatsMap,
} from '../game/challengeStats';

export type Phase =
  | 'idle'
  | 'reference'
  | 'gap'
  | 'question'
  | 'countdown'
  | 'reveal'
  | 'answering'
  | 'correct'
  | 'gameover';

// 'listen'=自動で答え合わせ、'challenge'=クリックで回答、
// 'practice'=出題なしで自由に鍵盤を鳴らす練習（進行はusePracticeKeyboardが持つ）
export type GameMode = 'listen' | 'challenge' | 'practice';

const NOTE_COUNT_CHOICES = [1, 2, 3] as const;
const INSTRUMENT_CHOICES = Object.keys(INSTRUMENTS) as InstrumentId[];

// 隠し要素: 挑戦者モードで「3音」を連続10回正解すると「5音」が解放される。
// 解放状態はlocalStorageに保存し、一度解放したら以降ずっと選べるようにする。
const FIVE_NOTE_UNLOCK_KEY = 'sound-tatch:fiveNoteUnlocked';
export const FIVE_NOTE_UNLOCK_STREAK = 10;
export const FIVE_NOTE_UNLOCK_COUNT = 3;

function readFiveNoteUnlocked(): boolean {
  try {
    return localStorage.getItem(FIVE_NOTE_UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

function persistFiveNoteUnlocked(): void {
  try {
    localStorage.setItem(FIVE_NOTE_UNLOCK_KEY, '1');
  } catch {
    // localStorageが使えない環境でも解放演出だけは機能させる（永続化は諦める）
  }
}

export interface GameSettings {
  referenceEnabled: boolean;
  includeBlackKeys: boolean;
  noteCount: 1 | 2 | 3 | 5 | 'random';
  instrument: InstrumentId | 'random';
  mode: GameMode;
}

const REFERENCE_NOTE: NoteName = 'ド';
const REFERENCE_DURATION_MS = 900;
const GAP_DURATION_MS = 300;
const QUESTION_DURATION_MS = 900;
const THINKING_DURATION_MS = 1000;
const REVEAL_DISPLAY_MS = 2000;
const CORRECT_DISPLAY_MS = 600;

function pickFrom<T>(choices: readonly T[]): T {
  return choices[Math.floor(Math.random() * choices.length)];
}

// ゲームオーバー時の文言。過去の自己ベストを更新したときだけお祝い表示にし、
// それ以外は従来どおりのシンプルな「残念…」で正解を示す（慰め文言は出さない）。
// 初回（過去記録なし）は超える対象がなく「更新」にならないので、普通の文言にする。
// フェーズ遷移の瞬間に1回だけ生成して保持し、再レンダーで文言が揺れないようにする。
function buildGameoverMessage(
  streak: number,
  bestBeforeGame: number,
  notes: NoteName[],
): string {
  const suffix = `正解は「${notes.map(displayLabel).join('・')}」でした`;

  if (bestBeforeGame > 0 && streak > bestBeforeGame) {
    return `🎉 自己ベスト更新！${streak}連続！ ${suffix}`;
  }
  return `残念…${suffix}`;
}

export function useGameSequence(settings: GameSettings) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [questionNotes, setQuestionNotes] = useState<NoteName[]>([]);
  const [selectedNotes, setSelectedNotes] = useState<NoteName[]>([]);
  const [wrongNote, setWrongNote] = useState<NoteName | null>(null);
  const [streak, setStreak] = useState(0);
  const [replayAvailable, setReplayAvailable] = useState(false);
  const [fiveNoteUnlocked, setFiveNoteUnlocked] = useState(readFiveNoteUnlocked);
  // 解放した瞬間だけtrueにするお祝い演出用フラグ（ユーザーが閉じるまで表示）。
  const [justUnlocked, setJustUnlocked] = useState(false);

  // 挑戦者モードの永続成績。難易度（音数×黒鍵）ごとに別々に持つ。localStorage連動。
  const [statsMap, setStatsMap] = useState<ChallengeStatsMap>(readAllChallengeStats);
  // 今回の挑戦で自己ベストを超えたか（超えた瞬間から演出を出しっぱなしにする）。
  const [beatBest, setBeatBest] = useState(false);
  // ゲームオーバー時に1回だけ生成して固定する文言。
  const [gameoverMessage, setGameoverMessage] = useState('');

  // 今選んでいる設定に対応する難易度キー／記録／ラベル。
  // idleで設定を変えると、その難易度の記録に表示が切り替わる。
  const currentKey = difficultyKey(settings.noteCount, settings.includeBlackKeys);
  const currentStats = statsFor(statsMap, currentKey);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // イベントハンドラ（answerNote）から常に最新値を読むためのref。
  // Strict Modeはstateの関数形更新（setState(prev => ...)）を副作用検査のため
  // 二重実行することがあるため、副作用（setPhase等）はref経由の値で判定し、
  // 更新関数の中には入れない設計にしている。
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;
  const questionNotesRef = useRef<NoteName[]>([]);
  questionNotesRef.current = questionNotes;
  const selectedNotesRef = useRef<NoteName[]>([]);
  selectedNotesRef.current = selectedNotes;
  const replayAvailableRef = useRef(false);
  replayAvailableRef.current = replayAvailable;
  const streakRef = useRef(0);
  streakRef.current = streak;
  const fiveNoteUnlockedRef = useRef(fiveNoteUnlocked);
  fiveNoteUnlockedRef.current = fiveNoteUnlocked;
  const statsMapRef = useRef(statsMap);
  statsMapRef.current = statsMap;
  // 今回の挑戦の難易度キー（開始時に確定）。プレイ中は設定がロックされるため一定。
  const gameKeyRef = useRef(currentKey);
  // 今回の挑戦を始めた時点での自己ベスト（ベスト更新判定・演出に使う）。
  const bestBeforeGameRef = useRef(currentStats.bestStreak);

  // 成績マップを更新してlocalStorageにも保存する。副作用（保存）は更新関数の外で
  // 行い、Strict Modeの二重実行に巻き込まれないようにする。
  const commitStatsMap = useCallback((next: ChallengeStatsMap) => {
    statsMapRef.current = next;
    persistAllChallengeStats(next);
    setStatsMap(next);
  }, []);

  // そのラウンドの問題再生に使った音色（'random'解決後の実際の値）を覚えておき、
  // 「もう一度聞く」でも同じ音色で再生できるようにする。
  const roundInstrumentRef = useRef<InstrumentId>('triangle');

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
    setSelectedNotes([]);
    setWrongNote(null);
    setReplayAvailable(false);

    // 「ランダム」設定はラウンド開始時に1回だけ解決し、基準音・問題音の両方で
    // 同じ音色を使う（ラウンドの途中で音色が変わると比較にならないため）。
    const noteCount = current.noteCount === 'random' ? pickFrom(NOTE_COUNT_CHOICES) : current.noteCount;
    const instrument =
      current.instrument === 'random' ? pickFrom(INSTRUMENT_CHOICES) : current.instrument;
    const pool = current.includeBlackKeys ? NOTE_ORDER : WHITE_NOTE_ORDER;

    roundInstrumentRef.current = instrument;
    const notes = pickRandomNotes(noteCount, pool);
    setQuestionNotes(notes);

    const beginQuestion = () => {
      setPhase('question');
      playNotes(notes, instrument, QUESTION_DURATION_MS);
      schedule(() => {
        if (current.mode === 'challenge') {
          // 挑戦者モードは回答時間無制限。鍵盤クリック（answerNote）を待つ。
          // 「もう一度聞く」は1ラウンドにつき1回だけ使える。
          setReplayAvailable(true);
          setPhase('answering');
        } else {
          setPhase('countdown');
          schedule(() => {
            setPhase('reveal');
            // ユーザー操作を待たず、一定時間表示したら自動で次のラウンドへ進む
            schedule(() => startRoundRef.current(), REVEAL_DISPLAY_MS);
          }, THINKING_DURATION_MS);
        }
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

  // 「スタート」（idleから）と「もう一度」（gameoverから）は同じ動作:
  // 連続正解数をリセットして新しい挑戦を始める。
  const start = useCallback(() => {
    setStreak(0);
    if (settingsRef.current.mode === 'challenge') {
      // 今回の難易度キーを確定し、その記録に対して挑戦回数を+1。
      const key = difficultyKey(
        settingsRef.current.noteCount,
        settingsRef.current.includeBlackKeys,
      );
      gameKeyRef.current = key;
      const cur = statsFor(statsMapRef.current, key);
      bestBeforeGameRef.current = cur.bestStreak;
      setBeatBest(false);
      commitStatsMap({
        ...statsMapRef.current,
        [key]: { ...cur, totalGames: cur.totalGames + 1 },
      });
    }
    startRound();
  }, [startRound, commitStatsMap]);

  const stop = useCallback(() => {
    clearTimers();
    setPhase('idle');
  }, [clearTimers]);

  // 挑戦者モードで鍵盤をクリックしたときの回答判定。
  const answerNote = useCallback(
    (note: NoteName) => {
      if (phaseRef.current !== 'answering') return;
      const notes = questionNotesRef.current;

      if (!notes.includes(note)) {
        clearTimers();
        setWrongNote(note);
        setGameoverMessage(
          buildGameoverMessage(streakRef.current, bestBeforeGameRef.current, notes),
        );
        setPhase('gameover');
        return;
      }

      if (selectedNotesRef.current.includes(note)) return; // 既に正解済みの音は無視

      const next = [...selectedNotesRef.current, note];
      setSelectedNotes(next);

      if (next.length === notes.length) {
        // 全音正解: 少し表示してから自動で次のラウンドへ
        const nextStreak = streakRef.current + 1;
        setStreak(nextStreak);

        // 今回の難易度の記録を更新（累計正解＋1、自己ベストは最大値を保持）。
        const key = gameKeyRef.current;
        const cur = statsFor(statsMapRef.current, key);
        commitStatsMap({
          ...statsMapRef.current,
          [key]: {
            bestStreak: Math.max(cur.bestStreak, nextStreak),
            totalCorrect: cur.totalCorrect + 1,
            totalGames: cur.totalGames,
          },
        });
        // 過去記録を上回った瞬間から「更新中」演出を出す（初回＝記録なしは出さない）。
        if (bestBeforeGameRef.current > 0 && nextStreak > bestBeforeGameRef.current) {
          setBeatBest(true);
        }

        // 隠し要素の解放判定: 「3音」設定で連続10回正解に到達したら「5音」を解放。
        // noteCountは実行中ロックされるため、このラウンド＝3音固定と判断できる。
        if (
          !fiveNoteUnlockedRef.current &&
          settingsRef.current.noteCount === FIVE_NOTE_UNLOCK_COUNT &&
          nextStreak >= FIVE_NOTE_UNLOCK_STREAK
        ) {
          persistFiveNoteUnlocked();
          setFiveNoteUnlocked(true);
          setJustUnlocked(true);
          // お祝い表示中はゲームを一時停止。次のラウンドはユーザーが
          // オーバーレイを閉じた（dismissUnlock）ときに開始する。
          setPhase('correct');
          return;
        }

        setPhase('correct');
        schedule(() => startRoundRef.current(), CORRECT_DISPLAY_MS);
      }
    },
    [clearTimers, schedule, commitStatsMap],
  );

  // 挑戦者モード用「もう一度聞く」。1ラウンドにつき1回だけ、同じ音色・同じ問題音を再生する。
  const replay = useCallback(() => {
    if (phaseRef.current !== 'answering' || !replayAvailableRef.current) return;
    setReplayAvailable(false);
    playNotes(questionNotesRef.current, roundInstrumentRef.current, QUESTION_DURATION_MS);
  }, []);

  const dismissUnlock = useCallback(() => {
    setJustUnlocked(false);
    // 一時停止していたゲームを再開し、次のラウンドへ進む。
    startRoundRef.current();
  }, []);

  return {
    phase,
    questionNotes,
    selectedNotes,
    wrongNote,
    streak,
    replayAvailable,
    fiveNoteUnlocked,
    justUnlocked,
    bestStreak: currentStats.bestStreak,
    totalCorrect: currentStats.totalCorrect,
    totalGames: currentStats.totalGames,
    difficultyLabel: difficultyLabel(settings.noteCount, settings.includeBlackKeys),
    beatBest,
    gameoverMessage,
    start,
    stop,
    answerNote,
    replay,
    dismissUnlock,
  };
}
