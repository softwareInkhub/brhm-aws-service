#!/bin/bash

echo "Cleaning up system..."

# Remove old npm cache
npm cache clean --force

# Remove old logs
sudo rm -rf /var/log/*.gz
sudo rm -rf /var/log/*.[0-9]
sudo rm -rf /var/log/*.[0-9][0-9]

# Clean apt cache
sudo apt-get clean
sudo apt-get autoremove -y

# Remove old docker images and containers if any
if command -v docker &> /dev/null; then
    docker system prune -af
fi

# Clean temp files
sudo rm -rf /tmp/*

# Clean journal logs
sudo journalctl --vacuum-time=1d

echo "Disk space before cleanup:"
df -h /

echo "Cleaning build artifacts..."
rm -rf .next
rm -rf node_modules
rm -rf ~/.npm/_cacache

echo "Disk space after cleanup:"
df -h /

# Extend disk space if needed
echo "Current volume size:"
lsblk

echo "Cleanup completed!" 