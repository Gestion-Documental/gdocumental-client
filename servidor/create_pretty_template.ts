
import * as fs from "fs";
import * as path from "path";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, Header, Footer, BorderStyle } from "docx";

const outputPath = path.join(__dirname, "uploads", "template.docx");

const doc = new Document({
    styles: {
        default: {
            document: {
                run: {
                    font: "Ubuntu",
                },
            },
            heading1: {
                run: {
                    font: "Ubuntu",
                },
            },
            heading2: {
                run: {
                    font: "Ubuntu",
                },
            },
        },
    },
    sections: [{
        properties: {},
        headers: {
            default: new Header({
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "[NOMBRE DE LA EMPRESA]",
                                bold: true,
                                size: 28, // 14pt
                            }),
                        ],
                        alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "[Departamento / Gerencia]",
                                italics: true,
                                size: 24, // 12pt
                            }),
                        ],
                        alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({
                        text: "", // Spacer
                        border: {
                            bottom: {
                                color: "000000",
                                space: 1,
                                style: BorderStyle.SINGLE,
                                size: 6,
                            },
                        },
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
                                text: "Dirección: [DIRECCIÓN DE LA EMPRESA]",
                                size: 20, // 10pt
                            }),
                        ],
                        alignment: AlignmentType.CENTER,
                    }),
                ],
            }),
        },
        children: [
            // Metadata Table
            new Table({
                width: {
                    size: 100,
                    type: WidthType.PERCENTAGE,
                },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ children: [new TextRun({ text: "FECHA:", bold: true })] })],
                                width: { size: 20, type: WidthType.PERCENTAGE },
                            }),
                            new TableCell({
                                children: [new Paragraph({ children: [new TextRun("{DATE}")] })],
                            }),
                            new TableCell({
                                children: [new Paragraph({ children: [new TextRun({ text: "SERIE:", bold: true })] })],
                                width: { size: 20, type: WidthType.PERCENTAGE },
                            }),
                            new TableCell({
                                children: [new Paragraph({ children: [new TextRun("{SERIES}")] })],
                            }),
                        ],
                    }),
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ children: [new TextRun({ text: "RADICADO:", bold: true })] })],
                            }),
                            new TableCell({
                                children: [new Paragraph({ children: [new TextRun("{RADICADO}")] })],
                                columnSpan: 3,
                            }),
                        ],
                    }),
                ],
            }),

            new Paragraph({ text: "" }), // Spacer
            new Paragraph({ text: "" }), // Spacer

            new Paragraph({ text: "" }), // Spacer
            new Paragraph({ text: "" }), // Spacer

            // Recipient Block
            new Paragraph({
                children: [
                    new TextRun({ text: "Señor(a):", bold: true }),
                ],
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "{RECIPIENT_NAME}", bold: true }),
                ],
            }),
            new Paragraph({
                children: [
                    new TextRun("{RECIPIENT_ROLE}"),
                ],
            }),
            new Paragraph({
                children: [
                    new TextRun("{RECIPIENT_COMPANY}"),
                ],
            }),
            new Paragraph({
                children: [
                    new TextRun("{RECIPIENT_ADDRESS}"),
                ],
            }),

            new Paragraph({ text: "" }), // Spacer
            new Paragraph({ text: "" }), // Spacer

            // Title/Subject (Moved here as requested)
            new Paragraph({
                children: [
                    new TextRun({
                        text: "REF: {TITLE}",
                        bold: true,
                        size: 24,
                    }),
                ],
                alignment: AlignmentType.RIGHT,
            }),

            new Paragraph({ text: "" }), // Spacer
            new Paragraph({ text: "" }), // Spacer

            // Body Placeholder
            new Paragraph({
                children: [
                    new TextRun("Estimado(a):"),
                ],
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
                children: [
                    new TextRun("Por medio de la presente... (Escriba aquí el contenido de su carta)"),
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
                    new TextRun({ text: "{SENDER_NAME}", bold: true }),
                ],
            }),
             new Paragraph({
                children: [
                    new TextRun("{SENDER_ROLE}"),
                ],
            }),

            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),

            new Paragraph({
                children: [
                    new TextRun({ text: "Proyectó: {PROJECTED_BY}", size: 16 }), // 8pt
                ],
            }),
        ],
    }],
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync(outputPath, buffer);
    console.log(`Template generated successfully at ${outputPath}`);
});
