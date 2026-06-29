FROM node:20-alpine AS builder

WORKDIR /workspace

# Copy the extensions directory
COPY extensions ./extensions

# Loop through each extension, install all dependencies, build, and prune devDependencies
RUN for dir in extensions/*; do \
      if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then \
        echo "Building extension: $(basename "$dir")..." && \
        cd "$dir" && \
        npm ci && \
        npm run build && \
        npm prune --production && \
        cd /workspace; \
      fi; \
    done

# Use the official Directus 11 image as the base
FROM directus/directus:11

# Copy the built extensions into the container with the correct ownership
COPY --from=builder --chown=node:node /workspace/extensions /directus/extensions
