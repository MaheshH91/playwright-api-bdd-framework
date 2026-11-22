pipeline {
    agent any

    tools {
        nodejs 'NodeJS 24.21.0'
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
                    def workers = params.PARALLEL_WORKERS?.trim() ?: '3'
                    if (!workers.matches('\\d+') || workers.toInteger() < 1) {
                        error("Invalid PARALLEL_WORKERS value '${params.PARALLEL_WORKERS}'. Must be a positive integer.")
                    }

                    def extraArgs = "--parallel ${workers}"
                    if (params.TAGS?.trim()) {
                        def escapedTags = params.TAGS.trim().replace("'", "'\\\\''")
                        extraArgs += " --tags '${escapedTags}'"
                    }

                    def envVars = []
                    if (params.BASE_URL_OVERRIDE?.trim()) {
                        envVars.add("BASE_URL=${params.BASE_URL_OVERRIDE.trim()}")
                    }

                    def runTests = {
                        withEnv(envVars) {
                            if (params.API_ENV == 'local') {
                                sh "node scripts/run-local.mjs ${extraArgs}"
                            } else {
                                sh "node scripts/run.mjs ${extraArgs}"
                            }
                        }
                    }

                    // Only bind reqres-api-key when not running local (and once created in Jenkins)
                    if (params.API_ENV != 'local') {
                        withCredentials([string(credentialsId: 'reqres-api-key', variable: 'API_KEY')]) {
                            runTests()
                        }
                    } else {
                        runTests()
                    }
                }
            }
        }
    }

    post {
        always {
            junit allowEmptyResults: true, testResults: 'reports/junit-report.xml'

            publishHTML(target: [
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'reports/html',
                reportFiles: 'index.html',
                reportName: 'Cucumber API HTML Report',
                reportTitles: 'Playwright API BDD Test Report'
            ])

            archiveArtifacts artifacts: 'reports/**/*', allowEmptyArchive: true
        }
        failure {
            echo 'API BDD Test execution failed. Inspect the Cucumber API HTML Report or JUnit results for request/response details.'
        }
    }
}
