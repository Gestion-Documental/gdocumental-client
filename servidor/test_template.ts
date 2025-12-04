
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const templatePath = path.join(__dirname, 'uploads', 'template.docx');
const outputPath = path.join(__dirname, 'uploads', 'test_output.docx');

try {
    console.log(`Reading template from: ${templatePath}`);
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    // Inspect XML before processing
    const docXml = zip.file('word/document.xml')?.asText() || '';
    console.log('--- XML Snippet (Before) ---');
    const titleIndex = docXml.indexOf('{TITLE}');
    if (titleIndex !== -1) {
        console.log(docXml.substring(titleIndex - 50, titleIndex + 50));
    } else {
        console.log('TAG {TITLE} NOT FOUND IN XML');
    }
    console.log('----------------------------');

    const docTmpl = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
    });

    const data = {
        TITLE: 'TEST TITLE REPLACEMENT',
        SERIES: 'TEST SERIES',
        DATE: '2025-12-02',
        RADICADO: 'TEST-RAD-001',
        RECIPIENT_NAME: 'Test Recipient',
        RECIPIENT_ROLE: 'Test Role',
        RECIPIENT_COMPANY: 'Test Company',
        RECIPIENT_ADDRESS: 'Test Address'
    };

    console.log('Rendering with data:', data);
    docTmpl.render(data);

    const buf = docTmpl.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
    });

    fs.writeFileSync(outputPath, buf);
    console.log(`Saved output to: ${outputPath}`);

    // Inspect output XML
    const outZip = new PizZip(buf);
    const outXml = outZip.file('word/document.xml')?.asText() || '';
    console.log('--- XML Snippet (After) ---');
    if (outXml.includes('TEST TITLE REPLACEMENT')) {
        console.log('SUCCESS: Found replaced text in output XML');
    } else {
        console.log('FAILURE: Replaced text NOT found in output XML');
        // Print around where TITLE was
        const oldTitleIndex = outXml.indexOf('{TITLE}');
        if (oldTitleIndex !== -1) {
             console.log('Found unreplaced {TITLE} at:', outXml.substring(oldTitleIndex - 50, oldTitleIndex + 50));
        }
    }
    console.log('---------------------------');

} catch (error) {
    console.error('Error:', error);
}
