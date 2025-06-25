module.exports = {
  apps: [
    {
      name: 'cold-outreach-backend',
      script: './cold-outreach-backend/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        JWT_SECRET: "6a0863e52a1b8c3ea7d8abc769f96bf3ddc6a3a94dbd00176db921edf1d792de"
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024'
    }
  ]
};
