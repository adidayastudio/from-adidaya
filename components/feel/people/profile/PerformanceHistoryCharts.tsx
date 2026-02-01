"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

interface ChartDataPoint {
    label: string;
    value: number;
    benchmark?: number;
}

interface SpiderChartProps {
    data: {
        label: string;
        value: number;
        benchmark: number;
    }[];
}

export function SpiderChart({ data }: SpiderChartProps) {
    const size = 300;
    const center = size / 2;
    const radius = size * 0.4;
    const angleStep = (Math.PI * 2) / data.length;

    // Helper to get coordinates
    const getCoords = (val: any, angle: any, r: number) => {
        const numericVal = Number(val) || 0;
        const numericAngle = Number(angle) || 0;
        const normalizedVal = Math.min(100, Math.max(0, numericVal)) / 100;
        const x = center + (r * normalizedVal) * Math.cos(numericAngle - Math.PI / 2);
        const y = center + (r * normalizedVal) * Math.sin(numericAngle - Math.PI / 2);

        // Final safety check to prevent NaN in attributes
        return {
            x: isNaN(x) ? center : x,
            y: isNaN(y) ? center : y
        };
    };

    // Background Hexagons/Circles
    const levels = [0.2, 0.4, 0.6, 0.8, 1];
    const gridLines = levels.map((level) => {
        const points = data.map((_, i) => {
            const { x, y } = getCoords(100, i * angleStep, radius * level);
            return `${x},${y}`;
        }).join(" ");
        return points;
    });

    // Axis Lines
    const axisLines = data.map((_, i) => {
        const { x, y } = getCoords(100, i * angleStep, radius);
        return { x1: center, y1: center, x2: x, y2: y };
    });

    // Data Path
    const userPoints = data.map((d, i) => {
        const { x, y } = getCoords(d.value, i * angleStep, radius);
        return `${x},${y}`;
    }).join(" ");

    const benchmarkPoints = data.map((d, i) => {
        const { x, y } = getCoords(d.benchmark, i * angleStep, radius);
        return `${x},${y}`;
    }).join(" ");

    return (
        <div className="flex flex-col items-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
                {/* Grid */}
                {gridLines.map((points, i) => (
                    <polygon
                        key={i}
                        points={points}
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="1"
                    />
                ))}

                {/* Axis */}
                {axisLines.map((line, i) => (
                    <line
                        key={i}
                        {...line}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                    />
                ))}

                {/* Legend/Labels */}
                {data.map((d, i) => {
                    const { x, y } = getCoords(115, i * angleStep, radius);
                    return (
                        <text
                            key={i}
                            x={x}
                            y={y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-[10px] font-bold fill-neutral-400 uppercase tracking-tighter"
                        >
                            {d.label}
                        </text>
                    );
                })}

                {/* Benchmark Area */}
                <motion.polygon
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    points={benchmarkPoints}
                    fill="rgba(163, 163, 163, 0.1)"
                    stroke="#a3a3a3"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                />

                {/* User Area */}
                <motion.polygon
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    points={userPoints}
                    fill="rgba(37, 99, 235, 0.2)"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                />

                {/* Data Points */}
                {data.map((d, i) => {
                    const { x, y } = getCoords(d.value, i * angleStep, radius);
                    return (
                        <motion.circle
                            key={i}
                            initial={{ r: 0 }}
                            animate={{ r: 4 }}
                            cx={x}
                            cy={y}
                            fill="#2563eb"
                            stroke="white"
                            strokeWidth="2"
                        />
                    );
                })}
            </svg>

            <div className="flex gap-4 mt-4 text-[10px] font-bold uppercase tracking-widest">
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
                    <span className="text-neutral-900">Your Score</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm border border-dashed border-neutral-400 bg-neutral-100" />
                    <span className="text-neutral-500">Team Avg (KKM)</span>
                </div>
            </div>
        </div>
    );
}

interface LineChartProps {
    data: ChartDataPoint[];
    height?: number;
}

export function PerformanceLineChart({ data, height = 200 }: LineChartProps) {
    const width = 800;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const maxVal = 100;
    const minVal = 0;

    const getX = (index: number) => {
        const val = padding + (index * (chartWidth / (data.length - 1 || 1)));
        return isNaN(val) ? padding : val;
    };

    const getY = (value: any) => {
        const numericVal = Number(value) || 0;
        const val = height - padding - (((numericVal - minVal) / (maxVal - minVal)) * chartHeight);
        return isNaN(val) ? height - padding : val;
    };

    const pathData = data.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.value)}`).join(" ");
    const areaData = `${pathData} L ${getX(data.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`;

    const benchmarkPath = data.some(d => d.benchmark !== undefined)
        ? data.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.benchmark || 0)}`).join(" ")
        : null;

    return (
        <div className="w-full overflow-x-auto">
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
                {/* Horizontal Grid Lines */}
                {[0, 25, 50, 75, 100].map((v) => (
                    <g key={v}>
                        <line
                            x1={padding}
                            y1={getY(v)}
                            x2={width - padding}
                            y2={getY(v)}
                            stroke="#f3f4f6"
                            strokeWidth="1"
                        />
                        <text
                            x={padding - 10}
                            y={getY(v)}
                            textAnchor="end"
                            dominantBaseline="middle"
                            className="text-[10px] fill-neutral-400 font-medium"
                        >
                            {v}
                        </text>
                    </g>
                ))}

                {/* Benchmark Line */}
                {benchmarkPath && (
                    <motion.path
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 0.3 }}
                        d={benchmarkPath}
                        fill="none"
                        stroke="#a3a3a3"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                    />
                )}

                {/* Area Gradient */}
                <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <motion.path
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    d={areaData}
                    fill="url(#chartGradient)"
                />

                {/* Main Path */}
                <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    d={pathData}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Data Dots and Labels */}
                {data.map((d, i) => (
                    <g key={i} className="group cursor-help">
                        {/* Hidden hover area */}
                        <circle cx={getX(i)} cy={getY(d.value)} r={15} fill="transparent" />

                        <motion.circle
                            initial={{ r: 0 }}
                            animate={{ r: 4 }}
                            cx={getX(i)}
                            cy={getY(d.value)}
                            fill="white"
                            stroke="#2563eb"
                            strokeWidth="2.5"
                        />

                        {/* Tooltip-like label */}
                        <text
                            x={getX(i)}
                            y={getY(d.value) - 12}
                            textAnchor="middle"
                            className="text-[10px] font-bold fill-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            {d.value}
                        </text>

                        {/* X-Axis Labels */}
                        <text
                            x={getX(i)}
                            y={height - padding + 20}
                            textAnchor="middle"
                            className="text-[10px] font-medium fill-neutral-500"
                        >
                            {d.label}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
}
