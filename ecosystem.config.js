module.exports = {
  apps: [{
    name: 'discord-music-bot',
    script: 'index.js',
    cwd: '/opt/discord-bot', // Update this path for your deployment
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200MB',
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 5000,
    
    // Environment configurations
    env: {
      NODE_ENV: 'development',
      LOG_LEVEL: 'debug'
    },
    env_production: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info'
    },
    
    // Log configuration
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Performance monitoring
    monitoring: false, // Set to true if you have PM2+ subscription
    
    // Advanced settings
    kill_timeout: 3000,
    listen_timeout: 8000,
    
    // Node.js flags for memory optimization
    node_args: '--max-old-space-size=180'
  }]
};
