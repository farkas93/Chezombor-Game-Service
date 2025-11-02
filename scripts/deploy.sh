#!/bin/bash
set -e

NAMESPACE=${1:-games}
RELEASE_NAME=${2:-game-platform}

cd ..

echo "Deploying to namespace: ${NAMESPACE}"

# Install or upgrade
helm upgrade --install ${RELEASE_NAME} ./helm/game-platform \
  --namespace ${NAMESPACE} \
  --create-namespace \
  --wait \
  --timeout 5m

echo "Deployment complete!"
echo "Check status: kubectl get pods -n ${NAMESPACE}"