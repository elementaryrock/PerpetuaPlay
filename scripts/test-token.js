// Test if the Discord bot token is valid
require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("❌ DISCORD_TOKEN not found in environment variables");
  process.exit(1);
}

console.log("🔍 Testing Discord bot token...");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  console.log(`✅ Bot token is valid! Logged in as: ${client.user.tag}`);
  client.destroy();
  process.exit(0);
});

client.on("error", (error) => {
  console.error("❌ Discord client error:", error);
  process.exit(1);
});

client.login(token).catch((error) => {
  console.error("❌ Failed to login with bot token:", error.message);
  process.exit(1);
});
