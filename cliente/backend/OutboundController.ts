import { RadicationService } from './RadicationService';

export class OutboundController {
  private radicationService: RadicationService;
  private db: any; // Database Pool

  constructor(radicationService: RadicationService, db: any) {
    this.radicationService = radicationService;
    this.db = db;
  }

  // POST /api/documents/draft
  async createDraft(req: any, res: any) {
    try {
      const { projectId, title, content, metadata } = req.body;
      
      // 1. Save initial metadata
      const result = await this.db.query(
        `INSERT INTO documents (project_id, type, status, title, metadata) 
         VALUES ($1, 'OUTBOUND', 'DRAFT', $2, $3) RETURNING id`,
        [projectId, title, metadata]
      );
      
      // 2. (Mock) Generate Preliminary PDF (No Radicado yet)
      // await pdfService.generateDraft(result.rows[0].id);

      res.status(201).json({ id: result.rows[0].id, status: 'DRAFT' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create draft' });
    }
  }

  // POST /api/documents/finalize
  async finalizeAndSign(req: any, res: any) {
    const { docId, signatureMethod } = req.body; // 'DIGITAL' | 'PHYSICAL'

    try {
      // 1. Get current doc state
      const docRes = await this.db.query('SELECT * FROM documents WHERE id = $1', [docId]);
      const doc = docRes.rows[0];

      if (doc.status !== 'DRAFT') {
         return res.status(400).json({ error: 'Document is not in DRAFT state' });
      }

      // 2. Call Logic Service for Radication
      const radication = await this.radicationService.generateRadicado(
        doc.project_id, 
        'OUTBOUND', 
        docId
      );

      // 3. Determine Next Status based on Signature Method
      let newStatus = 'RADICADO'; // Ready for distribution
      if (signatureMethod === 'PHYSICAL') {
        newStatus = 'PENDING_SCAN'; // Waiting for manual upload of signed paper
      }

      // 4. Update Database
      await this.db.query(
        `UPDATE documents SET 
           status = $1, 
           radicado_code = $2, 
           sequence_number = $3,
           security_hash = $4,
           qr_code_data = $5,
           updated_at = NOW() 
         WHERE id = $6`,
        [newStatus, radication.radicadoCode, radication.sequenceNumber, radication.securityHash, radication.qrString, docId]
      );

      // 5. (Mock) Final PDF stamping
      // if (signatureMethod === 'DIGITAL') {
      //    await pdfService.stampDigitalSignature(docId, radication.qrString);
      // } else {
      //    await pdfService.stampRadicationLabelOnly(docId, radication.qrString);
      // }

      res.json({ success: true, radicado: radication.radicadoCode, status: newStatus });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Transaction failed' });
    }
  }
}