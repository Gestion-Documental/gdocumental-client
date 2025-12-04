import { Document as WordDocument, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, Header, Footer, BorderStyle } from "docx";
import { getStorage } from "../storage/index";

export async function generateDocumentDocx(doc: any, user: any, radicadoCode: string = "BORRADOR") {
    try {
        const docx = new WordDocument({
            sections: [{
                headers: {
                    default: new Header({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: "[NOMBRE DE LA EMPRESA]",
                                        bold: true,
                                        size: 28,
                                        color: "999999"
                                    }),
                                ],
                                alignment: AlignmentType.CENTER,
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: "[Departamento / Gerencia]",
                                        italics: true,
                                        size: 20,
                                        color: "999999"
                                    }),
                                ],
                                alignment: AlignmentType.CENTER,
                            }),
                        ],
                    }),
                },
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: "Dirección: Calle Principal #123",
                                        size: 16,
                                        color: "999999"
                                    }),
                                ],
                                alignment: AlignmentType.CENTER,
                            }),
                        ],
                    }),
                },
                children: [
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ text: "FECHA:", bold: true })],
                                        width: { size: 15, type: WidthType.PERCENTAGE },
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ text: new Date().toLocaleDateString() })],
                                        width: { size: 35, type: WidthType.PERCENTAGE },
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ text: "SERIE:", bold: true })],
                                        width: { size: 15, type: WidthType.PERCENTAGE },
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ text: doc.series || "ADM" })],
                                        width: { size: 35, type: WidthType.PERCENTAGE },
                                    }),
                                ],
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ text: "RADICADO:", bold: true })],
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ text: radicadoCode })],
                                        columnSpan: 3,
                                    }),
                                ],
                            }),
                        ],
                    }),
                    new Paragraph({ text: "" }), // Spacer
                    new Paragraph({ text: "" }), // Spacer

                    // Recipient Info
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Señor(a):", bold: true }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: (doc.metadata as any)?.recipientName || "Destinatario", bold: true }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: (doc.metadata as any)?.recipientRole || "Cargo" }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: (doc.metadata as any)?.recipientCompany || "Empresa" }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: (doc.metadata as any)?.recipientAddress || "Dirección" }),
                        ],
                    }),

                    new Paragraph({ text: "" }), // Spacer
                    new Paragraph({ text: "" }), // Spacer

                    new Paragraph({
                        children: [
                            new TextRun({ text: `REF: ${doc.title}`, bold: true }),
                        ],
                        alignment: AlignmentType.RIGHT,
                    }),

                    new Paragraph({ text: "" }), // Spacer
                    new Paragraph({ text: "" }), // Spacer

                    new Paragraph({
                        children: [
                            new TextRun("Estimado(a):"),
                        ],
                    }),
                    new Paragraph({ text: "" }),
                    
                    // Content
                    // If doc.content is HTML, we might need to strip tags or just put it as text for now.
                    // Since we are regenerating, we should try to preserve what was edited if possible.
                    // BUT, doc.content in DB is HTML from OnlyOffice.
                    // Inserting HTML into docx is hard with `docx` library.
                    // However, the user complained that "no toma la información de la carta".
                    // This implies they edited it in OnlyOffice.
                    // If we regenerate the DOCX here, we might OVERWRITE their edits with the initial template text!
                    // THIS IS A RISK.
                    // If they edited the body in OnlyOffice, `doc.content` (HTML) *should* have the updates IF we synced it.
                    // But we know `doc.content` might be stale.
                    // AND `docx` library cannot easily convert HTML to DOCX structure.
                    
                    // ALTERNATIVE STRATEGY for "BORRADOR":
                    // Instead of regenerating the whole DOCX (which risks losing body edits),
                    // we should rely on the PDF conversion of the *existing* DOCX (which has the edits).
                    // And to fix "BORRADOR", we should use the PDF modification (stamping) to *cover* the "BORRADOR" text and write the new code.
                    // OR, we assume the user *hasn't* edited the "RADICADO: BORRADOR" part (it's in a table).
                    // If we can't easily edit the DOCX, patching the PDF is safer for preserving body content.
                    
                    // Wait, if I regenerate, I lose their edits. That's unacceptable.
                    // So I MUST NOT regenerate the DOCX from scratch in `/radicar`.
                    // I must use the file they saved.
                    
                    // So, how to fix "RADICADO: BORRADOR" in the table?
                    // 1. Edit the DOCX using a library that can find/replace text? `docx` is for creation. `docxtemplater` needs tags. `PizZip` can edit XML.
                    // 2. Patch the PDF.
                    
                    // Patching the PDF is easier. I know roughly where the table is (top of first page).
                    // I can draw a white rectangle over the "BORRADOR" text and write the new code.
                    
                    // Let's stick to patching the PDF for the "BORRADOR" issue.
                    // And for the signature, place it at the bottom.
                    
                    // So I will ABORT the "Refactor DOCX Generation" plan for `/radicar`.
                    // I will only use `generateDocumentDocx` for the initial `/create`.
                    
                    // But wait, the user said "sigue sin tomar la información de la carta".
                    // This was because `SignedDocumentView` was using `doc.content` (HTML) which was stale.
                    // Now that `SignedDocumentView` uses the PDF, they should see their edits.
                    // So the only remaining issues are "BORRADOR" label and Signature position.
                    
                    // I will implement `generateDocumentDocx` anyway for `/create` to clean up the controller.
                    // But for `/radicar`, I will use PDF patching.
                    
                    new Paragraph({
                        children: [
                            new TextRun(doc.content?.replace(/<[^>]*>/g, '') || "Por medio de la presente..."),
                        ],
                    }),

                    new Paragraph({ text: "" }), // Spacer
                    new Paragraph({ text: "" }), // Spacer
                    new Paragraph({ text: "" }), // Spacer

                    // Signature Block
                    new Paragraph({
                        children: [
                            new TextRun("Atentamente,"),
                        ],
                    }),
                    new Paragraph({ text: "" }), // Space for signature
                    new Paragraph({ text: "" }),
                    new Paragraph({ text: "" }),
                    
                    new Paragraph({
                        children: [
                            new TextRun({ text: user?.fullName || user?.email || 'Usuario', bold: true }),
                        ],
                    }),
                     new Paragraph({
                        children: [
                            new TextRun("Alcaldía Municipal de Jinotepe"),
                        ],
                    }),
                ],
            }],
        });

        const buffer = await Packer.toBuffer(docx);
        const storage = getStorage();
        const stored = await storage.save({
            buffer: buffer,
            filename: `draft-${doc.id}.docx`,
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        
        return stored.url;
    } catch (error) {
        console.error("Error generating DOCX:", error);
        throw error;
    }
}
