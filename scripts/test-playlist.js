// Test playlist URLs for accessibility
const playdl = require("play-dl");
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
      const info = await playdl.video_info(url);
      console.log(
        `✅ ${info.video_details.title} - Duration: ${info.video_details.durationRaw}`
      );
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
    console.log("");
  }

  console.log("✨ Playlist test complete!");
}

testPlaylist();
