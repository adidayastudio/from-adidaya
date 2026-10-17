"use client";

import React, { useState } from "react";
import { ArrowUpDown, Loader2, GripVertical, ChevronRight, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface Column<T> {
    key: string;
    header: string;
    width?: string;
    sortable?: boolean;
    render?: (
        item: T,
        isEditing?: boolean,
        draft?: Partial<T>,
        setDraft?: (val: Partial<T>) => void,
        onEditStart?: (item: T) => void,
        onSave?: () => Promise<void>,
        onCancel?: () => void
    ) => React.ReactNode;
}

interface SortableTableProps<T> {
    data: T[];
    columns: Column<T>[];
    onRowClick?: (item: T) => void;
    isLoading?: boolean;
    emptyMessage?: string;
    onSave?: (item: T) => Promise<void>;
    renderExpandedRow?: (
        item: T,
        isEditing?: boolean,
        draft?: Partial<T>,
        setDraft?: (val: Partial<T>) => void
    ) => React.ReactNode;
    expandedRowId?: string | null;
    onExpandRow?: (id: string | null) => void;
    onReorder?: (items: T[]) => void;
}

function SortableRow<T>({ item, columns, isEditing, isExpanded, draft, onRowClick, onEditStart, handleFieldChange, handleSave, handleCancel, setDraft, renderExpandedRow, handleExpand }: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
        position: isDragging ? 'relative' as const : 'static' as const,
    };

    return (
        <React.Fragment>
            <tr
                ref={setNodeRef}
                style={style}
                onClick={(e) => {
                    if (isEditing) return;
                    if (onRowClick) {
                        onRowClick(item);
                    } else if (renderExpandedRow) {
                        // We need to pass toggleExpand from parent or handle it here. 
                        // Since we don't have toggleExpand passed directly, we rely on parent rendering but SortableRow controls its own click?
                        // Actually, renderRow passes isExpanded. But clicking needs to trigger onExpandRow.
                        // We should pass toggleExpand or similar to SortableRow.
                        // Let's assume onExpandRow is passed or utilize a wrapper.
                        // EDIT: I will simply add onExpand prop to SortableRow in the next chunk and use it here.
                        if (handleExpand) handleExpand(e, item.id);
                    }
                }}
                onDoubleClick={() => !isEditing && onEditStart(item)}
                className={clsx(
                    "group transition-colors bg-white",
                    (onRowClick || renderExpandedRow) && !isEditing ? "cursor-pointer hover:bg-neutral-50" : "",
                    isEditing ? "bg-amber-50" : "",
                    isExpanded ? "bg-neutral-50" : "",
                    isDragging ? "shadow-lg opacity-80" : ""
                )}
            >
                <td className="w-10 px-0 py-0 pl-4 align-middle">
                    {!isEditing && (
                        <button {...attributes} {...listeners} className="p-2 cursor-grab text-neutral-300 hover:text-neutral-600 focus:outline-none">
                            <GripVertical className="w-4 h-4" />
                        </button>
                    )}
                </td>
                {renderExpandedRow && (
                    <td className="w-10 px-0 py-0 pl-4 align-middle">
                        <div className="p-2 text-neutral-400">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                    </td>
                )}
                {columns.map((col: Column<T>) => (
                    <td key={col.key} className="px-6 py-4 text-neutral-700 align-middle">
                        {col.render
                            ? col.render(
                                item,
                                isEditing,
                                draft,
                                (v) => setDraft((prev: any) => ({ ...prev, ...v })),
                                onEditStart,
                                handleSave,
                                handleCancel
                            )
                            : isEditing && col.key !== 'id' && !col.render
                                ? <input
                                    className="w-full px-2 py-1 bg-white border border-neutral-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                                    value={(draft as any)[col.key] || ""}
                                    onChange={(e) => handleFieldChange(col.key, e.target.value)}
                                />
                                : (item as any)[col.key]
                        }
                    </td>
                ))}
            </tr>
            {isExpanded && renderExpandedRow && (
                <tr className="bg-neutral-50/50">
                    <td colSpan={columns.length + 1 + (renderExpandedRow ? 1 : 0)} className="px-6 py-4 border-t border-neutral-100 shadow-inner">
                        {renderExpandedRow(
                            item,
                            isEditing,
                            draft,
                            (v: Partial<T>) => setDraft((prev: any) => ({ ...prev, ...v }))
                        )}
                    </td>
                </tr>
            )}
        </React.Fragment>
    );
}

export function SortableTable<T extends { id: string }>({
    data,
    columns,
    onRowClick,
    isLoading = false,
    emptyMessage = "No data found",
    onSave,
    renderExpandedRow,
    expandedRowId: controlledExpandedId,
    onExpandRow,
    onReorder
}: SortableTableProps<T>) {
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [internalExpandedId, setInternalExpandedId] = useState<string | null>(null);
    const [draft, setDraft] = useState<Partial<T>>({});
    const [isSaving, setIsSaving] = useState(false);

    const expandedId = controlledExpandedId !== undefined ? controlledExpandedId : internalExpandedId;

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleSort = (key: string) => {
        if (onReorder) return; // Disable sorting if draggable
        let direction: "asc" | "desc" = "asc";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const sortedData = [...data].sort((a: any, b: any) => {
        if (onReorder) return 0; // Disable sorting if draggable (rely on index)
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;
        const aVal = a[key] ?? "";
        const bVal = b[key] ?? "";
        if (aVal < bVal) return direction === "asc" ? -1 : 1;
        if (aVal > bVal) return direction === "asc" ? 1 : -1;
        return 0;
    });

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = data.findIndex((item) => item.id === active.id);
        const newIndex = data.findIndex((item) => item.id === over.id);

        if (onReorder) {
            onReorder(arrayMove(data, oldIndex, newIndex));
        }
    };

    const handleEditStart = (item: T) => {
        if (!onSave) return;
        setEditingId(item.id);
        setDraft({ ...item });
    };

    const handleCancel = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setEditingId(null);
        setDraft({});
    };

    const handleSave = async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!onSave || !draft) return;
        setIsSaving(true);
        try {
            await onSave(draft as T);
            setEditingId(null);
            setDraft({});
        } finally {
            setIsSaving(false);
        }
    };

    const handleFieldChange = (key: string, value: any) => {
        setDraft(prev => ({ ...prev, [key]: value }));
    };

    const toggleExpand = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const newId = expandedId === id ? null : id;
        if (onExpandRow) {
            onExpandRow(newId);
        } else {
            setInternalExpandedId(newId);
        }
    };

    const renderRow = (item: T) => {
        const isEditing = item.id === editingId;
        const isExpanded = item.id === expandedId;

        if (onReorder) {
            return (
                <SortableRow
                    key={item.id}
                    item={item}
                    columns={columns}
                    isEditing={isEditing}
                    isExpanded={isExpanded}
                    draft={draft}
                    onRowClick={onRowClick}
                    onEditStart={handleEditStart}
                    handleFieldChange={handleFieldChange}
                    handleSave={handleSave}
                    handleCancel={handleCancel}
                    setDraft={setDraft}
                    renderExpandedRow={renderExpandedRow}
                    handleExpand={toggleExpand}
                />
            );
        }

        return (
            <React.Fragment key={item.id}>
                <tr
                    onClick={() => {
                        if (isEditing) return;
                        if (onRowClick) {
                            onRowClick(item);
                        } else if (renderExpandedRow) {
                            toggleExpand({ stopPropagation: () => { } } as React.MouseEvent, item.id);
                        }
                    }}
                    onDoubleClick={() => !isEditing && handleEditStart(item)}
                    className={clsx(
                        "group transition-colors",
                        (onRowClick || renderExpandedRow) && !isEditing ? "cursor-pointer hover:bg-neutral-50" : "",
                        isEditing ? "bg-amber-50" : "",
                        isExpanded ? "bg-neutral-50" : ""
                    )}
                >{onReorder && <td className="w-10"></td>}
                    {renderExpandedRow && (
                        <td className="w-10 px-0 py-0 pl-4 align-middle">
                            <div className="p-2 text-neutral-400">
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </div>
                        </td>
                    )}
                    {columns.map((col) => (
                        <td key={col.key} className="px-6 py-4 text-neutral-700 align-middle">
                            {col.render
                                ? col.render(
                                    item,
                                    isEditing,
                                    draft,
                                    (v) => setDraft(prev => ({ ...prev, ...v })),
                                    handleEditStart,
                                    () => handleSave(),
                                    () => handleCancel()
                                )
                                : isEditing && col.key !== 'id' && !col.render
                                    ? <input
                                        className="w-full px-2 py-1 bg-white border border-neutral-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                                        value={(draft as any)[col.key] || ""}
                                        onChange={(e) => handleFieldChange(col.key, e.target.value)}
                                    />
                                    : (item as any)[col.key]
                            }
                        </td>
                    ))}
                </tr>
                {isExpanded && renderExpandedRow && (
                    <tr className="bg-neutral-50/50">
                        <td colSpan={columns.length + (onReorder ? 1 : 0) + 1} className="px-6 py-4 border-t border-neutral-100 shadow-inner">
                            {renderExpandedRow(
                                item,
                                isEditing,
                                draft,
                                (v) => setDraft(prev => ({ ...prev, ...v }))
                            )}
                        </td>
                    </tr>
                )}
            </React.Fragment>
        );
    };

    return (
        <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <table className="w-full text-left text-sm">
                        <thead className="bg-neutral-50 border-b border-neutral-200">
                            <tr>
                                {onReorder && <th className="w-10 px-0 pl-4 py-4"></th>}
                                {renderExpandedRow && <th className="w-10 px-0 pl-4 py-4"></th>}
                                {columns.map((col) => (
                                    <th
                                        key={col.key}
                                        className={clsx(
                                            "px-6 py-4 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap select-none",
                                            (col.sortable && !onReorder) ? "cursor-pointer hover:bg-neutral-100 transition-colors" : ""
                                        )}
                                        style={{ width: col.width }}
                                        onClick={() => (col.sortable && !onReorder) && handleSort(col.key)}
                                    >
                                        <div className="flex items-center gap-1">
                                            {col.header}
                                            {col.sortable && !onReorder && sortConfig?.key === col.key && (
                                                sortConfig.direction === "asc"
                                                    ? <ArrowUpDown className="w-3 h-3 text-neutral-900" />
                                                    : <ArrowUpDown className="w-3 h-3 text-neutral-900 rotate-180" />
                                            )}
                                            {col.sortable && !onReorder && sortConfig?.key !== col.key && (
                                                <ArrowUpDown className="w-3 h-3 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={columns.length + (onReorder ? 1 : 0) + (renderExpandedRow ? 1 : 0)} className="px-6 py-12 text-center text-neutral-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
                                            <p>Loading data...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : sortedData.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length + (onReorder ? 1 : 0) + (renderExpandedRow ? 1 : 0)} className="px-6 py-12 text-center text-neutral-500">
                                        <p className="text-neutral-400 mb-2">No data available</p>
                                        <p className="text-xs">{emptyMessage}</p>
                                    </td>
                                </tr>
                            ) : (
                                onReorder ? (
                                    <SortableContext
                                        items={sortedData.map(item => item.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {sortedData.map(renderRow)}
                                    </SortableContext>
                                ) : (
                                    sortedData.map(renderRow)
                                )
                            )}
                        </tbody>
                    </table>
                </DndContext>
            </div>
        </div>
    );
}
