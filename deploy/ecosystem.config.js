module.exports = {
  apps: [
    {
      name: 'siryan-frontend',
      cwd: '/home/ubuntu/siryan/apps/frontend',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/home/ubuntu/.pm2/logs/siryan-frontend-error.log',
      out_file: '/home/ubuntu/.pm2/logs/siryan-frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
