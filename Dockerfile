# Build stage
FROM node:18-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Set build-time environment variables
ENV NODE_ENV=production
ENV NEXTAUTH_URL=https://z.tigerpanda.tv
ENV NEXT_PUBLIC_APP_URL=https://z.tigerpanda.tv

# Build arguments for environment variables
ARG AZURE_OPENAI_API_KEY
ARG AZURE_OPENAI_ENDPOINT
ARG AZURE_OPENAI_DEPLOYMENT
ARG JWT_SECRET

# Set environment variables for build
ENV AZURE_OPENAI_API_KEY=$AZURE_OPENAI_API_KEY
ENV AZURE_OPENAI_ENDPOINT=$AZURE_OPENAI_ENDPOINT
ENV AZURE_OPENAI_DEPLOYMENT=$AZURE_OPENAI_DEPLOYMENT
ENV JWT_SECRET=$JWT_SECRET

# Build application
RUN pnpm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Create public directory
RUN mkdir -p public
# Attempt to copy public files (will not fail if directory is empty or doesn't exist)
RUN cp -r /app/public/. ./public/ 2>/dev/null || true

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "./server.js"] 