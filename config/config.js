require('dotenv').config();

module.exports = {
    // Discord Bot Configuration
    token: process.env.DISCORD_TOKEN || 'your_bot_token_here',
    clientId: process.env.DISCORD_CLIENT_ID || 'your_client_id_here',
    
    // Bot Settings
    prefix: process.env.BOT_PREFIX || '!',
    
    // Audio Settings
    audio: {
        bitrate: parseInt(process.env.AUDIO_BITRATE) || 128,
        quality: process.env.AUDIO_QUALITY || 'high',
        volume: parseFloat(process.env.DEFAULT_VOLUME) || 0.5
    },
    
    // Reconnection Settings
    reconnection: {
        enabled: process.env.AUTO_RECONNECT !== 'false',
        maxAttempts: parseInt(process.env.MAX_RECONNECT_ATTEMPTS) || 5,
        delay: parseInt(process.env.RECONNECT_DELAY) || 5000,
        backoffMultiplier: parseFloat(process.env.BACKOFF_MULTIPLIER) || 1.5
    },
    
    // Logging Settings
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        saveToFile: process.env.LOG_TO_FILE !== 'false',
        maxFiles: parseInt(process.env.MAX_LOG_FILES) || 5
    },
    
    // Performance Settings
    performance: {
        maxMemoryUsage: parseInt(process.env.MAX_MEMORY_MB) || 200,
        garbageCollectionInterval: parseInt(process.env.GC_INTERVAL) || 300000 // 5 minutes
    },
    
    // File Paths
    paths: {
        playlist: process.env.PLAYLIST_PATH || './config/playlist.json',
        logs: process.env.LOGS_PATH || './logs'
    }
};
