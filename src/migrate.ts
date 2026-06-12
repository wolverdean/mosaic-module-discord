import type Database from 'better-sqlite3'

export function migrate(db: Database.Database): void {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS discord_config (
      user_id     INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      channel_ids TEXT    NOT NULL DEFAULT '',
      guild_id    TEXT    NOT NULL DEFAULT ''
    )
  `).run()
}
