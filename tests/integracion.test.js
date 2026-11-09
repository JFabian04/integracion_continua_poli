import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { pool } from '../src/db.js';

const isIntegrationEnabled = Boolean(process.env.DB_HOST);

describe(
  'Pruebas de Integración - Base de Datos PostgreSQL Real',
  { skip: !isIntegrationEnabled ? 'Variable DB_HOST no definida. Omitiendo pruebas de integración.' : false },
  () => {
    let server;
    let baseUrl;
    let createdTaskId;

    before(async () => {
      // Iniciar el servidor Express real sobre un puerto efímero
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
      try {
        await pool.end();
      } catch (err) {
        // Ignorar si el pool ya fue cerrado
      }
    });

    // -----------------------------------------------------------------------
    // Prueba de Endpoint /salud contra la base de datos real
    // -----------------------------------------------------------------------
    it('GET /salud debe responder 200 con la base de datos y versión exacta de PostgreSQL', async () => {
      const res = await fetch(`${baseUrl}/salud`);
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.estado, 'OK');
      assert.ok(typeof data.base_de_datos === 'string' && data.base_de_datos.length > 0);
      assert.ok(
        data.version.toLowerCase().includes('postgresql'),
        `Se esperaba versión de PostgreSQL, recibido: ${data.version}`
      );
    });

    // -----------------------------------------------------------------------
    // Ciclo CRUD Completo
    // -----------------------------------------------------------------------
    it('Debe completar el ciclo de vida CRUD de una tarea (Crear, Leer, Actualizar, Eliminar)', async () => {
      // 1. CREAR (POST)
      const payloadCreacion = {
        titulo: 'Tarea de Validación CI Automatizada',
        responsable: 'Pipeline Runner',
        estado: 'en_progreso',
      };

      const resCreate = await fetch(`${baseUrl}/tareas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadCreacion),
      });

      assert.equal(resCreate.status, 201);
      const tareaCreada = await resCreate.json();
      assert.ok(tareaCreada.id, 'La tarea debe tener un ID asignado por PostgreSQL');
      assert.equal(tareaCreada.titulo, payloadCreacion.titulo);
      assert.equal(tareaCreada.responsable, payloadCreacion.responsable);
      assert.equal(tareaCreada.estado, payloadCreacion.estado);

      createdTaskId = tareaCreada.id;

      // 2. LEER LISTA (GET /tareas)
      const resList = await fetch(`${baseUrl}/tareas`);
      assert.equal(resList.status, 200);
      const listaTareas = await resList.json();
      assert.ok(Array.isArray(listaTareas));
      const existeEnLista = listaTareas.some((t) => t.id === createdTaskId);
      assert.ok(existeEnLista, 'La tarea recién creada debe aparecer en el listado');

      // 3. LEER POR ID (GET /tareas/:id)
      const resGetById = await fetch(`${baseUrl}/tareas/${createdTaskId}`);
      assert.equal(resGetById.status, 200);
      const detalleTarea = await resGetById.json();
      assert.equal(detalleTarea.id, createdTaskId);
      assert.equal(detalleTarea.titulo, payloadCreacion.titulo);

      // 4. ACTUALIZAR (PUT /tareas/:id)
      const payloadActualizacion = {
        titulo: 'Tarea de Validación CI Automatizada - Actualizada',
        estado: 'completada',
      };

      const resUpdate = await fetch(`${baseUrl}/tareas/${createdTaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadActualizacion),
      });

      assert.equal(resUpdate.status, 200);
      const tareaActualizada = await resUpdate.json();
      assert.equal(tareaActualizada.id, createdTaskId);
      assert.equal(tareaActualizada.titulo, payloadActualizacion.titulo);
      assert.equal(tareaActualizada.estado, payloadActualizacion.estado);
      assert.equal(tareaActualizada.responsable, payloadCreacion.responsable); // Se preserva el responsable

      // 5. ELIMINAR (DELETE /tareas/:id)
      const resDelete = await fetch(`${baseUrl}/tareas/${createdTaskId}`, {
        method: 'DELETE',
      });

      assert.equal(resDelete.status, 200);
      const confirmacion = await resDelete.json();
      assert.equal(confirmacion.mensaje, 'Tarea eliminada exitosamente.');
      assert.equal(confirmacion.tarea.id, createdTaskId);

      // 6. VERIFICAR QUE YA NO EXISTE (GET /tareas/:id -> 404)
      const resVerifyNotFound = await fetch(`${baseUrl}/tareas/${createdTaskId}`);
      assert.equal(resVerifyNotFound.status, 404);
    });
  }
);

