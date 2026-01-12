"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import SupplySidebar from "@/components/flow/supply/SupplySidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Search, Plus, Star, Phone, Mail, MapPin, Eye } from "lucide-react";
import clsx from "clsx";
import Drawer, { FormField, FormInput, FormTextarea, FormSelect, FormActions } from "@/components/shared/Drawer";

const MOCK_VENDORS = [
    { id: 1, name: "PT Baja Steel Indonesia", category: "Steel & Metal", contact: "Pak Hendra", phone: "021-555-1234", email: "hendra@bajasteel.co.id", address: "Kawasan Industri MM2100, Bekasi", rating: 4.8, orders: 45 },
    { id: 2, name: "CV Kayu Prima Nusantara", category: "Wood & Timber", contact: "Ibu Sari", phone: "021-555-5678", email: "sari@kayuprima.com", address: "Jl. Industri Raya 123, Tangerang", rating: 4.5, orders: 32 },
    { id: 3, name: "PT Semen Jaya Abadi", category: "Cement & Concrete", contact: "Pak Budi", phone: "021-555-9012", email: "budi@semenjaya.co.id", address: "Cibitung Industrial Park, Bekasi", rating: 4.6, orders: 28 },
    { id: 4, name: "PT Cat Indonesia", category: "Paint & Finishing", contact: "Ibu Maya", phone: "021-555-3456", email: "maya@catindo.com", address: "Jl. Raya Bogor Km 25, Jakarta Timur", rating: 4.2, orders: 15 },
];

function VendorCard({ vendor, onView }: { vendor: typeof MOCK_VENDORS[0]; onView: () => void }) {
    return (
        <div className="bg-white rounded-xl border p-5 hover:border-red-200 hover:shadow-sm transition-all">
            <div className="flex items-start justify-between mb-3">
                <div><h3 className="font-semibold text-neutral-900">{vendor.name}</h3><span className="text-sm text-neutral-500">{vendor.category}</span></div>
                <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full text-sm font-medium"><Star className="w-3 h-3 fill-current" /> {vendor.rating}</div>
            </div>
            <div className="space-y-2 text-sm text-neutral-600 mb-4">
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-neutral-400" /> {vendor.phone}</div>
                <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-neutral-400" /> {vendor.email}</div>
                <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-neutral-400 mt-0.5" /> <span className="line-clamp-1">{vendor.address}</span></div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t">
                <span className="text-sm text-neutral-500">Contact: <span className="font-medium text-neutral-900">{vendor.contact}</span></span>
                <button onClick={onView} className="p-2 hover:bg-neutral-100 rounded-lg"><Eye className="w-4 h-4 text-neutral-500" /></button>
            </div>
        </div>
    );
}

export default function VendorsPage() {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState<typeof MOCK_VENDORS[0] | null>(null);

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Supply" }, { label: "Vendors" }]} />
            <PageWrapper sidebar={<SupplySidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    <div className="space-y-4"><div><h1 className="text-2xl font-bold text-neutral-900">Vendors</h1><p className="text-sm text-neutral-500 mt-1">Manage supplier relationships and contacts.</p></div><div className="border-b border-neutral-200" /></div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-between">
                        <div className="flex gap-3 flex-wrap">
                            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input type="text" placeholder="Search vendors..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64" /></div>
                            <select className="px-4 py-2 border rounded-lg text-sm"><option value="all">All Categories</option><option value="steel">Steel & Metal</option><option value="wood">Wood & Timber</option><option value="cement">Cement & Concrete</option><option value="paint">Paint & Finishing</option></select>
                        </div>
                        <button onClick={() => setIsDrawerOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700"><Plus className="w-4 h-4" /> Add Vendor</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {MOCK_VENDORS.map((vendor) => (<VendorCard key={vendor.id} vendor={vendor} onView={() => { setSelectedVendor(vendor); setIsViewDrawerOpen(true); }} />))}
                    </div>
                </div>
            </PageWrapper>

            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Add Vendor" width="lg">
                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setIsDrawerOpen(false); }}>
                    <FormField label="Company Name" required><FormInput placeholder="e.g. PT Baja Steel Indonesia" /></FormField>
                    <FormField label="Category" required><FormSelect><option value="">Select category...</option><option>Steel & Metal</option><option>Wood & Timber</option><option>Cement & Concrete</option><option>Paint & Finishing</option><option>Electrical</option><option>Plumbing</option><option>Other</option></FormSelect></FormField>
                    <FormField label="Contact Person" required><FormInput placeholder="Contact name" /></FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Phone" required><FormInput type="tel" placeholder="021-xxx-xxxx" /></FormField>
                        <FormField label="Email"><FormInput type="email" placeholder="email@company.com" /></FormField>
                    </div>
                    <FormField label="Address"><FormTextarea placeholder="Full address..." /></FormField>
                    <FormField label="Bank Account"><FormInput placeholder="Bank name - Account number" /></FormField>
                    <FormField label="Tax ID (NPWP)"><FormInput placeholder="XX.XXX.XXX.X-XXX.XXX" /></FormField>
                    <FormField label="Notes"><FormTextarea placeholder="Additional information..." /></FormField>
                    <FormActions onCancel={() => setIsDrawerOpen(false)} submitLabel="Add Vendor" />
                </form>
            </Drawer>

            <Drawer isOpen={isViewDrawerOpen} onClose={() => setIsViewDrawerOpen(false)} title="Vendor Details" width="lg">
                {selectedVendor && (
                    <div className="space-y-6">
                        <div className="flex items-start justify-between">
                            <div><h3 className="text-xl font-semibold text-neutral-900">{selectedVendor.name}</h3><p className="text-neutral-500">{selectedVendor.category}</p></div>
                            <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-full font-medium"><Star className="w-4 h-4 fill-current" /> {selectedVendor.rating}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-xl">
                            <div><div className="text-sm text-neutral-500">Total Orders</div><div className="text-xl font-semibold">{selectedVendor.orders}</div></div>
                            <div><div className="text-sm text-neutral-500">Rating</div><div className="text-xl font-semibold">{selectedVendor.rating}/5</div></div>
                        </div>
                        <div className="space-y-3">
                            <h4 className="font-medium text-neutral-900">Contact Information</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-3"><span className="text-neutral-500 w-20">Contact</span><span className="font-medium">{selectedVendor.contact}</span></div>
                                <div className="flex items-center gap-3"><span className="text-neutral-500 w-20">Phone</span><span>{selectedVendor.phone}</span></div>
                                <div className="flex items-center gap-3"><span className="text-neutral-500 w-20">Email</span><span>{selectedVendor.email}</span></div>
                                <div className="flex items-start gap-3"><span className="text-neutral-500 w-20">Address</span><span>{selectedVendor.address}</span></div>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-4 border-t">
                            <button className="flex-1 px-4 py-2.5 border rounded-lg text-sm font-medium hover:bg-neutral-50">Edit Vendor</button>
                            <button className="flex-1 px-4 py-2.5 bg-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700">Create PO</button>
                        </div>
                    </div>
                )}
            </Drawer>
        </div>
    );
}
