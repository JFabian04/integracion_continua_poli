# API REST de Gestión de Tareas - Integración Continua (Entrega 1)

API REST robusta construida con **Node.js 22**, **Express** y **PostgreSQL 16**, totalmente orquestada mediante **Docker** y **Docker Compose**, con suite de pruebas automatizadas usando el **test runner nativo de Node.js (`node:test`)**.

---

## 🚀 Arquitectura y Tecnologías

- **Lenguaje y Entorno:** Node.js 22 LTS (ES Modules nativos)
- **Framework Web:** Express 4.x
- **Base de Datos:** PostgreSQL 16 Alpine (`postgres:16-alpine`)
- **Orquestación:** Docker Compose (Red interna tipo bridge `red-tareas` y volumen persistente `tareas-datos`)
- **Contenerización:** Dockerfile multi-etapa (*multi-stage build*) con usuario no privilegiado (`USER node`)
- **Testing:** Test Runner nativo de Node.js (`node:test` y `node:assert/strict`)

---

## 📁 Estructura del Proyecto

```text
entrega_1/
├── .dockerignore              # Archivos excluidos del contexto Docker
├── .env                       # Variables de entorno locales
├── .env.example               # Plantilla de variables de entorno requeridas
├── .gitignore                 # Archivos y carpetas ignorados por Git
├── Dockerfile                 # Construcción multi-stage de producción
├── docker-compose.yml         # Orquestación de app y base de datos con healthchecks
├── package.json               # Configuración de dependencias y scripts de prueba
├── README.md                  # Documentación del proyecto
├── db/
│   └── init.sql               # DDL de la tabla 'tareas' y DML con 5 registros de prueba
├── src/
│   ├── app.js                 # Lógica de endpoints, validaciones y factoría Express
│   ├── db.js                  # Pool de conexiones a PostgreSQL y healthcheck
│   └── server.js              # Arranque HTTP y apagado elegante (Graceful Shutdown)
└── tests/
    ├── app.test.js            # Pruebas unitarias con mocks (HTTP 400, 404, 503)
    └── integracion.test.js    # Pruebas de integración reales (/salud y ciclo CRUD)
```

---

## ⚙️ Variables de Entorno

Definidas en `.env.example` y `.env`:

| Variable | Descripción | Valor por Defecto |
| :--- | :--- | :--- |
| `PORT` | Puerto interno de la aplicación Express | `3000` |
| `DB_HOST` | Host o nombre de servicio de PostgreSQL | `db` (en Docker) / `localhost` (local) |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_USER` | Usuario de la base de datos | `postgres` |
| `DB_PASSWORD` | Contraseña de la base de datos | `postgres` |
| `DB_NAME` | Nombre de la base de datos | `tareas_db` |

---

## 🐳 Ejecución con Docker Compose

Para construir y levantar todos los servicios:

```bash
docker compose up -d --build
```

El servicio estará disponible en el puerto local **8095**:
- URL base: `http://localhost:8095`
- Endpoint de salud: `http://localhost:8095/salud`

### Verificación de contenedores y estado del healthcheck
```bash
docker compose ps
```

### Ver logs en tiempo real
```bash
docker compose logs -f
```

### Detener los servicios
```bash
docker compose down
```

---

## 🧪 Ejecución de Pruebas Automatizadas

Las pruebas utilizan **exclusivamente** el test runner nativo de Node.js (`node:test` y `node:assert`).

### 1. Pruebas Unitarias (con Mocks - No requieren base de datos activa)
Valida los códigos de respuesta **HTTP 400**, **HTTP 404** y **HTTP 503**:
```bash
npm run test:unit
```

### 2. Pruebas de Integración (Ciclo CRUD y /salud real)
Requiere que `DB_HOST` esté configurada y la base de datos esté activa:
```bash
npm run test:integration
```

### 3. Ejecutar todas las pruebas
```bash
npm test
```

### 4. Ejecutar pruebas dentro de un contenedor Docker
```bash
docker compose exec app npm test
```

---

## 📡 Endpoints de la API REST

### 1. Healthcheck (`GET /salud`)
Ejecuta una consulta SQL para verificar la conexión real con PostgreSQL.
- **Respuesta 200 OK:**
  ```json
  {
    "estado": "OK",
    "base_de_datos": "tareas_db",
    "version": "PostgreSQL 16.2 on x86_64-pc-linux-musl..."
  }
  ```
- **Respuesta 503 Service Unavailable:** (Si la BD no responde)
  ```json
  {
    "estado": "ERROR",
    "mensaje": "Servicio no disponible: fallo en la conexión con la base de datos",
    "error": "..."
  }
  ```

### 2. Listar Tareas (`GET /tareas`)
- **Respuesta 200 OK:** Lista en formato JSON de todas las tareas.

### 3. Obtener Tarea por ID (`GET /tareas/:id`)
- **Respuesta 200 OK:** Objeto de la tarea encontrada.
- **Respuesta 404 Not Found:** `{"error": "Tarea no encontrada."}`

### 4. Crear Tarea (`POST /tareas`)
- **Body requerido (JSON):**
  ```json
  {
    "titulo": "Implementar módulo de seguridad",
    "responsable": "DevOps Engineer",
    "estado": "pendiente"
  }
  ```
- **Respuesta 201 Created:** Tarea creada.
- **Respuesta 400 Bad Request:** Si falta el título o está en blanco.

### 5. Actualizar Tarea (`PUT /tareas/:id`)
- **Body (JSON):** Campos opcionales a modificar (`titulo`, `responsable`, `estado`).
- **Respuesta 200 OK:** Tarea actualizada.
- **Respuesta 400 Bad Request:** Si el formato es incorrecto o título vacío.
- **Respuesta 404 Not Found:** Si la tarea no existe.

### 6. Eliminar Tarea (`DELETE /tareas/:id`)
- **Respuesta 200 OK:** Confirmación de eliminación.
- **Respuesta 404 Not Found:** Si la tarea no existe.

