const port = process.env.BARBERFLOW_API_PORT || '8080';
if (!/^\d+$/.test(port) || Number(port) < 1024 || Number(port) > 65535) {
  throw new Error('BARBERFLOW_API_PORT must be a local port between 1024 and 65535.');
}

module.exports = {
  '/api': { target: `http://127.0.0.1:${port}`, secure: false, changeOrigin: false },
  '/actuator': { target: `http://127.0.0.1:${port}`, secure: false, changeOrigin: false },
};
