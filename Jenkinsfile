pipeline {
    agent any

    stages {

        stage('Build') {
            steps {
                sh '''
                docker build -t myapp:latest /workspace/app
                '''
            }
        }

        stage('Deploy App1') {
            steps {
                sh '''
                docker rm -f app1 || true

                docker run -d \
                  --name app1 \
                  --network nginx-haproxy-jenkins-lab_default \
                  myapp:latest
                '''
            }
        }

        stage('Deploy App2') {
            steps {
                sh '''
                docker rm -f app2 || true

                docker run -d \
                  --name app2 \
                  --network nginx-haproxy-jenkins-lab_default \
                  myapp:latest
                '''
            }
        }

    }
}