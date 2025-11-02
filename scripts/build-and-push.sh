#!/bin/bash
set -e

# Configuration
REGISTRY="your-registry.example.com"
IMAGE_NAME="game-platform"
VERSION=$(cat helm/game-platform/Chart.yaml | grep "^version:" | awk '{print $2}')

echo "Building image ${REGISTRY}/${IMAGE_NAME}:${VERSION}"

# Build image
docker build -f Dockerfile.k8s -t ${REGISTRY}/${IMAGE_NAME}:${VERSION} .
docker tag ${REGISTRY}/${IMAGE_NAME}:${VERSION} ${REGISTRY}/${IMAGE_NAME}:latest

# Push to registry
docker push ${REGISTRY}/${IMAGE_NAME}:${VERSION}
docker push ${REGISTRY}/${IMAGE_NAME}:latest

echo "Image pushed successfully!"