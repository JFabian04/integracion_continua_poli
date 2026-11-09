import express from 'express';
import { pool as defaultPool } from './db.js';

/**
 * Factoría para instanciar la aplicación Express permitiendo inyección de dependencias (para pruebas unitarias)
 * @param {object} poolInstance - Instancia del pool de PostgreSQL
 */
export function createApp(poolInstance = defaultPool) {
  const app = express();

  app.use(express.json());

  // -------------------------------------------------------------
  // ENDPOINT: Verificación de Salud (/salud)
  // -------------------------------------------------------------
  app.get('/salud', async (req, res) => {
    try {
      const result = await poolInstance.query(
        'SELECT current_database() AS nombre_bd, version() AS version_postgresql;'
      );

      const data = result.rows[0];
      return res.status(200).json({
        estado: 'OK',
        base_de_datos: data.nombre_bd,
        version: data.version_postgresql,
      });
    } catch (error) {
      console.error('[Healthcheck Error]', error.message);
      return res.status(503).json({
        estado: 'ERROR',
        mensaje: 'Servicio no disponible: fallo en la conexión con la base de datos',
        error: error.message,
      });
    }
  });

  // -------------------------------------------------------------
  // CRUD TAREAS
  // -------------------------------------------------------------

  // 1. Obtener todas las tareas
  app.get('/tareas', async (req, res, next) => {
    try {
      const result = await poolInstance.query('SELECT * FROM tareas ORDER BY id ASC;');
      return res.status(200).json(result.rows);
    } catch (error) {
      return next(error);
    }
  });

  // 2. Obtener una tarea por su ID
  app.get('/tareas/:id', async (req, res, next) => {
    const { id } = req.params;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({ error: 'El ID de la tarea debe ser un número entero positivo.' });
    }

    try {
      const result = await poolInstance.query('SELECT * FROM tareas WHERE id = $1;', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Tarea no encontrada.' });
      }

      return res.status(200).json(result.rows[0]);
    } catch (error) {
      return next(error);
    }
  });

  // 3. Crear una nueva tarea
  app.post('/tareas', async (req, res, next) => {
    const { titulo, responsable, estado } = req.body;

    if (!titulo || typeof titulo !== 'string' || titulo.trim() === '') {
      return res.status(400).json({
        error: 'El campo "titulo" es obligatorio y debe ser un texto no vacío.',
      });
    }

    const estadoFinal = estado && typeof estado === 'string' && estado.trim() !== ''
      ? estado.trim()
      : 'pendiente';

    const responsableFinal = responsable && typeof responsable === 'string'
      ? responsable.trim()
      : null;

    try {
      const result = await poolInstance.query(
        'INSERT INTO tareas (titulo, responsable, estado) VALUES ($1, $2, $3) RETURNING *;',
        [titulo.trim(), responsableFinal, estadoFinal]
      );

      return res.status(201).json(result.rows[0]);
    } catch (error) {
      return next(error);
    }
  });

  // 4. Actualizar una tarea existente
  app.put('/tareas/:id', async (req, res, next) => {
    const { id } = req.params;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({ error: 'El ID de la tarea debe ser un número entero positivo.' });
    }

    const { titulo, responsable, estado } = req.body;

    if (titulo !== undefined && (typeof titulo !== 'string' || titulo.trim() === '')) {
      return res.status(400).json({
        error: 'Si se proporciona el campo "titulo", debe ser un texto no vacío.',
      });
    }

    try {
      // Verificar existencia previa
      const existing = await poolInstance.query('SELECT * FROM tareas WHERE id = $1;', [id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Tarea no encontrada.' });
      }

      const current = existing.rows[0];
      const nuevoTitulo = titulo !== undefined ? titulo.trim() : current.titulo;
      const nuevoResponsable = responsable !== undefined ? responsable : current.responsable;
      const nuevoEstado = estado !== undefined ? estado : current.estado;

      const result = await poolInstance.query(
        'UPDATE tareas SET titulo = $1, responsable = $2, estado = $3 WHERE id = $4 RETURNING *;',
        [nuevoTitulo, nuevoResponsable, nuevoEstado, id]
      );

      return res.status(200).json(result.rows[0]);
    } catch (error) {
      return next(error);
    }
  });

  // 5. Eliminar una tarea por ID
  app.delete('/tareas/:id', async (req, res, next) => {
    const { id } = req.params;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({ error: 'El ID de la tarea debe ser un número entero positivo.' });
    }

    try {
      const result = await poolInstance.query('DELETE FROM tareas WHERE id = $1 RETURNING *;', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Tarea no encontrada.' });
      }

      return res.status(200).json({
        mensaje: 'Tarea eliminada exitosamente.',
        tarea: result.rows[0],
      });
    } catch (error) {
      return next(error);
    }
  });

  // Manejo de rutas no encontradas (404)
  app.use((req, res) => {
    return res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
  });

  // Middleware global de manejo de errores (500)
  app.use((err, req, res, next) => {
    console.error('[Error de Servidor]', err);
    return res.status(500).json({
      error: 'Error interno del servidor',
      mensaje: err.message,
    });
  });

  return app;
}

export const app = createApp();

