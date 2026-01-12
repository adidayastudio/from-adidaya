"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, Plus, Trash2, GripVertical, ArrowUp, ArrowDown, CornerDownRight } from "lucide-react";
import { WBSItem, WBSView, WBSMode } from "./data/wbs.types";
import clsx from "clsx";

type Props = {
  items: WBSItem[];
  view: WBSView;
  mode: WBSMode;
  onUpdateItem: (id: string, patch: Partial<{ nameEn: string; nameId?: string; code?: string }>) => void;
  onAddChild: (parentId: string, level: number) => void;
  onAddSibling?: (siblingId: string, position: "above" | "below") => void;
  onRemove: (id: string) => void;
  onReorder?: (parentId: string | null, fromIndex: number, toIndex: number) => void;
};

// Default SAM codes that cannot be reordered
const DEFAULT_CODES = ["S", "A", "M"];

export default function WBSList({
  items: initialItems,
  view,
  mode,
  onUpdateItem,
  onAddChild,
  onAddSibling,
  onRemove,
  onReorder
}: Props) {
  const [items, setItems] = useState<WBSItem[]>(initialItems);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

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
    <div className="w-full space-y-0">
      {items.map((item, idx) => (
        <WBSNode
          key={item.id || item.code}
          item={item}
          view={view}
          mode={mode}
          level={0}
          index={idx}
          isFirst={idx === 0}
          isLast={idx === items.length - 1}
          onUpdate={onUpdateItem}
          onAddChild={onAddChild}
          onAddSibling={onAddSibling}
          onRemove={onRemove}
          onReorder={onReorder}
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
      ))}
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
  onUpdate,
  onAddChild,
  onAddSibling,
  onRemove,
  onReorder,
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
  onUpdate: (id: string, patch: Partial<{ nameEn: string; nameId?: string; code?: string }>) => void;
  onAddChild: (parentId: string, level: number) => void;
  onAddSibling?: (siblingId: string, position: "above" | "below") => void;
  onRemove: (id: string) => void;
  onReorder?: (parentId: string | null, fromIndex: number, toIndex: number) => void;
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
  const [open, setOpen] = useState(true); // Default expanded
  const [showAddMenu, setShowAddMenu] = useState(false);

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

  // Check if child can be reordered
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
        <div className="flex-1 min-w-0">
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
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {/* Add Menu - Always show for add above/below */}
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
                  <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 min-w-[140px]">
                    {/* Add Above/Below - only for child items (level > 0) */}
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
                    {/* Add Subwork - for items that can have children */}
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
              key={child.id || child.code}
              item={child}
              view={view}
              mode={mode}
              level={level + 1}
              index={idx}
              isFirst={idx === 0}
              isLast={idx === item.children!.length - 1}
              onUpdate={onUpdate}
              onAddChild={onAddChild}
              onAddSibling={onAddSibling}
              onRemove={onRemove}
              onReorder={onReorder}
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
}: {
  value: string;
  onSave: (value: string) => void;
  className?: string;
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
      {value || "—"}
    </div>
  );
}
