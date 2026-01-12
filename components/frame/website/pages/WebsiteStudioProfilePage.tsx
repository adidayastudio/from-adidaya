"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Save } from "lucide-react";
import { toast } from "react-hot-toast";

export default function WebsiteStudioProfilePage() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({
        companyName: "Adidaya Studio",
        vision: "To become the leading sustainable architecture firm in Southeast Asia.",
        mission: "Delivering exceptional spatial experiences through innovative design, sustainable practices, and cultural sensitivity.",
        description: "Adidaya Studio sees architecture as an ongoing conversation—between people, place, and the quiet rhythms that shape life within. We design by listening: to the land that murmurs, to users who carry stories, to light that chooses how a room should feel.\n\nGuided by “Framing the Flow to Feel”, we shape movement into moments—spaces that are honest, warm, and enduring. Each project becomes an attempt to weave aesthetics, function, and systems into experiences that unfold naturally."
    });

    const handleSave = async () => {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLoading(false);
        toast.success("Profile updated successfully");
    };

    return (
        <div className="max-w-3xl space-y-6">
            <h3 className="font-bold text-neutral-900 border-b border-neutral-200 pb-3">Company Identity</h3>

            <div className="space-y-2">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Company Name</label>
                <Input value={data.companyName} onChange={e => setData({ ...data, companyName: e.target.value })} />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Description</label>
                <textarea
                    className="w-full min-h-[200px] p-3 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 resize-y"
                    value={data.description}
                    onChange={e => setData({ ...data, description: e.target.value })}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Vision</label>
                    <textarea
                        className="w-full min-h-[120px] p-3 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 resize-y"
                        value={data.vision}
                        onChange={e => setData({ ...data, vision: e.target.value })}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Mission</label>
                    <textarea
                        className="w-full min-h-[120px] p-3 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 resize-y"
                        value={data.mission}
                        onChange={e => setData({ ...data, mission: e.target.value })}
                    />
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-neutral-100">
                <Button
                    variant="primary"
                    onClick={handleSave}
                    loading={loading}
                    icon={<Save className="w-4 h-4" />}
                >
                    Save Profile
                </Button>
            </div>
        </div>
    );
}
