const path = require('path');
const { createServer } = require('./app-server');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  const server = createServer({
    settingsPath: process.env.SERVER_SETTINGS_PATH || path.join(__dirname, 'settings.json'),
    staticDir: path.join(__dirname, 'public'),
  });

  const info = await server.start({ port: PORT, host: HOST });
  const browserHost = HOST === '0.0.0.0' ? '127.0.0.1' : HOST;

  console.log('\nPCO Service Dashboard v1.0');
  console.log(`Listening on ${info.host}:${info.port}`);
  console.log(`Open in browser: http://${browserHost}:${info.port}\n`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
