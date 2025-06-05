// Azure VM optimization script for Discord music bot
// Helps avoid common issues with YouTube streaming on cloud servers

const fs = require("fs");
const path = require("path");

function createAzureOptimizedConfig() {
  const configPath = path.join(__dirname, "..", "config", "azure-config.json");

  const azureConfig = {
    network: {
      dns: ["8.8.8.8", "1.1.1.1"],
      timeout: 30000,
      retries: 3,
    },
    audio: {
      bufferSize: 33554432,
      highWaterMark: 33554432,
      requestOptions: {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate",
          DNT: "1",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
      },
    },
    tips: [
      "Use residential proxy if issues persist",
      "Consider rotating User-Agent strings",
      "Monitor Azure VM IP reputation",
      "Set up DNS over HTTPS if needed",
    ],
  };

  fs.writeFileSync(configPath, JSON.stringify(azureConfig, null, 2));
  console.log("✅ Azure optimization config created at:", configPath);

  return azureConfig;
}

function displayAzureTroubleshooting() {
  console.log(`
=== AZURE VM TROUBLESHOOTING FOR YOUTUBE STREAMING ===

Common issues and solutions:

1. BOT DETECTION:
   ✅ Switch to @distube/ytdl-core (more reliable)
   ✅ Use residential proxy services
   ✅ Set proper User-Agent headers
   ✅ Add YouTube cookies from browser session

2. NETWORK ISSUES:
   ✅ Use public DNS (8.8.8.8, 1.1.1.1)
   ✅ Increase timeout values
   ✅ Enable keep-alive connections

3. MEMORY/PERFORMANCE:
   ✅ Increase buffer sizes
   ✅ Monitor RAM usage
   ✅ Use PM2 for process management

4. IP REPUTATION:
   ✅ Check if Azure IP is flagged
   ✅ Consider changing Azure region
   ✅ Use proxy rotation services

5. ALTERNATIVE SOLUTIONS:
   - Use spotify-web-api-node for Spotify
   - Use SoundCloud API directly
   - Host audio files on your own server
   - Use Discord voice channel recording bots

Current recommendations:
1. Try the ytdl-core implementation first
2. If issues persist, set up YouTube cookies
3. Consider using a proxy service like ProxyMesh or Bright Data
4. Monitor bot performance and error rates
`);
}

if (require.main === module) {
  createAzureOptimizedConfig();
  displayAzureTroubleshooting();
}

module.exports = { createAzureOptimizedConfig, displayAzureTroubleshooting };
