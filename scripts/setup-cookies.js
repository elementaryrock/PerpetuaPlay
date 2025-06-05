// Script to help set up YouTube cookies for play-dl
// This script shows how to configure cookies to avoid bot detection

const playdl = require("play-dl");

// Instructions for getting YouTube cookies:
console.log(`
=== YOUTUBE COOKIE SETUP FOR PLAY-DL ===

To fix the "Sign in to confirm you're not a bot" error, you need to:

1. Go to YouTube.com in your browser
2. Log in to your account (or just browse normally)
3. Open Developer Tools (F12)
4. Go to Application/Storage tab > Cookies > https://youtube.com
5. Find and copy these cookie values:
   - VISITOR_INFO1_LIVE
   - YSC
   - CONSENT (if present)

6. Create a .env file in your project root and add:
   YOUTUBE_COOKIE="VISITOR_INFO1_LIVE=your_value_here; YSC=your_value_here; CONSENT=your_value_here"

7. Then uncomment the setToken code in your main script.

Example cookie format:
YOUTUBE_COOKIE="VISITOR_INFO1_LIVE=CgtZbWZOQkVvblE2NCiQ8bKmBg%3D%3D; YSC=ABC123xyz"
`);

// Example of how to set the token (to be used in main script)
async function setupYouTubeAuth() {
  const cookieString = process.env.YOUTUBE_COOKIE;

  if (cookieString) {
    try {
      await playdl.setToken({
        youtube: {
          cookie: cookieString,
        },
      });
      console.log("✅ YouTube authentication set up successfully");
      return true;
    } catch (error) {
      console.error("❌ Failed to set YouTube token:", error.message);
      return false;
    }
  } else {
    console.log("⚠️  No YouTube cookie found in environment variables");
    return false;
  }
}

module.exports = { setupYouTubeAuth };
