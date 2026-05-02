import { createClient } from '@supabase/supabase-js'

export type LeaderboardEntry = {
  id: string
  nickname: string
  score: number
  best_streak: number
  correct_answers: number
  wrong_answers: number
  game_seconds: number
  created_at: string
}

export type NewLeaderboardEntry = {
  nickname: string
  score: number
  bestStreak: number
  correctAnswers: number
  wrongAnswers: number
  gameSeconds: number
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const MAX_SCORE = 100000
const MAX_STREAK = 1000
const MAX_ANSWERS = 5000
const MAX_GAME_SECONDS = 86400

export const isLeaderboardConfigured = Boolean(supabaseUrl && supabaseAnonKey)

const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

export async function loadLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('leaderboard_scores')
    .select(
      'id,nickname,score,best_streak,correct_answers,wrong_answers,game_seconds,created_at',
    )
    .order('score', { ascending: false })
    .order('best_streak', { ascending: false })
    .limit(10)

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function saveLeaderboardEntry(entry: NewLeaderboardEntry) {
  if (!supabase) {
    throw new Error('Online tabulka zatím není připojená.')
  }

  const nickname = entry.nickname.trim().slice(0, 18)

  if (nickname.length < 2) {
    throw new Error('Zadej přezdívku alespoň se 2 znaky.')
  }

  if (
    entry.score < 0 ||
    entry.score > MAX_SCORE ||
    entry.bestStreak < 20 ||
    entry.bestStreak > MAX_STREAK ||
    entry.correctAnswers < entry.bestStreak ||
    entry.correctAnswers > MAX_ANSWERS ||
    entry.wrongAnswers < 0 ||
    entry.wrongAnswers > MAX_ANSWERS ||
    entry.gameSeconds < 0 ||
    entry.gameSeconds > MAX_GAME_SECONDS
  ) {
    throw new Error('Skóre nejde uložit, protože má neplatné hodnoty.')
  }

  const { error } = await supabase.from('leaderboard_scores').insert({
    nickname,
    score: entry.score,
    best_streak: entry.bestStreak,
    correct_answers: entry.correctAnswers,
    wrong_answers: entry.wrongAnswers,
    game_seconds: entry.gameSeconds,
  })

  if (error) {
    throw new Error(error.message)
  }
}
