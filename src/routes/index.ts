import { Router } from 'express'
import { trace, metrics } from '@opentelemetry/api'
import type { ModuleContext } from '@mosaic/sdk'
import { getConfig, upsertConfig } from '../services/config.service.js'

const tracer = trace.getTracer('discord')
const meter  = metrics.getMeter('discord')
const httpReqs = meter.createCounter('discord_http_requests_total')

function track(name: string) {
  return (_req: any, _res: any, next: any) => {
    httpReqs.add(1, { route: name })
    const span = tracer.startSpan(name)
    _res.on('finish', () => span.end())
    next()
  }
}

export function createDiscordRouter(ctxRef: { current: ModuleContext | null }) {
  const router = Router()

  function db() {
    const c = ctxRef.current
    if (!c) throw new Error('Module context not initialised')
    return c.db.raw as any
  }

  router.get('/config', track('GET /config'), (req, res) => {
    res.json(getConfig(db(), req.userId!))
  })

  router.put('/config', track('PUT /config'), (req, res) => {
    const { channel_ids = '', guild_id = '' } = req.body
    upsertConfig(db(), req.userId!, { channel_ids, guild_id })
    res.json(getConfig(db(), req.userId!))
  })

  return router
}
