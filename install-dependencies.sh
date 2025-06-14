#!/bin/bash

# WhatsApp Tracker - Install dependencies script
# This script installs required system dependencies for Puppeteer/Chrome

# Text formatting
BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BOLD}Installing Puppeteer dependencies for WhatsApp Tracker${NC}"
echo "======================================================="
echo ""

# Detect OS
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$ID
else
  OS=$(uname -s)
fi

echo "Detected OS: $OS"

# Install dependencies based on OS
case $OS in
  debian|ubuntu|raspbian)
    echo "Installing dependencies for Debian/Ubuntu-based system..."
    sudo apt-get update
    sudo apt-get install -y \
        gconf-service \
        libasound2 \
        libatk1.0-0 \
        libatk-bridge2.0-0 \
        libc6 \
        libcairo2 \
        libcups2 \
        libdbus-1-3 \
        libexpat1 \
        libfontconfig1 \
        libgbm1 \
        libgcc1 \
        libgconf-2-4 \
        libgdk-pixbuf2.0-0 \
        libglib2.0-0 \
        libgtk-3-0 \
        libnspr4 \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        libstdc++6 \
        libx11-6 \
        libx11-xcb1 \
        libxcb1 \
        libxcomposite1 \
        libxcursor1 \
        libxdamage1 \
        libxext6 \
        libxfixes3 \
        libxi6 \
        libxrandr2 \
        libxrender1 \
        libxss1 \
        libxtst6 \
        ca-certificates \
        fonts-liberation \
        libappindicator1 \
        libnss3 \
        lsb-release \
        xdg-utils \
        wget
    ;;

  fedora|rhel|centos)
    echo "Installing dependencies for Fedora/RHEL/CentOS-based system..."
    sudo dnf install -y \
        alsa-lib \
        atk \
        at-spi2-atk \
        at-spi2-core \
        cups-libs \
        gtk3 \
        ipa-gothic-fonts \
        libXcomposite \
        libXcursor \
        libXdamage \
        libXext \
        libXi \
        libXrandr \
        libXScrnSaver \
        libXtst \
        pango \
        xorg-x11-fonts-100dpi \
        xorg-x11-fonts-75dpi \
        xorg-x11-fonts-cyrillic \
        xorg-x11-fonts-misc \
        xorg-x11-fonts-Type1 \
        xorg-x11-utils
    ;;

  *)
    echo -e "${RED}Unsupported operating system: $OS${NC}"
    echo "Please install Puppeteer dependencies manually according to:"
    echo "https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#chrome-headless-doesnt-launch-on-unix"
    exit 1
    ;;
esac

echo -e "\n${GREEN}Puppeteer dependencies installed successfully!${NC}"
echo "You can now restart the WhatsApp tracker using:"
echo "  pm2 restart whatsapp-tracker"

chmod +x install-dependencies.sh 