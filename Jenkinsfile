pipeline {
    agent any

    environment {
        APP_NAME = 'myapp'
        APP_VERSION = "${env.BUILD_NUMBER}-${env.GIT_COMMIT?.take(7) ?: 'local'}"

        // Remote VM settings
        DEPLOY_HOST = '192.168.139.128'
        DEPLOY_USER = 'dnajar'
        SSH_KEY = '/var/jenkins_home/.ssh/deploy-key'
        SSH_OPTS = "-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo "Building version: ${APP_VERSION}"
                echo "Deploy: app1=local, app2=${DEPLOY_HOST}"
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

        stage('Export Image') {
            steps {
                sh '''
                    docker save ${APP_NAME}:${APP_VERSION} -o /tmp/${APP_NAME}-${APP_VERSION}.tar
                    echo "Image exported: $(ls -lh /tmp/${APP_NAME}-${APP_VERSION}.tar)"
                '''
            }
        }

        stage('Deploy App1 (Local)') {
            steps {
                sh '''
                    docker rm -f app1 || true
                    docker run -d \
                      --name app1 \
                      --restart unless-stopped \
                      --label "app.version=${APP_VERSION}" \
                      --label "app.name=app1" \
                      -p 8081:80 \
                      ${APP_NAME}:${APP_VERSION}
                    echo "App1 started on port 8081"
                '''
            }
        }

        stage('Deploy App2 (VM)') {
            steps {
                script {
                    sh """
                        scp ${SSH_OPTS} -i ${SSH_KEY} /tmp/${APP_NAME}-${APP_VERSION}.tar ${DEPLOY_USER}@${DEPLOY_HOST}:/tmp/${APP_NAME}-${APP_VERSION}.tar
                    """
                    sh """
                        ssh ${SSH_OPTS} -i ${SSH_KEY} ${DEPLOY_USER}@${DEPLOY_HOST} "docker load -i /tmp/${APP_NAME}-${APP_VERSION}.tar && rm /tmp/${APP_NAME}-${APP_VERSION}.tar"
                        ssh ${SSH_OPTS} -i ${SSH_KEY} ${DEPLOY_USER}@${DEPLOY_HOST} "docker rm -f app2 || true"
                        ssh ${SSH_OPTS} -i ${SSH_KEY} ${DEPLOY_USER}@${DEPLOY_HOST} "docker run -d --name app2 --restart unless-stopped --label 'app.version=${APP_VERSION}' --label 'app.name=app2' -p 80:80 ${APP_NAME}:${APP_VERSION}"
                        echo "App2 started on VM at port 80"
                    """
                }
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    echo "Waiting for containers to be healthy..."

                    for i in 1 2 3 4 5; do
                        sleep 2
                        if curl -sf http://localhost:8081/health > /dev/null; then
                            echo "App1 is healthy"
                            break
                        fi
                    done

                    ssh ${SSH_OPTS} -i ${SSH_KEY} ${DEPLOY_USER}@${DEPLOY_HOST} "for i in 1 2 3 4 5; do sleep 2; if curl -sf http://localhost:80/health > /dev/null; then echo 'App2 is healthy'; break; fi; done"
                '''
            }
        }

        stage('Verify Load Balancer') {
            steps {
                sh '''
                    echo "Testing HAProxy..."
                    sleep 3

                    if curl -sf -u admin:ad*in123 http://localhost:8404/stats > /dev/null; then
                        echo "HAProxy stats: OK"
                    else
                        echo "HAProxy stats: FAILED"
                    fi

                    if curl -sf http://localhost:80/ > /dev/null; then
                        echo "HAProxy routing: OK"
                    else
                        echo "HAProxy routing: FAILED"
                    fi
                '''
            }
        }
    }

    post {
        always {
            cleanWs()
            sh 'rm -f /tmp/${APP_NAME}-${APP_VERSION}.tar || true'
        }
        failure {
            script {
                echo "Deployment failed! Checking status..."
                sh '''
                    echo "=== Local app1 ==="
                    docker ps -a --filter name=app1 --format "{{.Names}}\t{{.Status}}"
                    docker logs app1 --tail 10 || true

                    echo "=== Remote app2 ==="
                    ssh ${SSH_OPTS} -i ${SSH_KEY} ${DEPLOY_USER}@${DEPLOY_HOST} "docker ps -a --filter name=app2 --format '{{.Names}}\t{{.Status}}'" || true
                '''
            }
        }
        success {
            echo "✅ Deployed ${APP_VERSION}"
            echo ""
            echo "Access points:"
            echo "  HAProxy (LB): http://localhost:80/"
            echo "  HAProxy Stats: http://localhost:8404/stats (admin:ad*in123)"
            echo "  App1 (local): http://localhost:8081/"
            echo "  App2 (VM):    http://${DEPLOY_HOST}/"
        }
    }
}
