const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

test('Angular development proxy routes authentication to the configured local API port', () => {
  const frontend = path.resolve(__dirname, '..');
  const probe = `
    const config = require('./angular.json');
    const proxy = require('./' + config.projects.frontend.architect.serve.options.proxyConfig);
    process.stdout.write(JSON.stringify(proxy));
  `;
  const proxy = JSON.parse(
    execFileSync(process.execPath, ['-e', probe], {
      cwd: frontend,
      env: { ...process.env, BARBERFLOW_API_PORT: '8082' },
      encoding: 'utf8',
    }),
  );
  assert.equal(proxy['/api'].target, 'http://127.0.0.1:8082');
  assert.equal(proxy['/actuator'].target, 'http://127.0.0.1:8082');
  assert.equal(proxy['/api'].changeOrigin, false);
});
