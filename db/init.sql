-- Script DDL: Creación de la tabla tareas
CREATE TABLE IF NOT EXISTS tareas (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    responsable VARCHAR(100),
    estado VARCHAR(50) DEFAULT 'pendiente',
    creada_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Script DML: Inserción de 5 registros iniciales de prueba
INSERT INTO tareas (titulo, responsable, estado) VALUES
('Configurar pipeline de CI/CD', 'DevOps Team', 'en_progreso'),
('Implementar endpoints de la API REST', 'Backend Team', 'completada'),
('Diseñar pruebas unitarias con node:test', 'QA Team', 'completada'),
('Configurar orquestación con Docker Compose', 'DevOps Team', 'pendiente'),
('Documentar arquitectura del sistema', 'Tech Lead', 'pendiente');

