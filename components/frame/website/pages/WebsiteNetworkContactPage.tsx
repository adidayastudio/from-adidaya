"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Save, MapPin, Mail, Phone, Users } from "lucide-react";
import { toast } from "react-hot-toast";

export default function WebsiteNetworkContactPage() {
    const [data, setData] = useState({
        email: "hello@adidayastudio.id",
        whatsapp: "+62 812 3456 7890",
        instagram: "@adidayastudio",
        address: "Jl. Sunset Road No. 88, Kuta, Bali",
        mapUrl: "https://goo.gl/maps/..."
    });

    return (
        <div className="max-w-3xl space-y-8">
            {/* Header & Actions */}
            <div className="flex flex-col gap-6 mb-8">
                <div className="flex items-start justify-between border-b border-neutral-200 pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900">Contact Information</h1>
                        <p className="text-sm text-neutral-500 mt-1">Manage public contact details for the network page.</p>
                    </div>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => toast.success("Contact info saved")}
                        icon={<Save className="w-4 h-4" />}
                    >
                        Save Changes
                    </Button>
                </div>
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                    {/* Primary Contact */}
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-neutral-100 rounded-lg">
                            <Mail className="w-5 h-5 text-neutral-600" />
                        </div>
                        <div className="flex-grow space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">General Email</label>
                            <Input
                                value={data.email}
                                onChange={e => setData({ ...data, email: e.target.value })}
                                placeholder="hello@adidayastudio.id"
                            />
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-green-50 rounded-lg">
                            <Phone className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-grow space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">WhatsApp Number</label>
                            <Input
                                value={data.whatsapp}
                                onChange={e => setData({ ...data, whatsapp: e.target.value })}
                                placeholder="+62 8..."
                            />
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-pink-50 rounded-lg">
                            <Users className="w-5 h-5 text-pink-600" />
                        </div>
                        <div className="flex-grow space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Instagram</label>
                            <Input
                                value={data.instagram}
                                onChange={e => setData({ ...data, instagram: e.target.value })}
                                placeholder="@username or URL"
                            />
                        </div>
                    </div>

                    <div className="border-t border-neutral-100 my-2" />

                    {/* Location */}
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-neutral-100 rounded-lg">
                            <MapPin className="w-5 h-5 text-neutral-600" />
                        </div>
                        <div className="flex-grow space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Address Display</label>
                            <Input
                                value={data.address}
                                onChange={e => setData({ ...data, address: e.target.value })}
                                placeholder="Full address..."
                            />
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-9 shrink-0" />
                        <div className="flex-grow space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Google Maps Embed URL</label>
                            <Input
                                value={data.mapUrl}
                                onChange={e => setData({ ...data, mapUrl: e.target.value })}
                                placeholder="https://www.google.com/maps/embed?..."
                                className="font-mono text-xs"
                            />
                            <p className="text-[10px] text-neutral-400">Paste the 'src' attribute from Google Maps Embed HTML</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
