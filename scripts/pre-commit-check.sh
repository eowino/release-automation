# Branches to prevent commits in: master, develop, preprod

branch="$(git rev-parse --abbrev-ref HEAD)"

if [ "$branch" = "master" ]; then
  echo "⛔️  You can't commit directly to ${branch} branch"
  exit 1
fi