pipeline {
    agent {
        docker {
            image 'mcr.microsoft.com/playwright:v1.62.1-noble'
            args '--user root'
        }
    }

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
    }

    parameters {
        booleanParam(
            name: 'DEPLOY_STAGING',
            defaultValue: true,
            description: 'Publicar em staging após os testes passarem'
        )
        booleanParam(
            name: 'DEPLOY_PRODUCTION',
            defaultValue: false,
            description: 'Solicitar aprovação e publicar em produção'
        )
        string(
            name: 'BASE_URL',
            defaultValue: '',
            description: 'Opcional: testar contra uma URL externa (ex.: https://staging.1ipim.online)'
        )
    }

    environment {
        CI = 'true'
        NODE_ENV = 'test'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Instalar dependências') {
            steps {
                dir('astro_project') {
                    sh 'npm ci'
                }
            }
        }

        stage('Build') {
            steps {
                withCredentials([
                    string(credentialsId: 'youtube-api-key', variable: 'YOUTUBE_API_KEY')
                ]) {
                    dir('astro_project') {
                        sh 'echo "YOUTUBE_API_KEY=$YOUTUBE_API_KEY" > .env'
                        sh 'npm run build'
                    }
                }
            }
        }

        stage('Testes E2E (Playwright)') {
            steps {
                dir('astro_project') {
                    script {
                        if (params.BASE_URL?.trim()) {
                            sh "BASE_URL='${params.BASE_URL.trim()}' npx playwright test"
                        } else {
                            sh 'npx playwright test'
                        }
                    }
                }
            }
        }

        stage('Preparar deploy') {
            when {
                expression { params.DEPLOY_STAGING || params.DEPLOY_PRODUCTION }
            }
            steps {
                sh 'apt-get update && apt-get install -y python3-pip'
                sh 'pip3 install --break-system-packages paramiko'
            }
        }

        stage('Deploy staging') {
            when {
                expression {
                    params.DEPLOY_STAGING &&
                    (env.BRANCH_NAME == null || env.BRANCH_NAME == 'master')
                }
            }
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: '1ipim-sftp',
                        usernameVariable: 'DEPLOY_USER',
                        passwordVariable: 'DEPLOY_PASS'
                    )
                ]) {
                    sh 'python3 scripts/deploy_astro.py --target staging --confirm'
                }
            }
        }

        stage('Aprovação produção') {
            when {
                expression { params.DEPLOY_PRODUCTION }
            }
            steps {
                input message: 'Testes passaram. Publicar em produção agora?', ok: 'Publicar'
            }
        }

        stage('Deploy produção') {
            when {
                expression {
                    params.DEPLOY_PRODUCTION &&
                    (env.BRANCH_NAME == null || env.BRANCH_NAME == 'master')
                }
            }
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: '1ipim-sftp',
                        usernameVariable: 'DEPLOY_USER',
                        passwordVariable: 'DEPLOY_PASS'
                    )
                ]) {
                    sh 'python3 scripts/deploy_astro.py --target production --confirm'
                }
            }
        }
    }

    post {
        always {
            junit allowEmptyResults: true, testResults: 'astro_project/test-results/junit.xml'
            archiveArtifacts artifacts: 'astro_project/playwright-report/**, astro_project/test-results/**', allowEmptyArchive: true
            catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                publishHTML(target: [
                    allowMissing: true,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: 'astro_project/playwright-report',
                    reportFiles: 'index.html',
                    reportName: 'Playwright'
                ])
            }
        }
        failure {
            echo 'Pipeline falhou. A versão não foi entregue.'
        }
        success {
            echo 'Testes E2E passaram. Deploy concluído conforme os parâmetros.'
        }
    }
}
