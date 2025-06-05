// Advanced test script with bot detection avoidance
const ytdl = require("@distube/ytdl-core");
const fs = require("fs");
const path = require("path");

const playlistPath = path.join(__dirname, "..", "config", "playlist.json");

if (!fs.existsSync(playlistPath)) {
  console.error("❌ playlist.json not found");
  process.exit(1);
}

let playlist;
try {
  playlist = JSON.parse(fs.readFileSync(playlistPath, "utf8"));
} catch (e) {
  console.error("❌ Invalid playlist.json format:", e.message);
  process.exit(1);
}

// Advanced options to avoid bot detection
const ytdlOptions = {
  requestOptions: {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Cache-Control": "max-age=0",
    },
  },
};

console.log(
  `🔍 Testing ${playlist.length} URLs with advanced bot detection avoidance...\n`
);

async function testPlaylistAdvanced() {
  for (let i = 0; i < playlist.length; i++) {
    const url = playlist[i];
    console.log(`Testing ${i + 1}/${playlist.length}: ${url}`);

    try {
      if (!ytdl.validateURL(url)) {
        throw new Error("Invalid YouTube URL");
      }

      // Add delay between requests to avoid rate limiting
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      const info = await ytdl.getInfo(url, ytdlOptions);
      console.log(
        `✅ ${info.videoDetails.title} - Duration: ${info.videoDetails.lengthSeconds}s`
      );
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);

      // If it's a bot detection error, suggest solutions
      if (
        error.message.includes("Sign in to confirm") ||
        error.message.includes("bot")
      ) {
        console.log("💡 This appears to be bot detection. Try:");
        console.log(
          "   1. Set up YouTube cookies: node scripts/setup-cookies.js"
        );
        console.log("   2. Use a proxy service");
        console.log("   3. Try a different Azure region");
      }
    }
    console.log("");
  }

  console.log("✨ Advanced playlist test complete!");
}

testPlaylistAdvanced();
