#!/bin/bash

# Uqudo Admin Portal - Quick Start Script
# This script helps you configure and start the application

echo "============================================================"
echo "     Uqudo Admin Portal - Quick Start Setup"
echo "============================================================"
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/backend"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js 16+ from: https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js $(node -v) detected"
echo ""

# Check if .env file exists
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    echo "✓ Created .env file"
    echo ""
    echo "============================================================"
    echo "IMPORTANT: You need to configure your Supabase credentials!"
    echo "============================================================"
    echo ""
    echo "Please edit: $BACKEND_DIR/.env"
    echo ""
    echo "You need to add:"
    echo "  1. SUPABASE_URL (from Supabase Settings → API)"
    echo "  2. SUPABASE_ANON_KEY (from Supabase Settings → API)"
    echo "  3. SUPABASE_SERVICE_ROLE_KEY (from Supabase Settings → API)"
    echo ""
    echo "After updating .env, run this script again."
    echo ""

    # Ask if user wants to edit now
    read -p "Do you want to open .env file now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command -v code &> /dev/null; then
            code "$BACKEND_DIR/.env"
        elif command -v nano &> /dev/null; then
            nano "$BACKEND_DIR/.env"
        else
            open -t "$BACKEND_DIR/.env"
        fi
    fi
    exit 0
fi

echo "✓ .env file found"
echo ""

# Check if dependencies are installed
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
    echo "📦 Installing dependencies..."
    cd "$BACKEND_DIR"
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✓ Dependencies installed"
    echo ""
fi

echo "✓ Dependencies installed"
echo ""

# Ask what to do
echo "What would you like to do?"
echo ""
echo "1) Create demo user (generate password hash)"
echo "2) Start backend server"
echo "3) Start frontend server"
echo "4) Start both servers"
echo "5) Exit"
echo ""
read -p "Enter choice [1-5]: " choice

case $choice in
    1)
        echo ""
        echo "Generating demo user credentials..."
        cd "$BACKEND_DIR"
        node create-user.js
        echo ""
        echo "Copy the SQL above and run it in Supabase SQL Editor"
        ;;
    2)
        echo ""
        echo "Starting backend server..."
        echo "Press Ctrl+C to stop"
        echo ""
        cd "$BACKEND_DIR"
        npm run dev
        ;;
    3)
        echo ""
        echo "Starting frontend server on http://localhost:8080"
        echo "Press Ctrl+C to stop"
        echo ""

        # Check if http-server is installed
        if ! command -v http-server &> /dev/null; then
            echo "Installing http-server..."
            npm install -g http-server
        fi

        cd "$SCRIPT_DIR"
        http-server -p 8080 -o /pages/uqudo-sign-in.html
        ;;
    4)
        echo ""
        echo "Starting both servers..."
        echo "Backend: http://localhost:3000"
        echo "Frontend: http://localhost:8080"
        echo ""
        echo "Press Ctrl+C to stop both servers"
        echo ""

        # Check if http-server is installed
        if ! command -v http-server &> /dev/null; then
            echo "Installing http-server..."
            npm install -g http-server
        fi

        # Start backend in background
        cd "$BACKEND_DIR"
        npm run dev &
        BACKEND_PID=$!

        # Wait a bit for backend to start
        sleep 3

        # Start frontend
        cd "$SCRIPT_DIR"
        http-server -p 8080 -o /pages/uqudo-sign-in.html &
        FRONTEND_PID=$!

        # Wait for both processes
        wait $BACKEND_PID $FRONTEND_PID
        ;;
    5)
        echo "Goodbye!"
        exit 0
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac
