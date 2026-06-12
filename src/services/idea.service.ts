import type Database from 'better-sqlite3'

export function createIdea(
  db: Database.Database,
  userId: number,
  title: string,
  notes: string,
  source: string,
): number | null {
  try {
    const result = db.prepare(`
      INSERT INTO ideas_lab_ideas (user_id, title, notes, priority, status, source, created_at, updated_at)
      VALUES (?, ?, ?, 'low', 'new', ?, datetime('now'), datetime('now'))
    `).run(userId, title.slice(0, 500), notes || '', source)
    return result.lastInsertRowid as number
  } catch {
    return null
  }
}
