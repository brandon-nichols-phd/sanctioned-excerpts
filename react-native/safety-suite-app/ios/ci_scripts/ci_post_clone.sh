#!/bin/bash
set -euxo pipefail

# Resolve repo root no matter where we're invoked from
# (this script lives at ios/ci_scripts/ci_post_clone.sh)
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

############################################
# Node 20 + npm 10 (match local)
############################################
if ! command -v node >/dev/null 2>&1 || ! node -v | grep -q 'v20\.'; then
  brew install node@20
  if [ -d "/usr/local/opt/node@20/bin" ]; then
    export PATH="/usr/local/opt/node@20/bin:$PATH"
  elif [ -d "/opt/homebrew/opt/node@20/bin" ]; then
    export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
  fi
fi
node -v
npm -v

############################################
# Ruby 3.2 for CocoaPods (avoid Ruby 3.4 stdlib issues)
############################################
brew install ruby@3.2 || true
if [ -d "/opt/homebrew/opt/ruby@3.2/bin" ]; then
  export PATH="/opt/homebrew/opt/ruby@3.2/bin:$PATH"
elif [ -d "/usr/local/opt/ruby@3.2/bin" ]; then
  export PATH="/usr/local/opt/ruby@3.2/bin:$PATH"
fi
ruby -v
gem -v

# Isolate gems to the repo; no sudo
export GEM_HOME="$REPO_ROOT/vendor/gems"
export GEM_PATH="$GEM_HOME"
export PATH="$GEM_HOME/bin:$PATH"

gem install bundler -v 2.5.10 --no-document
bundle config set path "$REPO_ROOT/vendor/bundle"
bundle config set force_ruby_platform 'true'
bundle install

############################################
# JS dependencies (npm only; don’t mix yarn)
############################################
export YARN_IGNORE_PATH=1
cd "$REPO_ROOT"
if [ -f package-lock.json ]; then
  npm ci --legacy-peer-deps
else
  npm install --legacy-peer-deps
fi

############################################
# iOS Pods via Bundler
############################################
cd "$REPO_ROOT/ios"
bundle exec pod repo update
bundle exec pod install --repo-update

echo "✅ Post-clone setup finished."

