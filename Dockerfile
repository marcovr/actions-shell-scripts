FROM ubuntu:24.04

RUN apt update && apt install -y \
    nodejs \
    npm \
    # Install dependencies vor vscode:
    # See also: https://github.com/microsoft/vscode-generator-code/blob/main/.github/workflows/tests.yml
    libnss3 \
    libatk1.0-0t64 \
    libatk-bridge2.0-0t64 \
    libgtk-3-0t64 \
    libasound2t64 \
    xvfb \
    x11-xserver-utils

WORKDIR /test

COPY . ./

RUN npm ci

# Run tests with virtual framebuffer
RUN xvfb-run --auto-servernum npm test
