// 挑戦者モードの成績をブラウザのlocalStorageに保存する。
// サーバーは使わず、その人自身のブラウザの中だけに記録が残る
// （5音モード解放と同じ方式）。ブラウザを閉じても・再起動しても維持され、
// 消えるのはサイトデータを手動削除したときなど。
//
// 記録は難易度（同時出題数×黒鍵の有無）ごとに別々に持つ。1音・白鍵のみと
// 3音・黒鍵ありでは難しさが段違いなので、同じ土俵で比較しないようにするため。
const STATS_KEY = 'sound-tatch:challengeStatsByDifficulty';

export interface ChallengeStats {
  bestStreak: number; // 自己ベスト連続正解数
  totalCorrect: number; // 累計正解ラウンド数
  totalGames: number; // 挑戦回数（スタート／もう一度した回数）
}

// 難易度キーごとの記録。キーは difficultyKey() で作る（例: "3-black"）。
export type ChallengeStatsMap = Record<string, ChallengeStats>;

export const EMPTY_STATS: ChallengeStats = { bestStreak: 0, totalCorrect: 0, totalGames: 0 };

// 音数と黒鍵有無から記録の保存キーを作る。noteCountは 'random' もそのまま
// 独立した難易度として扱う（毎ラウンド音数が変わるため別カテゴリ）。
export function difficultyKey(noteCount: number | 'random', includeBlackKeys: boolean): string {
  return `${noteCount}-${includeBlackKeys ? 'black' : 'white'}`;
}

// 表示用の難易度ラベル（例: "3音・黒鍵あり"）。
export function difficultyLabel(noteCount: number | 'random', includeBlackKeys: boolean): string {
  const count = noteCount === 'random' ? '音数ランダム' : `${noteCount}音`;
  return `${count}・${includeBlackKeys ? '黒鍵あり' : '白鍵のみ'}`;
}

function normalizeStats(v: Partial<ChallengeStats> | undefined): ChallengeStats {
  return {
    bestStreak: Number(v?.bestStreak) || 0,
    totalCorrect: Number(v?.totalCorrect) || 0,
    totalGames: Number(v?.totalGames) || 0,
  };
}

export function readAllChallengeStats(): ChallengeStatsMap {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<ChallengeStats>>;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: ChallengeStatsMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      out[key] = normalizeStats(value);
    }
    return out;
  } catch {
    return {};
  }
}

export function persistAllChallengeStats(map: ChallengeStatsMap): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(map));
  } catch {
    // localStorageが使えない環境でも実行中の表示は機能させる（永続化は諦める）
  }
}

// 指定キーの記録を取り出す（未プレイなら空の記録）。
export function statsFor(map: ChallengeStatsMap, key: string): ChallengeStats {
  return map[key] ?? { ...EMPTY_STATS };
}
