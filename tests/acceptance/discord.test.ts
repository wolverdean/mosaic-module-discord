import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import express from 'express'
import request from 'supertest'
import { migrate } from '../../src/migrate.js'
import { createDiscordRouter } from '../../src/routes/index.js'
import type { ModuleContext } from '@mosaic/sdk'

function makeApp() {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  db.prepare(`CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT)`).run()
  db.prepare(`INSERT INTO users VALUES (1, 'a@b.com')`).run()
  migrate(db)

  const ctxRef: { current: ModuleContext | null } = {
    current: {
      db:        { raw: db } as any,
      ai:        {} as any,
      logger:    { info: () => {}, error: () => {}, warn: () => {}, debug: () => {} } as any,
      store:     {} as any,
      events:    {} as any,
      notify:    {} as any,
      config:    {} as any,
      scheduler: {} as any,
      calendar:  {} as any,
      slug:      'discord',
    }
  }

  const app = express()
  app.use(express.json())
  app.use((req: any, _res, next) => { req.userId = 1; next() })
  app.use('/api/discord', createDiscordRouter(ctxRef))
  return app
}

describe('AC1 — GET /config returns defaults', () => {
  it('returns empty config for unconfigured user', async () => {
    const app = makeApp()
    const res = await request(app).get('/api/discord/config').expect(200)
    expect(res.body.channel_ids).toBe('')
    expect(res.body.guild_id).toBe('')
  })
})

describe('AC2 — PUT /config saves and returns config', () => {
  it('saves channel_ids and guild_id', async () => {
    const app = makeApp()
    const res = await request(app).put('/api/discord/config')
      .send({ channel_ids: '123456789,987654321', guild_id: '111222333' })
      .expect(200)
    expect(res.body.channel_ids).toBe('123456789,987654321')
    expect(res.body.guild_id).toBe('111222333')
  })

  it('updates existing config on second call', async () => {
    const app = makeApp()
    await request(app).put('/api/discord/config').send({ channel_ids: '111', guild_id: '999' })
    const res = await request(app).put('/api/discord/config')
      .send({ channel_ids: '222', guild_id: '888' }).expect(200)
    expect(res.body.channel_ids).toBe('222')
  })

  it('allows clearing config with empty strings', async () => {
    const app = makeApp()
    await request(app).put('/api/discord/config').send({ channel_ids: '111', guild_id: '999' })
    const res = await request(app).put('/api/discord/config')
      .send({ channel_ids: '', guild_id: '' }).expect(200)
    expect(res.body.channel_ids).toBe('')
  })
})

describe('AC3 — GET /config after PUT returns saved values', () => {
  it('round-trips config correctly', async () => {
    const app = makeApp()
    await request(app).put('/api/discord/config').send({ channel_ids: '555', guild_id: '777' })
    const res = await request(app).get('/api/discord/config').expect(200)
    expect(res.body.channel_ids).toBe('555')
    expect(res.body.guild_id).toBe('777')
  })
})
