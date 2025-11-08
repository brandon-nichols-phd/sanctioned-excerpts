#!/bin/bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if root parameter is provided
if [ -z "$1" ]; then
  echo "Port not provided, using port: 9001"
  PORT="9001"
else
  PORT=$1
  echo "Using port: $PORT"
fi

if [[ "$DIR" == */backend-customer ]]; then
  echo "Current directory is backend-customer, opening /app directory..."
  cd app/
else
  if [[ "$DIR" == "*/app" ]]; then
    echo "Already in app directory. Starting...."
  else
    echo "Current directory is: $DIR Please navigate to /backend_customer and restart script"
    exit 1
  fi
fi

echo "Installing backend requirements..."
python -m pip uninstall -y backendlib
python -m pip install -r requirements.txt --upgrade
echo "Done installing backend requirements..."

echo "Starting backend dev server..."
chalice local --stage local --port $PORT
echo "Done."
