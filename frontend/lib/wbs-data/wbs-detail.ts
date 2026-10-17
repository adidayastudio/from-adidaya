// WBS Detail Mode Data - Extensions for Level 3+
import type { WBSItem } from "./wbs.types";

export const WBS_DETAIL_EXTENSIONS: Record<string, Omit<WBSItem, "id">[]> = {
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

    "S.1.3": [
        { code: "S.1.3.1", nameEn: "Rebar Work", nameId: "Pembesian" },
        { code: "S.1.3.2", nameEn: "Formwork", nameId: "Bekisting" },
        { code: "S.1.3.3", nameEn: "Concrete Casting", nameId: "Pengecoran" },
    ],

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

    "A.1.1": [
        { code: "A.1.1.1", nameEn: "Lightweight Brick 10cm", nameId: "Bata Ringan 10cm" },
        { code: "A.1.1.2", nameEn: "Lightweight Brick 15cm", nameId: "Bata Ringan 15cm" },
    ],

    "A.1.2": [
        { code: "A.1.2.1", nameEn: "Plaster 1:4", nameId: "Plesteran 1:4" },
        { code: "A.1.2.2", nameEn: "Plaster 1:6", nameId: "Plesteran 1:6" },
    ],

    "A.1.3": [
        { code: "A.1.3.1", nameEn: "Cement Skim Coat", nameId: "Acian Semen" },
    ],

    "A.2.1": [
        { code: "A.2.1.1", nameEn: "Granite Tile 60x60", nameId: "Granit 60x60" },
        { code: "A.2.1.2", nameEn: "Granite Tile 60x120", nameId: "Granit 60x120" },
        { code: "A.2.1.3", nameEn: "Ceramic Tile 40x40", nameId: "Keramik 40x40" },
    ],

    "A.2.2": [
        { code: "A.2.2.1", nameEn: "Wall Tile 30x60", nameId: "Keramik 30x60" },
        { code: "A.2.2.2", nameEn: "Wall Tile 60x120", nameId: "Keramik 60x120" },
        { code: "A.2.2.3", nameEn: "Mosaic Tile", nameId: "Keramik Mozaik" },
    ],

    "A.2.3": [
        { code: "A.2.3.1", nameEn: "Interior Paint", nameId: "Cat Interior" },
        { code: "A.2.3.2", nameEn: "Exterior Paint", nameId: "Cat Eksterior" },
        { code: "A.2.3.3", nameEn: "Textured Paint", nameId: "Cat Tekstur" },
    ],

    "A.3.1": [
        { code: "A.3.1.1", nameEn: "Wooden Panel Door", nameId: "Pintu Panel Kayu" },
        { code: "A.3.1.2", nameEn: "Aluminum Door", nameId: "Pintu Aluminium" },
        { code: "A.3.1.3", nameEn: "Glass Door", nameId: "Pintu Kaca" },
    ],

    "A.3.2": [
        { code: "A.3.2.1", nameEn: "Aluminum Window", nameId: "Jendela Aluminium" },
        { code: "A.3.2.2", nameEn: "uPVC Window", nameId: "Jendela uPVC" },
    ],

    "M.1.1": [
        { code: "M.1.1.1", nameEn: "Downlight LED", nameId: "Lampu Downlight" },
        { code: "M.1.1.2", nameEn: "Surface Mount Light", nameId: "Lampu Outbow" },
        { code: "M.1.1.3", nameEn: "Pendant Light", nameId: "Lampu Pendant" },
        { code: "M.1.1.4", nameEn: "Wall Sconce", nameId: "Lampu Dinding" },
        { code: "M.1.1.5", nameEn: "LED Strip", nameId: "LED Strip" },
    ],

    "M.1.2": [
        { code: "M.1.2.1", nameEn: "Single Outlet", nameId: "Stop Kontak Tunggal" },
        { code: "M.1.2.2", nameEn: "Double Outlet", nameId: "Stop Kontak Ganda" },
        { code: "M.1.2.3", nameEn: "Floor Outlet", nameId: "Stop Kontak Lantai" },
    ],

    "M.1.3": [
        { code: "M.1.3.1", nameEn: "MCB Panel", nameId: "Panel MCB" },
        { code: "M.1.3.2", nameEn: "Distribution Panel", nameId: "Panel Distribusi" },
    ],

    "M.2.1": [
        { code: "M.2.1.1", nameEn: "Wall Hung Toilet", nameId: "Kloset Gantung" },
        { code: "M.2.1.2", nameEn: "Floor Mounted Toilet", nameId: "Kloset Duduk" },
        { code: "M.2.1.3", nameEn: "Urinal", nameId: "Urinoir" },
        { code: "M.2.1.4", nameEn: "Washbasin", nameId: "Wastafel" },
    ],

    "M.3.1": [
        { code: "M.3.1.1", nameEn: "Split AC 1 HP", nameId: "AC Split 1 PK" },
        { code: "M.3.1.2", nameEn: "Split AC 1.5 HP", nameId: "AC Split 1.5 PK" },
        { code: "M.3.1.3", nameEn: "Split AC 2 HP", nameId: "AC Split 2 PK" },
        { code: "M.3.1.4", nameEn: "Cassette AC", nameId: "AC Cassette" },
    ],
};

export function buildDetailFromEstimates(estimatesTree: WBSItem[]): WBSItem[] {
    let idCounter = 0;
    const generateId = () => `detail-${Date.now()}-${idCounter++}`;

    function addExtensions(items: WBSItem[]): WBSItem[] {
        return items.map(item => {
            const extensions = WBS_DETAIL_EXTENSIONS[item.code];
            let children = item.children ? addExtensions(item.children) : [];

            if (extensions) {
                const extendedChildren = extensions.map(ext => ({
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
