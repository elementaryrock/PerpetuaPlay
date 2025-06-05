#!/bin/bash

# PerpetuaPlay Discord Music Bot - Start Script
# This script validates configuration and starts the bot with proper error handling

echo "🎵 PerpetuaPlay Discord Music Bot - Starting..."
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js (version 16.11.0 or higher)"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="16.11.0"

if ! node -e "process.exit(require('semver').gte('$NODE_VERSION', '$REQUIRED_VERSION') ? 0 : 1)" 2>/dev/null; then
    print_error "Node.js version $NODE_VERSION is too old. Required: $REQUIRED_VERSION or higher"
    exit 1
fi

print_success "Node.js version $NODE_VERSION ✓"

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    print_warning "Dependencies not found. Installing..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "Failed to install dependencies"
        exit 1
    fi
    print_success "Dependencies installed ✓"
else
    print_success "Dependencies found ✓"
fi

# Run configuration validation
print_status "Validating configuration..."

# Test Discord bot token
print_status "Testing Discord bot token..."
npm run test:token --silent
if [ $? -ne 0 ]; then
    print_error "Discord bot token validation failed"
    print_error "Please check your .env file or DISCORD_TOKEN environment variable"
    exit 1
fi
print_success "Discord bot token valid ✓"

# Validate playlist
print_status "Validating playlist URLs..."
npm run test:playlist --silent
if [ $? -ne 0 ]; then
    print_error "Playlist validation failed"
    print_error "Please check your config/playlist.json file"
    exit 1
fi
print_success "Playlist URLs valid ✓"

# Complete configuration validation
print_status "Running complete configuration check..."
npm run config:validate --silent
if [ $? -ne 0 ]; then
    print_error "Configuration validation failed"
    exit 1
fi
print_success "Configuration validation complete ✓"

echo ""
print_success "All pre-flight checks passed!"
echo ""
print_status "Starting PerpetuaPlay Discord Music Bot..."
print_status "Press Ctrl+C to stop the bot"
echo ""

# Start the bot
npm start
