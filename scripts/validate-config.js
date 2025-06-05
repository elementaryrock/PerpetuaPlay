// Utility script to validate configuration
require("dotenv").config();
const fs = require("fs");
const path = require("path");

console.log("🔍 Validating bot configuration...\n");

// Check for bot token
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("❌ DISCORD_TOKEN not found in environment variables");
  console.log("💡 Create a .env file with DISCORD_TOKEN=your_bot_token_here");
} else {
  console.log("✅ Discord bot token found");
}

// Check playlist
const playlistPath = path.join(__dirname, "..", "config", "playlist.json");
if (!fs.existsSync(playlistPath)) {
  console.error("❌ playlist.json not found");
} else {
  try {
    const playlist = JSON.parse(fs.readFileSync(playlistPath, "utf8"));
    if (!Array.isArray(playlist) || playlist.length === 0) {
      console.error("❌ Playlist is empty or invalid");
    } else {
      console.log(`✅ Playlist loaded with ${playlist.length} songs`);
    }
  } catch (e) {
    console.error("❌ Invalid playlist.json format:", e.message);
  }
}

// Check required dependencies
const packagePath = path.join(__dirname, "..", "package.json");
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const requiredDeps = ["discord.js", "@discordjs/voice", "play-dl", "dotenv"];

console.log("\n📦 Checking dependencies:");
requiredDeps.forEach((dep) => {
  if (pkg.dependencies[dep]) {
    console.log(`✅ ${dep}: ${pkg.dependencies[dep]}`);
  } else {
    console.error(`❌ Missing dependency: ${dep}`);
  }
});

console.log("\n✨ Configuration validation complete!");
