# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build with placeholders for environment variables to allow runtime injection
ENV VITE_DIRECTUS_URL=PLACEHOLDER_VITE_DIRECTUS_URL
ENV VITE_FLOWISE_URL=PLACEHOLDER_VITE_FLOWISE_URL
ENV VITE_FLOWISE_CHATFLOW_ID=PLACEHOLDER_VITE_FLOWISE_CHATFLOW_ID

RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script for runtime environment variable injection
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
