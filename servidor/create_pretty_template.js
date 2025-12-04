"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
var docx_1 = require("docx");
var outputPath = path.join(__dirname, "uploads", "template.docx");
var doc = new docx_1.Document({
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
                default: new docx_1.Header({
                    children: [
                        new docx_1.Paragraph({
                            children: [
                                new docx_1.TextRun({
                                    text: "[NOMBRE DE LA EMPRESA]",
                                    bold: true,
                                    size: 28, // 14pt
                                }),
                            ],
                            alignment: docx_1.AlignmentType.CENTER,
                        }),
                        new docx_1.Paragraph({
                            children: [
                                new docx_1.TextRun({
                                    text: "[Departamento / Gerencia]",
                                    italics: true,
                                    size: 24, // 12pt
                                }),
                            ],
                            alignment: docx_1.AlignmentType.CENTER,
                        }),
                        new docx_1.Paragraph({
                            text: "", // Spacer
                            border: {
                                bottom: {
                                    color: "000000",
                                    space: 1,
                                    style: docx_1.BorderStyle.SINGLE,
                                    size: 6,
                                },
                            },
                        }),
                    ],
                }),
            },
            footers: {
                default: new docx_1.Footer({
                    children: [
                        new docx_1.Paragraph({
                            children: [
                                new docx_1.TextRun({
                                    text: "Dirección: [DIRECCIÓN DE LA EMPRESA]",
                                    size: 20, // 10pt
                                }),
                            ],
                            alignment: docx_1.AlignmentType.CENTER,
                        }),
                    ],
                }),
            },
            children: [
                // Metadata Table
                new docx_1.Table({
                    width: {
                        size: 100,
                        type: docx_1.WidthType.PERCENTAGE,
                    },
                    rows: [
                        new docx_1.TableRow({
                            children: [
                                new docx_1.TableCell({
                                    children: [new docx_1.Paragraph({ children: [new docx_1.TextRun({ text: "FECHA:", bold: true })] })],
                                    width: { size: 20, type: docx_1.WidthType.PERCENTAGE },
                                }),
                                new docx_1.TableCell({
                                    children: [new docx_1.Paragraph({ children: [new docx_1.TextRun("{DATE}")] })],
                                }),
                                new docx_1.TableCell({
                                    children: [new docx_1.Paragraph({ children: [new docx_1.TextRun({ text: "SERIE:", bold: true })] })],
                                    width: { size: 20, type: docx_1.WidthType.PERCENTAGE },
                                }),
                                new docx_1.TableCell({
                                    children: [new docx_1.Paragraph({ children: [new docx_1.TextRun("{SERIES}")] })],
                                }),
                            ],
                        }),
                        new docx_1.TableRow({
                            children: [
                                new docx_1.TableCell({
                                    children: [new docx_1.Paragraph({ children: [new docx_1.TextRun({ text: "RADICADO:", bold: true })] })],
                                }),
                                new docx_1.TableCell({
                                    children: [new docx_1.Paragraph({ children: [new docx_1.TextRun("{RADICADO}")] })],
                                    columnSpan: 3,
                                }),
                            ],
                        }),
                    ],
                }),
                new docx_1.Paragraph({ text: "" }), // Spacer
                new docx_1.Paragraph({ text: "" }), // Spacer
                new docx_1.Paragraph({ text: "" }), // Spacer
                new docx_1.Paragraph({ text: "" }), // Spacer
                // Recipient Block
                new docx_1.Paragraph({
                    children: [
                        new docx_1.TextRun({ text: "Señor(a):", bold: true }),
                    ],
                }),
                new docx_1.Paragraph({
                    children: [
                        new docx_1.TextRun({ text: "{RECIPIENT_NAME}", bold: true }),
                    ],
                }),
                new docx_1.Paragraph({
                    children: [
                        new docx_1.TextRun("{RECIPIENT_ROLE}"),
                    ],
                }),
                new docx_1.Paragraph({
                    children: [
                        new docx_1.TextRun("{RECIPIENT_COMPANY}"),
                    ],
                }),
                new docx_1.Paragraph({
                    children: [
                        new docx_1.TextRun("{RECIPIENT_ADDRESS}"),
                    ],
                }),
                new docx_1.Paragraph({ text: "" }), // Spacer
                new docx_1.Paragraph({ text: "" }), // Spacer
                // Title/Subject (Moved here as requested)
                new docx_1.Paragraph({
                    children: [
                        new docx_1.TextRun({
                            text: "REF: {TITLE}",
                            bold: true,
                            size: 24,
                        }),
                    ],
                    alignment: docx_1.AlignmentType.RIGHT,
                }),
                new docx_1.Paragraph({ text: "" }), // Spacer
                new docx_1.Paragraph({ text: "" }), // Spacer
                // Body Placeholder
                new docx_1.Paragraph({
                    children: [
                        new docx_1.TextRun("Estimado(a):"),
                    ],
                }),
                new docx_1.Paragraph({ text: "" }),
                new docx_1.Paragraph({
                    children: [
                        new docx_1.TextRun("Por medio de la presente... (Escriba aquí el contenido de su carta)"),
                    ],
                }),
                new docx_1.Paragraph({ text: "" }), // Spacer
                new docx_1.Paragraph({ text: "" }), // Spacer
                new docx_1.Paragraph({ text: "" }), // Spacer
                // Signature Block
                new docx_1.Paragraph({
                    children: [
                        new docx_1.TextRun("Atentamente,"),
                    ],
                }),
                new docx_1.Paragraph({ text: "" }), // Space for signature
                new docx_1.Paragraph({ text: "" }),
                new docx_1.Paragraph({ text: "" }),
                new docx_1.Paragraph({
                    children: [
                        new docx_1.TextRun({ text: "{AUTHOR}", bold: true }),
                    ],
                }),
                new docx_1.Paragraph({
                    children: [
                        new docx_1.TextRun("Alcaldía Municipal de Jinotepe"),
                    ],
                }),
            ],
        }],
});
docx_1.Packer.toBuffer(doc).then(function (buffer) {
    fs.writeFileSync(outputPath, buffer);
    console.log("Template generated successfully at ".concat(outputPath));
});
