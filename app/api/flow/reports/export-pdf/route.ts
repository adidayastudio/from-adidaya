import { NextRequest, NextResponse } from "next/server";

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { html } = await req.json();

        if (!html) {
            return NextResponse.json({ error: "HTML content is required" }, { status: 400 });
        }

        let browser;
        if (process.env.NODE_ENV === "production") {
            const chromium = require("@sparticuz/chromium");
            const puppeteer = require("puppeteer-core");

            browser = await puppeteer.launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
                ignoreHTTPSErrors: true,
            });
        } else {
            const puppeteer = require("puppeteer");
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-accelerated-2d-canvas",
                    "--no-first-run",
                    "--no-zygote",
                    "--single-process",
                    "--disable-gpu",
                ],
            });
        }

        const page = await browser.newPage();

        // Standard A4 dimensions in pixels at 96 DPI (794 x 1123) with 2x device scale for high density
        await page.setViewport({
            width: 794,
            height: 1123,
            deviceScaleFactor: 2,
        });

        // Load the complete HTML string
        await page.setContent(html, {
            waitUntil: ["load", "networkidle0"],
            timeout: 30000,
        });

        // Generate A4 PDF:
        // Left/Right margin: 0mm so full 794px width is rendered without right-side clipping
        // Top/Bottom margin: 14mm/12mm for clean page breaks
        // Footer: No line, right-aligned format "Adidaya Studio | <nama file> | 1/2"
        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            displayHeaderFooter: false,
            headerTemplate: `<span style="font-size: 0px;"></span>`,
            footerTemplate: `
                <div style="font-size: 7px; font-family: Arial, sans-serif; width: 100%; margin: 0 10mm; display: flex; justify-content: flex-end; align-items: center; color: #4b5563;">
                    <span style="font-weight: 600;">Adidaya Studio &nbsp;|&nbsp; <span class="title"></span> &nbsp;|&nbsp; <span class="pageNumber"></span>/<span class="totalPages"></span></span>
                </div>
            `,
            margin: {
                top: "14mm",
                bottom: "12mm",
                left: "0mm",
                right: "0mm",
            },
            preferCSSPageSize: true,
        });

        await browser.close();

        return new NextResponse(pdfBuffer as any, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": 'attachment; filename="report.pdf"',
            },
        });
    } catch (error: any) {
        console.error("Puppeteer PDF generation error:", error);
        return NextResponse.json(
            { error: error.message || "Gagal membuat file PDF dengan Puppeteer." },
            { status: 500 }
        );
    }
}
