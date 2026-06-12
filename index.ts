import type { ModuleManifest, ModuleContext } from '@mosaic/sdk'
import type { Client } from 'discord.js'
import { migrate } from './src/migrate.js'
import { createDiscordRouter } from './src/routes/index.js'
import { startBot, stopBot } from './src/bot.js'

const ctxRef: { current: ModuleContext | null } = { current: null }
let botClient: Client | null = null

const manifest: ModuleManifest = {
  name:    'Discord Bot',
  slug:    'discord',
  version: '1.0.0',
  sdk:     '0.1.0',

  migrate(db) {
    migrate(db)
  },

  router: createDiscordRouter(ctxRef),

  nav: undefined,

  onInit(ctx) {
    ctxRef.current = ctx
    botClient = startBot(ctx.db.raw as any, ctx.logger)
  },

  async onShutdown() {
    await stopBot(botClient)
    botClient = null
    ctxRef.current?.logger.info('discord module shut down')
  },

  health() {
    return {
      status: 'ok',
      module: 'discord',
      botConnected: botClient?.isReady() ?? false,
    }
  },
}

export default manifest
