import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { migrate } from '../../src/migrate.js'
import { createIdea } from '../../src/services/idea.service.js'

function makeDb() {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  db.prepare(`CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT)`).run()
  db.prepare(`INSERT INTO users VALUES (1, 'a@b.com')`).run()
  migrate(db)
  // Simulate the ideas-lab table existing
  db.prepare(`
    CREATE TABLE IF NOT EXISTS ideas_lab_ideas (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      title      TEXT    NOT NULL,
      notes      TEXT    NOT NULL DEFAULT '',
      priority   TEXT    NOT NULL DEFAULT 'low',
      status     TEXT    NOT NULL DEFAULT 'new',
      source     TEXT    NOT NULL DEFAULT 'manual',
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `).run()
  return db
}

describe('createIdea', () => {
  it('inserts an idea and returns its id', () => {
    const db = makeDb()
    const id = createIdea(db, 1, 'Test idea', '', 'discord')
    expect(id).toBeGreaterThan(0)
  })

  it('persists title and notes', () => {
    const db = makeDb()
    const id = createIdea(db, 1, 'My title', 'some notes', 'discord')
    const row = db.prepare(`SELECT * FROM ideas_lab_ideas WHERE id = ?`).get(id) as any
    expect(row.title).toBe('My title')
    expect(row.notes).toBe('some notes')
    expect(row.source).toBe('discord')
  })

  it('truncates title to 500 characters', () => {
    const db = makeDb()
    const longTitle = 'x'.repeat(600)
    const id = createIdea(db, 1, longTitle, '', 'discord')
    const row = db.prepare(`SELECT title FROM ideas_lab_ideas WHERE id = ?`).get(id) as any
    expect(row.title.length).toBe(500)
  })

  it('returns null when ideas_lab_ideas table does not exist', () => {
    const db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    db.prepare(`CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT)`).run()
    db.prepare(`INSERT INTO users VALUES (1, 'a@b.com')`).run()
    migrate(db)
    // No ideas_lab_ideas table
    const id = createIdea(db, 1, 'Test', '', 'discord')
    expect(id).toBeNull()
  })

  it('sets status=new and priority=low', () => {
    const db = makeDb()
    const id = createIdea(db, 1, 'Idea', '', 'discord')
    const row = db.prepare(`SELECT * FROM ideas_lab_ideas WHERE id = ?`).get(id) as any
    expect(row.status).toBe('new')
    expect(row.priority).toBe('low')
  })
})
