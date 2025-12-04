
async function debugPdfParse() {
    console.log('--- Debugging pdf-parse ---');
    try {
        const pdfParse = require('pdf-parse');
        console.log('typeof pdfParse:', typeof pdfParse);
        console.log('pdfParse structure:', pdfParse);
        console.log('Object.keys(pdfParse):', Object.keys(pdfParse));
        
        if (pdfParse.default) {
            console.log('typeof pdfParse.default:', typeof pdfParse.default);
        }
        
        // Try to identify the function
        let parseFunc = pdfParse;
        if (typeof parseFunc !== 'function' && pdfParse.default) {
            parseFunc = pdfParse.default;
        }
        
        if (typeof parseFunc === 'function') {
            console.log('✅ Found callable function!');
        } else {
            console.log('❌ Still not a function.');
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

debugPdfParse();
