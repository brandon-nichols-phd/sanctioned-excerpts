#!/bin/bash

#Assumes you are using a Mac

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Script is running from: $DIR"

noderoot="$DIR/node_modules"

if [ -e "$noderoot" ]; then
echo "Node module folder found, cleaning..."
rm -r ./node_modules
fi

echo "Initializing frontend..."
export NVM_DIR="$HOME/.nvm"
# load nvm
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "Setting node environment..."
nvm use 22
echo "Done setting node environment."

echo "Installing packages..."
npm install --force
echo "Done installing packages."