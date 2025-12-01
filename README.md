# Radika (Gestión Documental, de mock a real)

Este repo tiene dos carpetas:
- `cliente/`: front en React + Vite (mock inicial, ahora en transición a backend real).
- `servidor/`: backend Express + Prisma + MySQL (API básica ya lista).

## Estado actual
- Base de datos: MySQL (`DATABASE_URL` en `servidor/.env`).
- Migraciones Prisma aplicadas (vía `prisma migrate deploy`): enums reales y `Document.content` LONGTEXT; `Project.trd` (JSON) para tabla de retención documental.
- Backend en `servidor/`:
  - Auth: login con usuarios seeded, JWT access/refresh; `/auth/login`, `/auth/me`.
  - Documentos (JWT): `GET /documents`, `POST /documents/create` (borrador), `/documents/inbound`, `/documents/:id/radicar`, `/documents/:id/status`, `/documents/:id/delivery`, adjuntos `/documents/:id/attachments` (upload/list/delete).
  - Roles: `ENGINEER` edita borradores; `DIRECTOR` radica/firma y puede borrar adjuntos; validaciones de estado para radicar/entrega/adjuntos.
  - TRD: `/projects/:id/trd` (get/update) y validación de `trdCode` en creación/edición de documentos; cálculo de `requiresResponse`/`deadline` por TRD.
  - Radicado: `generateRadicado(projectId, series, IN|OUT|INT)` → `PREFIJO-SERIE-TIPO-AÑO-#####`.
  - Storage: local (`LOCAL_STORAGE_PATH`); S3 listo via `STORAGE_DRIVER=s3` + `AWS_*`.
- Front en `cliente/`:
  - Usa backend real: login con usuarios seeded, dashboard con datos reales, editor conecta a TRD y adjuntos, permisos UI según rol/estado.
  - Manejo de 401/403: logout/redirección.
  - Etiqueta PDF: botón en lista descarga `/documents/:id/label` (acepta `logo` query param o `metadata.logoUrl` para branding por proyecto).

## Requisitos
- Node 18+
- MySQL en local con usuario/clave que coincidan con `servidor/.env`.

## Backend (servidor)
1. Copia env y ajusta credenciales:
   ```bash
   cd servidor
   cp .env.example .env
   # edita DATABASE_URL, JWT_ACCESS_SECRET, etc.
   ```
2. Instala y genera Prisma:
   ```bash
   npm install
   npx prisma generate
   ```
3. Migraciones y seeds (dev/prod):
   ```bash
   npx prisma migrate deploy
   npm run prisma:seed   # crea proyectos con TRD y usuarios admin/director/engineer (pass 123456)
   ```
4. Levanta dev:
   ```bash
   npm run dev
   ```
5. Endpoints principales:
   - `POST /auth/login` { email, password } → { token, user }
   - `GET /auth/me` con `Authorization: Bearer <token>`
   - `GET /documents?projectId=...`
   - `POST /documents/create` (borrador outbound/internal) `{ projectId, series, type, title, content, trdCode? }`
   - `POST /documents/inbound` (radica entrada) `{ projectId, series, title, metadata, requiresResponse?, deadline?, receptionMedium }`
   - `POST /documents/:id/radicar` `{ signatureMethod: "DIGITAL"|"PHYSICAL" }`
   - `POST /documents/:id/status` (cambios válidos: draft ↔ pending_approval ↔ radicado, etc.)
   - `POST /documents/:id/delivery` (entregas para OUTBOUND radicados)
   - Adjuntos: `POST/GET/DELETE /documents/:id/attachments`
   - TRD por proyecto: `GET/PUT /projects/:id/trd`

### Variables de entorno clave
En `servidor/.env` (prod):
- `DATABASE_URL` (MySQL)
- `PORT` (opcional, default 4000)
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (obligatorias)
- `STORAGE_DRIVER` (`local`|`s3`), `LOCAL_STORAGE_PATH` (local)
- Si `s3`: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `STORAGE_BUCKET`
- Opcional: `RADIKA_LOGO_URL` para branding de etiquetas PDF

En `cliente/.env`:
- `VITE_API_URL` (por ej. `http://localhost:4000` o URL de prod)

## Front (cliente)
1. Instala deps:
   ```bash
   cd cliente
   npm install
   ```
2. Dev server:
   ```bash
   npm run dev -- --host --port 3000
   ```
3. Usa el backend real: configura `VITE_API_URL` y verifica que el login funcione con los usuarios seeded.

## Próximos pasos sugeridos
1) Afinar límites de subida (multer) y firma/etiqueta PDF.
2) Endpoints de export (listado maestro, etiqueta QR).
3) Endurecer expiración de refresh tokens y rotación en prod.
