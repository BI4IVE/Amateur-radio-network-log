#!/bin/bash
set -Eeuo pipefail

cd "${COZE_WORKSPACE_PATH}"

echo "Installing dependencies..."
pnpm install

echo "Building the project..."
pnpm run build

echo "Build completed successfully!"
