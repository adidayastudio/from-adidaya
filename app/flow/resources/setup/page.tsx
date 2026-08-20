"use client";

import React, { useState, useEffect, useMemo } from "react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { 
  Package, 
  Wrench, 
  Truck, 
  Handshake, 
  Plus, 
  Trash2,
  Sliders,
  Search,
  ChevronDown,
  ChevronRight,
  Folder,
  Layers,
  Database,
  Edit2,
  Check,
  X,
  MoreHorizontal
} from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/utils/supabase/client";
import { fetchCatalogResources, CatalogResource } from "@/lib/api/resources-client";
import { generateResourceCode } from "@/components/flow/resources/ResourceCard";
import { toast } from "sonner";

const supabase = createClient();

interface ResourceItem {
  id: string;
  sku: string;
  badge: string;
  name: string;
  category: "material" | "tool" | "asset" | "service";
  subcategory: string;
  group_name: string;
  unit: string;
  price_default?: number;
}

export default function ResourcesSetupPage() {
  const [activeCategory, setActiveCategory] = useState<"material" | "tool" | "asset" | "service">("material");
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Inline edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSubcategory, setEditSubcategory] = useState("");
  const [editGroup, setEditGroup] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editPrice, setEditPrice] = useState<number | "">("");

  // Bulk taxonomy editing states
  const [editingTaxonomyType, setEditingTaxonomyType] = useState<"subcategory" | "group" | null>(null);
  const [editingTaxonomyOldValue, setEditingTaxonomyOldValue] = useState<string>("");
  const [editingTaxonomyNewValue, setEditingTaxonomyNewValue] = useState<string>("");
  const [editingTaxonomySubName, setEditingTaxonomySubName] = useState<string>("");

  // Dropdown menu state
  const [activeMenuSub, setActiveMenuSub] = useState<string | null>(null);
  const [activeMenuGroup, setActiveMenuGroup] = useState<string | null>(null);

  // Quick addition states
  const [isAddingSubcategory, setIsAddingSubcategory] = useState(false);
  const [newSubcatName, setNewSubcatName] = useState("");
  const [newSubcatBadge, setNewSubcatBadge] = useState("");
  const [addingGroupToSub, setAddingGroupToSub] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");

  // Selection sidebar filter states
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // Group expand/collapse states (key is subcategory)
  const [expandedSubs, setExpandedSubs] = useState<Record<string, boolean>>({});
  const [expandedVariants, setExpandedVariants] = useState<Record<string, boolean>>({});

  // Input states for new item addition
  const [newName, setNewName] = useState("");
  const [newSubcategory, setNewSubcategory] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newPrice, setNewPrice] = useState<number | "">("");

  const categories = [
    { id: "material", label: "Material", icon: Package, color: "text-blue-500 bg-blue-500/10 border-blue-200/20" },
    { id: "tool", label: "Tools", icon: Wrench, color: "text-orange-500 bg-orange-500/10 border-orange-200/20" },
    { id: "asset", label: "Assets", icon: Truck, color: "text-purple-500 bg-purple-500/10 border-purple-200/20" },
    { id: "service", label: "Services", icon: Handshake, color: "text-emerald-500 bg-emerald-500/10 border-emerald-200/20" },
  ];

  const badgeMapping = (cat: string, sub?: string, itemCode?: string): string => {
    if (cat === "tool") return "TLS";
    if (cat === "asset") return "AST";
    if (cat === "service") return "SRV";
    
    // Check standard subcategory text first (GEN, STR, ARS, etc.)
    const s = (sub || "").toLowerCase().trim();
    if (s.includes("general") || s.includes("uncategorized") || s.includes("umum") || s === "gen") return "GEN";
    if (s.includes("structure") || s.includes("struktur") || s === "str") return "STR";
    if (s.includes("architecture") || s.includes("arsitektur") || s === "ars") return "ARS";
    if (s.includes("mep") || s.includes("mekanikal") || s.includes("elektrikal")) return "MEP";
    if (s.includes("interior") || s === "int") return "INT";
    if (s.includes("landscape") || s.includes("lanskap") || s.includes("infra") || s === "lan") return "LAN";
    if (s.includes("miscellaneous") || s.includes("msc") || s.includes("lain")) return "MSC";

    // Extract from itemCode prefix if available (e.g. MT02... -> ARS)
    if (itemCode && itemCode.length >= 4) {
      const l2 = itemCode.substring(2, 4);
      if (l2 === "00") return "GEN";
      if (l2 === "01") return "STR";
      if (l2 === "02") return "ARS";
      if (l2 === "03") return "MEP";
      if (l2 === "04") return "INT";
      if (l2 === "05") return "LAN";
      if (l2 === "99") return "MSC";
    }
    
    if (sub && sub.length >= 3) {
      return sub.substring(0, 3).toUpperCase();
    }
    return "MSC";
  };

  const getBadgeColor = (badge: string): string => {
    switch (badge) {
      case "GEN": return "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
      case "STR": return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";
      case "ARS": return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
      case "MEP": return "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400";
      case "INT": return "bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400";
      case "LAN": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
      case "MSC": return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400";
      case "TLS": return "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400";
      case "AST": return "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400";
      default: return "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400";
    }
  };

  // Fetch category counts for header buttons
  const loadCategoryCounts = async () => {
    try {
      const counts: Record<string, number> = {};
      const categoriesList = ["material", "tool", "asset", "service"];
      
      await Promise.all(categoriesList.map(async (cat) => {
        const { count, error } = await supabase
          .from("pricing_resources")
          .select("*", { count: "exact", head: true })
          .eq("category", cat);
        
        if (!error && count !== null) {
          counts[cat] = count;
        } else {
          counts[cat] = 0;
        }
      }));
      
      setCategoryCounts(counts);
    } catch (err) {
      console.error("Failed to load category counts:", err);
    }
  };

  // Fetch all items from DB for active category
  const loadAllItems = async () => {
    setIsLoading(true);
    try {
      // Refresh category counts
      loadCategoryCounts();

      let allData: any[] = [];
      let from = 0;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("pricing_resources")
          .select("*")
          .eq("category", activeCategory)
          .order("name", { ascending: true })
          .order("id", { ascending: true })
          .range(from, from + limit - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += limit;
          if (data.length < limit) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      // Deduplicate to prevent key collision if any overlaps occurred during range fetching
      const uniqueData = Array.from(new Map(allData.map(item => [item.id, item])).values());

      const variantCounts: Record<string, number> = {};
      const mapped: ResourceItem[] = uniqueData.map((row: any) => {
        const cat = row.category || 'material';
        const sub = (row.subcategory || 'General').toLowerCase().trim();
        const grp = (row.group_name || 'General').toLowerCase().trim();
        const baseName = (row.name || "").split(' - ')[0].trim().toLowerCase();
        const key = `${cat}_${sub}_${grp}_${baseName}`;
        
        variantCounts[key] = (variantCounts[key] || 0) + 1;
        const variantIndex = variantCounts[key];
        
        const rowWithVariant = {
          ...row,
          metadata: {
            ...row.metadata,
            variant_index: variantIndex
          }
        };

        const badge = badgeMapping(rowWithVariant.category, rowWithVariant.subcategory || "General", rowWithVariant.code);
        const sku = generateResourceCode(rowWithVariant as any);

        return {
          id: rowWithVariant.id,
          sku: sku,
          badge: badge,
          name: rowWithVariant.name,
          category: rowWithVariant.category as any,
          subcategory: rowWithVariant.subcategory || "General",
          group_name: rowWithVariant.group_name || "General",
          unit: rowWithVariant.unit || "pcs",
          price_default: rowWithVariant.price_default || 0,
        };
      });

      setItems(mapped);

      // Auto expand subcategories
      const uniqueSubs = [...new Set(mapped.map(i => i.subcategory))];
      const expands: Record<string, boolean> = {};
      uniqueSubs.forEach(s => {
        expands[s] = true;
      });
      setExpandedSubs(expands);
    } catch (err: any) {
      console.error("Failed to load catalog resources from DB. Message:", err?.message, "Details:", err?.details, "Full Error:", err);
      const dbMessage = err?.message || err?.details || "Unknown error";
      toast.error(`Failed to load catalog resources: ${dbMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllItems();
  }, [activeCategory]);

  // Extract unique taxonomies for left sidebar based on current category
  const taxonomies = useMemo(() => {
    const list = items.filter(i => i.category === activeCategory);
    
    // Standard subcategories for activeCategory === "material"
    const standards = activeCategory === "material" 
      ? ["General", "Structure", "Architecture", "MEP", "Interior", "Landscape", "Miscellaneous"] 
      : [];
      
    // Combine standard subcategories with any additional subcategories found in DB
    const allSubs = [...new Set([...standards, ...list.map(i => i.subcategory)])];
    
    // Custom sort: standard order first, then custom categories, and Miscellaneous always at the absolute bottom
    const sortedSubs = allSubs.sort((a, b) => {
      const isAMisc = a.toLowerCase().includes("misc") || a.toLowerCase() === "msc";
      const isBMisc = b.toLowerCase().includes("misc") || b.toLowerCase() === "msc";
      if (isAMisc && !isBMisc) return 1;
      if (!isAMisc && isBMisc) return -1;
      
      const idxA = standards.indexOf(a);
      const idxB = standards.indexOf(b);
      
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      
      return a.localeCompare(b);
    });
    
    return sortedSubs.map(sub => {
      const groups = [...new Set(list.filter(i => i.subcategory === sub).map(i => i.group_name))];
      // Make sure there is always at least a "General" group
      if (groups.length === 0) groups.push("General");
      return { subcategory: sub, groups };
    });
  }, [items, activeCategory]);

  // SKU code conflict previews for ADD
  const previewSku = useMemo(() => {
    if (!newName.trim()) return "";
    try {
      const cat = activeCategory;
      const sub = (newSubcategory || "General").toLowerCase().trim();
      const grp = (newGroup || "General").toLowerCase().trim();
      const baseName = newName.split(' - ')[0].trim().toLowerCase();
      
      const existingVariants = items.filter(item => {
        const itemBase = item.name.split(' - ')[0].trim().toLowerCase();
        return item.category === cat && 
               item.subcategory.toLowerCase().trim() === sub && 
               item.group_name.toLowerCase().trim() === grp && 
               itemBase === baseName;
      });

      const variantIndex = existingVariants.length + 1;

      return generateResourceCode({
        category: activeCategory,
        subcategory: newSubcategory || "General",
        group_name: newGroup || "General",
        name: newName,
        metadata: { variant_index: variantIndex }
      } as any);
    } catch (e) {
      return "";
    }
  }, [activeCategory, newSubcategory, newGroup, newName, items]);

  const isSkuConflicting = useMemo(() => {
    if (!previewSku) return false;
    return items.some(item => item.sku === previewSku);
  }, [items, previewSku]);

  // SKU code conflict previews for EDIT
  const previewEditSku = useMemo(() => {
    if (!editName.trim() || !editingId) return "";
    try {
      const cat = activeCategory;
      const sub = (editSubcategory || "General").toLowerCase().trim();
      const grp = (editGroup || "General").toLowerCase().trim();
      const baseName = editName.split(' - ')[0].trim().toLowerCase();

      const matchingItems = items.filter(item => {
        const itemBase = item.name.split(' - ')[0].trim().toLowerCase();
        return item.category === cat && 
               item.subcategory.toLowerCase().trim() === sub && 
               item.group_name.toLowerCase().trim() === grp && 
               itemBase === baseName;
      });

      const existingIdx = matchingItems.findIndex(i => i.id === editingId);
      const variantIndex = existingIdx !== -1 ? (existingIdx + 1) : (matchingItems.length + 1);

      return generateResourceCode({
        category: activeCategory,
        subcategory: editSubcategory || "General",
        group_name: editGroup || "General",
        name: editName,
        metadata: { variant_index: variantIndex }
      } as any);
    } catch (e) {
      return "";
    }
  }, [activeCategory, editSubcategory, editGroup, editName, editingId, items]);

  const isEditSkuConflicting = useMemo(() => {
    if (!previewEditSku || !editingId) return false;
    return items.some(item => item.sku === previewEditSku && item.id !== editingId);
  }, [items, previewEditSku, editingId]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUnit.trim()) return;

    const sub = newSubcategory.trim() || "General";
    const grp = newGroup.trim() || "General";
    
    const baseName = newName.trim().split(' - ')[0].trim().toLowerCase();
    const existingVariants = items.filter(item => {
      const itemBase = item.name.split(' - ')[0].trim().toLowerCase();
      return item.category === activeCategory && 
             item.subcategory.toLowerCase().trim() === sub.toLowerCase().trim() && 
             item.group_name.toLowerCase().trim() === grp.toLowerCase().trim() && 
             itemBase === baseName;
    });
    const variantIndex = existingVariants.length + 1;

    const targetSku = generateResourceCode({
      category: activeCategory,
      subcategory: sub,
      group_name: grp,
      name: newName.trim(),
      metadata: { variant_index: variantIndex }
    } as any);

    const duplicate = items.find(item => item.sku === targetSku);
    if (duplicate) {
      const confirmMerge = window.confirm(`An item with SKU "${targetSku}" already exists ("${duplicate.name}"). Do you want to merge this new item with the existing duplicate?`);
      if (!confirmMerge) return;
      
      toast.success("Successfully merged into existing item!");
      setNewName("");
      setNewSubcategory("");
      setNewGroup("");
      setNewUnit("");
      setNewPrice("");
      return;
    }

    try {
      const { error } = await supabase
        .from("pricing_resources")
        .insert({
          name: newName.trim(),
          category: activeCategory,
          subcategory: sub,
          group_name: grp,
          unit: newUnit.trim(),
          price_default: newPrice === "" ? 0 : Number(newPrice),
          code: targetSku
        });

      if (error) throw error;

      toast.success("Item successfully added to catalog!");
      loadAllItems();
      
      // Clear inputs
      setNewName("");
      setNewSubcategory("");
      setNewGroup("");
      setNewUnit("");
      setNewPrice("");
    } catch (err) {
      console.error("Error inserting catalog item:", err);
      toast.error("Failed to add catalog item");
    }
  };

  const handleDeleteItem = async (idOrIds: string | string[]) => {
    const isBulk = Array.isArray(idOrIds);
    const count = isBulk ? idOrIds.length : 1;
    
    const message = isBulk 
      ? `This item has ${count} variants. Deleting this means you delete all the variants too. Are you sure you want to proceed?`
      : "Are you sure to delete this item?";
      
    if (!window.confirm(message)) return;

    try {
      // 1. Nullify references in resource_sync_log to prevent FK block
      if (isBulk) {
        await supabase
          .from("resource_sync_log")
          .update({ resource_id: null })
          .in("resource_id", idOrIds);
      } else {
        await supabase
          .from("resource_sync_log")
          .update({ resource_id: null })
          .eq("resource_id", idOrIds);
      }

      // 2. Execute deletion query on pricing_resources
      let query = supabase.from("pricing_resources").delete();
      if (isBulk) {
        query = query.in("id", idOrIds);
      } else {
        query = query.eq("id", idOrIds);
      }
      
      const { error } = await query;
      if (error) throw error;

      toast.success(isBulk ? "All variants deleted successfully!" : "Item deleted successfully!");
      loadAllItems();
    } catch (err: any) {
      console.error("Error deleting catalog item. Message:", err?.message, "Details:", err?.details, "Full Error:", err);
      const dbMessage = err?.message || err?.details || "Failed to delete catalog item due to reference constraints.";
      toast.error(`Delete Failed: ${dbMessage}`);
    }
  };

  const startEditing = (item: ResourceItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditSubcategory(item.subcategory);
    setEditGroup(item.group_name);
    setEditUnit(item.unit);
    setEditPrice(item.price_default || 0);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim() || !editUnit.trim() || !editSubcategory.trim()) {
      toast.error("Name, Subcategory, and Unit are required");
      return;
    }
    
    const sub = editSubcategory.trim();
    const grp = editGroup.trim();
    
    const baseName = editName.trim().split(' - ')[0].trim().toLowerCase();
    const matchingItems = items.filter(item => {
      const itemBase = item.name.split(' - ')[0].trim().toLowerCase();
      return item.category === activeCategory && 
             item.subcategory.toLowerCase().trim() === sub.toLowerCase().trim() && 
             item.group_name.toLowerCase().trim() === grp.toLowerCase().trim() && 
             itemBase === baseName;
    });
    const existingIdx = matchingItems.findIndex(i => i.id === id);
    const variantIndex = existingIdx !== -1 ? (existingIdx + 1) : (matchingItems.length + 1);

    const targetSku = generateResourceCode({
      category: activeCategory,
      subcategory: sub,
      group_name: grp,
      name: editName.trim(),
      metadata: { variant_index: variantIndex }
    } as any);

    const duplicate = items.find(item => item.sku === targetSku && item.id !== id);
    if (duplicate) {
      const confirmMerge = window.confirm(`An item with SKU "${targetSku}" already exists ("${duplicate.name}"). Do you want to merge this item with the existing one?`);
      if (!confirmMerge) return;
      
      setIsLoading(true);
      try {
        // Merge references
        await supabase.from('resource_inventory').update({ resource_id: duplicate.id }).eq('resource_id', id);
        await supabase.from('resource_sync_log').update({ resource_id: duplicate.id }).eq('resource_id', id);
        await supabase.from('ahsp_components').update({ resource_id: duplicate.id }).eq('resource_id', id);
        await supabase.from('pricing_resources').delete().eq('id', id);

        toast.success("Successfully merged items!");
        setEditingId(null);
        loadAllItems();
      } catch (err) {
        console.error("Error merging edit:", err);
        toast.error("Failed to merge duplicate items");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      const { error } = await supabase
        .from("pricing_resources")
        .update({
          name: editName.trim(),
          subcategory: editSubcategory.trim(),
          group_name: editGroup.trim(),
          unit: editUnit.trim(),
          price_default: editPrice === "" ? 0 : Number(editPrice),
          code: targetSku
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Item updated successfully!");
      setEditingId(null);
      loadAllItems();
    } catch (err: any) {
      console.error("Error updating catalog item. Message:", err?.message, "Details:", err?.details, "Full Error:", err);
      const dbMessage = err?.message || err?.details || "Failed to update catalog item due to schema constraints.";
      toast.error(`Update Failed: ${dbMessage}`);
    }
  };

  const handleSmartMerge = async () => {
    setIsLoading(true);
    try {
      // 1. Standardize subcategories to group similar ones using highly optimized bulk updates
      const { data: dbItems, error: fetchErr } = await supabase
        .from("pricing_resources")
        .select("subcategory")
        .eq("category", activeCategory);

      if (!fetchErr && dbItems) {
        const uniqueSubs = [...new Set(dbItems.map(d => d.subcategory || ""))];
        const groupsToUpdate: Record<string, string[]> = {
          "General": [],
          "Structure": [],
          "Architecture": [],
          "MEP": [],
          "Interior": [],
          "Landscape": [],
          "Miscellaneous": []
        };

        uniqueSubs.forEach(sub => {
          const s = sub.toLowerCase().trim();
          if (!s || s.includes("general") || s.includes("uncategorized") || s.includes("umum") || s === "gen") {
            groupsToUpdate["General"].push(sub);
          } else if (s.includes("struktur") || s.includes("structure") || s === "str") {
            groupsToUpdate["Structure"].push(sub);
          } else if (s.includes("arsitektur") || s.includes("architecture") || s.includes("finishing") || s.includes("atap") || s === "ars" || s === "ata") {
            groupsToUpdate["Architecture"].push(sub);
          } else if (s.includes("mep") || s.includes("mekanikal") || s.includes("elektrikal") || s.includes("plumbing") || s.includes("sanitary")) {
            groupsToUpdate["MEP"].push(sub);
          } else if (s.includes("interior") || s === "int") {
            groupsToUpdate["Interior"].push(sub);
          } else if (s.includes("landscape") || s.includes("lanskap") || s.includes("infra") || s === "lan") {
            groupsToUpdate["Landscape"].push(sub);
          } else {
            const standards = ["General", "Structure", "Architecture", "MEP", "Interior", "Landscape", "Miscellaneous"];
            if (!standards.includes(sub)) {
              groupsToUpdate["Miscellaneous"].push(sub);
            }
          }
        });

        for (const [targetSub, sourceSubs] of Object.entries(groupsToUpdate)) {
          // Filter out standard categories to prevent redundant updates
          const toUpdate = sourceSubs.filter(s => s !== targetSub);
          if (toUpdate.length > 0) {
            await supabase
              .from("pricing_resources")
              .update({ subcategory: targetSub })
              .eq("category", activeCategory)
              .in("subcategory", toUpdate);
          }
        }
      }

      // Re-fetch items to get updated subcategories before grouping
      const { data: refreshedData, error: refreshErr } = await supabase
        .from("pricing_resources")
        .select("*")
        .eq("category", activeCategory);

      const variantCounts: Record<string, number> = {};
      const itemsToMerge = (refreshErr || !refreshedData) ? items : refreshedData.map((row: any) => {
        const cat = row.category || 'material';
        const sub = (row.subcategory || 'General').toLowerCase().trim();
        const grp = (row.group_name || 'General').toLowerCase().trim();
        const baseName = (row.name || "").split(' - ')[0].trim().toLowerCase();
        const key = `${cat}_${sub}_${grp}_${baseName}`;
        
        variantCounts[key] = (variantCounts[key] || 0) + 1;
        const variantIndex = variantCounts[key];
        
        const rowWithVariant = {
          ...row,
          metadata: {
            ...row.metadata,
            variant_index: variantIndex
          }
        };

        return {
          id: rowWithVariant.id,
          sku: generateResourceCode(rowWithVariant as any),
          badge: badgeMapping(rowWithVariant.category, rowWithVariant.subcategory || "General", rowWithVariant.code),
          name: rowWithVariant.name,
          category: rowWithVariant.category as any,
          subcategory: rowWithVariant.subcategory || "General",
          group_name: rowWithVariant.group_name || "General",
          unit: rowWithVariant.unit || "pcs",
          price_default: rowWithVariant.price_default || 0,
        };
      });

      // Group items by SKU
      const groups: Record<string, any[]> = {};
      itemsToMerge.forEach(item => {
        const key = item.sku.trim();
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      });

      let mergedCount = 0;
      for (const key in groups) {
        const duplicates = groups[key];
        if (duplicates.length > 1) {
          const winner = duplicates[0];
          const losers = duplicates.slice(1);
          const loserIds = losers.map(l => l.id);

          // Update resource_inventory references
          for (const loserId of loserIds) {
            const { data: dupInv } = await supabase
              .from('resource_inventory')
              .select('*')
              .eq('resource_id', loserId);

            for (const entry of (dupInv || [])) {
              const { data: winEntry } = await supabase
                .from('resource_inventory')
                .select('*')
                .eq('resource_id', winner.id)
                .eq('project_id', entry.project_id)
                .maybeSingle();

              if (winEntry) {
                await supabase.from('resource_inventory')
                  .update({
                    quantity_in: Number(winEntry.quantity_in) + Number(entry.quantity_in),
                    quantity_used: Number(winEntry.quantity_used) + Number(entry.quantity_used),
                    quantity_manual_adj: Number(winEntry.quantity_manual_adj) + Number(entry.quantity_manual_adj),
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', winEntry.id);

                await supabase.from('resource_inventory').delete().eq('id', entry.id);
              } else {
                await supabase.from('resource_inventory')
                  .update({ resource_id: winner.id })
                  .eq('id', entry.id);
              }
            }

            // Update sync logs
            await supabase.from('resource_sync_log').update({ resource_id: winner.id }).eq('resource_id', loserId);
          }

          // Delete duplicate resources
          const { error: delErr } = await supabase
            .from('pricing_resources')
            .delete()
            .in('id', loserIds);

          if (delErr) {
            console.warn(`Skipped merging SKU ${key} due to DB reference constraints:`, delErr.message);
          } else {
            mergedCount += loserIds.length;
          }
        }
      }

      if (mergedCount > 0) {
        toast.success(`Successfully merged ${mergedCount} duplicate items!`);
        loadAllItems();
      } else {
        toast.info("No duplicate items found to merge.");
      }
    } catch (err) {
      console.error("Error merging duplicates:", err);
      toast.error("Failed to merge duplicate items");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkRenameTaxonomy = async () => {
    if (!editingTaxonomyNewValue.trim()) return;
    
    if (editingTaxonomyType === "subcategory") {
      const targetExists = taxonomies.some(t => t.subcategory.toLowerCase() === editingTaxonomyNewValue.trim().toLowerCase());
      if (targetExists) {
        const confirmMerge = window.confirm(`Subcategory "${editingTaxonomyNewValue}" already exists. Do you want to merge all items from "${editingTaxonomyOldValue}" into "${editingTaxonomyNewValue}"?`);
        if (!confirmMerge) return;
      }
    }

    setIsLoading(true);
    try {
      let query = supabase.from("pricing_resources").update({
        [editingTaxonomyType === "subcategory" ? "subcategory" : "group_name"]: editingTaxonomyNewValue.trim()
      });

      if (editingTaxonomyType === "subcategory") {
        query = query.eq("subcategory", editingTaxonomyOldValue).eq("category", activeCategory);
      } else {
        query = query.eq("group_name", editingTaxonomyOldValue).eq("subcategory", editingTaxonomySubName).eq("category", activeCategory);
      }

      const { error } = await query;
      if (error) throw error;

      toast.success(`Taxonomy renamed to ${editingTaxonomyNewValue}`);
      setEditingTaxonomyType(null);
      loadAllItems();
    } catch (err) {
      console.error("Failed to rename taxonomy:", err);
      toast.error("Failed to rename taxonomy");
    } finally {
      setIsLoading(false);
    }
  };

  const existingSubForBadge = useMemo(() => {
    if (!newSubcatBadge.trim()) return undefined;
    return taxonomies.find(t => {
      const subItems = items.filter(i => i.subcategory === t.subcategory && i.category === activeCategory);
      const b = subItems.length > 0 ? subItems[0].badge : badgeMapping(activeCategory, t.subcategory);
      return b === newSubcatBadge;
    });
  }, [taxonomies, newSubcatBadge, activeCategory, items]);

  const handleAddSubcategoryQuick = async () => {
    if (!newSubcatName.trim()) return;
    
    if (existingSubForBadge) {
      const confirmMerge = window.confirm(`Badge code "${newSubcatBadge}" is already used by subcategory "${existingSubForBadge.subcategory}". Do you want to merge "${newSubcatName}" into "${existingSubForBadge.subcategory}"?`);
      if (confirmMerge) {
        setIsLoading(true);
        try {
          const { error } = await supabase
            .from("pricing_resources")
            .update({ subcategory: existingSubForBadge.subcategory })
            .eq("subcategory", newSubcatName.trim())
            .eq("category", activeCategory);

          if (error) throw error;
          toast.success(`Merged "${newSubcatName}" into "${existingSubForBadge.subcategory}"`);
          setIsAddingSubcategory(false);
          setNewSubcatName("");
          setNewSubcatBadge("");
          loadAllItems();
        } catch (err) {
          console.error(err);
          toast.error("Failed to merge subcategories");
        } finally {
          setIsLoading(false);
        }
        return;
      }
    }

    setIsLoading(true);
    try {
      const codePrefix = 
        newSubcatBadge === "GEN" ? "00" :
        newSubcatBadge === "STR" ? "01" :
        newSubcatBadge === "ARS" ? "02" :
        newSubcatBadge === "MEP" ? "03" :
        newSubcatBadge === "INT" ? "04" :
        newSubcatBadge === "LAN" ? "05" : "99";
        
      const randomSku = `MT${codePrefix}00000-${Math.floor(100 + Math.random() * 900)}`;

      const { error } = await supabase
        .from("pricing_resources")
        .insert({
          name: `[Placeholder] New ${newSubcatName.trim()} item`,
          category: activeCategory,
          subcategory: newSubcatName.trim(),
          group_name: "General",
          unit: "pcs",
          price_default: 0,
          code: randomSku
        });

      if (error) throw error;
      toast.success(`Subcategory ${newSubcatName} added!`);
      setIsAddingSubcategory(false);
      setNewSubcatName("");
      setNewSubcatBadge("");
      loadAllItems();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add subcategory");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGroupQuick = async (sub: string) => {
    if (!newGroupName.trim()) return;
    setIsLoading(true);
    try {
      const badge = badgeMapping(activeCategory, sub);
      const codePrefix = badge === "ARS" ? "02" : badge === "STR" ? "01" : "03";
      const randomSku = `MT${codePrefix}01260-${Math.floor(100 + Math.random() * 900)}`;

      const { error } = await supabase
        .from("pricing_resources")
        .insert({
          name: `[Placeholder] New ${newGroupName.trim()} item in ${sub}`,
          category: activeCategory,
          subcategory: sub,
          group_name: newGroupName.trim(),
          unit: "pcs",
          price_default: 0,
          code: randomSku
        });

      if (error) throw error;
      toast.success(`Group ${newGroupName} added to ${sub}!`);
      setAddingGroupToSub(null);
      setNewGroupName("");
      loadAllItems();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add group");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSubExpanded = (sub: string) => {
    setExpandedSubs(prev => ({ ...prev, [sub]: !prev[sub] }));
  };

  const filteredItems = items.filter(item => {
    if (item.category !== activeCategory) return false;
    
    if (selectedSubcategory && item.subcategory !== selectedSubcategory) return false;
    if (selectedGroup && item.group_name !== selectedGroup) return false;

    const matchesSearch = !searchQuery || [
      item.name,
      item.sku,
      item.subcategory,
      item.group_name
    ].some(v => v.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  const toggleVariantExpanded = (key: string) => {
    setExpandedVariants(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const groupedItems = useMemo(() => {
    const groups: Record<string, ResourceItem[]> = {};
    filteredItems.forEach(item => {
      const baseName = item.name.split(' - ')[0].trim();
      const key = `${item.category}_${item.subcategory}_${item.group_name}_${baseName}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    return Object.entries(groups).map(([key, groupList]) => {
      const first = groupList[0];
      const baseName = first.name.split(' - ')[0].trim();
      return {
        key,
        baseName,
        category: first.category,
        subcategory: first.subcategory,
        group_name: first.group_name,
        badge: first.badge,
        items: groupList
      };
    });
  }, [filteredItems]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 relative">
      <div className="hidden lg:block">
        <StandardPageHeader 
          title="Resources Setup" 
          subtitle="Manage default items, SKUs, category hierarchies, and default pricing."
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          const count = categoryCounts[cat.id] || 0;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id as any);
                setSelectedSubcategory(null);
                setSelectedGroup(null);
              }}
              className={clsx(
                "p-4 rounded-2xl border text-left flex items-center justify-between transition-all group cursor-pointer shadow-2xs hover:shadow-sm",
                isActive 
                  ? "bg-white dark:bg-neutral-900 border-neutral-350 dark:border-neutral-700 ring-2 ring-blue-500/20" 
                  : "bg-white/40 dark:bg-neutral-900/20 border-neutral-200/80 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", cat.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-800 dark:text-white capitalize">{cat.label}</div>
                  <div className="text-[10px] text-neutral-400 font-semibold">{count} Items catalogued</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-270px)] min-h-[500px] overflow-hidden">
        
        <div className="lg:col-span-1 bg-white/70 dark:bg-neutral-900/40 backdrop-blur-md rounded-[24px] border border-neutral-200/80 dark:border-neutral-800/80 p-5 shadow-2xs flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100 dark:border-neutral-850 shrink-0">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-350">
              Taxonomy Filter
            </span>
            <button
              onClick={() => setIsAddingSubcategory(true)}
              className="px-2 py-1 rounded bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-all text-[10px] font-bold flex items-center gap-0.5 cursor-pointer border-none"
              title="Add Subcategory"
            >
              <Plus className="w-3 h-3" />
              <span>Sub</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto mt-4 pr-1.5 space-y-2.5">
            <button
              onClick={() => {
                setSelectedSubcategory(null);
                setSelectedGroup(null);
              }}
              className={clsx(
                "w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none",
                !selectedSubcategory && !selectedGroup
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              )}
            >
              <span>Show All Items</span>
            </button>

            {taxonomies.map((sub, sIdx) => {
              const isSubSelected = selectedSubcategory === sub.subcategory && !selectedGroup;
              const isExpanded = expandedSubs[sub.subcategory] !== false;
              const subItems = items.filter(i => i.subcategory === sub.subcategory && i.category === activeCategory);
              const badge = subItems.length > 0 ? subItems[0].badge : badgeMapping(activeCategory, sub.subcategory);
              
              return (
                <div key={sIdx} className="space-y-1">
                  <div className="flex items-center justify-between w-full group/sub relative">
                    <button
                      onClick={() => {
                        setSelectedSubcategory(sub.subcategory);
                        setSelectedGroup(null);
                      }}
                      className={clsx(
                        "flex-1 text-left px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-w-0 pr-12 border-none whitespace-normal break-words",
                        isSubSelected
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : selectedSubcategory === sub.subcategory
                          ? "text-neutral-800 dark:text-neutral-200 bg-neutral-100/50 dark:bg-neutral-800/30"
                          : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                      )}
                    >
                      <span className={clsx(
                        "px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider leading-none shrink-0",
                        getBadgeColor(badge)
                      )}>
                        {badge}
                      </span>
                      <span>{sub.subcategory}</span>
                    </button>

                    <div className={clsx(
                      "absolute right-6 flex items-center transition-opacity duration-150",
                      activeMenuSub === sub.subcategory ? "opacity-100" : "opacity-0 group-hover/sub:opacity-100"
                    )}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuSub(activeMenuSub === sub.subcategory ? null : sub.subcategory);
                        }}
                        className="p-1 rounded hover:bg-neutral-250 dark:hover:bg-neutral-800 text-neutral-450 hover:text-neutral-600 cursor-pointer border-none bg-transparent"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                      
                      {activeMenuSub === sub.subcategory && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setActiveMenuSub(null)} 
                          />
                          <div className="absolute bottom-6 right-0 bg-white dark:bg-neutral-850 border border-neutral-250 dark:border-neutral-800 rounded-lg shadow-lg p-1 z-30 flex flex-col min-w-32 text-[10px] font-bold animate-in slide-in-from-bottom-1 duration-150">
                            <button
                              onClick={() => {
                                setEditingTaxonomyType("subcategory");
                                setEditingTaxonomyOldValue(sub.subcategory);
                                setEditingTaxonomyNewValue(sub.subcategory);
                                setActiveMenuSub(null);
                              }}
                              className="px-2 py-1 text-left rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-none bg-transparent cursor-pointer"
                            >
                              Rename Subcategory
                            </button>
                            <button
                              onClick={() => {
                                setAddingGroupToSub(sub.subcategory);
                                setActiveMenuSub(null);
                              }}
                              className="px-2 py-1 text-left rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-none bg-transparent cursor-pointer"
                            >
                              Add Group
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <button
                      onClick={() => toggleSubExpanded(sub.subcategory)}
                      className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors border-none bg-transparent cursor-pointer"
                    >
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {isExpanded && sub.groups.map((grp, gIdx) => {
                    const isGroupSelected = selectedGroup === grp && selectedSubcategory === sub.subcategory;
                    return (
                      <div key={gIdx} className="flex items-center justify-between w-full group/grp relative pl-8">
                        <button
                          onClick={() => {
                            setSelectedSubcategory(sub.subcategory);
                            setSelectedGroup(grp);
                          }}
                          className={clsx(
                            "flex-1 text-left pr-10 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-2 transition-all cursor-pointer min-w-0 border-none whitespace-normal break-words",
                            isGroupSelected
                              ? "text-blue-600 dark:text-blue-400 bg-blue-500/5 font-extrabold"
                              : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/30"
                          )}
                        >
                          <span>{grp}</span>
                        </button>

                        <div className={clsx(
                          "absolute right-2 flex items-center transition-opacity duration-150",
                          activeMenuGroup === `${sub.subcategory}::${grp}` ? "opacity-100" : "opacity-0 group-hover/grp:opacity-100"
                        )}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuGroup(activeMenuGroup === `${sub.subcategory}::${grp}` ? null : `${sub.subcategory}::${grp}`);
                            }}
                            className="p-0.5 rounded hover:bg-neutral-250 dark:hover:bg-neutral-800 text-neutral-450 hover:text-neutral-600 cursor-pointer border-none bg-transparent"
                          >
                            <MoreHorizontal className="w-3 h-3" />
                          </button>
                          
                          {activeMenuGroup === `${sub.subcategory}::${grp}` && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setActiveMenuGroup(null)} 
                              />
                              <div className="absolute bottom-6 right-0 bg-white dark:bg-neutral-850 border border-neutral-250 dark:border-neutral-800 rounded-lg shadow-lg p-1 z-30 flex flex-col min-w-24 text-[10px] font-bold animate-in slide-in-from-bottom-1 duration-150">
                                <button
                                  onClick={() => {
                                    setEditingTaxonomyType("group");
                                    setEditingTaxonomySubName(sub.subcategory);
                                    setEditingTaxonomyOldValue(grp);
                                    setEditingTaxonomyNewValue(grp);
                                    setActiveMenuGroup(null);
                                  }}
                                  className="px-2 py-1 text-left rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-none bg-transparent cursor-pointer"
                                >
                                  Rename Group
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-3 flex flex-col h-full overflow-hidden space-y-5">
          <div className="flex-1 overflow-hidden flex flex-col bg-white/70 dark:bg-neutral-900/40 backdrop-blur-md rounded-[24px] border border-neutral-200/80 dark:border-neutral-800/80 p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-850 shrink-0">
              <div className="flex items-center gap-2">
                <Database className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-neutral-800 dark:text-white capitalize">
                  Setup Item Catalog ({filteredItems.length} items)
                </h3>
              </div>
              
              <div className="flex items-center gap-2 max-w-sm w-full sm:w-auto shrink-0 justify-end">
                <div className="relative flex items-center bg-white dark:bg-neutral-850 border border-neutral-250 dark:border-neutral-700 rounded-full px-3 py-1.5 shadow-2xs w-full sm:w-48">
                  <Search className="w-3.5 h-3.5 text-neutral-450 shrink-0 mr-1.5" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-[11px] font-bold text-neutral-700 dark:text-neutral-300 w-full"
                  />
                </div>
                <button
                  onClick={handleSmartMerge}
                  className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black shadow-2xs hover:shadow active:scale-95 transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  title="Merge duplicate items (same name & SKU)"
                >
                  <span>Smart Merge</span>
                </button>
                <button
                  onClick={() => {
                    setNewSubcategory(selectedSubcategory || "");
                    setNewGroup(selectedGroup || "");
                    setIsDrawerOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black shadow-2xs hover:shadow active:scale-95 transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1.5">
              <table className="w-full text-left text-xs border-collapse table-fixed">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 dark:text-neutral-500 font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="pb-3 pr-3 w-[125px]">Code & Group</th>
                    <th className="pb-3 px-3">Item Name</th>
                    <th className="pb-3 px-3 w-[65px] text-center">Unit</th>
                    <th className="pb-3 px-3 w-[125px] text-right">Default Rate (Rp)</th>
                    <th className="pb-3 pl-3 w-[95px] text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-medium">
                  {groupedItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-neutral-400 font-bold">
                        No items found matching the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    groupedItems.map((group) => {
                      const isExpanded = expandedVariants[group.key] !== false;
                      
                      if (group.items.length === 1) {
                        const item = group.items[0];
                        const isEditing = editingId === item.id;
                        return (
                          <tr key={item.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                            <td className="py-3.5 pr-3 align-middle">
                              <div className="flex flex-col gap-1">
                                 {isEditing ? (
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] font-bold text-neutral-400 w-8 shrink-0">Sub:</span>
                                      <select
                                        value={editSubcategory}
                                        onChange={(e) => {
                                          setEditSubcategory(e.target.value);
                                          const subTax = taxonomies.find(t => t.subcategory === e.target.value);
                                          if (subTax && subTax.groups.length > 0) {
                                            setEditGroup(subTax.groups[0]);
                                          } else {
                                            setEditGroup("General");
                                          }
                                        }}
                                        className="px-2 py-0.5 text-xs font-semibold rounded border border-neutral-250 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-500 w-28 cursor-pointer"
                                      >
                                        {taxonomies.map(t => (
                                          <option key={t.subcategory} value={t.subcategory}>{t.subcategory}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] font-bold text-neutral-400 w-8 shrink-0">Grp:</span>
                                      {(() => {
                                        const selectedSubTax = taxonomies.find(t => t.subcategory === editSubcategory);
                                        const availableGroups = selectedSubTax ? selectedSubTax.groups : ["General"];
                                        return (
                                          <select
                                            value={editGroup}
                                            onChange={(e) => setEditGroup(e.target.value)}
                                            className="px-2 py-0.5 text-xs font-semibold rounded border border-neutral-250 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-500 w-28 cursor-pointer"
                                          >
                                            {availableGroups.map(g => (
                                              <option key={g} value={g}>{g}</option>
                                            ))}
                                          </select>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={clsx(
                                      "px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider leading-none shrink-0",
                                      getBadgeColor(item.badge)
                                    )}>
                                      {item.badge}
                                    </span>
                                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                                      {item.group_name}
                                    </span>
                                  </div>
                                )}
                                {isEditing ? (
                                  <div className="mt-1 flex flex-col gap-0.5">
                                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-[10.5px]">
                                      Preview: {previewEditSku}
                                    </span>
                                    {isEditSkuConflicting && (
                                      <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 leading-tight">
                                        ⚠️ Duplicate SKU. Saving will merge.
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="font-mono font-bold text-neutral-400 dark:text-neutral-500 text-[10.5px]">
                                    {item.sku}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-3 align-middle font-bold text-neutral-900 dark:text-white">
                              {isEditing ? (
                                <textarea
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  rows={2}
                                  className="w-full px-2.5 py-1.5 text-xs font-semibold rounded border border-neutral-350 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-500 resize-y"
                                  placeholder="Item name"
                                />
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <div className="w-3.5 h-3.5 shrink-0" />
                                  <span>{item.name}</span>
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-3 align-middle text-center font-bold text-neutral-600 dark:text-neutral-400">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editUnit}
                                  onChange={(e) => setEditUnit(e.target.value)}
                                  className="w-16 px-2 py-1 text-xs font-semibold rounded border border-neutral-350 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-500 text-center"
                                  placeholder="Unit"
                                />
                              ) : (
                                <span>{item.unit}</span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 align-middle text-right font-bold text-neutral-800 dark:text-neutral-200 tabular-nums">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editPrice}
                                  onChange={(e) => setEditPrice(e.target.value === "" ? "" : Number(e.target.value))}
                                  className="w-28 px-2 py-1 text-xs font-semibold rounded border border-neutral-350 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-500 text-right"
                                  placeholder="Price"
                                />
                              ) : (
                                item.price_default !== undefined && item.price_default > 0 ? (
                                  `Rp ${item.price_default.toLocaleString("id-ID")}`
                                ) : (
                                  <span className="text-neutral-450 italic font-normal text-[11px]">Rp 0</span>
                                )
                              )}
                            </td>
                            <td className="py-3.5 pl-3 align-middle text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {isEditing ? (
                                  <>
                                    <button
                                      onClick={() => handleSaveEdit(item.id)}
                                      className="p-1 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all cursor-pointer"
                                      title="Save"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setEditingId(null)}
                                      className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                                      title="Cancel"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        setNewSubcategory(item.subcategory);
                                        setNewGroup(item.group_name);
                                        setNewName(`${item.name.split(' - ')[0].trim()} - `);
                                        setNewUnit(item.unit || "pcs");
                                        setNewPrice(item.price_default || "");
                                        setIsDrawerOpen(true);
                                      }}
                                      className="p-1 rounded-lg text-blue-650 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/45 transition-all cursor-pointer"
                                      title="Add Variant"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => startEditing(item)}
                                      className="p-1 rounded-lg text-neutral-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all cursor-pointer"
                                      title="Edit inline"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="p-1 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all cursor-pointer"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      // Group has multiple items (variants)
                      return (
                        <React.Fragment key={group.key}>
                          {/* Parent Row */}
                          <tr className="bg-neutral-50/20 dark:bg-neutral-900/10 border-b border-neutral-100/50 dark:border-neutral-800/40">
                            <td className="py-3.5 pr-3 align-middle">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={clsx(
                                    "px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider leading-none shrink-0",
                                    getBadgeColor(group.badge)
                                  )}>
                                    {group.badge}
                                  </span>
                                  <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                                    {group.group_name}
                                  </span>
                                </div>
                                <span className="font-mono font-bold text-neutral-400 dark:text-neutral-500 text-[10.5px]">
                                  {group.items[0]?.sku.split('-')[0]}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-3 align-middle">
                              <button
                                onClick={() => toggleVariantExpanded(group.key)}
                                className="flex items-center gap-1.5 text-left border-none bg-transparent cursor-pointer group"
                              >
                                <ChevronDown className={clsx(
                                  "w-3.5 h-3.5 text-neutral-450 transition-transform duration-200 shrink-0",
                                  isExpanded ? "transform rotate-0" : "transform -rotate-90"
                                )} />
                                <span className="font-extrabold text-xs text-neutral-800 dark:text-white group-hover:text-blue-500 transition-colors">
                                  {group.baseName}
                                </span>
                                <span className="text-[10px] text-neutral-400 font-bold bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-full shrink-0">
                                  {group.items.length} variants
                                </span>
                              </button>
                            </td>
                            <td className="py-3.5 px-3 align-middle text-center text-neutral-450 font-bold">—</td>
                            <td className="py-3.5 px-3 align-middle text-right text-neutral-450 font-bold">—</td>
                            <td className="py-3.5 pl-3 align-middle text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setNewSubcategory(group.subcategory);
                                    setNewGroup(group.group_name);
                                    setNewName(`${group.baseName} - `);
                                    setNewUnit(group.items[0]?.unit || "pcs");
                                    setNewPrice(group.items[0]?.price_default || "");
                                    setIsDrawerOpen(true);
                                  }}
                                  className="p-1 rounded-lg text-blue-650 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/45 transition-all cursor-pointer border-none bg-transparent"
                                  title="Add Variant"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    const ids = group.items.map(item => item.id);
                                    handleDeleteItem(ids);
                                  }}
                                  className="p-1 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all cursor-pointer border-none bg-transparent"
                                  title="Delete Group"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => toggleVariantExpanded(group.key)}
                                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer border-none bg-transparent"
                                  title={isExpanded ? "Collapse" : "Expand"}
                                >
                                  <ChevronDown className={clsx("w-3.5 h-3.5 transition-transform duration-200", isExpanded ? "" : "transform -rotate-90")} />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Children Variant Rows */}
                          {isExpanded && group.items.map((item, idx) => {
                            const isEditing = editingId === item.id;
                            const variationName = item.name.includes(" - ") 
                              ? item.name.split(" - ").slice(1).join(" - ")
                              : item.name;

                            return (
                              <tr key={item.id} className="bg-white dark:bg-neutral-900/50 hover:bg-neutral-50/50 dark:hover:bg-neutral-850/30 transition-colors border-b border-neutral-100/50 dark:border-neutral-800/40">
                                <td className="py-3.5 pl-6 pr-3 align-middle font-mono font-bold text-[10.5px] text-neutral-400 dark:text-neutral-500">
                                  {isEditing ? (
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-blue-600 dark:text-blue-400 text-[10px]">
                                        Preview: {previewEditSku}
                                      </span>
                                      {isEditSkuConflicting && (
                                        <span className="text-[9px] text-amber-600 font-bold">
                                          ⚠️ Duplicate SKU
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span>{item.sku}</span>
                                  )}
                                </td>
                                <td className="py-3.5 pl-8 pr-3 align-middle font-bold text-neutral-800 dark:text-neutral-200">
                                  {isEditing ? (
                                    <textarea
                                      value={editName}
                                      onChange={(e) => setEditName(e.target.value)}
                                      rows={1}
                                      className="w-full px-2.5 py-1 text-xs font-semibold rounded border border-neutral-350 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-500 resize-none"
                                      placeholder="Variant name"
                                    />
                                  ) : (
                                    <span className="text-neutral-600 dark:text-neutral-450 font-semibold">{variationName}</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-3 align-middle text-center font-bold text-neutral-600 dark:text-neutral-400">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editUnit}
                                      onChange={(e) => setEditUnit(e.target.value)}
                                      className="w-16 px-2 py-0.5 text-xs font-semibold rounded border border-neutral-350 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-500 text-center"
                                      placeholder="Unit"
                                    />
                                  ) : (
                                    <span>{item.unit}</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-3 align-middle text-right font-bold text-neutral-800 dark:text-neutral-200 tabular-nums">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      value={editPrice}
                                      onChange={(e) => setEditPrice(e.target.value === "" ? "" : Number(e.target.value))}
                                      className="w-24 px-2 py-0.5 text-xs font-semibold rounded border border-neutral-350 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-500 text-right"
                                      placeholder="Price"
                                    />
                                  ) : (
                                    item.price_default !== undefined && item.price_default > 0 ? (
                                      `Rp ${item.price_default.toLocaleString("id-ID")}`
                                    ) : (
                                      <span className="text-neutral-455 italic font-normal text-[11px]">Rp 0</span>
                                    )
                                  )}
                                </td>
                                <td className="py-3.5 pl-3 align-middle text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {isEditing ? (
                                      <>
                                        <button
                                          onClick={() => handleSaveEdit(item.id)}
                                          className="p-1 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-all cursor-pointer"
                                          title="Save"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => setEditingId(null)}
                                          className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 transition-all cursor-pointer"
                                          title="Cancel"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => startEditing(item)}
                                          className="p-1 rounded-lg text-neutral-400 hover:text-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
                                          title="Edit variant"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteItem(item.id)}
                                          className="p-1 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                                          title="Delete variant"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* 3. SLIDE OVER DRAWER FOR ADD ITEM */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          {/* Backdrop overlay */}
          <div 
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-xs transition-opacity" 
          />

          {/* Drawer container */}
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 h-full shadow-2xl flex flex-col justify-between p-6 z-10 animate-in slide-in-from-right duration-350 ease-out border-l border-neutral-200/80 dark:border-neutral-800">
            
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-neutral-800 dark:text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-500" />
                    <span>Add {activeCategory} Item</span>
                  </h3>
                  <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">Define new resource specs in the catalog.</p>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Drawer Form Fields */}
              <form onSubmit={(e) => { handleAddItem(e); setIsDrawerOpen(false); }} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Item Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Bata Ringan - 7.5 cm"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-neutral-250 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Subcategory</label>
                  <input
                    type="text"
                    placeholder="e.g. Arsitektur"
                    value={newSubcategory}
                    onChange={(e) => setNewSubcategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-neutral-250 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Group / Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Dinding"
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-neutral-250 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. m³, sak, btg"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-neutral-250 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Default Price Rate (Rp)</label>
                  <input
                    type="number"
                    placeholder="e.g. 750000"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-neutral-250 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-500"
                  />
                </div>

                {previewSku && (
                  <div className={clsx(
                    "p-3 rounded-lg border text-xs font-semibold space-y-1.5 transition-all",
                    isSkuConflicting 
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
                      : "bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-300"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-neutral-450 tracking-wider">Preview SKU Code:</span>
                      <span className="font-mono font-bold tracking-wider">{previewSku}</span>
                    </div>
                    {isSkuConflicting && (
                      <p className="text-[10px] leading-relaxed font-bold text-amber-600 dark:text-amber-400">
                        ⚠️ Warning: SKU code already exists. Submitting will merge this item with the existing duplicate.
                      </p>
                    )}
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-xs active:scale-98 transition-all cursor-pointer text-center"
                  >
                    Save to DB Catalog
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-neutral-250 dark:border-neutral-700 text-xs font-bold text-neutral-600 dark:text-neutral-450 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>

            <div className="text-[9px] font-bold text-neutral-400 text-center uppercase tracking-widest pt-4 border-t border-neutral-100 dark:border-neutral-850">
              Adidaya Setup taxonomy
            </div>
          </div>
        </div>
      )}
      {/* Taxonomy Bulk Rename Dialog */}
      {editingTaxonomyType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-[20px] p-6 w-full max-w-sm shadow-xl space-y-4">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-neutral-850 dark:text-white">
                Rename {editingTaxonomyType}
              </h4>
              <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">
                Bulk updates all items belonging to this category.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-450 uppercase tracking-wide">
                Current Name: <span className="text-neutral-700 dark:text-neutral-300 font-extrabold">{editingTaxonomyOldValue}</span>
              </label>
              <input
                type="text"
                value={editingTaxonomyNewValue}
                onChange={(e) => setEditingTaxonomyNewValue(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-neutral-250 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-500"
                placeholder="Enter new name"
              />
            </div>
            <div className="flex gap-2 justify-end text-[11px] font-bold">
              <button
                onClick={() => setEditingTaxonomyType(null)}
                className="px-3.5 py-1.5 rounded-lg border border-neutral-250 dark:border-neutral-700 text-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkRenameTaxonomy}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Quick Add Subcategory Dialog */}
      {isAddingSubcategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-[20px] p-6 w-full max-w-sm shadow-xl space-y-4">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-neutral-850 dark:text-white">
                Add New Subcategory
              </h4>
              <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">
                Creates a subcategory branch in the taxonomy.
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-wider">Subcategory Code / Badge</label>
                <input
                  type="text"
                  value={newSubcatBadge}
                  onChange={(e) => setNewSubcatBadge(e.target.value.toUpperCase().trim())}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-neutral-250 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-500"
                  placeholder="3-letter code (e.g. ARS)"
                  maxLength={3}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-wider">Subcategory Name</label>
                <input
                  type="text"
                  value={newSubcatName}
                  onChange={(e) => setNewSubcatName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-neutral-250 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-500"
                  placeholder="e.g. Arsitektur"
                />
              </div>

              {/* Duplicate code warning */}
              {existingSubForBadge && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[10px] font-semibold leading-relaxed">
                  ⚠️ Warning: Badge code "{newSubcatBadge}" is already used by "{existingSubForBadge.subcategory}". Saving will trigger a merge choice.
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end text-[11px] font-bold pt-2 border-t border-neutral-100 dark:border-neutral-850">
              <button
                onClick={() => setIsAddingSubcategory(false)}
                className="px-3.5 py-1.5 rounded-lg border border-neutral-250 dark:border-neutral-700 text-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSubcategoryQuick}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                Add Subcategory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Group Dialog */}
      {addingGroupToSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-[20px] p-6 w-full max-w-sm shadow-xl space-y-4">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-neutral-850 dark:text-white">
                Add Group to {addingGroupToSub}
              </h4>
              <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">
                Creates a group branch inside {addingGroupToSub}.
              </p>
            </div>
            <div className="space-y-1">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-neutral-250 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-500"
                placeholder="Group/Brand Name (e.g. Dinding)"
              />
            </div>
            <div className="flex gap-2 justify-end text-[11px] font-bold">
              <button
                onClick={() => setAddingGroupToSub(null)}
                className="px-3.5 py-1.5 rounded-lg border border-neutral-250 dark:border-neutral-700 text-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddGroupQuick(addingGroupToSub)}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                Add Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
