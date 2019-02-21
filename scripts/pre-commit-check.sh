#!/bin/sh

# Branches to prevent commits in: master
RED='\033[0;31m'
NC='\033[0m' # No Color
branch="$(git rev-parse --abbrev-ref HEAD)"

if [ "$branch" = "master" ]; then
  echo "⛔️  ${RED}You can't commit directly to branch: ${branch}${NC}\n"
  exit 1
fi