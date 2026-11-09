import { app } from './app.js';
import { pool } from './db.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`[Servidor Iniciado] API ejecutándose en http://${HOST}:${PORT}`);
  console.log(`[Healthcheck] Verifique el estado en http://${HOST}:${PORT}/salud`);
});

// Manejo de apagado elegante (Graceful Shutdown)
async function gracefulShutdown(signal) {
  console.log(`\n[Señal ${signal} recibida] Cerrando servidor HTTP y conexiones de base de datos...`);
  
  server.close(async () => {
    console.log('[Servidor HTTP] Conexiones HTTP cerradas.');
    try {
      await pool.end();
      console.log('[PostgreSQL Pool] Conexiones a la base de datos cerradas con éxito.');
      process.exit(0);
    } catch (err) {
      console.error('[Error de Cierre] Fallo al cerrar la conexión a la base de datos:', err);
      process.exit(1);
    }
  });

  // Forzar cierre si no responde en 10 segundos
  setTimeout(() => {
    console.error('[Tiempo Expirado] Forzando el cierre de la aplicación.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

