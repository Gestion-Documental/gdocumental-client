# Radika (Gestión Documental, de mock a real)

Este repo tiene dos carpetas:
- `cliente/`: front en React + Vite (mock inicial, ahora en transición a backend real).
- `servidor/`: backend Express + Prisma + MySQL (API básica ya lista).

## Estado actual
- Base de datos: MySQL local (`DATABASE_URL` en `servidor/.env`).
- Migraciones Prisma aplicadas: enums alineados a tipos reales (`INBOUND/OUTBOUND/INTERNAL`, estados `DRAFT/PENDING_APPROVAL/PENDING_SCAN/RADICADO/ARCHIVED/VOID`).
- Backend en `servidor/`:
  - Auth: `/auth/login` (auto-provisiona usuario si no existe, hash con bcrypt) y `/auth/me`.
  - Documentos (protegido con JWT):
    - `GET /documents` (opcional `?projectId`).
    - `POST /documents/inbound`: registra entrada externa y radica de inmediato.
    - `POST /documents/:id/radicar`: radica un doc existente (OUTBOUND físico → `PENDING_SCAN`).
    - Siguen operativos: `/documents/create` (borrador), `/documents/sign`, `/documents/void`.
  - Middleware de roles: `ENGINEER/DIRECTOR/SUPER_ADMIN` (configurable).
  - Radicado: `generateRadicado(projectId, series, IN|OUT|INT)` formatea `PREFIJO-SERIE-TIPO-AÑO-#####`.
  - Storage: hoy local (`LOCAL_STORAGE_PATH`), S3 preparado vía env (`STORAGE_DRIVER`, `AWS_*`).
- Front en `cliente/`:
  - UI mock de dashboard, editor tipo Word (TinyMCE), radicación simulada (`simulateRadication`) y datos de ejemplo.
  - Inbound “Radicar Entrada” genera docs mock; pendiente de conectar al backend real.

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
   Si cambias el schema, genera SQL con `npx prisma migrate diff --from-url <db> --to-schema-datamodel schema.prisma --script` y aplícalo al MySQL.
3. Levanta dev:
   ```bash
   npm run dev
   ```
4. Endpoints principales:
   - `POST /auth/login` { email, password } → { token, user }
   - `GET /auth/me` con `Authorization: Bearer <token>`
   - `GET /documents?projectId=...`
   - `POST /documents/inbound` (JWT) body mínimo: `{ projectId, series, title, metadata, requiresResponse, deadline, receptionMedium }`
   - `POST /documents/:id/radicar` (JWT) `{ signatureMethod: "DIGITAL"|"PHYSICAL" }`

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
3. Hoy consume mocks; siguiente paso es apuntarlo al backend real y reemplazar `MOCK_*` y `simulateRadication` por llamadas REST.

## Próximos pasos sugeridos
1) Conectar el front al backend: login real, listar documentos y crear inbound usando `/documents/inbound`.
2) Añadir subida de archivos (local) y switch a S3 por env.
3) Radicación de salidas/internos con estados y PDFs firmados/escaneados.
4) Semillas de usuarios/proyectos y autenticación más estricta (sin auto-provision).
