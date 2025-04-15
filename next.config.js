/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  env: {
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_LAMBDA_ROLE_ARN: process.env.AWS_LAMBDA_ROLE_ARN,
    AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
    optimizeCss: true,
    optimizePackageImports: ['@/components', '@/lib'],
  },
  // Add this to ensure environment variables are available during build
  serverRuntimeConfig: {
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_LAMBDA_ROLE_ARN: process.env.AWS_LAMBDA_ROLE_ARN,
    AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
  },
  // Add this to ensure environment variables are available at runtime
  publicRuntimeConfig: {
    AWS_REGION: process.env.AWS_REGION,
  },
  async headers() {
    return [
      {
        // matching all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ]
      }
    ]
  },
  // Optimize build
  swcMinify: true,
  // Webpack optimization
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          minChunks: 1,
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          cacheGroups: {
            defaultVendors: {
              test: /[\\/]node_modules[\\/]/,
              priority: -10,
              reuseExistingChunk: true,
            },
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
}

module.exports = nextConfig