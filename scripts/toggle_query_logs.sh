#!/usr/bin/env bash

# Toggle Prisma Query Logging in .env
ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
  touch "$ENV_FILE"
fi

if grep -q "PRISMA_LOG_QUERIES=true" "$ENV_FILE"; then
  sed -i '' 's/PRISMA_LOG_QUERIES=true/PRISMA_LOG_QUERIES=false/' "$ENV_FILE"
  echo "🔇 Prisma query logging disabled in .env (PRISMA_LOG_QUERIES=false)"
else
  if grep -q "PRISMA_LOG_QUERIES=" "$ENV_FILE"; then
    sed -i '' 's/PRISMA_LOG_QUERIES=false/PRISMA_LOG_QUERIES=true/' "$ENV_FILE"
  else
    echo "PRISMA_LOG_QUERIES=true" >> "$ENV_FILE"
  fi
  echo "🔊 Prisma query logging enabled in .env (PRISMA_LOG_QUERIES=true)"
fi
