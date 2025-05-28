#!/bin/bash

# Name of the Docker Compose service
SERVICE_NAME="web"
PORT=8080

# Trap Ctrl+C and stop the Docker container
cleanup() {
  echo ""
  echo "Stopping map server..."
  docker-compose down
  echo "Map server stopped. Goodbye!"
  exit 0
}

# Set trap for INT signal (Ctrl+C)
trap cleanup INT

echo "Map server is running on http://localhost:$PORT"

echo "-------------------------------------------"
echo " 🚀 Building and starting the 3D map server "
echo "-------------------------------------------"
docker-compose up --build


# If the container exits naturally
cleanup
