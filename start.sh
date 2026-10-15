#!/bin/bash

# E-Commerce Platform - Complete Startup Script
# Run this to start both backend and frontend

echo "🚀 E-Commerce Platform Startup"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on Windows
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    IS_WINDOWS=true
else
    IS_WINDOWS=false
fi

# Backend startup
echo -e "${BLUE}[1/2] Starting Backend...${NC}"
echo ""

if [ "$IS_WINDOWS" = true ]; then
    echo "Windows detected - Please run in separate terminals:"
    echo ""
    echo -e "${GREEN}Terminal 1 (Backend):${NC}"
    echo "cd D:\Projects\capcrew-platform\backend"
    echo "venv\Scripts\activate"
    echo "python manage.py runserver"
    echo ""
    echo "Backend will start at: ${YELLOW}http://localhost:8001${NC}"
    echo ""
    echo -e "${GREEN}Terminal 2 (Frontend):${NC}"
    echo "cd D:\Projects\capcrew-platform\frontend"
    echo "npm run dev"
    echo ""
    echo "Frontend will start at: ${YELLOW}http://localhost:5175${NC}"
else
    # Unix/Linux/Mac startup
    echo "Starting backend..."
    cd ./backend
    source venv/bin/activate
    python manage.py runserver &
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"
    cd ..

    sleep 2

    echo ""
    echo -e "${BLUE}[2/2] Starting Frontend...${NC}"
    echo "Starting frontend..."
    cd ./frontend
    npm run dev &
    FRONTEND_PID=$!
    echo "Frontend PID: $FRONTEND_PID"

    echo ""
    echo -e "${GREEN}✅ Both services started!${NC}"
    echo ""
    echo "Backend:  ${YELLOW}http://localhost:8001${NC}"
    echo "Frontend: ${YELLOW}http://localhost:5175${NC}"
    echo ""
    echo "Press Ctrl+C to stop both services"
    echo ""

    # Wait for both processes
    wait $BACKEND_PID $FRONTEND_PID
fi
