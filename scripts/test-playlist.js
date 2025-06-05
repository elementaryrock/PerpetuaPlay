// Test playlist URLs for accessibility
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

console.log(`🔍 Testing ${playlist.length} URLs in playlist...\n`);

async function testPlaylist() {
  for (let i = 0; i < playlist.length; i++) {
    const url = playlist[i];
    console.log(`Testing ${i + 1}/${playlist.length}: ${url}`);

    try {
      if (!ytdl.validateURL(url)) {
        throw new Error("Invalid YouTube URL");
      }

      const info = await ytdl.getInfo(url);
      console.log(
        `✅ ${info.videoDetails.title} - Duration: ${info.videoDetails.lengthSeconds}s`
      );
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
    console.log("");
  }

  console.log("✨ Playlist test complete!");
}

testPlaylist();
