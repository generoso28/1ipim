FROM jenkins/jenkins:lts-jdk21

USER root

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        gnupg \
        git \
        python3 \
        python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Node 22 (Astro 6 exige >= 22.12)
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Playwright 1.62.1 + Chromium + dependências do sistema
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx --yes playwright@1.62.1 install --with-deps chromium \
    && chmod -R a+rX /ms-playwright

# Cliente SFTP usado pelo scripts/deploy_astro.py
RUN pip3 install --break-system-packages paramiko

# Plugins do Jenkins
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

USER jenkins

ENV CASC_JENKINS_CONFIG=/var/jenkins_home/casc/jenkins.yaml
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
