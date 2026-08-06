"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, Plus, Trash2, GripVertical, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, CornerDownRight, Copy, Search, Maximize2, Minimize2 } from "lucide-react";
import { WBSItem, WBSView, WBSMode } from "./data/wbs.types";
import clsx from "clsx";

type Props = {
  items: WBSItem[];
  view: WBSView;
  mode: WBSMode;
  onUpdateItem: (id: string, patch: Partial<{ nameEn: string; nameId?: string; code?: string; notes?: string }>) => void;
  onAddChild: (parentId: string, level: number) => void;
  onAddSibling?: (siblingId: string, position: "above" | "below") => void;
  onRemove: (id: string) => void;
  onReorder?: (parentId: string | null, fromIndex: number, toIndex: number) => void;
  onIndent?: (id: string) => void;
  onOutdent?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onMoveDirection?: (id: string, direction: "up" | "down") => void;
};

// Default SAM codes that cannot be reordered
const DEFAULT_CODES = ["S", "A", "M"];

function filterTree(items: WBSItem[], query: string): WBSItem[] {
  if (!query.trim()) return items;
  const q = query.toLowerCase().trim();

  return items.reduce<WBSItem[]>((acc, item) => {
    const codeMatch = item.code.toLowerCase().includes(q);
    const nameEnMatch = item.nameEn.toLowerCase().includes(q);
    const nameIdMatch = item.nameId?.toLowerCase().includes(q) ?? false;
    const notesMatch = item.notes?.toLowerCase().includes(q) ?? false;
    const matchesSelf = codeMatch || nameEnMatch || nameIdMatch || notesMatch;

    const filteredChildren = item.children ? filterTree(item.children, q) : [];

    if (matchesSelf || filteredChildren.length > 0) {
      acc.push({
        ...item,
        children: filteredChildren.length > 0 ? filteredChildren : item.children
      });
    }
    return acc;
  }, []);
}

export default function WBSList({
  items: initialItems,
  view,
  mode,
  onUpdateItem,
  onAddChild,
  onAddSibling,
  onRemove,
  onReorder,
  onIndent,
  onOutdent,
  onDuplicate,
  onMoveDirection
}: Props) {
  const [items, setItems] = useState<WBSItem[]>(initialItems);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandAllState, setExpandAllState] = useState<boolean | null>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const filteredItems = filterTree(items, searchQuery);

  // Root level drag state
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => setDraggedIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const handleDragLeave = () => setDragOverIdx(null);
  const handleDrop = (toIdx: number) => {
    if (draggedIdx !== null && draggedIdx !== toIdx && onReorder) {
      onReorder(null, draggedIdx, toIdx);
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  };
  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const canAddChild = (level: number) => {
    if (mode === "BALLPARK") return level < 1;
    return true;
  };

  const canReorder = (item: WBSItem) => {
    return !DEFAULT_CODES.includes(item.code);
  };

  return (
    <div className="w-full space-y-3">
      {/* Controls Bar: Search & Expand/Collapse All */}
      <div className="flex items-center justify-between gap-3 bg-neutral-50 p-2.5 rounded-lg border border-neutral-200/80">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search WBS code or title..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-brand-red focus:border-brand-red transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setExpandAllState(true)}
            className="px-2.5 py-1.5 rounded border border-neutral-200 bg-white hover:bg-neutral-50 text-[11px] font-medium text-neutral-600 flex items-center gap-1 transition-colors"
            title="Expand All Nodes"
          >
            <Maximize2 className="w-3 h-3 text-neutral-500" /> Expand All
          </button>
          <button
            onClick={() => setExpandAllState(false)}
            className="px-2.5 py-1.5 rounded border border-neutral-200 bg-white hover:bg-neutral-50 text-[11px] font-medium text-neutral-600 flex items-center gap-1 transition-colors"
            title="Collapse All Nodes"
          >
            <Minimize2 className="w-3 h-3 text-neutral-500" /> Collapse All
          </button>
        </div>
      </div>

      <div className="w-full border border-neutral-200 rounded-lg overflow-hidden bg-white">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400">
            No WBS items found matching &quot;{searchQuery}&quot;.
          </div>
        ) : (
          filteredItems.map((item, idx) => (
            <WBSNode
              key={item.id ? `${item.id}-root-${idx}` : `${item.code}-root-${idx}`}
              item={item}
              view={view}
              mode={mode}
              level={0}
              index={idx}
              isFirst={idx === 0}
              isLast={idx === filteredItems.length - 1}
              expandAllState={expandAllState}
              onUpdate={onUpdateItem}
              onAddChild={onAddChild}
              onAddSibling={onAddSibling}
              onRemove={onRemove}
              onReorder={onReorder}
              onIndent={onIndent}
              onOutdent={onOutdent}
              onDuplicate={onDuplicate}
              onMoveDirection={onMoveDirection}
              canAddChild={canAddChild}
              canReorder={canReorder(item)}
              isDragging={draggedIdx === idx}
              isDragOver={dragOverIdx === idx && draggedIdx !== idx}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(idx)}
              onDragEnd={handleDragEnd}
            />
          ))
        )}
      </div>
    </div>
  );
}

function WBSNode({
  item,
  view,
  mode,
  level,
  index,
  isFirst,
  isLast,
  expandAllState,
  onUpdate,
  onAddChild,
  onAddSibling,
  onRemove,
  onReorder,
  onIndent,
  onOutdent,
  onDuplicate,
  onMoveDirection,
  canAddChild,
  canReorder,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: {
  item: WBSItem;
  view: WBSView;
  mode: WBSMode;
  level: number;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  expandAllState?: boolean | null;
  onUpdate: (id: string, patch: Partial<{ nameEn: string; nameId?: string; code?: string; notes?: string }>) => void;
  onAddChild: (parentId: string, level: number) => void;
  onAddSibling?: (siblingId: string, position: "above" | "below") => void;
  onRemove: (id: string) => void;
  onReorder?: (parentId: string | null, fromIndex: number, toIndex: number) => void;
  onIndent?: (id: string) => void;
  onOutdent?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onMoveDirection?: (id: string, direction: "up" | "down") => void;
  canAddChild: (level: number) => boolean;
  canReorder: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
}) {
  const hasChildren = item.children && item.children.length > 0;
  const [open, setOpen] = useState(level < 1);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showSpecInput, setShowSpecInput] = useState(!!item.notes);

  useEffect(() => {
    if (expandAllState === true) setOpen(true);
    else if (expandAllState === false) setOpen(level < 1);
  }, [expandAllState, level]);

  // Sync state if notes change externally
  useEffect(() => {
    setShowSpecInput(!!item.notes);
  }, [item.notes]);

  // Child drag state
  const [childDragIdx, setChildDragIdx] = useState<number | null>(null);
  const [childDragOverIdx, setChildDragOverIdx] = useState<number | null>(null);

  const handleChildDragStart = (idx: number) => setChildDragIdx(idx);
  const handleChildDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setChildDragOverIdx(idx);
  };
  const handleChildDragLeave = () => setChildDragOverIdx(null);
  const handleChildDrop = (toIdx: number) => {
    if (childDragIdx !== null && childDragIdx !== toIdx && onReorder) {
      onReorder(item.id, childDragIdx, toIdx);
    }
    setChildDragIdx(null);
    setChildDragOverIdx(null);
  };
  const handleChildDragEnd = () => {
    setChildDragIdx(null);
    setChildDragOverIdx(null);
  };

  const showDragHandle = view === "BREAKDOWN" && canReorder;
  const showActions = view === "BREAKDOWN";
  const itemId = item.id || item.code;
  const isDefaultItem = DEFAULT_CODES.includes(item.code);

  const canChildReorder = (child: WBSItem) => !DEFAULT_CODES.includes(child.code);

  return (
    <div className={clsx(level === 0 && "border-b border-neutral-100 last:border-b-0")}>
      {/* Row */}
      <div
        draggable={showDragHandle}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        className={clsx(
          "flex items-center gap-3 py-2.5 px-3 transition-all group",
          isDragging && "opacity-50 bg-neutral-100",
          isDragOver && "border-t-2 border-brand-red",
          !isDragging && !isDragOver && "hover:bg-neutral-50/80"
        )}
        style={{ paddingLeft: `${12 + level * 24}px` }}
      >
        {/* Drag Handle + Expand Toggle */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Drag Handle for reorderable items */}
          {showDragHandle && (
            <GripVertical className="w-3.5 h-3.5 text-neutral-300 cursor-grab active:cursor-grabbing group-hover:text-neutral-500" />
          )}

          {/* Expand Toggle for items with children */}
          {hasChildren ? (
            <button
              onClick={() => setOpen((v) => !v)}
              className="p-0.5 hover:bg-neutral-200 rounded transition-colors"
            >
              {open ? (
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              )}
            </button>
          ) : level > 0 && !showDragHandle ? (
            <CornerDownRight className="w-3 h-3 text-neutral-300" />
          ) : !showDragHandle ? (
            <div className="w-5" />
          ) : null}
        </div>

        {/* Code Badge - Circle for level 0-1, Pill for level 2+ */}
        <div className={clsx(
          "shrink-0 flex items-center justify-center border text-[10px] font-bold transition-colors",
          level === 0
            ? "w-7 h-7 rounded-full border-neutral-300 bg-neutral-100 text-neutral-600"
            : level === 1
              ? "w-6 h-6 rounded-full border-neutral-200 bg-neutral-50 text-neutral-500"
              : "px-2 h-5 rounded-full border-neutral-100 bg-white text-neutral-400"
        )}>
          {item.code}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <div>
            <InlineEdit
              value={item.nameEn}
              onSave={(v) => onUpdate(itemId, { nameEn: v })}
              className="text-sm font-medium text-neutral-900"
            />
            {item.nameId && (
              <InlineEdit
                value={item.nameId}
                onSave={(v) => onUpdate(itemId, { nameId: v || undefined })}
                className="text-xs text-neutral-400 italic mt-0.5"
              />
            )}
            {/* Notes / Specification */}
            {(showSpecInput || item.notes) && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider shrink-0 select-none">Spec:</span>
                <InlineEdit
                  value={item.notes || ""}
                  onSave={(v) => {
                    onUpdate(itemId, { notes: v || undefined });
                    if (!v) {
                      setShowSpecInput(false);
                    }
                  }}
                  placeholder="Add specification notes..."
                  className="text-xs text-neutral-500 hover:text-neutral-700 bg-neutral-50/50 hover:bg-neutral-50 px-1.5 py-0.5 rounded transition-all italic w-64"
                />
              </div>
            )}
          </div>
          {(item as any).descendantCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-500 border border-neutral-200 shrink-0">
              +{(item as any).descendantCount} sub-tasks
            </span>
          )}
        </div>

        {/* Actions Toolbar */}
        {showActions && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {/* Move Up / Down */}
            {onMoveDirection && !isDefaultItem && (
              <>
                <button
                  disabled={isFirst}
                  onClick={() => onMoveDirection(itemId, "up")}
                  className="p-1.5 rounded-md hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 transition-colors disabled:opacity-20"
                  title="Move Up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={isLast}
                  onClick={() => onMoveDirection(itemId, "down")}
                  className="p-1.5 rounded-md hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 transition-colors disabled:opacity-20"
                  title="Move Down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {/* Outdent (Naik Level / Make Sibling of Parent) */}
            {onOutdent && level > 0 && (
              <button
                onClick={() => onOutdent(itemId)}
                className="p-1.5 rounded-md hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 transition-colors"
                title="Naik Level (Outdent to parent level)"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Indent (Turun Level / Make Sub-item) */}
            {onIndent && level > 0 && index > 0 && (
              <button
                onClick={() => onIndent(itemId)}
                className="p-1.5 rounded-md hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 transition-colors"
                title="Turun Level (Indent as sub-item)"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Duplicate Item */}
            {onDuplicate && level > 0 && (
              <button
                onClick={() => onDuplicate(itemId)}
                className="p-1.5 rounded-md hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 transition-colors"
                title="Duplicate item & sub-tasks"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Add Menu */}
            <div className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="p-1.5 rounded-md hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600 transition-colors"
                title="Add work"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {showAddMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
                  <div className="absolute right-0 bottom-full mb-1 z-50 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 min-w-[140px]">
                    {onAddSibling && level > 0 && (
                      <>
                        <button
                          onClick={() => { onAddSibling(itemId, "above"); setShowAddMenu(false); }}
                          className="w-full px-3 py-1.5 text-left text-xs hover:bg-neutral-50 flex items-center gap-2"
                        >
                          <ArrowUp className="w-3 h-3" /> Add Above
                        </button>
                        <button
                          onClick={() => { onAddSibling(itemId, "below"); setShowAddMenu(false); }}
                          className="w-full px-3 py-1.5 text-left text-xs hover:bg-neutral-50 flex items-center gap-2"
                        >
                          <ArrowDown className="w-3 h-3" /> Add Below
                        </button>
                      </>
                    )}
                    {canAddChild(level) && (
                      <>
                        {onAddSibling && level > 0 && <div className="border-t border-neutral-100 my-1" />}
                        <button
                          onClick={() => { onAddChild(itemId, level); setShowAddMenu(false); }}
                          className="w-full px-3 py-1.5 text-left text-xs hover:bg-neutral-50 flex items-center gap-2"
                        >
                          <CornerDownRight className="w-3 h-3" /> Add Subwork
                        </button>
                      </>
                    )}
                    <div className="border-t border-neutral-100 my-1" />
                    <button
                      onClick={() => {
                        setShowSpecInput(true);
                        setShowAddMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-neutral-50 flex items-center gap-2 text-neutral-600 font-medium"
                    >
                      <Plus className="w-3 h-3 text-neutral-400" /> Add Spec Notes
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Delete (only non-default, non-root items) */}
            {!isDefaultItem && level > 0 && (
              <button
                onClick={() => onRemove(itemId)}
                className="p-1.5 rounded-md hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-colors"
                title="Remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && open && (
        <div className="ml-3 border-l border-neutral-100">
          {item.children!.map((child, idx) => (
            <WBSNode
              key={child.id ? `${child.id}-L${level + 1}-${idx}` : `${child.code}-L${level + 1}-${idx}`}
              item={child}
              view={view}
              mode={mode}
              level={level + 1}
              index={idx}
              isFirst={idx === 0}
              isLast={idx === item.children!.length - 1}
              expandAllState={expandAllState}
              onUpdate={onUpdate}
              onAddChild={onAddChild}
              onAddSibling={onAddSibling}
              onRemove={onRemove}
              onReorder={onReorder}
              onIndent={onIndent}
              onOutdent={onOutdent}
              onDuplicate={onDuplicate}
              onMoveDirection={onMoveDirection}
              canAddChild={canAddChild}
              canReorder={canChildReorder(child)}
              isDragging={childDragIdx === idx}
              isDragOver={childDragOverIdx === idx && childDragIdx !== idx}
              onDragStart={() => handleChildDragStart(idx)}
              onDragOver={(e) => handleChildDragOver(e, idx)}
              onDragLeave={handleChildDragLeave}
              onDrop={() => handleChildDrop(idx)}
              onDragEnd={handleChildDragEnd}
            />
          ))}

          {/* Add Task at End */}
          {view === "BREAKDOWN" && canAddChild(level) && (
            <button
              onClick={() => onAddChild(itemId, level)}
              className="w-full py-2 px-3 text-xs text-neutral-400 hover:text-brand-red hover:bg-neutral-50 transition-colors flex items-center gap-2"
              style={{ paddingLeft: `${12 + (level + 1) * 24}px` }}
            >
              <Plus className="w-3 h-3" /> Add work item
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function InlineEdit({
  value,
  onSave,
  className,
  placeholder = "—"
}: {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft.trim() !== value) onSave(draft.trim());
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={clsx(
          className,
          "w-full bg-white border border-neutral-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red/40"
        )}
      />
    );
  }

  return (
    <div
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={clsx(
        className,
        "cursor-text hover:bg-neutral-100 rounded-md px-2 py-0.5 -mx-2 transition-colors"
      )}
    >
      {value || <span className="text-neutral-300 italic">{placeholder}</span>}
    </div>
  );
}
