FROM python:3.11-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    nodejs \
    npm \
    ripgrep \
    ffmpeg \
    curl \
    bash \
    && rm -rf /var/lib/apt/lists/*

ENV HERMES_HOME=/data
ENV PATH="/root/.local/bin:${PATH}"

RUN curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash

ENV API_SERVER_ENABLED=true
ENV API_SERVER_HOST=0.0.0.0
ENV API_SERVER_PORT=8642

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8642
VOLUME /data

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
    CMD curl -f http://localhost:8642/health || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]