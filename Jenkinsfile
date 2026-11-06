pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 45, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
    }

    parameters {
        booleanParam(
            name: 'DEPLOY_STAGING',
            defaultValue: true,
            description: 'Publicar no staging e validar com Playwright'
        )
        booleanParam(
            name: 'DEPLOY_PRODUCTION',
            defaultValue: false,
            description: 'Publicar em produção após os testes locais e de staging (marque manualmente)'
        )
        booleanParam(
            name: 'REQUIRE_APPROVAL',
            defaultValue: false,
            description: 'Pausar para aprovação manual antes do deploy de produção'
        )
    }

    environment {
        CI = 'true'
        NODE_ENV = 'test'
    }

    stages {
        stage('Instalar dependências') {
            steps {
                dir('astro_project') {
                    sh 'npm ci'
                }
            }
        }

        stage('Build') {
            steps {
                dir('astro_project') {
                    sh 'npm run build'
                }
            }
        }

        stage('Testes locais (Playwright)') {
            steps {
                dir('astro_project') {
                    sh 'npx playwright test'
                }
            }
        }

        stage('Lighthouse CI') {
            steps {
                dir('astro_project') {
                    sh '''
                        set -e
                        npm run preview -- --port 4321 > /tmp/lighthouse-preview.log 2>&1 &
                        PREVIEW_PID=$!
                        trap "kill $PREVIEW_PID 2>/dev/null || true" EXIT
                        for i in $(seq 1 30); do
                            curl -sf http://localhost:4321/ >/dev/null && break
                            sleep 1
                        done
                        curl -sf http://localhost:4321/ >/dev/null || (cat /tmp/lighthouse-preview.log; exit 1)
                        export CHROME_PATH=$(find /ms-playwright -maxdepth 3 -type f -name chrome | head -1)
                        npx lhci autorun
                        node scripts/lighthouse_index.mjs
                    '''
                }
            }
        }

        stage('Deploy staging') {
            when {
                expression { params.DEPLOY_STAGING }
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

        stage('Testes no staging (Playwright)') {
            when {
                expression { params.DEPLOY_STAGING }
            }
            steps {
                dir('astro_project') {
                    sh 'BASE_URL=https://staging.1ipim.online npx playwright test'
                }
            }
        }

        stage('Aprovação para produção') {
            when {
                expression { params.DEPLOY_PRODUCTION && params.REQUIRE_APPROVAL }
            }
            steps {
                input message: 'Testes locais e de staging passaram. Publicar em produção?', ok: 'Publicar'
            }
        }

        stage('Deploy produção') {
            when {
                expression { params.DEPLOY_PRODUCTION }
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

        stage('Smoke produção (Playwright)') {
            when {
                expression { params.DEPLOY_PRODUCTION }
            }
            steps {
                dir('astro_project') {
                    sh 'BASE_URL=https://1ipim.online npx playwright test'
                }
            }
        }
    }

    post {
        always {
            junit allowEmptyResults: true, testResults: 'astro_project/test-results/junit.xml'
            archiveArtifacts artifacts: 'astro_project/playwright-report/**, astro_project/test-results/**, astro_project/lighthouse-reports/**', allowEmptyArchive: true
            catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                publishHTML(target: [
                    allowMissing: true,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: 'astro_project/playwright-report',
                    reportFiles: 'index.html',
                    reportName: 'Playwright'
                ])
                publishHTML(target: [
                    allowMissing: true,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: 'astro_project/lighthouse-reports',
                    reportFiles: 'index.html',
                    reportName: 'Lighthouse'
                ])
            }
        }
        failure {
            echo 'Pipeline falhou. Verifique o relatório do Playwright e os logs do deploy.'
        }
        success {
            echo 'Pipeline concluído: testes locais, staging e produção conforme os parâmetros.'
        }
    }
}
