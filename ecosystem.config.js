module.exports = {
  apps: [
    {
      name: 'brhm-aws-service',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=4096'
      },
      max_memory_restart: '4G'
    },
    {
      name: 'brhm-aws-service-build',
      script: 'npm',
      args: 'run build',
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=4096'
      },
      max_memory_restart: '4G'
    }
  ]
} 