import fetch from 'node-fetch';

export interface LegalDocExtraction {
  meta: {
    tipo_documento: string;
    prioridad: string;
    idioma: string;
  };
  data: {
    fecha: string | null;
    numero_radicado: string | null;
    remitente: {
      nombre: string | null;
      entidad: string | null;
      cargo: string | null;
    };
    destinatario: {
      nombre: string | null;
      entidad: string | null;
    };
    contenido: {
      asunto_original: string;
      resumen_ia: string;
      entidades_mencionadas: string[];
    };
  };
}

const systemPrompt = `
ERES EL MOTOR DE INTELIGENCIA ARTIFICIAL DE "RADIKA".
Tu misión es procesar texto OCR sucio proveniente de documentos legales y administrativos (Oficios, Cartas, Memorandos, Notificaciones Judiciales).

TU OBJETIVO:
Analizar el texto suministrado y extraer una estructura JSON estricta.

REGLAS DE EXTRACCIÓN:
1. Detecta la **Fecha de Radicación** o creación. Formato: YYYY-MM-DD. Si no hay, usa null.
2. Identifica el **Remitente** (Quién envía). Separa Nombre de Entidad/Empresa si es posible.
3. Identifica el **Destinatario** (A quién va dirigido).
4. Extrae el **Asunto** o Referencia principal.
5. Genera un **Resumen Ejecutivo**: Máximo 2 oraciones que expliquen la intención jurídica del documento (ej: "Solicitud de prórroga para entrega de informes financieros").
6. Clasifica el **Tipo de Documento**: [Oficio, Carta, Memorando, Tutela, Derecho de Petición, Notificación, Factura, Otro].
7. Identifica **Entidades Mencionadas**: Array de nombres de empresas o personas clave citadas en el cuerpo.
8. Detecta **Tono/Prioridad**: Basado en palabras clave (Urgente, Desacato, Multa), define prioridad: [Alta, Media, Baja].

OUTPUT FORMAT (JSON ONLY):
{
  "meta": {
    "tipo_documento": "string",
    "prioridad": "string",
    "idioma": "es"
  },
  "data": {
    "fecha": "YYYY-MM-DD",
    "numero_radicado": "string | null",
    "remitente": {
      "nombre": "string | null",
      "entidad": "string | null",
      "cargo": "string | null"
    },
    "destinatario": {
      "nombre": "string | null",
      "entidad": "string | null"
    },
    "contenido": {
      "asunto_original": "string",
      "resumen_ia": "string",
      "entidades_mencionadas": ["string"]
    }
  }
}
`.trim();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

if (!OPENAI_API_KEY) {
  // Avoid crashing in prod silently; throw explicit error
  throw new Error('OPENAI_API_KEY no está configurado');
}

async function callLLM(ocrText: string): Promise<LegalDocExtraction> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: ocrText },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM error ${res.status}: ${errText}`);
  }

  const payload = await res.json();
  const raw = payload?.choices?.[0]?.message?.content || '';
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`No se pudo parsear la respuesta del LLM: ${raw}`);
  }
}

/**
 * Procesa texto OCR con LLM, con reintento simple de parseo.
 */
export async function processLegalDocument(ocrText: string): Promise<LegalDocExtraction> {
  try {
    return await callLLM(ocrText);
  } catch (err) {
    // reintento simple si falló parse o request transitorio
    return await callLLM(ocrText);
  }
}
