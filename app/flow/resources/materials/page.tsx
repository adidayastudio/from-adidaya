"use client";

import { useState, useEffect, useCallback, useRef, useContext } from "react";
import { ResourceLayout } from "@/components/flow/resources/ResourceLayout";
import { ResourceCard } from "@/components/flow/resources/ResourceCard";
import { ResourceDetailDrawer } from "@/components/flow/resources/ResourceDetailDrawer";
import { ProjectContext } from "@/components/flow/project-context";
import { fetchCatalogResources, fetchCatalogSubcategories, fetchCatalogGroups, CatalogResource } from "@/lib/api/resources-client";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

const PAGE_SIZE = 50;

// Expanded & Varied Dummy Data with Photo Placeholders
export const DUMMY_MATERIALS: any[] = [
    {
        id: "dummy-1",
        name: "bata ringan - 10 cm",
        category: "material",
        subcategory: "arsitektur",
        group_name: "dinding",
        unit: "m3",
        price_default: 0,
        description: "Standard 10cm lightweight brick",
        metadata: { variant_index: 1 }
    },
    {
        id: "dummy-2",
        name: "bata ringan - 7.5 cm",
        category: "material",
        subcategory: "arsitektur",
        group_name: "dinding",
        unit: "m3",
        price_default: 0,
        description: "Standard 7.5cm lightweight brick",
        metadata: { variant_index: 2 }
    },
    {
        id: "dummy-3",
        name: "semen portland - 40kg",
        category: "material",
        subcategory: "struktur",
        group_name: "beton",
        unit: "sak",
        price_default: 0,
        description: "Portland Cement",
        metadata: { variant_index: 1 }
    },
    {
        id: "dummy-4",
        name: "besi beton polos - 10mm",
        category: "material",
        subcategory: "struktur",
        group_name: "besi",
        unit: "btg",
        price_default: 0,
        description: "Reinforcement bar 10mm",
        metadata: { variant_index: 1 }
    },
    {
        id: "dummy-5",
        name: "pasir pasang",
        category: "material",
        subcategory: "arsitektur",
        group_name: "dinding",
        unit: "m3",
        price_default: 0,
        description: "Masonry sand",
        metadata: { variant_index: 1 }
    }
];

// Mock Stock with photos placeholder
export const MOCK_STOCK: Record<string, any[]> = {
    "dummy-1": [
        { project: "JPF", quantity: 10, unit: "m3", photo: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?q=80&w=200&auto=format&fit=crop" },
        { project: "PRG", quantity: 7.5, unit: "m3" },
        { project: "AD-038", quantity: 15, unit: "m3", photo: "https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?q=80&w=200&auto=format&fit=crop" }
    ],
    "dummy-2": [
        { project: "JPF", quantity: 5, unit: "m3" },
        { project: "STUDIO", quantity: 2, unit: "m3" }
    ],
    "dummy-3": [
        { project: "PRG", quantity: 120, unit: "sak", photo: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=200&auto=format&fit=crop" },
        { project: "JPF", quantity: 45, unit: "sak" }
    ]
};

export default function MaterialsPage() {
    const projectCtx = useContext(ProjectContext);
    const forceProjectCode = projectCtx?.project?.code || null;

    const [items, setItems] = useState<CatalogResource[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const searchParams = useSearchParams();
    const urlQuery = searchParams.get("q") || "";

    // Filters
    const [searchQuery, setSearchQuery] = useState(urlQuery);
    const [subcategoryFilter, setSubcategoryFilter] = useState("ALL");
    const [groupFilter, setGroupFilter] = useState("ALL");
    const [page, setPage] = useState(1);

    // Detail Drawer State
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Filter options from DB
    const [subcategories, setSubcategories] = useState<string[]>([]);
    const [groups, setGroups] = useState<string[]>([]);

    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    // Load filter options
    useEffect(() => {
        fetchCatalogSubcategories("material").then(setSubcategories);
    }, []);

    useEffect(() => {
        fetchCatalogGroups("material", subcategoryFilter !== "ALL" ? subcategoryFilter : undefined).then(setGroups);
    }, [subcategoryFilter]);

    // Load data
    const loadData = useCallback(async (signal?: AbortSignal) => {
        setIsLoading(true);
        try {
            // Include 0 stock items if searching or filtering
            const isActiveFilter = searchQuery !== "" || subcategoryFilter !== "ALL" || groupFilter !== "ALL";

            const result = await fetchCatalogResources("material", {
                search: searchQuery || undefined,
                subcategory: subcategoryFilter,
                group_name: groupFilter,
                limit: PAGE_SIZE,
                offset: (page - 1) * PAGE_SIZE,
                signal
            });

            if (!signal?.aborted) {
                let finalItems = result.data as any[];

                // Handle Dummy Data Search & Filter
                const dummyMatches = DUMMY_MATERIALS.filter(d => {
                    const matchSearch = !searchQuery || [
                        d.name,
                        d.subcategory,
                        d.group_name,
                    ].some(v => v?.toLowerCase().includes(searchQuery.toLowerCase()));

                    const matchSub = subcategoryFilter === "ALL" || d.subcategory?.toLowerCase() === subcategoryFilter.toLowerCase();
                    const matchGroup = groupFilter === "ALL" || d.group_name?.toLowerCase() === groupFilter.toLowerCase();
                    const hasStockInProject = (MOCK_STOCK[d.id] || []).some(ps => ps.project === forceProjectCode);

                    return matchSearch && matchSub && matchGroup && (!forceProjectCode || hasStockInProject);
                });

                if (isActiveFilter || page > 1) {
                    finalItems = [...dummyMatches, ...result.data];
                    setTotalCount(result.count + dummyMatches.length);
                } else {
                    // Default view (no filters): Show only items with recorded stock (Dummy items)
                    const activeDummyItems = DUMMY_MATERIALS.filter(d => {
                        const hasStock = (MOCK_STOCK[d.id] || []).some(ps => ps.project === forceProjectCode);
                        return !forceProjectCode || hasStock;
                    });
                    finalItems = activeDummyItems;
                    setTotalCount(activeDummyItems.length);
                }

                setItems(finalItems);
            }
        } catch (error: any) {
            if (error?.name === 'AbortError') return;
            console.error("Failed to load materials:", error);
            toast.error("Failed to load materials");
        } finally {
            if (!signal?.aborted) setIsLoading(false);
        }
    }, [searchQuery, subcategoryFilter, groupFilter, page, forceProjectCode]);

    useEffect(() => {
        const controller = new AbortController();
        loadData(controller.signal);
        return () => controller.abort();
    }, [loadData]);

    // Sync search query from URL
    useEffect(() => {
        setSearchQuery(urlQuery);
        setPage(1);
    }, [urlQuery]);

    const handleSubcategoryChange = (sub: string) => {
        setSubcategoryFilter(sub);
        setGroupFilter("ALL");
        setPage(1);
    };

    const handleGroupChange = (group: string) => {
        setGroupFilter(group);
        setPage(1);
    };

    const openDetail = (item: any) => {
        setSelectedItem(item);
        setIsDrawerOpen(true);
    };

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    return (
        <ResourceLayout
            title="Materials"
            description="Manage your project materials, stock adjustments, and transfers."
            stats={{
                total: totalCount,
                catalogItems: items.length,
                subcategories: subcategories.length,
                groups: groups.length
            }}
            subcategories={subcategories}
            groups={groups}
            selectedSubcategory={subcategoryFilter}
            selectedGroup={groupFilter}
            onSearch={() => { }}
            onSubcategoryChange={handleSubcategoryChange}
            onGroupChange={handleGroupChange}
            currentCategory="material"
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
        >
            {isLoading ? (
                <div className="py-20 text-center text-neutral-400 font-medium">Loading materials...</div>
            ) : items.length > 0 ? (
                <div className="flex flex-col gap-4">
                    {items.map(item => (
                        <ResourceCard
                            key={item.id}
                            item={item}
                            projectStock={(MOCK_STOCK[item.id] || []).filter(ps => !forceProjectCode || ps.project === forceProjectCode)}
                            onOpenDetail={() => openDetail(item)}
                        />
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center text-neutral-400 bg-white/50 dark:bg-neutral-900/50 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-[32px]">
                    No materials found matching criteria.
                </div>
            )}

            {/* Global Detail Drawer */}
            <ResourceDetailDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                resource={selectedItem}
                projectStock={selectedItem ? ((MOCK_STOCK[selectedItem.id] || []).filter(ps => !forceProjectCode || ps.project === forceProjectCode)) : []}
            />
        </ResourceLayout>
    );
}
