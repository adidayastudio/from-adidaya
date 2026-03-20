import React from "react";
import { PdfExportPayload } from "./types";

// This layout is rendered on the server to string and passed to Puppeteer
export function PdfLayout({ meta, summary, sections, trendData, categoryData }: PdfExportPayload) {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("id-ID").format(val);
    };

    const renderTrendChart = () => {
        if (!trendData || trendData.length === 0) return null;

        const width = 1000;
        const height = 240;
        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;

        const maxAmount = Math.max(...trendData.map(d => d.amount), 1);
        const barWidth = (chartWidth / trendData.length) * 0.8;
        const gap = (chartWidth / trendData.length) * 0.2;

        return (
            <div className="mb-10">
                <h3 className="text-lg font-bold text-neutral-800 mb-4 border-l-4 border-blue-500 pl-3">Expense Trend</h3>
                <div className="bg-neutral-50 rounded-2xl p-6 border border-neutral-100">
                    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
                        {/* Grid Lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                            <line
                                key={i}
                                x1={padding}
                                y1={height - padding - p * chartHeight}
                                x2={width - padding}
                                y2={height - padding - p * chartHeight}
                                stroke="#e5e5e5"
                                strokeDasharray="4 4"
                            />
                        ))}

                        {/* Bars */}
                        {trendData.map((d, i) => {
                            const barHeight = (d.amount / maxAmount) * chartHeight;
                            const x = padding + i * (barWidth + gap) + gap / 2;
                            const y = height - padding - barHeight;

                            return (
                                <g key={i} className="group">
                                    <rect
                                        x={x}
                                        y={y}
                                        width={barWidth}
                                        height={barHeight}
                                        fill="#3b82f6"
                                        rx="4"
                                    />
                                    <text
                                        x={x + barWidth / 2}
                                        y={height - padding + 15}
                                        textAnchor="middle"
                                        fontSize="10"
                                        fill="#888"
                                        fontWeight="600"
                                    >
                                        {d.label}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Y-Axis labels */}
                        <text x={padding - 5} y={height - padding} textAnchor="end" fontSize="9" fill="#aaa">0</text>
                        <text x={padding - 5} y={padding} textAnchor="end" fontSize="9" fill="#aaa">{new Intl.NumberFormat("id-ID", { notation: "compact" }).format(maxAmount)}</text>
                    </svg>
                </div>
            </div>
        );
    };

    const renderCategoryChart = () => {
        if (!categoryData || categoryData.length === 0) return null;

        const width = 1000;
        const rowHeight = 35;
        const padding = 40;
        const chartWidth = width - padding * 2 - 180; // space for labels
        const height = categoryData.length * rowHeight + padding * 2;

        const maxValue = Math.max(...categoryData.map(d => d.value), 1);

        return (
            <div className="mb-10">
                <h3 className="text-lg font-bold text-neutral-800 mb-4 border-l-4 border-emerald-500 pl-3">Category Allocation</h3>
                <div className="bg-neutral-50 rounded-2xl p-6 border border-neutral-100">
                    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
                        {categoryData.map((d, i) => {
                            const barWidth = (d.value / maxValue) * chartWidth;
                            const y = padding + i * rowHeight;

                            return (
                                <g key={i}>
                                    <text
                                        x={padding}
                                        y={y + 18}
                                        fontSize="11"
                                        fill="#444"
                                        fontWeight="700"
                                    >
                                        {d.label}
                                    </text>
                                    <rect
                                        x={padding + 140}
                                        y={y + 5}
                                        width={barWidth}
                                        height={20}
                                        fill="#10b981"
                                        rx="10"
                                    />
                                    <text
                                        x={padding + 140 + barWidth + 10}
                                        y={y + 18}
                                        fontSize="11"
                                        fill="#666"
                                        fontWeight="700"
                                    >
                                        Rp {new Intl.NumberFormat("id-ID").format(d.value)}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>
        );
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
                                if (card.color === "orange") { bgClass = "bg-orange-50 border-orange-100"; textClass = "text-orange-700"; }
                                if (card.color === "neutral") { bgClass = "bg-neutral-50 border-neutral-200"; textClass = "text-neutral-600"; }

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

                {/* VISUAL CHARTS */}
                <div className="flex flex-col gap-6 mb-8">
                    <div className="w-full">{renderTrendChart()}</div>
                    <div className="w-full">{renderCategoryChart()}</div>
                </div>

                {/* SECTIONS */}
                {sections.map((section, sI) => (
                    <div key={sI} className="mb-10 last:mb-0">
                        <h3 className="text-lg font-bold text-neutral-800 mb-4 border-l-4 border-blue-500 pl-3">{section.title}</h3>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold uppercase text-[10px] tracking-wider">
                                <tr>
                                    {section.columns.map(col => (
                                        <th key={col.id} className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {section.data.map((row, rI) => (
                                    <tr key={rI} className="border-b border-neutral-50 hover:bg-neutral-50/50">
                                        {section.columns.map(col => {
                                            const val = row[col.id];
                                            let displayVal = val;

                                            if (col.format === "currency" && typeof val === "number") {
                                                displayVal = new Intl.NumberFormat("id-ID").format(val);
                                            }

                                            // Status column special rendering
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
                                                }

                                                return (
                                                    <td key={col.id} className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
                                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${bgClass} ${textClass}`}>
                                                            {label}
                                                        </span>
                                                    </td>
                                                );
                                            }

                                            return (
                                                <td key={col.id} className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
                                                    {col.format === "currency" ? (
                                                        <span className="font-mono font-medium">
                                                            <span className="currency-superscript mr-0.5">Rp</span>
                                                            {displayVal}
                                                        </span>
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
                    </div>
                ))}
            </body>
        </html>
    );
}

