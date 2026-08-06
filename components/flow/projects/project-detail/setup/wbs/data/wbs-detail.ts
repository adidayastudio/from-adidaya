// WBS Detail Mode Data - Extensions for Level 3+
// This adds detailed children to items from Estimates
// Structure: Inherit Estimates (Level 0-2), Add Detail (Level 3-5)

import type { WBSItem } from "./wbs.types";

// Detail extensions mapped by parent code from Estimates
// Key = Estimates item code, Value = additional children to add
export const WBS_DETAIL_EXTENSIONS: Record<string, Omit<WBSItem, "id">[]> = {
    // ===== STRUCTURE - Kolom Beton children =====
    "S.1.1": [
        {
            code: "S.1.1.1",
            nameEn: "Rebar Work",
            nameId: "Pembesian",
            children: [
                { id: "", code: "S.1.1.1.1", nameEn: "Rebar D10", nameId: "Pembesian D10" },
                { id: "", code: "S.1.1.1.2", nameEn: "Rebar D13", nameId: "Pembesian D13" },
                { id: "", code: "S.1.1.1.3", nameEn: "Rebar D16", nameId: "Pembesian D16" },
            ],
        },
        {
            code: "S.1.1.2",
            nameEn: "Formwork",
            nameId: "Bekisting",
            children: [
                { id: "", code: "S.1.1.2.1", nameEn: "Column Formwork", nameId: "Bekisting Kolom" },
            ],
        },
        {
            code: "S.1.1.3",
            nameEn: "Concrete Casting",
            nameId: "Pengecoran",
            children: [
                { id: "", code: "S.1.1.3.1", nameEn: "Concrete K-350", nameId: "Beton K-350" },
            ],
        },
    ],

    // Balok Beton
    "S.1.2": [
        {
            code: "S.1.2.1",
            nameEn: "Rebar Work",
            nameId: "Pembesian",
            children: [
                { id: "", code: "S.1.2.1.1", nameEn: "Rebar D10", nameId: "Pembesian D10" },
                { id: "", code: "S.1.2.1.2", nameEn: "Rebar D16", nameId: "Pembesian D16" },
            ],
        },
        {
            code: "S.1.2.2",
            nameEn: "Formwork",
            nameId: "Bekisting",
        },
        {
            code: "S.1.2.3",
            nameEn: "Concrete Casting",
            nameId: "Pengecoran",
        },
    ],

    // Plat Lantai
    "S.1.3": [
        { code: "S.1.3.1", nameEn: "Rebar Work", nameId: "Pembesian" },
        { code: "S.1.3.2", nameEn: "Formwork", nameId: "Bekisting" },
        { code: "S.1.3.3", nameEn: "Concrete Casting", nameId: "Pengecoran" },
    ],

    // Upper Structure (Kolom, Balok, Plat)
    "S.4.1": [
        {
            code: "S.4.1.1",
            nameEn: "Rebar Work",
            nameId: "Pembesian",
            children: [
                { id: "", code: "S.4.1.1.1", nameEn: "Rebar D10", nameId: "Pembesian D10" },
                { id: "", code: "S.4.1.1.2", nameEn: "Rebar D13", nameId: "Pembesian D13" },
                { id: "", code: "S.4.1.1.3", nameEn: "Rebar D16", nameId: "Pembesian D16" },
                { id: "", code: "S.4.1.1.4", nameEn: "Stirrup D8", nameId: "Sengkang D8" },
            ],
        },
        {
            code: "S.4.1.2",
            nameEn: "Formwork",
            nameId: "Bekisting",
            children: [
                { id: "", code: "S.4.1.2.1", nameEn: "Column Formwork", nameId: "Bekisting Kolom" },
            ],
        },
        {
            code: "S.4.1.3",
            nameEn: "Concrete Casting",
            nameId: "Pengecoran",
            children: [
                { id: "", code: "S.4.1.3.1", nameEn: "Concrete K-350", nameId: "Beton K-350" },
            ],
        },
    ],
    "S.4.2": [
        {
            code: "S.4.2.1",
            nameEn: "Rebar Work",
            nameId: "Pembesian",
            children: [
                { id: "", code: "S.4.2.1.1", nameEn: "Rebar D13", nameId: "Pembesian D13" },
                { id: "", code: "S.4.2.1.2", nameEn: "Rebar D16", nameId: "Pembesian D16" },
                { id: "", code: "S.4.2.1.3", nameEn: "Stirrup D8", nameId: "Sengkang D8" },
            ],
        },
        { code: "S.4.2.2", nameEn: "Formwork", nameId: "Bekisting" },
        { code: "S.4.2.3", nameEn: "Concrete Casting", nameId: "Pengecoran" },
    ],
    "S.4.3": [
        {
            code: "S.4.3.1",
            nameEn: "Rebar Work",
            nameId: "Pembesian",
            children: [
                { id: "", code: "S.4.3.1.1", nameEn: "Wiremesh M8", nameId: "Wiremesh M8" },
            ],
        },
        { code: "S.4.3.2", nameEn: "Formwork (Bondex)", nameId: "Bekisting (Bondex)" },
        { code: "S.4.3.3", nameEn: "Concrete Casting", nameId: "Pengecoran" },
    ],

    // ===== ARCHITECTURE =====
    // Dinding
    "A.1.1": [
        { code: "A.1.1.1", nameEn: "Lightweight Block 10cm", nameId: "Bata Ringan 10cm" },
        { code: "A.1.1.2", nameEn: "Lightweight Block 15cm", nameId: "Bata Ringan 15cm" },
    ],
    "A.1.2": [
        { code: "A.1.2.1", nameEn: "Red Brick 1/2 Stone", nameId: "Bata Merah 1/2 Batu" },
        { code: "A.1.2.2", nameEn: "Red Brick 1 Stone", nameId: "Bata Merah 1 Batu" },
    ],

    // Wall Finishes
    "A.2.1": [
        { code: "A.2.1.1", nameEn: "Wall Tile 30x60", nameId: "Keramik 30x60" },
        { code: "A.2.1.2", nameEn: "Wall Tile 60x120", nameId: "Keramik 60x120" },
        { code: "A.2.1.3", nameEn: "Mosaic Tile", nameId: "Keramik Mozaik" },
    ],
    "A.2.2": [
        { code: "A.2.2.1", nameEn: "Andesite Stone Cladding", nameId: "Batu Andesit" },
        { code: "A.2.2.2", nameEn: "Palimanan Stone Cladding", nameId: "Batu Palimanan" },
    ],

    // Floor Finishes
    "A.3.1": [
        { code: "A.3.1.1", nameEn: "Homogeneous Tile 60x60", nameId: "Homogeneous Tile 60x60" },
        { code: "A.3.1.2", nameEn: "Ceramic Tile 60x60", nameId: "Keramik 60x60" },
    ],
    "A.3.2": [
        { code: "A.3.2.1", nameEn: "Granite Slab 60x120", nameId: "Granit Slab 60x120" },
        { code: "A.3.2.2", nameEn: "Porcelain Tile 60x120", nameId: "Porcelain Tile 60x120" },
    ],

    // Ceiling
    "A.4.1": [
        { code: "A.4.1.1", nameEn: "Gypsum Board 9mm", nameId: "Gypsum 9mm" },
        { code: "A.4.1.2", nameEn: "Hollow Steel Frame", nameId: "Rangka Hollow" },
    ],

    // Pengecatan
    "A.6.1": [
        { code: "A.6.1.1", nameEn: "Interior Primer", nameId: "Cat Dasar Interior" },
        { code: "A.6.1.2", nameEn: "Interior Topcoat", nameId: "Cat Finish Interior" },
    ],
    "A.6.2": [
        { code: "A.6.2.1", nameEn: "Weatherproof Exterior Primer", nameId: "Cat Dasar Eksterior" },
        { code: "A.6.2.2", nameEn: "Weatherproof Topcoat", nameId: "Cat Finish Eksterior" },
    ],

    // Pintu & Jendela (A.7)
    "A.7.1": [
        { code: "A.7.1.1", nameEn: "Solid Timber Panel Door", nameId: "Pintu Panel Kayu Solid" },
        { code: "A.7.1.2", nameEn: "Engineering Wood Door", nameId: "Pintu Engineering" },
    ],
    "A.7.2": [
        { code: "A.7.2.1", nameEn: "Frameless Tempered Glass Door 12mm", nameId: "Pintu Kaca Frameless 12mm" },
        { code: "A.7.2.2", nameEn: "Aluminium Frame Glass Door", nameId: "Pintu Kaca Frame Aluminium" },
    ],
    "A.7.3": [
        { code: "A.7.3.1", nameEn: "Powder Coated Aluminium Door", nameId: "Pintu Aluminium Powder Coating" },
    ],

    // Sanitary (A.9)
    "A.9.1": [
        { code: "A.9.1.1", nameEn: "Wall Hung Toilet Monoblock", nameId: "Kloset Gantung Monoblock" },
        { code: "A.9.1.2", nameEn: "Floor Mounted Toilet Monoblock", nameId: "Kloset Duduk Monoblock" },
    ],
    "A.9.2": [
        { code: "A.9.2.1", nameEn: "Under Counter Washbasin", nameId: "Wastafel Under Counter" },
        { code: "A.9.2.2", nameEn: "Countertop Washbasin", nameId: "Wastafel Meja" },
    ],
    "A.9.3": [
        { code: "A.9.3.1", nameEn: "Sensor Wall Mounted Urinal", nameId: "Urinoir Sensor Dinding" },
    ],

    // ===== MEP =====
    // Plumbing (M.1)
    "M.1.1": [
        { code: "M.1.1.1", nameEn: "PPR Pipe 1/2 inch", nameId: "Pipa PPR 1/2 Inch" },
        { code: "M.1.1.2", nameEn: "PPR Pipe 3/4 inch", nameId: "Pipa PPR 3/4 Inch" },
        { code: "M.1.1.3", nameEn: "PPR Pipe 1 inch", nameId: "Pipa PPR 1 Inch" },
    ],
    "M.1.19": [
        { code: "M.1.19.1", nameEn: "PVC Pipe Class AW 3 inch", nameId: "Pipa PVC AW 3 Inch" },
        { code: "M.1.19.2", nameEn: "PVC Pipe Class AW 4 inch", nameId: "Pipa PVC AW 4 Inch" },
    ],

    // Electrical (M.6)
    "M.6.1": [
        { code: "M.6.1.1", nameEn: "Downlight LED 12W", nameId: "Lampu Downlight LED 12W" },
        { code: "M.6.1.2", nameEn: "Surface Mount Light 18W", nameId: "Lampu Outbow 18W" },
        { code: "M.6.1.3", nameEn: "Pendant Light Decorative", nameId: "Lampu Pendant Dekoratif" },
        { code: "M.6.1.4", nameEn: "Wall Sconce Outdoor", nameId: "Lampu Dinding Outdoor" },
        { code: "M.6.1.5", nameEn: "LED Strip Architectural", nameId: "LED Strip Arsitektural" },
    ],
    "M.6.6": [
        { code: "M.6.6.1", nameEn: "Single Wall Outlet 16A", nameId: "Stop Kontak Tunggal 16A" },
        { code: "M.6.6.2", nameEn: "Double Wall Outlet 16A", nameId: "Stop Kontak Ganda 16A" },
        { code: "M.6.6.3", nameEn: "Floor Outlet Weatherproof", nameId: "Stop Kontak Lantai Waterproof" },
    ],
    "M.6.3": [
        { code: "M.6.3.1", nameEn: "Main Distribution Panel", nameId: "Panel Distribusi Utama" },
        { code: "M.6.3.2", nameEn: "Sub Distribution Panel", nameId: "Sub Panel Distribusi" },
    ],
};

// Function to build Detail tree from Estimates
export function buildDetailFromEstimates(estimatesTree: WBSItem[]): WBSItem[] {
    let idCounter = 0;
    const generateId = () => `detail-${Date.now()}-${idCounter++}`;

    function addExtensions(items: WBSItem[]): WBSItem[] {
        return items.map(item => {
            const prefix = item.code.match(/^[A-Z]\./) ? item.code.split(".")[0] + "." : "";
            const cleanCode = item.code.replace(/^[A-Z]\./, "");

            // Check if this item has detail extensions
            const extensions = WBS_DETAIL_EXTENSIONS[item.code] || WBS_DETAIL_EXTENSIONS[cleanCode];

            // Recursively process existing children
            let children = item.children ? addExtensions(item.children) : [];

            // Add extensions if they exist
            if (extensions) {
                const prefixChildCodes = (extList: Omit<WBSItem, "id">[]): Omit<WBSItem, "id">[] => {
                    return extList.map(ext => ({
                        ...ext,
                        code: prefix ? `${prefix}${ext.code}` : ext.code,
                        children: ext.children ? prefixChildCodes(ext.children) : undefined,
                    }));
                };

                const prefixedExtensions = prefix ? prefixChildCodes(extensions) : extensions;

                const extendedChildren = prefixedExtensions.map(ext => ({
                    ...ext,
                    id: generateId(),
                    children: ext.children?.map(child => ({
                        ...child,
                        id: generateId(),
                        children: child.children?.map(grandchild => ({
                            ...grandchild,
                            id: generateId(),
                        })),
                    })),
                }));
                children = [...children, ...extendedChildren];
            }

            return {
                ...item,
                children: children.length > 0 ? children : undefined,
            };
        });
    }

    return addExtensions(estimatesTree);
}
