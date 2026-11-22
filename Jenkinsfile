pipeline {
    agent any

    tools {
        nodejs 'NodeJS-22'
    }

    parameters {
        choice(
            name: 'API_ENV',
            choices: ['local', 'qa', 'prod'],
            description: 'Target API environment (local uses the built-in mock server)'
        )
        string(
            name: 'TAGS',
            defaultValue: '',
            description: 'Cucumber tag expression (e.g., @smoke, @regression, @users and not @negative)'
        )
        string(
            name: 'PARALLEL_WORKERS',
            defaultValue: '3',
            description: 'Number of parallel Cucumber workers'
        )
        string(
            name: 'BASE_URL_OVERRIDE',
            defaultValue: '',
            description: 'Optional custom BASE_URL override (leave blank to use envConfig default)'
        )
    }

    environment {
        CI = 'true'
        API_ENV = "${params.API_ENV}"
        TIMEOUT_MS = '10000'
        // Optional Jenkins credential for external APIs (fallback handled in envConfig.ts)
        API_KEY = credentials('reqres-api-key')
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timestamps()
        timeout(time: 15, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'node -v && npm -v'
                sh 'npm ci'
            }
        }

        stage('Type Check') {
            steps {
                sh 'npm run typecheck'
            }
        }

        stage('Run API BDD Tests') {
            steps {
                script {
                    def extraArgs = "--parallel ${params.PARALLEL_WORKERS}"
                    if (params.TAGS?.trim()) {
                        extraArgs += " --tags '${params.TAGS.trim()}'"
                    }

                    def envVars = []
                    if (params.BASE_URL_OVERRIDE?.trim()) {
                        envVars.add("BASE_URL=${params.BASE_URL_OVERRIDE.trim()}")
                    }

                    withEnv(envVars) {
                        if (params.API_ENV == 'local') {
                            sh "node scripts/run-local.mjs ${extraArgs}"
                        } else {
                            sh "node scripts/run.mjs ${extraArgs}"
                        }
                    }
                }
            }
        }
    }

    post {
        always {
            // Publish JUnit XML results in Jenkins Test Results trend view
            junit allowEmptyResults: true, testResults: 'reports/junit-report.xml'

            // Publish standalone HTML report (requires HTML Publisher plugin)
            publishHTML(target: [
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'reports/html',
                reportFiles: 'index.html',
                reportName: 'Cucumber API HTML Report',
                reportTitles: 'Playwright API BDD Test Report'
            ])

            // Archive raw JSON, JUnit XML, and HTML artifacts
            archiveArtifacts artifacts: 'reports/**/*', allowEmptyArchive: true
        }
        failure {
            echo "API BDD Test execution failed. Inspect the Cucumber API HTML Report or JUnit results for request/response details."
        }
    }
}
