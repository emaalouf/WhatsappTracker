#!/bin/bash

# WhatsApp Tracker - Quick Fix Script
# This script provides quick fixes for common issues

# Text formatting
BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BOLD}WhatsApp Tracker - Quick Fix Script${NC}"
echo "====================================="
echo ""

# Fix Chrome dependencies
fix_chrome_dependencies() {
  echo "Installing essential Chrome dependencies..."
  
  if [ -f /etc/debian_version ]; then
    # Debian/Ubuntu
    sudo apt-get update
    sudo apt-get install -y libatk1.0-0 libatk-bridge2.0-0 libcups2 libgtk-3-0 libgbm1 libasound2
  elif [ -f /etc/redhat-release ]; then
    # RHEL/CentOS/Fedora
    sudo dnf install -y atk cups-libs gtk3 alsa-lib
  else
    echo -e "${YELLOW}Could not determine Linux distribution. Please install Chrome dependencies manually.${NC}"
    return 1
  fi
  
  echo -e "${GREEN}Essential Chrome dependencies installed.${NC}"
  return 0
}

# Fix puppeteer
fix_puppeteer() {
  echo "Reinstalling Puppeteer..."
  npm uninstall puppeteer puppeteer-core
  npm install puppeteer --save
  
  echo -e "${GREEN}Puppeteer reinstalled.${NC}"
  return 0
}

# Find Chrome/Chromium executable
find_chrome() {
  echo "Searching for Chrome/Chromium executable..."
  
  CHROME_PATH=""
  
  # Common locations
  for path in \
    /usr/bin/google-chrome \
    /usr/bin/google-chrome-stable \
    /usr/bin/chromium \
    /usr/bin/chromium-browser \
    /snap/bin/chromium
  do
    if [ -x "$path" ]; then
      CHROME_PATH="$path"
      echo -e "${GREEN}Found Chrome/Chromium at: $CHROME_PATH${NC}"
      break
    fi
  done
  
  if [ -z "$CHROME_PATH" ]; then
    echo -e "${YELLOW}Could not find Chrome/Chromium executable. You may need to install it manually.${NC}"
    return 1
  fi
  
  # Update .env file
  if [ -f .env ]; then
    if grep -q "CHROME_PATH=" .env; then
      sed -i "s|#* *CHROME_PATH=.*|CHROME_PATH=$CHROME_PATH|" .env
    else
      echo "CHROME_PATH=$CHROME_PATH" >> .env
    fi
    
    # Uncomment MINIMAL_ENV
    sed -i "s/# MINIMAL_ENV=true/MINIMAL_ENV=true/" .env
    
    echo -e "${GREEN}Updated .env file with Chrome path.${NC}"
  else
    echo -e "${YELLOW}.env file not found. Could not update Chrome path.${NC}"
  fi
  
  return 0
}

# Enable container mode
enable_container_mode() {
  echo "Enabling container compatibility mode..."
  
  if [ -f .env ]; then
    sed -i "s/# CONTAINER_ENV=true/CONTAINER_ENV=true/" .env
    echo -e "${GREEN}Enabled container mode in .env file.${NC}"
  else
    echo -e "${YELLOW}.env file not found. Could not enable container mode.${NC}"
    return 1
  fi
  
  return 0
}

# Reset WhatsApp session
reset_session() {
  echo "Resetting WhatsApp session..."
  
  if [ -d "./session" ]; then
    rm -rf ./session/*
    echo -e "${GREEN}WhatsApp session data cleared.${NC}"
  else
    echo -e "${YELLOW}Session directory not found.${NC}"
    mkdir -p ./session
    echo -e "${GREEN}Created new session directory.${NC}"
  fi
  
  return 0
}

# Main menu
while true; do
  echo ""
  echo "Select an option to fix:"
  echo "1. Fix Chrome dependencies (libatk, etc.)"
  echo "2. Find and set Chrome executable path"
  echo "3. Enable container compatibility mode"
  echo "4. Reset WhatsApp session"
  echo "5. Reinstall Puppeteer"
  echo "6. Apply all fixes"
  echo "q. Quit"
  
  read -p "Enter your choice: " choice
  echo ""
  
  case $choice in
    1)
      fix_chrome_dependencies
      ;;
    2)
      find_chrome
      ;;
    3)
      enable_container_mode
      ;;
    4)
      reset_session
      ;;
    5)
      fix_puppeteer
      ;;
    6)
      fix_chrome_dependencies
      find_chrome
      enable_container_mode
      reset_session
      fix_puppeteer
      echo -e "\n${GREEN}All fixes applied. Please restart the application.${NC}"
      ;;
    q|Q)
      echo "Exiting..."
      break
      ;;
    *)
      echo -e "${YELLOW}Invalid choice. Please try again.${NC}"
      ;;
  esac
done

echo -e "\n${BOLD}Quick Fix completed${NC}"
echo "You should restart the WhatsApp tracker using:"
echo "  pm2 restart whatsapp-tracker"

chmod +x quick-fix.sh 