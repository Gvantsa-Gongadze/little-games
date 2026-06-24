import { supabase } from './supabase'

export async function submitScore(game: string, score: number, userId: string, username?: string | null) {
  const { error } = await supabase
    .from('scores')
    .insert({ game, score, user_id: userId, username: username ?? null })

  if (error) throw error
}

export async function getLeaderboard(game: string, limit = 10) {
  const { data, error } = await supabase
    .from('scores')
    .select('score, user_id, username, created_at')
    .eq('game', game)
    .order('score', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}
