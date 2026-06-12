import type Database from 'better-sqlite3'

export interface DiscordConfig {
  user_id:     number
  channel_ids: string
  guild_id:    string
}

export function getConfig(db: Database.Database, userId: number): DiscordConfig {
  return (db.prepare(
    `SELECT user_id, channel_ids, guild_id FROM discord_config WHERE user_id = ?`
  ).get(userId) as DiscordConfig | undefined) ?? { user_id: userId, channel_ids: '', guild_id: '' }
}

export function upsertConfig(
  db: Database.Database,
  userId: number,
  data: { channel_ids: string; guild_id: string },
) {
  db.prepare(`
    INSERT INTO discord_config (user_id, channel_ids, guild_id)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      channel_ids = excluded.channel_ids,
      guild_id    = excluded.guild_id
  `).run(userId, data.channel_ids, data.guild_id)
}

export function getChannelUserMap(db: Database.Database): Record<string, number> {
  const rows = db.prepare(
    `SELECT user_id, channel_ids FROM discord_config WHERE channel_ids != ''`
  ).all() as { user_id: number; channel_ids: string }[]

  const map: Record<string, number> = {}
  for (const row of rows) {
    const ids = row.channel_ids.split(',').map(s => s.trim()).filter(Boolean)
    for (const id of ids) map[id] = row.user_id
  }
  return map
}

export function getAllGuildIds(db: Database.Database): string[] {
  const rows = db.prepare(
    `SELECT DISTINCT guild_id FROM discord_config WHERE guild_id != ''`
  ).all() as { guild_id: string }[]
  return rows.map(r => r.guild_id)
}
