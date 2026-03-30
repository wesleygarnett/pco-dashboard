const path = require('path');
const { createServer } = require('./app-server');

const PORT = Number(process.env.PORT) || 3000;

async function main() {
  const server = createServer({
    settingsPath: process.env.SERVER_SETTINGS_PATH || path.join(__dirname, 'settings.json'),
    staticDir: path.join(__dirname, 'public'),
  });

  const info = await server.start({ port: PORT, host: '127.0.0.1' });
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║         PCO Service Dashboard  ✦  v1.0          ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║   Open in browser: http://127.0.0.1:${info.port}        ║`);
  console.log('║   Press F11 for fullscreen before screensharing  ║');
  console.log('║   Press Ctrl+C to stop the server                ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
