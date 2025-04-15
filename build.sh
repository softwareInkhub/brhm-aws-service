#!/bin/bash

# Clean up
echo "Cleaning up previous build..."
rm -rf .next
rm -rf node_modules
npm cache clean --force

# Setup swap if needed
if [ ! -f /swapfile ]; then
    echo "Setting up swap space..."
    sudo fallocate -l 4G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Set memory limit and run build
echo "Starting build process..."
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Check build status
if [ $? -eq 0 ]; then
    echo "Build completed successfully!"
else
    echo "Build failed. Check the logs above for errors."
    exit 1
fi 