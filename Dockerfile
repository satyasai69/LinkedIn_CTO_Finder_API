# Use the official Bun image
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# Copy package files
COPY package.json bun.lockb ./

# Install all dependencies first
RUN bun install --no-frozen-lockfile

# Copy source code
COPY . .

# Set production environment
ENV NODE_ENV=production

# [optional] tests & build
RUN bun run build || echo "No build script found, skipping..."

# Create temp directory for CSV files with proper permissions
RUN mkdir -p /usr/src/app/temp && \
    chown -R bun:bun /usr/src/app && \
    chmod -R 755 /usr/src/app && \
    chmod -R 777 /usr/src/app/temp

# Expose port
EXPOSE 3000

# Run the app
USER bun
CMD ["bun", "run", "index.ts"]