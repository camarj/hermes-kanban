#!/bin/bash
set -euo pipefail

HERMES_HOME="${HERMES_HOME:-/data}"
LLM_MODEL="${LLM_MODEL:-glm-5.1}"
LLM_PROVIDER="${LLM_PROVIDER:-opencode-go}"

echo "=== Hermes Agent Gateway Setup ==="
echo "HERMES_HOME: ${HERMES_HOME}"
echo "LLM Provider: ${LLM_PROVIDER}"
echo "LLM Model: ${LLM_MODEL}"
echo "API Server Port: ${API_SERVER_PORT:-8642}"

mkdir -p "${HERMES_HOME}/profiles"

if [ ! -f "${HERMES_HOME}/.env" ]; then
    touch "${HERMES_HOME}/.env"
fi

if [ -n "${OPENCODE_GO_API_KEY:-}" ]; then
    grep -q "^OPENCODE_GO_API_KEY=" "${HERMES_HOME}/.env" 2>/dev/null && \
      sed -i "s|^OPENCODE_GO_API_KEY=.*|OPENCODE_GO_API_KEY=${OPENCODE_GO_API_KEY}|" "${HERMES_HOME}/.env" || \
      echo "OPENCODE_GO_API_KEY=${OPENCODE_GO_API_KEY}" >> "${HERMES_HOME}/.env"
    LLM_PROVIDER="opencode-go"
    echo "Configuring opencode-go provider"
elif [ -n "${OPENROUTER_API_KEY:-}" ]; then
    echo "OPENROUTER_API_KEY=${OPENROUTER_API_KEY}" >> "${HERMES_HOME}/.env"
    LLM_PROVIDER="openrouter"
    echo "Configuring OpenRouter provider"
elif [ -n "${ANTHROPIC_API_KEY:-}" ]; then
    echo "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}" >> "${HERMES_HOME}/.env"
    LLM_PROVIDER="anthropic"
    echo "Configuring Anthropic provider"
elif [ -n "${OPENAI_API_KEY:-}" ]; then
    echo "OPENAI_API_KEY=${OPENAI_API_KEY}" >> "${HERMES_HOME}/.env"
    LLM_PROVIDER="openai"
    echo "Configuring OpenAI provider"
elif [ -n "${CUSTOM_LLM_BASE_URL:-}" ]; then
    if [ -n "${CUSTOM_LLM_API_KEY:-}" ]; then
        echo "OPENAI_API_KEY=${CUSTOM_LLM_API_KEY}" >> "${HERMES_HOME}/.env"
    fi
    LLM_PROVIDER="custom"
    echo "Configuring custom provider: ${CUSTOM_LLM_BASE_URL}"
else
    echo "WARNING: No LLM API key configured."
    echo "Set one of: OPENCODE_GO_API_KEY, OPENROUTER_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, or CUSTOM_LLM_BASE_URL"
fi

if [ "${LLM_PROVIDER}" = "custom" ]; then
    cat > "${HERMES_HOME}/config.yaml" <<EOF
model:
  default: "${LLM_MODEL}"
  provider: custom
  base_url: "${CUSTOM_LLM_BASE_URL}"
EOF
else
    cat > "${HERMES_HOME}/config.yaml" <<EOF
model:
  default: "${LLM_MODEL}"
  provider: ${LLM_PROVIDER}
EOF
fi

echo "Initializing kanban..."
hermes kanban init 2>/dev/null || true

echo "=== Setup complete. Starting gateway... ==="
echo ""
echo "Provider endpoints:"
echo "  API Server: http://0.0.0.0:${API_SERVER_PORT:-8642}"
echo "  Health:     http://0.0.0.0:${API_PORT:-8642}/health"
echo "  Models:     http://0.0.0.0:${API_SERVER_PORT:-8642}/v1/models"
echo ""

exec hermes gateway run