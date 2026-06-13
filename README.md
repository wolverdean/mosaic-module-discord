# mosaic-module-discord

Discord bot module for the Mosaic framework. Runs a Discord bot in the background that watches designated channels and responds to slash commands, capturing ideas directly into the Ideas Lab module from Discord.

The module is **not visible in the shell sidebar** — it runs silently. It starts automatically when `DISCORD_BOT_TOKEN` is set in the framework's environment; if the variable is absent the module loads without error but the bot does not connect.

---

## Setup

### 1 — Create a Discord bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new Application → **Bot**
3. Under **Privileged Gateway Intents**, enable **Message Content Intent**
4. Copy the bot token

### 2 — Add to environment

In the framework's `.env`:

```
DISCORD_BOT_TOKEN=your-bot-token-here
```

Restart Mosaic. The bot connects automatically.

### 3 — Invite the bot to your server

Generate an invite URL in the Developer Portal with:
- Scopes: `bot`, `applications.commands`
- Permissions: **Send Messages**, **Read Message History**

### 4 — Configure watched channels

Use the config API or the Discord module settings to map Discord channel IDs to Mosaic user IDs.

---

## Features

| Feature | Detail |
|---|---|
| Watched channels | Messages posted in configured channels are automatically captured as Ideas Lab ideas |
| Slash commands | `/idea <text>` creates an idea from anywhere in the server |
| Channel mapping | Each Discord channel maps to a specific Mosaic user account |
| Health check | Bot connection status is reported in the shell Admin → System Health panel |

---

## API

Base path: `/api/discord/`

| Method | Path | Description |
|---|---|---|
| `GET` | `/config` | Retrieve Discord configuration (guild_id, mapped channel_ids) |
| `PUT` | `/config` | Update guild and channel-to-user mappings |

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| `discord.js` | ^14.26.4 | Discord API client and slash command handler |
| `express` | ^5.2.1 | HTTP server (provided by framework) |
| `@opentelemetry/api` | ^1.9.1 | Observability — bot connection metrics |

---

## Project structure

```
mosaic-module-discord/
├── index.ts            # Module manifest — onInit (bot start), onShutdown (graceful disconnect), health
├── src/
│   ├── routes/
│   │   └── index.ts    # Config router: GET/PUT /config
│   └── bot/            # Discord.js client, slash command registration, channel watcher
└── tests/
    └── unit/           # Vitest unit tests
```
