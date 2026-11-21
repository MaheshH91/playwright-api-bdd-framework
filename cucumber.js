module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['step-definitions/**/*.ts', 'src/support/**/*.ts'],
    requireModule: ['ts-node/register'],
    format: ['summary', 'json:reports/cucumber-report.json'],
    formatOptions: { snippetInterface: 'async-await' },
    retry: 1,
    publishQuiet: true
  }
};
