import { supabase } from './supabase'

export interface GameProgress {
  level:     number
  bestScore: number
}

export async function loadProgress(game: string, userId: string): Promise<GameProgress | null> {
  const { data, error } = await supabase
    .from('game_progress')
    .select('level, best_score')
    .eq('user_id', userId)
    .eq('game', game)
    .maybeSingle()

  if (error || !data) return null
  return { level: data.level, bestScore: data.best_score }
}

export async function saveProgress(game: string, userId: string, level: number, score: number) {
  const existing  = await loadProgress(game, userId)
  const bestScore = Math.max(score, existing?.bestScore ?? 0)

  const { error } = await supabase
    .from('game_progress')
    .upsert(
      { user_id: userId, game, level, best_score: bestScore, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,game' },
    )

  if (error) console.error('saveProgress failed:', error.message)
}
