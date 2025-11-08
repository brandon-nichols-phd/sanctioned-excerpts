#!/bin/bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Script is running from: $DIR"

noderoot="$DIR/node_modules"

if [ -e "$noderoot" ]; then

echo "Initializing environment..."
export NVM_DIR="$HOME/.nvm"

# load nvm
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "Setting node environment..."
nvm use 22
echo "Done setting node environment."

echo "Starting frontend developmemt server..."
npm run start:local

else
echo "Please run init_local.sh first...."
exit 1
fi

