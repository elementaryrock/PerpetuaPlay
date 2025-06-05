// Discord 24/7 Music Bot - Main Entry Point
// Core logic for connecting to Discord, handling commands, and playing music

require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
} = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  NoSubscriberBehavior,
  getVoiceConnection,
  entersState,
} = require("@discordjs/voice");
const playdl = require("play-dl");
const path = require("path");
const fs = require("fs");

// Load config and playlist
const config = require("./config/config");
const playlistPath = path.join(__dirname, "config", "playlist.json");
let playlist = config.playlist || [];
if (fs.existsSync(playlistPath)) {
  try {
    playlist = JSON.parse(fs.readFileSync(playlistPath, "utf8"));
  } catch (e) {
    console.error("Failed to load playlist.json:", e);
  }
}

if (!playlist.length) {
  console.error("No playlist found! Please add songs to config/playlist.json");
  process.exit(1);
}

const TOKEN = config.token || process.env.DISCORD_TOKEN;
if (!TOKEN) {
  console.error("Bot token not set! See docs/config_guide.md");
  process.exit(1);
}

console.log(`Loaded ${playlist.length} songs in playlist`);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// Playback state
let currentIndex = 0;
let isPlaying = false;
let audioPlayer = null;
let textChannel = null;
let voiceChannel = null;
let connection = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Logging helper
function log(message, level = "INFO") {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

async function playSong(guild) {
  if (!playlist.length) return;
  const url = playlist[currentIndex];
  let stream, info;

  log(`Attempting to play: ${url}`);

  try {
    info = await playdl.video_info(url);
    stream = await playdl.stream(url, { quality: 2 });
  } catch (e) {
    log(`Error fetching stream for ${url}: ${e.message}`, "ERROR");
    textChannel?.send(`❌ Failed to play: ${url}\nSkipping to next song...`);
    skipSong(guild, true);
    return;
  }

  try {
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
    });
    audioPlayer.play(resource);
    isPlaying = true;

    log(`Now playing: ${info.video_details.title}`);
    textChannel?.send(
      `🎵 Now playing: **${info.video_details.title}**\n${url}`
    );
  } catch (e) {
    log(`Error playing audio resource: ${e.message}`, "ERROR");
    skipSong(guild, true);
  }
}

function skipSong(guild, auto = false) {
  if (!playlist.length) return;
  currentIndex = (currentIndex + 1) % playlist.length;

  if (!auto) {
    log(`Skipping to song ${currentIndex + 1}/${playlist.length}`);
  }

  // Add small delay to prevent rapid skipping on errors
  setTimeout(() => playSong(guild), auto ? 2000 : 500);
}

function stopPlayback(guild) {
  log("Stopping playback");
  isPlaying = false;
  currentIndex = 0;
  reconnectAttempts = 0;

  if (audioPlayer) {
    audioPlayer.stop();
  }

  if (connection) {
    connection.destroy();
    connection = null;
  }

  voiceChannel = null;
}

function setupAudioPlayer(guild) {
  audioPlayer = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Pause,
    },
  });

  audioPlayer.on(AudioPlayerStatus.Idle, () => {
    if (isPlaying) {
      log("Song finished, playing next song");
      skipSong(guild, true);
    }
  });

  audioPlayer.on("error", (error) => {
    log(`Audio player error: ${error.message}`, "ERROR");
    if (isPlaying) {
      skipSong(guild, true);
    }
  });

  audioPlayer.on(AudioPlayerStatus.Playing, () => {
    reconnectAttempts = 0; // Reset on successful playback
  });
}

function setupVoiceConnection(guild) {
  if (!connection) return;

  connection.on(
    VoiceConnectionStatus.Disconnected,
    async (oldState, newState) => {
      log("Voice connection disconnected", "WARN");

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        log(
          `Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
          "WARN"
        );

        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch (error) {
          log(`Reconnection failed: ${error.message}`, "ERROR");
          textChannel?.send(
            `⚠️ Voice connection lost. Attempting to reconnect...`
          );

          // Try to rejoin the voice channel
          if (voiceChannel && isPlaying) {
            setTimeout(() => {
              try {
                connection = joinVoiceChannel({
                  channelId: voiceChannel.id,
                  guildId: guild.id,
                  adapterCreator: guild.voiceAdapterCreator,
                });
                setupVoiceConnection(guild);
                connection.subscribe(audioPlayer);
              } catch (e) {
                log(`Failed to rejoin voice channel: ${e.message}`, "ERROR");
              }
            }, 5000);
          }
        }
      } else {
        log("Max reconnection attempts reached", "ERROR");
        textChannel?.send(
          `❌ Lost connection to voice channel after ${MAX_RECONNECT_ATTEMPTS} attempts. Use \`!play\` to restart.`
        );
        stopPlayback(guild);
      }
    }
  );

  connection.on(VoiceConnectionStatus.Destroyed, () => {
    log("Voice connection destroyed");
    stopPlayback(guild);
  });

  connection.on("error", (error) => {
    log(`Voice connection error: ${error.message}`, "ERROR");
  });
}

client.on("ready", async () => {
  log(`Bot logged in as ${client.user.tag}`);
  log(`Ready to serve ${client.guilds.cache.size} guilds`);

  // Set bot avatar from logo if it hasn't been set
  try {
    const logoPath = path.join(__dirname, "logo", "logo.png");
    if (fs.existsSync(logoPath)) {
      const currentAvatar = client.user.displayAvatarURL();
      if (currentAvatar.includes("embed/avatars")) {
        // Only update if using default Discord avatar
        const avatar = fs.readFileSync(logoPath);
        await client.user.setAvatar(avatar);
        log("Bot avatar updated with logo", "INFO");
      }
    }
  } catch (error) {
    log(`Failed to set bot avatar: ${error.message}`, "WARN");
  }
});

client.on("messageCreate", async (msg) => {
  if (!msg.guild || msg.author.bot) return;
  const content = msg.content.trim();
  textChannel = msg.channel;
  const guild = msg.guild;

  if (content === "!play") {
    if (isPlaying) {
      msg.reply("🎵 Already playing and looping the playlist!");
      return;
    }

    voiceChannel = msg.member.voice.channel;
    if (!voiceChannel) {
      msg.reply("❌ Join a voice channel first!");
      return;
    }

    try {
      connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
      });

      setupAudioPlayer(guild);
      setupVoiceConnection(guild);
      connection.subscribe(audioPlayer);
      currentIndex = 0;
      reconnectAttempts = 0;

      await playSong(guild);
      msg.reply(`🎵 Started playing the playlist! (${playlist.length} songs)`);
      log(`Started playback in ${voiceChannel.name} (${guild.name})`);
    } catch (error) {
      log(`Failed to start playback: ${error.message}`, "ERROR");
      msg.reply("❌ Failed to join voice channel or start playback.");
    }
  } else if (content === "!stop") {
    stopPlayback(guild);
    msg.reply("⏹️ Stopped playback and left the voice channel.");
  } else if (content === "!skip") {
    if (!isPlaying) {
      msg.reply("❌ Nothing is playing!");
      return;
    }
    skipSong(guild);
    msg.reply("⏭️ Skipped to the next song.");
  } else if (content === "!nowplaying" || content === "!np") {
    if (!isPlaying || !playlist.length) {
      msg.reply("❌ Nothing is playing!");
      return;
    }
    const url = playlist[currentIndex];
    try {
      const info = await playdl.video_info(url);
      msg.reply(
        `🎵 Now playing: **${info.video_details.title}**\n📊 Song ${
          currentIndex + 1
        }/${playlist.length}\n🔗 ${url}`
      );
    } catch {
      msg.reply(
        `🎵 Now playing: ${url}\n📊 Song ${currentIndex + 1}/${playlist.length}`
      );
    }
  } else if (content === "!join") {
    voiceChannel = msg.member.voice.channel;
    if (!voiceChannel) {
      msg.reply("❌ Join a voice channel first!");
      return;
    }

    try {
      connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
      });
      setupVoiceConnection(guild);
      msg.reply("✅ Joined your voice channel!");
      log(`Joined voice channel ${voiceChannel.name} (${guild.name})`);
    } catch (error) {
      log(`Failed to join voice channel: ${error.message}`, "ERROR");
      msg.reply("❌ Failed to join voice channel.");
    }
  } else if (content === "!leave") {
    stopPlayback(guild);
    msg.reply("👋 Left the voice channel.");
  } else if (content === "!help") {
    const helpEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("🎵 Discord 24/7 Music Bot")
      .setDescription(
        "A bot that plays your playlist continuously in voice channels!"
      )
      .addFields(
        {
          name: "🎶 Music Commands",
          value:
            "`!play` - Start playing the playlist\n`!stop` - Stop music and leave channel\n`!skip` - Skip to next song\n`!nowplaying` or `!np` - Show current song",
          inline: false,
        },
        {
          name: "🔧 Voice Commands",
          value:
            "`!join` - Join your voice channel\n`!leave` - Leave voice channel\n`!help` - Show this help message",
          inline: false,
        },
        {
          name: "📊 Status",
          value: `Playlist: ${playlist.length} songs\nCurrently: ${
            isPlaying ? "Playing" : "Stopped"
          }`,
          inline: false,
        }
      )
      .setFooter({ text: "Made for 24/7 music streaming" })
      .setTimestamp();

    try {
      const logoPath = path.join(__dirname, "logo", "logo.png");
      if (fs.existsSync(logoPath)) {
        const logoAttachment = { attachment: logoPath, name: "logo.png" };
        helpEmbed.setThumbnail("attachment://logo.png");
        msg.reply({ embeds: [helpEmbed], files: [logoAttachment] });
      } else {
        msg.reply({ embeds: [helpEmbed] });
      }
    } catch (error) {
      log(`Failed to send help embed: ${error.message}`, "WARN");
      // Fallback to simple text message
      const helpMessage = `
🎵 **Discord Music Bot Commands**

\`!play\` - Start playing the playlist
\`!stop\` - Stop playback and leave channel
\`!skip\` - Skip to next song
\`!nowplaying\` or \`!np\` - Show current song
\`!join\` - Join your voice channel
\`!leave\` - Leave voice channel
\`!help\` - Show this help message

📝 Playlist has ${playlist.length} songs loaded.
      `;
      msg.reply(helpMessage);
    }
  }
});

// Reconnection and error handling
client.on("shardDisconnect", (event, id) => {
  log(`Shard ${id} disconnected: ${event.code} - ${event.reason}`, "WARN");
  // Discord.js will auto-reconnect, but you can add custom logic here if needed
});

client.on("shardReconnecting", (id) => {
  log(`Shard ${id} reconnecting...`, "INFO");
});

client.on("shardReady", (id) => {
  log(`Shard ${id} ready`, "INFO");
});

client.on("error", (err) => {
  log(`Discord client error: ${err.message}`, "ERROR");
});

client.on("warn", (info) => {
  log(`Discord client warning: ${info}`, "WARN");
});

process.on("unhandledRejection", (err) => {
  log(`Unhandled promise rejection: ${err.message}`, "ERROR");
  console.error(err);
});

process.on("uncaughtException", (err) => {
  log(`Uncaught exception: ${err.message}`, "ERROR");
  console.error(err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", () => {
  log("Received SIGINT, shutting down gracefully...", "INFO");
  if (connection) {
    connection.destroy();
  }
  client.destroy();
  process.exit(0);
});

process.on("SIGTERM", () => {
  log("Received SIGTERM, shutting down gracefully...", "INFO");
  if (connection) {
    connection.destroy();
  }
  client.destroy();
  process.exit(0);
});

log("Starting Discord Music Bot...", "INFO");
client.login(TOKEN);
