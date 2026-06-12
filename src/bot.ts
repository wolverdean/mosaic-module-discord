import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Message,
} from 'discord.js'
import type Database from 'better-sqlite3'
import type { ModuleLogger } from '@mosaic/sdk'
import { getChannelUserMap, getAllGuildIds } from './services/config.service.js'
import { createIdea } from './services/idea.service.js'

export function startBot(
  db: Database.Database,
  logger: ModuleLogger,
): Client | null {
  const token = process.env['DISCORD_BOT_TOKEN']
  if (!token) {
    logger.info('DISCORD_BOT_TOKEN not set — Discord bot disabled')
    return null
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  })

  client.once('ready', async () => {
    logger.info({ tag: client.user?.tag }, 'Discord bot connected')

    const guildIds = getAllGuildIds(db)
    if (!guildIds.length) return

    const appId = client.application!.id
    const rest  = new REST({ version: '10' }).setToken(token)
    const cmd   = new SlashCommandBuilder()
      .setName('idea')
      .setDescription('Save an idea to your Ideas-Lab')
      .addStringOption(opt =>
        opt.setName('title').setDescription('Idea title').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('notes').setDescription('Optional notes').setRequired(false)
      )
      .toJSON()

    for (const guildId of guildIds) {
      try {
        await rest.put(Routes.applicationGuildCommands(appId, guildId), { body: [cmd] })
        logger.info({ guildId }, 'registered /idea slash command')
      } catch (err) {
        logger.error({ err, guildId }, 'failed to register slash command')
      }
    }
  })

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'idea') return
    const slash = interaction as ChatInputCommandInteraction

    const channelMap = getChannelUserMap(db)
    const userId = channelMap[slash.channelId]

    if (!userId) {
      await slash.reply({
        content: '❌ This channel is not linked to an Ideas-Lab account. Configure it in Settings → Discord.',
        ephemeral: true,
      })
      return
    }

    const title = slash.options.getString('title', true)
    const notes = slash.options.getString('notes') ?? ''
    const id    = createIdea(db, userId, title, notes, 'discord')

    if (id) {
      await slash.reply({ content: `✅ Idea saved: **${title}**`, ephemeral: true })
      logger.info({ userId, ideaId: id, title }, 'idea created via /idea command')
    } else {
      await slash.reply({ content: '❌ Failed to save idea. Is Ideas-Lab installed?', ephemeral: true })
      logger.error({ userId, title }, 'failed to create idea from /idea command')
    }
  })

  client.on('messageCreate', (message: Message) => {
    if (message.author.bot) return

    const channelMap = getChannelUserMap(db)
    const userId = channelMap[message.channelId]
    if (!userId) return

    const text = message.content.trim()
    if (!text || text.length < 3 || text.startsWith('/')) return

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    const title = lines[0]!
    const notes = lines.slice(1).join('\n').slice(0, 2000)

    const id = createIdea(db, userId, title, notes, 'discord')
    if (id) {
      logger.info({ userId, ideaId: id, channelId: message.channelId }, 'idea created from message')
    } else {
      logger.error({ userId, channelId: message.channelId }, 'failed to create idea from message')
    }
  })

  client.login(token).catch(err => {
    logger.error({ err }, 'Discord bot login failed')
  })

  return client
}

export async function stopBot(client: Client | null): Promise<void> {
  if (!client) return
  try {
    await client.destroy()
  } catch {
    // Ignore errors on shutdown
  }
}
