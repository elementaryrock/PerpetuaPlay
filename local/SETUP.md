# How to test local MP3 playback

Since we can't include copyrighted MP3 files in the repository, you'll need to:

1. **Find a test MP3 file** - You can:

   - Use any MP3 file you have
   - Download a royalty-free MP3 from sites like:
     - freesound.org
     - incompetech.com
     - youtube.com (using youtube-dl for non-copyrighted content)

2. **Place the file here**:

   ```
   local/song.mp3
   ```

3. **Test the bot**:
   ```bash
   npm start
   # Select option 2 when prompted
   ```

## Alternative: Create a test tone

You can generate a simple test tone using online tools or FFmpeg:

```bash
# If you have FFmpeg installed
ffmpeg -f lavfi -i "sine=frequency=440:duration=30" -ac 2 local/song.mp3
```

This creates a 30-second 440Hz tone for testing purposes.
