"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Save, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function WebsiteLandingDescriptionPage() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({
        title: "",
        description: "",
        buttonText: "Explore Studio",
        buttonLink: "/studio"
    });

    // MOCK LOAD
    useEffect(() => {
        // Here you would normally fetch from DB
        setTimeout(() => {
            setData({
                title: "Framing the Flow to Feel",
                description: "We craft spaces that follow the quiet flow of life—framed with intention and shaped to evoke feeling.\nTo us, architecture is a journey: of light in motion, of human presence, and of spaces that breathe with time.\n\nStep inside and discover how each project grows from context, intuition, and sensitivity.",
                buttonText: "Discover More",
                buttonLink: "/projects"
            });
        }, 100);
    }, []);

    const handleSave = async () => {
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLoading(false);
        toast.success("Description updated successfully");
    };

    return (
        <div className="max-w-2xl space-y-6">

            <div className="space-y-2">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Main Heading</label>
                <Input
                    value={data.title}
                    onChange={e => setData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Designing for the Future"
                />
                <p className="text-xs text-neutral-500">This is the large text that appears below the hero image.</p>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Description</label>
                <textarea
                    className="w-full min-h-[200px] p-3 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 resize-y"
                    value={data.description}
                    onChange={e => setData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter website introduction..."
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Button Text</label>
                    <Input
                        value={data.buttonText}
                        onChange={e => setData(prev => ({ ...prev, buttonText: e.target.value }))}
                        placeholder="e.g. Learn More"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Button Link</label>
                    <Input
                        value={data.buttonLink}
                        onChange={e => setData(prev => ({ ...prev, buttonLink: e.target.value }))}
                        placeholder="e.g. /about"
                    />
                </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex justify-end">
                <Button
                    variant="primary"
                    onClick={handleSave}
                    loading={loading}
                    icon={<Save className="w-4 h-4" />}
                >
                    Save Changes
                </Button>
            </div>
        </div>
    );
}
