
import { Pool } from 'pg'; // Assumed pg driver
import crypto from 'crypto';

interface RadicationResult {
  radicadoCode: string;
  sequenceNumber: number;
  qrString: string;
  securityHash: string;
}

export class RadicationService {
  private db: Pool;

  constructor(dbPool: Pool) {
    this.db = dbPool;
  }

  /**
   * Generates a unique Radicado Code atomically using Database Locking.
   * Format: [PREFIX]-[TYPE]-[YEAR]-[SEQUENCE]
   * Example: PTE01-OUT-2024-00150
   */
  async generateRadicado(projectId: string, docType: 'INBOUND' | 'OUTBOUND' | 'INTERNAL', docId: string): Promise<RadicationResult> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Get Project Prefix
      const projectRes = await client.query('SELECT project_prefix FROM projects WHERE id = $1', [projectId]);
      if (projectRes.rows.length === 0) throw new Error('Project not found');
      const prefix = projectRes.rows[0].project_prefix;

      // 2. Atomic Increment (UPSERT with Locking)
      // We lock the row for this specific Project+Type combination
      const seqRes = await client.query(`
        INSERT INTO project_sequences (project_id, doc_type, current_value)
        VALUES ($1, $2, 1)
        ON CONFLICT (project_id, doc_type)
        DO UPDATE SET current_value = project_sequences.current_value + 1
        RETURNING current_value
      `, [projectId, docType]);

      const sequenceNumber = seqRes.rows[0].current_value;

      // 3. Format Construction
      const year = new Date().getFullYear();
      const typeCode = docType === 'INBOUND' ? 'IN' : docType === 'OUTBOUND' ? 'OUT' : 'INT';
      const seqStr = sequenceNumber.toString().padStart(5, '0');
      
      const radicadoCode = `${prefix}-${typeCode}-${year}-${seqStr}`;

      // 4. Generate Security Hash & QR Data
      // Hash includes secret salt + immutable document data
      const salt = process.env.SECURITY_SALT || 'nexus-dms-secret';
      const rawString = `${docId}|${radicadoCode}|${salt}`;
      const securityHash = crypto.createHash('sha256').update(rawString).digest('hex');

      // Minimal JSON for QR Code (Compact for scanning)
      const qrData = {
        r: radicadoCode,
        id: docId,
        h: securityHash.substring(0, 16) // Short hash for QR capacity
      };
      const qrString = JSON.stringify(qrData);

      await client.query('COMMIT');

      return { radicadoCode, sequenceNumber, qrString, securityHash };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
