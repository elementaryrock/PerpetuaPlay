# Discord 24/7 Music Bot

<div align="center">
  <img src="logo/logo.png" alt="Discord Music Bot Logo" width="200" height="200">
</div>

A resource-efficient Discord bot that plays a looping playlist 24/7 in a voice channel. Built with Node.js, discord.js, and play-dl.

---

## Features

- Plays a user-defined playlist of YouTube URLs in a Discord voice channel
- 24/7 looping playback
- Robust reconnection and error handling
- Simple commands: `!play`, `!stop`, `!skip`, `!nowplaying`, `!join`, `!leave`

---

## Setup & Running Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd "Discord Music bot"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure the Bot

#### Set your Discord Bot Token

Create a `.env` file in the project root:

```env
DISCORD_TOKEN=your_bot_token_here
```


#### Configure Your Playlist

Edit `config/playlist.json` with your YouTube URLs:

```json
[
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "https://www.youtube.com/watch?v=3JZ_D3ELwOQ"
]
```

### 4. Validate Configuration (Recommended)

```bash
# Test bot token
npm run test:token

# Validate all playlist URLs
npm run test:playlist

# Complete configuration check
npm run config:validate
```

### 5. Start the Bot

#### Quick Start

```bash
./start.sh
```

#### Manual Start

```bash
npm start
```

#### Production (24/7 with PM2)

```bash
npm run pm2:start
```

### 6. Available Commands

- `!play` — Join your voice channel and start looping the playlist
- `!stop` — Stop playback and leave the channel
- `!skip` — Skip to the next song
- `!nowplaying` or `!np` — Show the current song with details
- `!join` — Join your voice channel
- `!leave` — Leave the voice channel
- `!help` — Show available commands

### 7. Production Deployment (Azure VM)


Quick production start:

```bash
npm install -g pm2
npm run pm2:start
pm2 save
pm2 startup
```

---

## License

MIT
