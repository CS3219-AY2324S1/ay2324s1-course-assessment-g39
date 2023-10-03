#!/bin/bash

# Check if Docker is running
if ! docker info &> /dev/null; then
  echo "Docker is not running. Starting Docker..."
  open -a Docker
  sleep 5  # Wait for Docker to start (adjust this if needed)
fi

# Check if PostgreSQL is running
if pgrep -x "postgres" &> /dev/null; then
  echo "Stopping PostgreSQL..."
  sudo pkill -u postgres
fi

# Run other commands
yarn
yarn docker:up
yarn prisma:studio &
yarn dev -- -p 3000

# Open the localhost URL in the default web browser
open http://localhost:3000 