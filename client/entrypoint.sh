#!/bin/sh

# Set defaults if not provided
VITE_DIRECTUS_URL=${VITE_DIRECTUS_URL:-""}
VITE_FLOWISE_URL=${VITE_FLOWISE_URL:-"http://localhost:3000"}
VITE_FLOWISE_CHATFLOW_ID=${VITE_FLOWISE_CHATFLOW_ID:-""}

echo "Injecting runtime environment variables..."
echo "VITE_DIRECTUS_URL: $VITE_DIRECTUS_URL"
echo "VITE_FLOWISE_URL: $VITE_FLOWISE_URL"
echo "VITE_FLOWISE_CHATFLOW_ID: $VITE_FLOWISE_CHATFLOW_ID"

# Find all JS files in the assets directory and replace placeholders
# We use | as a delimiter in sed because URLs contain slashes
for file in /usr/share/nginx/html/assets/*.js; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    sed -i "s|PLACEHOLDER_VITE_DIRECTUS_URL|${VITE_DIRECTUS_URL}|g" "$file"
    sed -i "s|PLACEHOLDER_VITE_FLOWISE_URL|${VITE_FLOWISE_URL}|g" "$file"
    sed -i "s|PLACEHOLDER_VITE_FLOWISE_CHATFLOW_ID|${VITE_FLOWISE_CHATFLOW_ID}|g" "$file"
  fi
done

# Execute the CMD passed to the container (Nginx)
exec "$@"
