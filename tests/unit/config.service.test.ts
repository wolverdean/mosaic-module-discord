import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { migrate } from '../../src/migrate.js'
import {
  getConfig, upsertConfig, getChannelUserMap,
} from '../../src/services/config.service.js'

function makeDb() {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  db.prepare(`CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT)`).run()
  db.prepare(`INSERT INTO users VALUES (1, 'a@b.com')`).run()
  db.prepare(`INSERT INTO users VALUES (2, 'c@d.com')`).run()
  migrate(db)
  return db
}

describe('getConfig', () => {
  it('returns empty defaults when no config exists', () => {
    const db = makeDb()
    const cfg = getConfig(db, 1)
    expect(cfg.channel_ids).toBe('')
    expect(cfg.guild_id).toBe('')
  })

  it('returns saved config', () => {
    const db = makeDb()
    upsertConfig(db, 1, { channel_ids: '111,222', guild_id: '999' })
    const cfg = getConfig(db, 1)
    expect(cfg.channel_ids).toBe('111,222')
    expect(cfg.guild_id).toBe('999')
  })
})

describe('upsertConfig', () => {
  it('inserts on first call', () => {
    const db = makeDb()
    upsertConfig(db, 1, { channel_ids: '123', guild_id: '456' })
    expect(getConfig(db, 1).channel_ids).toBe('123')
  })

  it('updates on subsequent calls', () => {
    const db = makeDb()
    upsertConfig(db, 1, { channel_ids: '111', guild_id: '999' })
    upsertConfig(db, 1, { channel_ids: '222', guild_id: '888' })
    const cfg = getConfig(db, 1)
    expect(cfg.channel_ids).toBe('222')
    expect(cfg.guild_id).toBe('888')
  })
})

describe('getChannelUserMap', () => {
  it('returns empty map when no configs exist', () => {
    const db = makeDb()
    expect(getChannelUserMap(db)).toEqual({})
  })

  it('maps channel IDs to user IDs', () => {
    const db = makeDb()
    upsertConfig(db, 1, { channel_ids: '111,222', guild_id: '999' })
    const map = getChannelUserMap(db)
    expect(map['111']).toBe(1)
    expect(map['222']).toBe(1)
  })

  it('handles multiple users with different channels', () => {
    const db = makeDb()
    upsertConfig(db, 1, { channel_ids: '111', guild_id: '999' })
    upsertConfig(db, 2, { channel_ids: '333', guild_id: '888' })
    const map = getChannelUserMap(db)
    expect(map['111']).toBe(1)
    expect(map['333']).toBe(2)
  })

  it('ignores empty channel_ids', () => {
    const db = makeDb()
    upsertConfig(db, 1, { channel_ids: '', guild_id: '999' })
    const map = getChannelUserMap(db)
    expect(Object.keys(map)).toHaveLength(0)
  })

  it('trims whitespace from channel IDs', () => {
    const db = makeDb()
    upsertConfig(db, 1, { channel_ids: '  111 , 222  ', guild_id: '999' })
    const map = getChannelUserMap(db)
    expect(map['111']).toBe(1)
    expect(map['222']).toBe(1)
  })
})
