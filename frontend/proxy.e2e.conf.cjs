const port = process.env.BARBERFLOW_E2E_API_PORT || '8080';
if (!/^\d+$/.test(port) || Number(port) < 1024 || Number(port) > 65535) {
  throw new Error('Invalid local E2E API port.');
}
module.exports = {
  '/api': { target: `http://127.0.0.1:${port}`, secure: false, changeOrigin: false },
};
