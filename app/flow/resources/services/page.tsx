"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ResourceLayout } from "@/components/flow/resources/ResourceLayout";
import { ResourceCard } from "@/components/flow/resources/ResourceCard";
import { fetchCatalogResources, fetchCatalogSubcategories, fetchCatalogGroups, CatalogResource } from "@/lib/api/resources-client";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

const PAGE_SIZE = 50;

export default function ServicesPage() {
    const [items, setItems] = useState<CatalogResource[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const searchParams = useSearchParams();
    const urlQuery = searchParams.get("q") || "";

    const [searchQuery, setSearchQuery] = useState(urlQuery);
    const [subcategoryFilter, setSubcategoryFilter] = useState("ALL");
    const [groupFilter, setGroupFilter] = useState("ALL");
    const [page, setPage] = useState(1);

    const [subcategories, setSubcategories] = useState<string[]>([]);
    const [groups, setGroups] = useState<string[]>([]);

    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetchCatalogSubcategories("service").then(setSubcategories);
    }, []);

    useEffect(() => {
        fetchCatalogGroups("service", subcategoryFilter !== "ALL" ? subcategoryFilter : undefined).then(setGroups);
    }, [subcategoryFilter]);

    const loadData = useCallback(async (signal?: AbortSignal) => {
        setIsLoading(true);
        try {
            const result = await fetchCatalogResources("service", {
                search: searchQuery || undefined,
                subcategory: subcategoryFilter,
                group_name: groupFilter,
                limit: PAGE_SIZE,
                offset: (page - 1) * PAGE_SIZE,
                signal
            });
            if (!signal?.aborted) {
                setItems(result.data);
                setTotalCount(result.count);
            }
        } catch (error: any) {
            if (error?.name === 'AbortError') return;
            console.error("Failed to load services:", error);
            toast.error("Failed to load services");
        } finally {
            if (!signal?.aborted) setIsLoading(false);
        }
    }, [searchQuery, subcategoryFilter, groupFilter, page]);

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

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    return (
        <ResourceLayout
            title="Services"
            description="Outsourced labor, consultant services, and expert sub-contracting."
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
            currentCategory="service"
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
        >
            {isLoading ? (
                <div className="py-20 text-center text-neutral-400 font-medium">Loading services...</div>
            ) : items.length > 0 ? (
                <div className="flex flex-col gap-3">
                    {items.map(item => (
                        <ResourceCard key={item.id} item={item} />
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center text-neutral-400 bg-white/50 border border-dashed border-neutral-200 rounded-[32px]">
                    No services found matching criteria.
                </div>
            )}
        </ResourceLayout>
    );
}
