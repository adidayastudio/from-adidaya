"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/primitives/button/button";
import { Upload, Trash2, Save, ZoomIn, Info } from "lucide-react";

type HomeHeroRecord = {
    id: number | string;
    image_url: string | null;
    updated_at?: string | null;
};

export default function WebsiteHeroImagePage() {
    const router = useRouter();

    // DATA DARI DB
    const [heroRecord, setHeroRecord] = useState<HomeHeroRecord | null>(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // STATE IMAGE & EDITOR
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);

    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [imgDims, setImgDims] = useState({ width: 0, height: 0 });
    const [zoom, setZoom] = useState(1.2);
    const [dragging, setDragging] = useState(false);

    const dragState = useRef({
        startX: 0,
        startY: 0,
        initX: 0,
        initY: 0,
    });

    const HERO_ASPECT = 16 / 10;

    /* ============================
       LOAD EXISTING HERO FROM DB (MOCK)
    ============================ */
    useEffect(() => {
        // Simulate loading
        setTimeout(() => {
            const mockImg = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1600";
            setHeroRecord({
                id: 1,
                image_url: mockImg,
                updated_at: new Date().toISOString()
            });
            setPreviewUrl(mockImg);
            setInitialLoading(false);
        }, 100); // Faster load for better UX
    }, []);

    /* ============================
       HANDLE FILE
    ============================ */
    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;

        setFile(f);
        const url = URL.createObjectURL(f);
        setPreviewUrl(url);
        setZoom(1.2);
        setPos({ x: 0, y: 0 });

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    /* ============================
       RESET IMAGE (LOCAL ONLY)
    ============================ */
    const resetLocalImage = () => {
        setFile(null);
        setPreviewUrl(heroRecord?.image_url ?? null);
        setZoom(1.2);
        setPos({ x: 0, y: 0 });
    };

    /* ============================
       FIT IMAGE INSIDE FRAME
    ============================ */
    /* ============================
       FIT IMAGE INSIDE FRAME
    ============================ */
    useEffect(() => {
        if (!previewUrl) return;

        const img = new Image();

        const updateDims = () => {
            const frame = containerRef.current;
            if (!frame) return;

            const frameW = frame.clientWidth;
            const frameH = frame.clientHeight;
            const imgW = img.width || 1600; // Fallback
            const imgH = img.height || 1000; // Fallback

            const frameAspect = frameW / frameH;
            const imgAspect = imgW / imgH;

            let renderW: number;
            let renderH: number;

            if (imgAspect > frameAspect) {
                renderH = frameH * zoom;
                renderW = renderH * imgAspect;
            } else {
                renderW = frameW * zoom;
                renderH = renderW / imgAspect;
            }

            setImgDims({ width: renderW, height: renderH });
            setPos({
                x: (frameW - renderW) / 2,
                y: (frameH - renderH) / 2,
            });
        };

        img.onload = updateDims;
        img.onerror = () => {
            console.error("Failed to load image");
            // Fallback: force update assuming some aspect ratio so it shows SOMETHING
            updateDims();
        };

        img.src = previewUrl;

        // Force update immediately if cached
        if (img.complete) {
            updateDims();
        }
    }, [previewUrl, zoom]);

    /* ============================
       DRAG TO PAN
    ============================ */
    const startDrag = (e: any) => {
        e.preventDefault();
        setDragging(true);

        const pageX = "touches" in e ? e.touches[0].pageX : e.pageX;
        const pageY = "touches" in e ? e.touches[0].pageY : e.pageY;

        dragState.current = {
            startX: pageX,
            startY: pageY,
            initX: pos.x,
            initY: pos.y,
        };
    };

    const onDrag = (e: any) => {
        if (!dragging || !containerRef.current) return;

        const pageX = "touches" in e ? e.touches[0].pageX : e.pageX;
        const pageY = "touches" in e ? e.touches[0].pageY : e.pageY;

        const dx = pageX - dragState.current.startX;
        const dy = pageY - dragState.current.startY;

        const frame = containerRef.current;

        const newX = dragState.current.initX + dx;
        const newY = dragState.current.initY + dy;

        const minX = frame.clientWidth - imgDims.width;
        const minY = frame.clientHeight - imgDims.height;

        setPos({
            x: Math.max(Math.min(newX, 0), minX),
            y: Math.max(Math.min(newY, 0), minY),
        });
    };

    const endDrag = () => {
        setDragging(false);
    };

    /* ============================
       SAVE CROP (MOCK)
    ============================ */
    const saveHero = async () => {
        if (!imgRef.current || !containerRef.current || !file) return;

        setSaving(true);

        // MOCK SAVE DELAY
        setTimeout(() => {
            setSaving(false);
            const mockUrl = URL.createObjectURL(file); // Use local blob as mock url
            setHeroRecord({
                id: 1,
                image_url: mockUrl,
                updated_at: new Date().toISOString()
            });
            alert("Hero image saved (Mock)!");
            setFile(null);
        }, 1500);
    };

    /* ============================
       DELETE HERO (MOCK)
    ============================ */
    const deleteHero = async () => {
        if (!heroRecord?.image_url) return;

        const confirmDelete = window.confirm(
            "Delete current hero image from website?"
        );
        if (!confirmDelete) return;

        setDeleting(true);

        // MOCK DELETE DELAY
        setTimeout(() => {
            setDeleting(false);
            setHeroRecord({
                id: 1,
                image_url: null,
                updated_at: new Date().toISOString()
            });
            setPreviewUrl(null);
            setFile(null);
            alert("Hero image deleted (Mock).");
        }, 1000);
    };

    if (initialLoading) {
        return <div className="p-10 text-center text-neutral-400">Loading...</div>;
    }

    return (
        <div className="max-w-4xl">
            {/* INFO BOX */}
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 mb-6 flex items-start gap-3">
                <Info className="w-5 h-5 text-neutral-400 mt-0.5 shrink-0" />
                <div className="text-sm text-neutral-600">
                    <p className="font-medium text-neutral-900 mb-1">Hero Image Instructions</p>
                    <p>This image appears at the top of the home page. Use a high-quality (1920px+) landscape image. You can crop and position it directly here.</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* UPLOAD */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Upload Image</label>
                    <div className="flex items-center gap-4">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFile}
                            className="hidden"
                            id="hero-upload"
                        />
                        <label
                            htmlFor="hero-upload"
                            className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Upload className="w-4 h-4" />
                            Select Image
                        </label>

                        {file && (
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-neutral-500 max-w-[200px] truncate">
                                    {file.name}
                                </span>
                                <button
                                    onClick={resetLocalImage}
                                    className="text-xs text-red-600 hover:underline font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* EDITOR FRAME */}
                {previewUrl ? (
                    <div className="space-y-4">
                        <div
                            ref={containerRef}
                            className="relative w-full aspect-[16/10] rounded-lg border border-neutral-200 overflow-hidden bg-neutral-100 select-none cursor-move group"
                        >
                            <img
                                ref={imgRef}
                                src={previewUrl}
                                alt="Hero Preview"
                                className="absolute top-0 left-0"
                                style={{
                                    width: imgDims.width,
                                    height: imgDims.height,
                                    transform: `translate(${pos.x}px, ${pos.y}px)`,
                                    transition: dragging ? "none" : "transform 0.15s ease-out",
                                }}
                                onMouseDown={startDrag}
                                onMouseMove={onDrag}
                                onMouseUp={endDrag}
                                onMouseLeave={endDrag}
                                onTouchStart={startDrag}
                                onTouchMove={onDrag}
                                onTouchEnd={endDrag}
                            />

                            <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                Drag to position
                            </div>
                        </div>

                        {/* ZOOM CONTROL */}
                        <div className="flex items-center gap-3 bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                            <ZoomIn className="w-4 h-4 text-neutral-500" />
                            <input
                                type="range"
                                min={1}
                                max={3}
                                step={0.01}
                                value={zoom}
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="flex-grow h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900"
                            />
                            <span className="text-xs text-neutral-500 font-mono w-10 text-right">{(zoom * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                ) : (
                    <div className="w-full aspect-[16/10] bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-lg flex flex-col items-center justify-center text-neutral-400">
                        <Upload className="w-12 h-12 mb-2 opacity-20" />
                        <p className="text-sm">No image selected</p>
                    </div>
                )}

                {/* ACTIONS */}
                <div className="mt-8 flex items-center justify-between border-t border-neutral-100 pt-6">
                    <div className="flex gap-3">
                        <Button
                            variant="primary"
                            onClick={saveHero}
                            disabled={!file || saving}
                            loading={saving}
                            icon={<Save className="w-4 h-4" />}
                        >
                            Save Changes
                        </Button>
                    </div>

                    {heroRecord?.image_url && (
                        <Button
                            variant="danger"
                            onClick={deleteHero}
                            disabled={deleting}
                            loading={deleting}
                            icon={<Trash2 className="w-4 h-4" />}
                        >
                            Delete Hero
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
