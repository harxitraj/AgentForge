FROM node:18-alpine

# Install git and essential tools
RUN apk add --no-cache git curl bash

# Configure git globals
RUN git config --global user.email "agentforge@bot.com" && \
    git config --global user.name "AgentForge Bot" && \
    git config --global credential.helper store && \
    git config --global init.defaultBranch main

WORKDIR /workspace

CMD ["sh"]
