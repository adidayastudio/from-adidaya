import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export interface ExportAttachment {
    url: string;
    name: string;
    originalPath: string;
    label: string; // e.g. "Invoice", "Payment Proof"
}

export interface ExportMetadata {
    title: string;
    subtitle: string;
    date: string;
    isDark: boolean;
}

/**
 * Utility to convert a PDF URL to an image data URL using pdfjs-dist.
 */
export const pdfToImage = async (pdfUrl: string): Promise<string | null> => {
    try {
        // Polyfill Promise.withResolvers for environments that don't support it yet
        if (typeof (Promise as unknown as { withResolvers: unknown }).withResolvers === 'undefined') {
            (Promise as unknown as { withResolvers: unknown }).withResolvers = function () {
                let resolve, reject;
                const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
                return { promise, resolve, reject };
            };
        }

        const pdfjsLib = await import("pdfjs-dist");
        // Ensure worker is loaded from a reliable source
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdfDoc = await loadingTask.promise;
        const page = await pdfDoc.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 }); // Increased scale for better quality

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;

        await page.render({ canvasContext: ctx, viewport }).promise;
        return canvas.toDataURL('image/jpeg', 0.90);
    } catch (e) {
        console.error('PDF to image failed:', e);
        return null;
    }
};

/**
 * Centralized export logic for generating detailed JPG or PDF reports.
 */
export const generateExport = async (
    element: HTMLElement,
    fileName: string,
    format: "jpg" | "pdf",
    attachments: ExportAttachment[],
    meta: ExportMetadata,
    onProgress?: (isExporting: boolean) => void
) => {
    if (!element) return;
    onProgress?.(true);

    try {
        // 1. Capture the UI content using html2canvas
        const uiCanvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            windowWidth: element.scrollWidth,
            windowHeight: element.scrollHeight,
            onclone: (clonedDoc) => {
                const clonedElement = clonedDoc.getElementById("export-content");
                if (!clonedElement) return;
                clonedElement.style.height = "auto";
                clonedElement.style.overflow = "visible";

                // Hide interactive elements
                const hideSelectors = [
                    'button[title="Copy to clipboard"]',
                    'button[title="View All"]',
                    'button[title="Export JPG"]',
                    'button[title="Export PDF"]',
                    '[data-html2canvas-ignore="true"]'
                ];
                hideSelectors.forEach(selector => {
                    clonedElement.querySelectorAll(selector).forEach((el) => {
                        (el as HTMLElement).style.display = 'none';
                    });
                });

                // Extra safety for buttons with specific text
                clonedElement.querySelectorAll('button').forEach(btn => {
                    if (btn.textContent?.includes('View All')) (btn as HTMLElement).style.display = 'none';
                });

                // Remove decorative blur blobs
                clonedElement.querySelectorAll('div').forEach((el) => {
                    const hEl = el as HTMLElement;
                    const cs = getComputedStyle(el);
                    const isBlur = (cs.filter && cs.filter.includes('blur')) ||
                        hEl.classList.contains('blur-xl') ||
                        hEl.classList.contains('blur-2xl') ||
                        hEl.classList.contains('blur-3xl');
                    if (isBlur && cs.position === 'absolute') {
                        hEl.style.display = 'none';
                    }
                });

                // Fix CSS compatibility (backdrop-filter, alpha backgrounds, etc)
                const allElements = clonedElement.querySelectorAll('*') as NodeListOf<HTMLElement>;
                allElements.forEach((el) => {
                    const cs = getComputedStyle(el);

                    if (cs.backdropFilter && cs.backdropFilter !== 'none') {
                        el.style.backdropFilter = 'none';
                        (el.style as CSSStyleDeclaration & { webkitBackdropFilter: string }).webkitBackdropFilter = 'none';
                    }

                    if (el.classList.contains('rounded-full')) {
                        el.style.display = 'inline-flex';
                        el.style.alignItems = 'center';
                        el.style.justifyContent = 'center';
                        el.style.lineHeight = '1';
                        if (el.tagName === 'SPAN') {
                            el.style.paddingTop = '4px';
                            el.style.paddingBottom = '4px';
                        }
                    }

                    // Solidify transparent backgrounds
                    const bg = cs.backgroundColor;
                    if (bg && bg.includes('rgba')) {
                        const match = bg.match(/rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
                        if (match) {
                            const alpha = parseFloat(match[4]);
                            if (alpha < 1 && alpha > 0) {
                                const base = meta.isDark ? 23 : 255;
                                const r = Math.round(Number(match[1]) * alpha + base * (1 - alpha));
                                const g = Math.round(Number(match[2]) * alpha + base * (1 - alpha));
                                const b = Math.round(Number(match[3]) * alpha + base * (1 - alpha));
                                el.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
                            }
                        }
                    }

                    // Solidify borders
                    const borderColor = cs.borderColor;
                    if (borderColor && borderColor.includes('rgba')) {
                        const match = borderColor.match(/rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
                        if (match) {
                            const alpha = parseFloat(match[4]);
                            if (alpha < 1 && alpha > 0) {
                                const base = meta.isDark ? 23 : 255;
                                const r = Math.round(Number(match[1]) * alpha + base * (1 - alpha));
                                const g = Math.round(Number(match[2]) * alpha + base * (1 - alpha));
                                const b = Math.round(Number(match[3]) * alpha + base * (1 - alpha));
                                el.style.borderColor = `rgb(${r}, ${g}, ${b})`;
                            }
                        }
                    }

                    if (cs.boxShadow && cs.boxShadow !== 'none') {
                        el.style.boxShadow = 'none';
                    }
                });
            }
        });

        // 2. Build document images in parallel
        const docImagePromises = attachments.map(async (att) => {
            try {
                const isImage = att.originalPath.match(/\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i);
                let imgSrc = att.url;

                if (!isImage) {
                    const pdfImg = await pdfToImage(att.url);
                    if (pdfImg) imgSrc = pdfImg;
                    else return null;
                }

                const img = new Image();
                img.crossOrigin = "anonymous";
                img.src = imgSrc;

                await new Promise<void>((resolve) => {
                    img.onload = () => resolve();
                    img.onerror = () => resolve(); // Don't block whole export on one image fail
                    setTimeout(() => resolve(), 10000); // Timeout fallback
                });

                if (img.naturalWidth > 0) {
                    return { img, label: att.label };
                }
            } catch (err) {
                console.warn(`Failed to process attachment ${att.name}:`, err);
            }
            return null;
        });

        const resolvedDocImages = (await Promise.all(docImagePromises)).filter(Boolean) as { img: HTMLImageElement; label: string }[];

        // 3. Compose final canvas
        const padding = 40;
        const headerH = 80;
        const docGap = 20;
        const docLabelH = 28;
        const canvasW = uiCanvas.width + padding * 2;

        // Calculate document section height
        let docsHeight = 0;
        if (resolvedDocImages.length > 0) {
            docsHeight += 50; // "Documents" section title
            const useGrid = resolvedDocImages.length > 1;
            if (useGrid) {
                const colW = (canvasW - padding * 2 - docGap) / 2;
                for (let i = 0; i < resolvedDocImages.length; i += 2) {
                    const img1 = resolvedDocImages[i].img;
                    const h1 = (img1.naturalHeight / img1.naturalWidth) * colW;
                    let maxH = h1;
                    if (i + 1 < resolvedDocImages.length) {
                        const img2 = resolvedDocImages[i + 1].img;
                        const h2 = (img2.naturalHeight / img2.naturalWidth) * colW;
                        maxH = Math.max(h1, h2);
                    }
                    docsHeight += maxH + docLabelH + docGap;
                }
            } else {
                const colW = canvasW - padding * 2;
                for (const doc of resolvedDocImages) {
                    const h = (doc.img.naturalHeight / doc.img.naturalWidth) * colW;
                    docsHeight += h + docLabelH + docGap;
                }
            }
        }

        const footerH = 40;
        const totalH = headerH + uiCanvas.height + docsHeight + footerH + padding * 2;

        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = canvasW;
        finalCanvas.height = totalH;
        const ctx = finalCanvas.getContext('2d')!;

        // Background
        ctx.fillStyle = meta.isDark ? '#111111' : '#ffffff';
        ctx.fillRect(0, 0, canvasW, totalH);

        let y = padding;

        // Draw header
        ctx.fillStyle = meta.isDark ? '#ffffff' : '#111111';
        ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
        ctx.textBaseline = 'top';
        ctx.fillText(meta.title, padding, y);

        ctx.fillStyle = meta.isDark ? '#737373' : '#6b7280';
        ctx.font = '500 16px system-ui, -apple-system, sans-serif';
        ctx.fillText(meta.subtitle, padding, y + 36);

        // Date on the right
        ctx.fillStyle = meta.isDark ? '#525252' : '#a3a3a3';
        ctx.font = '500 14px system-ui, -apple-system, sans-serif';
        const dateW = ctx.measureText(meta.date).width;
        ctx.fillText(meta.date, canvasW - padding - dateW, y + 6);

        // Separator line
        y += headerH - 10;
        ctx.fillStyle = meta.isDark ? '#333333' : '#e5e7eb';
        ctx.fillRect(padding, y, canvasW - padding * 2, 1);
        y += 16;

        // Draw UI screenshot
        ctx.drawImage(uiCanvas, padding, y);
        y += uiCanvas.height + 16;

        // Draw documents
        if (resolvedDocImages.length > 0) {
            ctx.fillStyle = meta.isDark ? '#ffffff' : '#111111';
            ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
            ctx.fillText('Documents', padding, y);
            y += 40;

            const useGrid = resolvedDocImages.length > 1;
            const contentW = canvasW - padding * 2;

            if (useGrid) {
                const colW = (contentW - docGap) / 2;
                for (let i = 0; i < resolvedDocImages.length; i += 2) {
                    const drawDoc = (doc: typeof resolvedDocImages[0], x: number, startY: number) => {
                        const h = (doc.img.naturalHeight / doc.img.naturalWidth) * colW;
                        ctx.fillStyle = meta.isDark ? '#a3a3a3' : '#737373';
                        ctx.font = 'bold 11px system-ui';
                        ctx.fillText(doc.label.toUpperCase(), x, startY);

                        const imgY = startY + 18;
                        ctx.save();
                        ctx.beginPath();
                        const r = 16;
                        ctx.roundRect(x, imgY, colW, h, r);
                        ctx.clip();
                        ctx.fillStyle = meta.isDark ? '#1a1a1a' : '#f5f5f5';
                        ctx.fillRect(x, imgY, colW, h);
                        ctx.drawImage(doc.img, x, imgY, colW, h);
                        ctx.restore();
                        return h + 18;
                    };

                    const h1 = drawDoc(resolvedDocImages[i], padding, y);
                    let maxH = h1;
                    if (i + 1 < resolvedDocImages.length) {
                        const x2 = padding + colW + docGap;
                        const h2 = drawDoc(resolvedDocImages[i + 1], x2, y);
                        maxH = Math.max(h1, h2);
                    }
                    y += maxH + docGap + 10;
                }
            } else {
                for (const doc of resolvedDocImages) {
                    const h = (doc.img.naturalHeight / doc.img.naturalWidth) * contentW;
                    ctx.fillStyle = meta.isDark ? '#a3a3a3' : '#737373';
                    ctx.font = 'bold 11px system-ui';
                    ctx.fillText(doc.label.toUpperCase(), padding, y);

                    const imgY = y + 18;
                    ctx.save();
                    ctx.beginPath();
                    ctx.roundRect(padding, imgY, contentW, h, 16);
                    ctx.clip();
                    ctx.fillStyle = meta.isDark ? '#1a1a1a' : '#f5f5f5';
                    ctx.fillRect(padding, imgY, contentW, h);
                    ctx.drawImage(doc.img, padding, imgY, contentW, h);
                    ctx.restore();
                    y += h + 18 + docGap + 10;
                }
            }
        }

        // Footer
        ctx.fillStyle = meta.isDark ? '#404040' : '#a3a3a3';
        ctx.font = '500 11px system-ui';
        const footerText = `Adidaya Studio (PT Mahardika Adidaya) · ${meta.date}`;
        const footerW = ctx.measureText(footerText).width;
        ctx.fillText(footerText, (canvasW - footerW) / 2, totalH - padding);

        // Export
        if (format === "jpg") {
            const link = document.createElement("a");
            link.download = fileName;
            link.href = finalCanvas.toDataURL("image/jpeg", 0.90);
            link.click();
        } else {
            const imgData = finalCanvas.toDataURL("image/jpeg", 0.85);
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "px",
                format: [finalCanvas.width, finalCanvas.height],
                hotfixes: ["px_scaling"]
            });
            pdf.addImage(imgData, "JPEG", 0, 0, finalCanvas.width, finalCanvas.height);
            pdf.save(fileName);
        }
    } catch (error) {
        console.error("Export failed:", error);
        throw error;
    } finally {
        onProgress?.(false);
    }
};
