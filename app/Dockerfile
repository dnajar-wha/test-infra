FROM nginx:latest

# Install curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy application files
COPY . /usr/share/nginx/html/

# Copy nginx config with health endpoint support
COPY nginx-health.conf /etc/nginx/conf.d/health.conf

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -sf http://localhost:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
