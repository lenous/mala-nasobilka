import { createClient } from '@supabase/supabase-js';

// ─── Supabase klient ──────────────────────────────────────────────────────────

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string | undefined;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isLeaderboardConfigured =
    Boolean(supabaseUrl && supabaseKey &&
                supabaseUrl !== 'your-project-url' &&
                supabaseKey !== 'your-anon-key');

const supabase = isLeaderboardConfigured
  ? createClient(supabaseUrl!, supabaseKey!)
    : null;

// ─── Typy ─────────────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
    id: string;
    nickname: string;
    score: number;
    best_streak: number;
    correct_answers: number;
    wrong_answers: number;
    game_seconds: number;
    multipliers: number[];
    difficulty_label: string;
    created_at: string;
}

export interface NewLeaderboardEntry {
    nickname: string;
    score: number;
    bestStreak: number;
    correctAnswers: number;
    wrongAnswers: number;
    gameSeconds: number;
    multipliers: number[];
}

// ─── Validační konstanty ──────────────────────────────────────────────────────

const MAX_SCORE        = 100_000;
const MAX_STREAK       = 1_000;
const MAX_ANSWERS      = 5_000;
const MAX_GAME_SECONDS = 86_400;

// ─── Obtížnost ────────────────────────────────────────────────────────────────

export function getDifficultyLabel(multipliers: number[]): string {
    if (multipliers.length === 0) return 'Neznámá';

  const avg = multipliers.reduce((a, b) => a + b, 0) / multipliers.length;
    const countSuffix = multipliers.length > 1 ? ` · ${multipliers.length}×` : '';

  let level: string;
    if (avg <= 3)      level = '⭐ Snadná';
    else if (avg <= 6) level = '⭐⭐ Střední';
    else               level = '⭐⭐⭐ Těžká';

  return level + countSuffix;
}

// ─── Načtení žebříčku ─────────────────────────────────────────────────────────

export async function loadLeaderboard(): Promise<LeaderboardEntry[]> {
    if (!supabase) return [];

  const { data, error } = await supabase
      .from('leaderboard_scores')
      .select('id, nickname, score, best_streak, correct_answers, wrong_answers, game_seconds, multipliers, difficulty_label, created_at')
      .order('score',       { ascending: false })
      .order('best_streak', { ascending: false })
      .limit(20);

  if (error) throw new Error(`Chyba načítání žebříčku: ${error.message}`);
    return (data ?? []) as LeaderboardEntry[];
}

// ─── Uložení skóre ────────────────────────────────────────────────────────────

export async function saveLeaderboardEntry(entry: NewLeaderboardEntry): Promise<void> {
    if (!supabase) throw new Error('Leaderboard není nakonfigurován.');

  const { nickname, score, bestStreak, correctAnswers, wrongAnswers, gameSeconds, multipliers } = entry;

  if (nickname.length < 2 || nickname.length > 18)
        throw new Error('Přezdívka musí mít 2–18 znaků.');
    if (score < 0 || score > MAX_SCORE)
          throw new Error('Neplatné skóre.');
    if (bestStreak < 20 || bestStreak > MAX_STREAK)
          throw new Error('Série musí být alespoň 20.');
    if (correctAnswers < bestStreak || correctAnswers > MAX_ANSWERS)
          throw new Error('Neplatný počet správných odpovědí.');
    if (wrongAnswers < 0 || wrongAnswers > MAX_ANSWERS)
          throw new Error('Neplatný počet špatných odpovědí.');
    if (gameSeconds < 0 || gameSeconds > MAX_GAME_SECONDS)
          throw new Error('Neplatný čas hry.');

  const difficulty_label = getDifficultyLabel(multipliers);

  const { error } = await supabase
      .from('leaderboard_scores')
      .insert({
              nickname,
              score,
              best_streak:     bestStreak,
              correct_answers: correctAnswers,
              wrong_answers:   wrongAnswers,
              game_seconds:    gameSeconds,
              multipliers:     multipliers,
              difficulty_label,
      });

  if (error) throw new Error(`Chyba uložení: ${error.message}`);
}
