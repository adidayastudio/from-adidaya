import React from "react";
import { PdfExportPayload } from "./types";

// This layout is rendered on the server to string and passed to Puppeteer
export function PdfLayout({ meta, summary, columns, data }: PdfExportPayload) {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("id-ID").format(val);
    };

    return (
        <html lang="en">
            <head>
                <meta charSet="UTF-8" />
                <script src="https://cdn.tailwindcss.com"></script>
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @page { size: A4 landscape; margin: 15mm; }
                    body { font-family: sans-serif; -webkit-print-color-adjust: exact; }
                    thead { display: table-header-group; }
                    tr { break-inside: avoid; }
                    .currency-superscript { font-size: 0.6em; vertical-align: top; margin-right: 2px; opacity: 0.7; font-weight: bold; }
                ` }} />
            </head>
            <body className="bg-white text-neutral-900">
                {/* HEADER */}
                <div className="flex items-start justify-between mb-8 border-b border-neutral-200 pb-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-100 border border-neutral-200 rounded-full text-xs font-semibold text-neutral-600 mb-2">
                            <span>{meta.projectCode || "N/A"}</span>
                        </div>
                        <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">{meta.projectName}</h1>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-semibold text-neutral-900">{meta.documentName}</h2>
                        <p className="text-sm font-medium text-neutral-500 mt-1">{meta.periodText}</p>
                        <p className="text-xs text-neutral-400 mt-1">Generated: {meta.generatedAt}</p>
                    </div>
                </div>

                {/* SUMMARY */}
                {summary.length > 0 && (
                    <div className="mb-8">
                        <div className="flex gap-4">
                            {summary.map((card, i) => {
                                const isCurrency = card.format === "currency";
                                const val = typeof card.value === 'number' ? card.value : parseFloat(String(card.value));

                                let bgClass = "bg-white border-neutral-200";
                                let textClass = "text-neutral-900";
                                if (card.color === "blue") { bgClass = "bg-blue-50 border-blue-100"; textClass = "text-blue-700"; }
                                if (card.color === "red") { bgClass = "bg-red-50 border-red-100"; textClass = "text-red-700"; }
                                if (card.color === "green") { bgClass = "bg-emerald-50 border-emerald-100"; textClass = "text-emerald-700"; }

                                return (
                                    <div key={i} className={`flex-1 p-4 rounded-xl border ${bgClass}`}>
                                        <div className={`text-xs font-medium mb-1 opacity-70 ${textClass}`}>{card.label}</div>
                                        <div className={`text-lg font-bold ${textClass}`}>
                                            {isCurrency ? (
                                                <span className="inline-flex items-start">
                                                    <span className="currency-superscript text-[0.6em] mt-[3px]">Rp</span>
                                                    {formatCurrency(val)}
                                                </span>
                                            ) : card.value}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* TABLE */}
                <table className="w-full text-sm text-left">
                    <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold uppercase text-xs">
                        <tr>
                            {columns.map(col => (
                                <th key={col.id} className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {data.map((row, rI) => (
                            <tr key={rI} className="border-b border-neutral-50">
                                {columns.map(col => {
                                    const val = row[col.id];
                                    let displayVal = val;

                                    if (col.format === "currency" && typeof val === "number") {
                                        displayVal = new Intl.NumberFormat("id-ID").format(val);
                                    }

                                    // Status column special rendering with colors
                                    if (col.id === "status" && typeof val === "string") {
                                        const statusVal = val.toLowerCase();
                                        let bgClass = "bg-neutral-100";
                                        let textClass = "text-neutral-700";
                                        let label = val;

                                        if (statusVal === "approved" || statusVal === "ontime") {
                                            bgClass = "bg-emerald-100";
                                            textClass = "text-emerald-700";
                                            label = statusVal === "ontime" ? "On Time" : "Approved";
                                        } else if (statusVal === "pending") {
                                            bgClass = "bg-orange-100";
                                            textClass = "text-orange-700";
                                            label = "Pending";
                                        } else if (statusVal === "rejected" || statusVal === "cancelled" || statusVal === "late" || statusVal === "absent") {
                                            bgClass = "bg-red-100";
                                            textClass = "text-red-700";
                                            label = statusVal.charAt(0).toUpperCase() + statusVal.slice(1);
                                        } else if (statusVal === "leave" || statusVal === "sick") {
                                            bgClass = "bg-purple-100";
                                            textClass = "text-purple-700";
                                            label = statusVal.charAt(0).toUpperCase() + statusVal.slice(1);
                                        } else if (statusVal === "holiday" || statusVal === "weekend") {
                                            bgClass = "bg-blue-100";
                                            textClass = "text-blue-700";
                                            label = statusVal.charAt(0).toUpperCase() + statusVal.slice(1);
                                        }

                                        return (
                                            <td key={col.id} className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${bgClass} ${textClass}`}>
                                                    {label}
                                                </span>
                                            </td>
                                        );
                                    }

                                    return (
                                        <td key={col.id} className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
                                            {col.format === "currency" ? (
                                                <span className="font-mono">{displayVal}</span>
                                            ) : (
                                                displayVal
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </body>
        </html>
    );
}
