# Dockerfile
# Multi-stage Dockerfile for building and serving the frontend.
# 1. Build Stage: Uses Node image to install deps and run Vite build.
# 2. Serve Stage: Uses lightweight nginx image to serve built static files.

# ---- Build Stage ----
FROM node:20 AS builder
WORKDIR /app
COPY . .
RUN npm install && npm run build

# ---- Serve Stage ----
FROM nginx:alpine
# Copy static build files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf