import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

describe('Pruebas Unitarias - API REST (Mocks con node:test)', () => {
  let server;
  let baseUrl;
  let mockHandler;

  before(async () => {
    // Instancia simulada del pool de base de datos
    const mockPool = {
      query: (...args) => mockHandler(...args),
    };

    const app = createApp(mockPool);

    // Iniciar servidor en puerto efímero (0) para pruebas HTTP aisladas
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // =========================================================================
  // Healthcheck: GET /salud
  // =========================================================================
  describe('GET /salud', () => {
    it('Debe responder con HTTP 503 si la base de datos no responde o lanza error', async () => {
      mockHandler = async () => {
        throw new Error('Connection refused / Timeout');
      };

      const res = await fetch(`${baseUrl}/salud`);
      assert.equal(res.status, 503);

      const body = await res.json();
      assert.equal(body.estado, 'ERROR');
      assert.ok(body.mensaje.includes('Servicio no disponible'));
      assert.equal(body.error, 'Connection refused / Timeout');
    });

    it('Debe responder con HTTP 200 y detalles de PostgreSQL si la base de datos responde', async () => {
      mockHandler = async (sql) => {
        if (sql.includes('current_database()')) {
          return {
            rows: [
              {
                nombre_bd: 'tareas_db',
                version_postgresql: 'PostgreSQL 16.2 on x86_64-pc-linux-musl',
              },
            ],
          };
        }
        return { rows: [] };
      };

      const res = await fetch(`${baseUrl}/salud`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.estado, 'OK');
      assert.equal(body.base_de_datos, 'tareas_db');
      assert.equal(body.version, 'PostgreSQL 16.2 on x86_64-pc-linux-musl');
    });
  });

  // =========================================================================
  // Validación de Errores: POST /tareas (HTTP 400)
  // =========================================================================
  describe('POST /tareas - Validaciones', () => {
    it('Debe retornar HTTP 400 si falta el campo "titulo"', async () => {
      const res = await fetch(`${baseUrl}/tareas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responsable: 'Carlos' }),
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.ok(body.error.includes('titulo'));
    });

    it('Debe retornar HTTP 400 si "titulo" es una cadena vacía o con solo espacios', async () => {
      const res = await fetch(`${baseUrl}/tareas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: '    ', responsable: 'Carlos' }),
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.ok(body.error.includes('titulo'));
    });

    it('Debe retornar HTTP 201 y la tarea creada si el payload es válido', async () => {
      mockHandler = async (sql, params) => {
        return {
          rows: [
            {
              id: 10,
              titulo: params[0],
              responsable: params[1],
              estado: params[2],
              creada_en: new Date().toISOString(),
            },
          ],
        };
      };

      const res = await fetch(`${baseUrl}/tareas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: 'Nueva tarea unitaria',
          responsable: 'DevOps Lead',
          estado: 'pendiente',
        }),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.id, 10);
      assert.equal(body.titulo, 'Nueva tarea unitaria');
      assert.equal(body.responsable, 'DevOps Lead');
    });
  });

  // =========================================================================
  // Recursos no encontrados: GET, PUT, DELETE (HTTP 404)
  // =========================================================================
  describe('Recursos no encontrados y validaciones (HTTP 404 y 400)', () => {
    it('GET /tareas/:id debe retornar HTTP 404 si la tarea no existe', async () => {
      mockHandler = async () => ({ rows: [] });

      const res = await fetch(`${baseUrl}/tareas/9999`);
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.error, 'Tarea no encontrada.');
    });

    it('GET /tareas/:id debe retornar HTTP 400 si el ID no es numérico', async () => {
      const res = await fetch(`${baseUrl}/tareas/abc`);
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.ok(body.error.includes('número entero'));
    });

    it('PUT /tareas/:id debe retornar HTTP 404 si la tarea a actualizar no existe', async () => {
      mockHandler = async () => ({ rows: [] });

      const res = await fetch(`${baseUrl}/tareas/8888`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: 'Actualización fantasma' }),
      });

      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.error, 'Tarea no encontrada.');
    });

    it('PUT /tareas/:id debe retornar HTTP 400 si el título enviado está en blanco', async () => {
      const res = await fetch(`${baseUrl}/tareas/1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: '   ' }),
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.ok(body.error.includes('titulo'));
    });

    it('DELETE /tareas/:id debe retornar HTTP 404 si la tarea a eliminar no existe', async () => {
      mockHandler = async () => ({ rows: [] });

      const res = await fetch(`${baseUrl}/tareas/7777`, {
        method: 'DELETE',
      });

      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.error, 'Tarea no encontrada.');
    });

    it('DELETE /tareas/:id debe retornar HTTP 200 y confirmar eliminación si existe', async () => {
      mockHandler = async () => ({
        rows: [{ id: 1, titulo: 'Tarea eliminada', responsable: 'Dev', estado: 'completada' }],
      });

      const res = await fetch(`${baseUrl}/tareas/1`, {
        method: 'DELETE',
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.mensaje, 'Tarea eliminada exitosamente.');
      assert.equal(body.tarea.id, 1);
    });

    it('Cualquier ruta inexistente debe responder HTTP 404', async () => {
      const res = await fetch(`${baseUrl}/ruta-inexistente-xyz`);
      assert.equal(res.status, 404);
    });
  });
});

