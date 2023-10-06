#!/bin/bash

# Check if Docker is running
if ! docker info &> /dev/null; then
  echo "Docker is not running. Starting Docker..."
  open -a Docker && sleep 5 
fi

# Check if PostgreSQL is running
if pgrep -x "postgres" &> /dev/null; then
  echo "Stopping PostgreSQL..."
  sudo pkill -u postgres
fi

# Function to perform cleanup
cleanup() {
  echo "Cleaning up..."
  kill $PRISMA_STUDIO_PID
  yarn docker:down & 
  sleep 20
  echo "Stopping Docker..."
  pkill "Docker"
  exit 0
}
# Trap Ctrl+C signal and call cleanup function
trap cleanup EXIT


# Run other commands
yarn

yarn docker:up && sleep 5

yarn prisma:studio -- &
PRISMA_STUDIO_PID=$!

open http://localhost:3000  
yarn dev -- -p 3000

