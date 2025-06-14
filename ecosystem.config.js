module.exports = {
  apps: [
    {
      name: 'whatsapp-tracker',
      script: './src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      args: 'start', // Start tracking immediately
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}; 