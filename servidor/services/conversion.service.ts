
import fetch from 'node-fetch';

const ONLYOFFICE_URL = process.env.ONLYOFFICE_URL || 'http://localhost:8080';

interface ConversionResponse {
    fileUrl?: string;
    percent?: number;
    endConvert?: boolean;
    error?: number;
}

export async function convertToPdf(documentUrl: string, fileType: string, key: string): Promise<string> {
    console.log(`[Conversion] Requesting conversion for ${documentUrl} (key: ${key})`);
    
    const payload = {
        async: false,
        filetype: fileType,
        key: key,
        outputtype: 'pdf',
        title: `converted-${key}.pdf`,
        url: documentUrl
    };

    try {
        const res = await fetch(`${ONLYOFFICE_URL}/ConvertService.ashx`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            throw new Error(`Conversion service returned ${res.status}`);
        }

        const data = (await res.json()) as ConversionResponse;
        console.log('[Conversion] Response:', data);

        if (data.error) {
            throw new Error(`Conversion error code: ${data.error}`);
        }

        if (!data.fileUrl) {
            throw new Error('Conversion did not return a file URL');
        }

        return data.fileUrl;
    } catch (error) {
        console.error('[Conversion] Failed:', error);
        throw error;
    }
}
