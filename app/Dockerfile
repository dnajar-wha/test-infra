FROM nginx:latest

# Install curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy application files
COPY . /usr/share/nginx/html/

# Remove default config and create custom one with health endpoint
RUN rm -f /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -sf http://localhost:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
