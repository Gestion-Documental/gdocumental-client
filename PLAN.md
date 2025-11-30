# Plan para llevar Radika a 100% real

## 1) Backend sólido
- [x] Definir modelo final de Documento/Adjuntos: adjuntos relacionales (Attachment) enlazados a Document.
- [x] Endpoints CRUD completos:
  - Crear/editar documentos: inbound/outbound/internal (existen `/create`, `/inbound`, `/radicar` y update de borrador).
  - Adjuntos: `/documents/:id/attachments` (upload/list/delete/download).
  - Entregas (delivery), void/anulación con motivo, cambios de estado (pendiente → aprobado → radicado básicos).
- [ ] Auth real: eliminar auto-provision, seeds de usuarios/roles, refresh/expiración configurable.
- [ ] Roles/permisos: middleware por rol y validaciones de estado (no radicar si ya está radicado, etc.).
- [ ] Proyectos: CRUD, prefijos/series configurables; endpoint TRD si aplica.
- [ ] Fechas/plazos: calcular/sincronizar `requiresResponse`, `deadline`, `isCompleted`.

## 2) Storage y archivos
- [x] Consolidar storage: `STORAGE_DRIVER=local|s3`; validar config al boot.
- [x] Servir adjuntos: endpoint de descarga con control de acceso; URLs presign en S3.
- [ ] OCR opcional para inbound (usar `ocr.service.ts` / Vision).

## 3) Base de datos y migraciones
- [ ] Revisar schema Prisma: limpiar campos legacy; añadir relación Document↔Attachment.
- [ ] Migraciones formales (`prisma migrate dev`), seeds de proyectos/usuarios base.
- [ ] Índices/constraints: unicidad de radicado, secuencias por proyecto/serie/tipo.

## 4) Frontend conectado
- [ ] Reemplazar mocks en dashboard KPIs, alertas y timeline con datos de API.
- [ ] Editor: guardar borradores/outbounds/internos vía API, radicar con `/documents/:id/radicar`; validaciones UI.
- [ ] Adjuntos: usar `/documents/:id/attachments` en editor e inbound; mostrar links y tamaños reales.
- [ ] Inbound: usar archivo real; mostrar radicado y deadline real.
- [ ] Listas/filtros: usar estados reales (draft/pending_approval/pending_scan/radicado/archived/void), requiresResponse/deadline para alertas.

## 5) PDF/etiquetas y radicado
- [ ] Generar radicado en backend con formato acordado (prefijo-serie-IN/OUT/INT-año-secuencia).
- [ ] Sello/etiqueta PDF o sticker con QR/hash; endpoint de export.
- [ ] Gestión `PENDING_SCAN` para salidas físicas; flujo de carga de escaneados.

## 6) Seguridad y UX
- [ ] Manejo de errores global en front (toasts/alerts).
- [ ] Sanitización de HTML (editor) y validación de tamaños/tipos de archivo.
- [ ] Sesiones: logout, refresh tokens (opcional).
- [ ] Logs/auditoría mínima en backend para acciones clave.

## 7) Infra y envs
- [ ] Configs `.env` claras para dev/prod; `VITE_API_URL`.
- [ ] Scripts de seed/arranque y docs de despliegue.
- [ ] Opcional: parametrizar `PORT` y evitar EADDRINUSE.
