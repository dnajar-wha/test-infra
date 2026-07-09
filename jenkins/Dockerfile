FROM jenkins/jenkins:lts

USER root

# Install Docker CLI, SSH client, and git
RUN apt-get update && \
    apt-get install -y docker.io openssh-client git && \
    rm -rf /var/lib/apt/lists/*

# Add SSH key for remote deployment
COPY deploy-key /var/jenkins_home/.ssh/deploy-key
RUN chown jenkins:jenkins /var/jenkins_home/.ssh/deploy-key && \
    chmod 600 /var/jenkins_home/.ssh/deploy-key

# Add VM to known_hosts to avoid interactive prompt
RUN mkdir -p /var/jenkins_home/.ssh && \
    ssh-keyscan -H 192.168.139.128 >> /var/jenkins_home/.ssh/known_hosts && \
    chown -R jenkins:jenkins /var/jenkins_home/.ssh

USER jenkins
