"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Camera, RefreshCw, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

interface CameraCaptureProps {
    onCapture: (blob: Blob) => void;
    locationText: string;
    userName: string;
}

export function CameraCapture({ onCapture, locationText, userName }: CameraCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
    const [retrying, setRetrying] = useState(false);

    const startCamera = async () => {
        setError(null);
        setRetrying(true);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user" },
                audio: false,
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.play().catch(e => {
                    if (e.name !== 'AbortError') {
                        console.error("Video play error:", e);
                    }
                });
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error("Camera error:", err);
                setError("Unable to access camera. Please enable camera permission in your browser settings.");
            }
        } finally {
            setRetrying(false);
        }
    };

    useEffect(() => {
        startCamera();
        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCapture = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Target width for heavy compression
        const MAX_WIDTH = 600;
        const scale = MAX_WIDTH / Math.max(video.videoWidth, 1);
        const width = MAX_WIDTH;
        const height = Math.max(video.videoHeight, 1) * scale;

        canvas.width = width;
        canvas.height = height;

        // Draw video frame
        ctx.drawImage(video, 0, 0, width, height);

        // Add Watermark
        const timestamp = format(new Date(), "dd MMM yyyy HH:mm:ss");
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, height - 60, width, 60);

        ctx.font = "bold 14px sans-serif";
        ctx.fillStyle = "white";
        ctx.textAlign = "left";
        
        ctx.fillText(`🕒 ${timestamp}`, 10, height - 35);
        ctx.fillText(`📍 ${locationText}`, 10, height - 15);
        ctx.textAlign = "right";
        ctx.fillText(`👤 ${userName}`, width - 10, height - 25);

        // Compress heavily (0.5 or 0.6 JPEG quality)
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    setCapturedBlob(blob);
                    setPreviewUrl(URL.createObjectURL(blob));
                    onCapture(blob);
                }
            },
            "image/jpeg",
            0.5
        );
    }, [locationText, userName]);

    const handleRetake = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
        setCapturedBlob(null);
        startCamera();
    };

    const handleConfirm = () => {
        if (capturedBlob) {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
            onCapture(capturedBlob);
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="relative rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-200/50 aspect-[4/3] flex items-center justify-center shadow-inner">
                {error ? (
                    <div className="text-center p-6 flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
                            <ShieldAlert className="w-7 h-7 text-red-400" />
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-sm text-white font-bold tracking-tight">Camera Required</p>
                            <p className="text-xs text-neutral-400 leading-relaxed max-w-[260px]">
                                If camera is not enabled, you will <span className="text-red-400 font-bold">not be marked as present</span>. Please allow camera access in your browser settings.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={startCamera}
                            disabled={retrying}
                            className="mt-1 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white text-xs font-bold rounded-full transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/30 active:scale-95"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
                            {retrying ? 'Retrying...' : 'Try Again'}
                        </button>
                    </div>
                ) : previewUrl ? (
                    <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previewUrl} alt="Captured preview" className="w-full h-full object-cover" />
                    </>
                ) : (
                    <video
                        ref={videoRef}
                        playsInline
                        muted
                        className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                )}
                
                {/* Hidden canvas for drawing watermark */}
                <canvas ref={canvasRef} className="hidden" />
            </div>

            {!error && (
                <div className="mt-1">
                    {!previewUrl ? (
                        <button
                            type="button"
                            onClick={handleCapture}
                            className="w-full py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                        >
                            <Camera className="w-4 h-4" />
                            Capture Photo
                        </button>
                    ) : (
                        <div className="flex items-center gap-3 w-full">
                            <button
                                type="button"
                                onClick={handleRetake}
                                className="px-5 py-3 rounded-xl text-sm font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors flex items-center gap-2 active:scale-[0.98]"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Retake
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Use This Photo
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
