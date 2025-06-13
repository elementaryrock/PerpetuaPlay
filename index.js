// Discord 24/7 Music Bot - Main Entry Point
// Core logic for connecting to Discord, handling commands, and playing music

require("dotenv").config();
const readline = require("readline");

// Import encryption package first
let sodium;
try {
  sodium = require("sodium");
  console.log("✅ Using sodium for voice encryption");
} catch (e) {
  console.warn("⚠️ sodium not found, trying other encryption packages");
  try {
    sodium = require("libsodium-wrappers");
    console.log("✅ Using libsodium-wrappers for voice encryption");
  } catch (e) {
    try {
      sodium = require("tweetnacl");
      console.log("✅ Using tweetnacl for voice encryption");
    } catch (e) {
      console.error(
        "❌ No encryption package found! Install sodium, libsodium-wrappers, or tweetnacl"
      );
    }
  }
}

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
const ytdl = require("@distube/ytdl-core");
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

// Skip playlist validation during initial load - will be checked after menu selection

const TOKEN = config.token || process.env.DISCORD_TOKEN;
if (!TOKEN) {
  console.error("Bot token not set! See docs/config_guide.md");
  process.exit(1);
}

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
let playbackMode = "youtube"; // "youtube" or "local"

// Logging helper
function log(message, level = "INFO") {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

// Display startup menu and get user choice
function displayStartupMenu() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log("\n" + "=".repeat(50));
    console.log("🎵 PerpetuaPlay Discord Music Bot");
    console.log("=".repeat(50));
    console.log("Choose playback mode:");
    console.log("1. Play from YouTube playlist");
    console.log("2. Play local MP3 file (local/song.mp3)");
    console.log("=".repeat(50));

    rl.question("Enter your choice (1 or 2): ", (answer) => {
      rl.close();

      if (answer === "1") {
        playbackMode = "youtube";
        console.log("✅ Selected: YouTube playlist mode");

        // Validate playlist for YouTube mode
        if (!playlist.length) {
          console.error(
            "❌ No playlist found! Please add songs to config/playlist.json"
          );
          process.exit(1);
        }
        console.log(`✅ Loaded ${playlist.length} songs in playlist`);
        resolve();
      } else if (answer === "2") {
        playbackMode = "local";
        console.log("✅ Selected: Local MP3 file mode");
        // Check if local MP3 file exists
        const localMp3Path = path.join(__dirname, "local", "song.mp3");
        if (!fs.existsSync(localMp3Path)) {
          console.error("❌ Local MP3 file not found at: local/song.mp3");
          console.log("Please place an MP3 file at local/song.mp3 and restart");
          process.exit(1);
        }
        console.log("✅ Found local MP3 file: local/song.mp3");
        resolve();
      } else {
        console.log(
          "❌ Invalid choice. Please run the bot again and select 1 or 2."
        );
        process.exit(1);
      }
    });
  });
}

async function playSong(guild) {
  if (playbackMode === "local") {
    return playLocalMp3(guild);
  }

  if (!playlist.length) return;
  const url = playlist[currentIndex];

  log(`Attempting to play: ${url}`);

  try {
    // Validate URL first
    if (!ytdl.validateURL(url)) {
      throw new Error("Invalid YouTube URL");
    }

    // Get video info
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title;

    // Create stream with better options for Azure VMs
    const stream = ytdl(url, {
      filter: "audioonly",
      quality: "highestaudio",
      highWaterMark: 1 << 25, // 32MB buffer
      requestOptions: {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      },
    });

    const resource = createAudioResource(stream, {
      inputType: "arbitrary",
    });

    audioPlayer.play(resource);
    isPlaying = true;

    log(`Now playing: ${title}`);
    textChannel?.send(`🎵 Now playing: **${title}**\n${url}`);
  } catch (e) {
    log(`Error fetching stream for ${url}: ${e.message}`, "ERROR");

    // Handle different types of errors
    if (e.message.includes("We're processing this video")) {
      textChannel?.send(
        `⏳ Video is being processed by YouTube, skipping: ${url}`
      );
    } else if (e.message.includes("Sign in to confirm")) {
      textChannel?.send(
        `🤖 Bot detection error, skipping: ${url}\n💡 Consider setting up YouTube cookies`
      );
    } else {
      textChannel?.send(`❌ Failed to play: ${url}\nSkipping to next song...`);
    }

    skipSong(guild, true);
    return;
  }
}

async function playLocalMp3(guild) {
  const localMp3Path = path.join(__dirname, "local", "song.mp3");

  log(`Playing local MP3: ${localMp3Path}`);

  try {
    // Check if file exists
    if (!fs.existsSync(localMp3Path)) {
      throw new Error("Local MP3 file not found");
    }

    // Create audio resource from local file
    const resource = createAudioResource(localMp3Path, {
      inputType: "arbitrary",
    });

    audioPlayer.play(resource);
    isPlaying = true;

    log(`Now playing local MP3: song.mp3`);
    textChannel?.send(`🎵 Now playing local file: **song.mp3**`);
  } catch (e) {
    log(`Error playing local MP3: ${e.message}`, "ERROR");
    textChannel?.send(`❌ Failed to play local MP3: ${e.message}`);
  }
}

function skipSong(guild, auto = false) {
  if (playbackMode === "local") {
    // For local mode, just restart the same song
    if (!auto) {
      log("Restarting local MP3");
      textChannel?.send("🔄 Restarting local MP3...");
    }
    setTimeout(() => playSong(guild), auto ? 2000 : 500);
    return;
  }

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
      if (playbackMode === "local") {
        log("Local MP3 finished, restarting...");
        setTimeout(() => playSong(guild), 1000); // Restart local MP3 after 1 second
      } else {
        log("Song finished, playing next song");
        skipSong(guild, true);
      }
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
  log("PerpetuaPlay Discord Music Bot - Made by elementaryrock(Maanas M S)");

  // Set bot avatar from logo if it hasn't been set
  try {
    const logoPath = "logo/logo.png";
    if (fs.existsSync(logoPath)) {
      log("Logo file found, checking if avatar needs update", "INFO");
      const currentAvatar = client.user.displayAvatarURL();
      if (
        currentAvatar.includes("embed/avatars") ||
        currentAvatar.includes("cdn.discordapp.com/embed/avatars")
      ) {
        // Only update if using default Discord avatar
        log("Using default avatar, updating with logo", "INFO");
        const avatar = fs.readFileSync(logoPath);
        await client.user.setAvatar(avatar);
        log("Bot avatar updated with logo", "INFO");
      } else {
        log("Custom avatar already set, skipping update", "INFO");
      }
    } else {
      log("Logo file not found at " + logoPath, "WARN");
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
      const info = await ytdl.getInfo(url);
      const nowPlayingEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle("🎵 Now Playing")
        .setDescription(`**${info.videoDetails.title}**`)
        .addFields(
          {
            name: "📊 Progress",
            value: `Song ${currentIndex + 1} of ${playlist.length}`,
            inline: true,
          },
          {
            name: "🔗 URL",
            value: url.length > 50 ? `[Click here](${url})` : url,
            inline: false,
          }
        )
        .setFooter({
          text: "PerpetuaPlay • Made by elementaryrock(Maanas M S)",
        })
        .setTimestamp();

      // Try to add logo
      const logoPath = "logo/logo.png";
      if (fs.existsSync(logoPath)) {
        const logoAttachment = { attachment: logoPath, name: "logo.png" };
        nowPlayingEmbed.setThumbnail("attachment://logo.png");
        msg.reply({ embeds: [nowPlayingEmbed], files: [logoAttachment] });
      } else {
        msg.reply({ embeds: [nowPlayingEmbed] });
      }
    } catch (error) {
      log(`Failed to get video info: ${error.message}`, "WARN");
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
    const modeStatus =
      playbackMode === "youtube"
        ? `YouTube Playlist (${playlist.length} songs)`
        : "Local MP3 File";
    const helpEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("🎵 PerpetuaPlay")
      .setDescription(
        "A bot that plays your playlist continuously in voice channels!\n\n**Made by elementaryrock(Maanas M S)**\n🔗 https://github.com/elementaryrock/PerpetuaPlay.git"
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
          value: `Mode: ${modeStatus}\nCurrently: ${
            isPlaying ? "Playing" : "Stopped"
          }`,
          inline: false,
        }
      )
      .setFooter({
        text: "Made by elementaryrock(Maanas M S) • 24/7 music streaming",
      })
      .setTimestamp();

    try {
      const logoPath = "logo/logo.png";
      if (fs.existsSync(logoPath)) {
        log("Sending help embed with logo", "INFO");
        const logoAttachment = { attachment: logoPath, name: "logo.png" };
        helpEmbed.setThumbnail("attachment://logo.png");
        msg.reply({ embeds: [helpEmbed], files: [logoAttachment] });
      } else {
        log("Logo file not found, sending help embed without logo", "WARN");
        msg.reply({ embeds: [helpEmbed] });
      }
    } catch (error) {
      log(`Failed to send help embed: ${error.message}`, "WARN");
      // Fallback to simple text message
      const modeStatus =
        playbackMode === "youtube"
          ? `YouTube playlist (${playlist.length} songs)`
          : "Local MP3 file";
      const skipText =
        playbackMode === "local" ? "Restart current song" : "Skip to next song";
      const helpMessage = `
🎵 **PerpetuaPlay**
**Made by elementaryrock(Maanas M S)**
🔗 https://github.com/elementaryrock/PerpetuaPlay.git

\`!play\` - Start playing
\`!stop\` - Stop playback and leave channel
\`!skip\` - ${skipText}
\`!nowplaying\` or \`!np\` - Show current song
\`!join\` - Join your voice channel
\`!leave\` - Leave voice channel
\`!help\` - Show this help message

📝 Mode: ${modeStatus}
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

// Display startup menu and wait for user choice
async function startBot() {
  await displayStartupMenu();
  client.login(TOKEN);
}

// Start the bot with menu
startBot();
