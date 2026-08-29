FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
# Ensure we have the correct build environment
ENV NODE_ENV=production
RUN npm run build

# Debug: Check if dist exists and has content
RUN ls -la dist

# Production image
FROM nginx:1.27-alpine AS runner
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy built artifacts from the builder stage
COPY --from=builder /app/dist ./

# Set permissions (critical for Nginx to read files if running as non-root)
RUN chmod -R 755 /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
