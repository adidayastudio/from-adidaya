import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { PdfLayout } from "@/lib/export/pdf-layout";
import { PdfExportPayload } from "@/lib/export/types";

// Force Node.js runtime for Puppeteer and ReactDOMServer
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json() as PdfExportPayload;

        // Use dynamic require to prevent Turbopack from complaining during static analysis
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { renderToStaticMarkup } = require('react-dom/server');

        // 1. Render HTML
        const htmlContent = renderToStaticMarkup(<PdfLayout {...body} />);

        // 2. Launch Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // 3. Set Content
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        // 4. Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            landscape: true,
            printBackground: true,
            margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }
        });

        await browser.close();

        // 5. Return Response
        return new NextResponse(pdfBuffer as any, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${body.meta.documentName}.pdf"`,
            },
        });

    } catch (error) {
        console.error("PDF Generation Error:", error);
        return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
    }
}
