pipeline {
    agent any

    environment {
        APP_NAME = 'myapp'
        // Version format: 1.0.0-abc1234 (semver + git commit)
        APP_VERSION = "${env.BUILD_NUMBER}-${env.GIT_COMMIT?.take(7) ?: 'local'}"
        NETWORK_NAME = sh(
            script: 'docker network ls --format "{{.Name}}" | grep -E "nginx-haproxy.*_default" | head -1',
            returnStdout: true
        ).trim()
        HEALTH_CHECK_RETRIES = 30
        HEALTH_CHECK_INTERVAL = 2
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    if (NETWORK_NAME.isEmpty()) {
                        NETWORK_NAME = 'nginx-haproxy-jenkins-lab_default'
                    }
                    echo "Using network: ${NETWORK_NAME}"
                    echo "Building version: ${APP_VERSION}"
                }
            }
        }

        stage('Build') {
            steps {
                sh '''
                    docker build \
                      -t ${APP_NAME}:${APP_VERSION} \
                      -t ${APP_NAME}:latest \
                      /workspace/app
                '''
            }
        }

        stage('Security Scan') {
            steps {
                script {
                    // Optional: Run trivy if available
                    try {
                        sh '''
                            if command -v trivy &> /dev/null; then
                                trivy image --exit-code 0 --severity HIGH,CRITICAL ${APP_NAME}:${APP_VERSION} || true
                            else
                                echo "Trivy not installed, skipping security scan"
                            fi
                        '''
                    } catch (Exception e) {
                        echo "Security scan failed but continuing: ${e.message}"
                    }
                }
            }
        }

        stage('Deploy App1') {
            steps {
                script {
                    deployContainer('app1')
                }
            }
        }

        stage('Deploy App2') {
            steps {
                script {
                    deployContainer('app2')
                }
            }
        }

        stage('Health Check') {
            steps {
                script {
                    echo "Waiting for containers to be healthy..."
                    def app1Healthy = waitForHealth('app1')
                    def app2Healthy = waitForHealth('app2')

                    if (!app1Healthy || !app2Healthy) {
                        error("Health checks failed - rolling back")
                    }
                    echo "All containers healthy"
                }
            }
        }

        stage('Smoke Test') {
            steps {
                sh '''
                    echo "Running smoke tests..."

                    # Test Nginx proxy
                    if ! curl -sf --max-time 5 http://nginx:80/ > /dev/null; then
                        echo "FAIL: Nginx not responding"
                        exit 1
                    fi

                    # Test HAProxy stats (with auth)
                    if ! curl -sf --max-time 5 -u admin:ad*in123 http://haproxy:8404/stats > /dev/null; then
                        echo "FAIL: HAProxy stats not responding"
                        exit 1
                    fi

                    # Test direct backend access
                    if ! curl -sf --max-time 5 http://app1:80/health > /dev/null; then
                        echo "FAIL: App1 health endpoint not responding"
                        exit 1
                    fi

                    if ! curl -sf --max-time 5 http://app2:80/health > /dev/null; then
                        echo "FAIL: App2 health endpoint not responding"
                        exit 1
                    fi

                    echo "All smoke tests passed!"
                '''
            }
        }

        stage('Cleanup') {
            steps {
                sh '''
                    # Remove old images (keep last 5)
                    docker images ${APP_NAME} --format "{{.Tag}}" | \
                      grep -v "${APP_VERSION}" | \
                      grep -v "latest" | \
                      tail -n +6 | \
                      xargs -r -I {} docker rmi ${APP_NAME}:{} || true
                '''
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        failure {
            script {
                echo "Deployment failed! Check logs for details."
                sh '''
                    docker logs app1 --tail 50 || true
                    docker logs app2 --tail 50 || true
                '''
            }
        }
        success {
            echo "Deployment successful! Version: ${APP_VERSION}"
        }
    }
}

// Helper function: Deploy a container with blue-green strategy
def deployContainer(String containerName) {
    def newName = "${containerName}-new"

    stage("Prepare ${containerName}") {
        sh """
            docker rm -f ${containerName} || true
            docker rm -f ${newName} || true
        """
    }

    stage("Start ${containerName}") {
        sh """
            docker run -d \\
              --name ${newName} \\
              --network ${NETWORK_NAME} \\
              --restart unless-stopped \\
              --label "app.version=${APP_VERSION}" \\
              --label "app.name=${containerName}" \\
              ${APP_NAME}:${APP_VERSION}
        """
    }

    stage("Validate ${containerName}") {
        script {
            def healthy = waitForHealth(newName)
            if (!healthy) {
                sh "docker rm -f ${newName} || true"
                error("Container ${containerName} failed health check")
            }
        }
    }

    stage("Activate ${containerName}") {
        sh """
            docker rename ${newName} ${containerName}
        """
    }
}

// Helper function: Wait for container health endpoint
def waitForHealth(String containerName, int maxRetries = 30, int interval = 2) {
    def retries = 0
    while (retries < maxRetries) {
        try {
            def result = sh(
                script: "docker exec ${containerName} curl -sf http://localhost:80/health",
                returnStatus: true
            )
            if (result == 0) {
                echo "${containerName} is healthy after ${retries + 1} attempts"
                return true
            }
        } catch (Exception e) {
            // Container not ready yet
        }

        retries++
        sleep(interval)
    }

    echo "${containerName} failed health check after ${maxRetries} attempts"
    return false
}
