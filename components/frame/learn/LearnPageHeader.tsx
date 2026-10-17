"use client";

import { ViewToggle } from "@/shared/ui/layout/ViewToggle";
import { Select } from "@/shared/ui/primitives/select/select";
import { List, LayoutList } from "lucide-react";
import { Department, KnowledgeType, QuickView, DEPARTMENT_OPTIONS, getTypeOptions } from "./types";

export type LearnView = "list" | "grouped";

type Props = {
  view: LearnView;
  onChangeView: (v: LearnView) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onAddKnowledge: () => void;
  selectedDepartment: Department;
  onDepartmentChange: (dept: Department) => void;
  selectedType: KnowledgeType | "ALL";
  onTypeChange: (type: KnowledgeType | "ALL") => void;
  activeQuickView: QuickView;
};

export default function LearnPageHeader({
  view,
  onChangeView,
  searchQuery,
  onSearchChange,
  onAddKnowledge,
  selectedDepartment,
  onDepartmentChange,
  selectedType,
  onTypeChange,
  activeQuickView
}: Props) {
  // HIDDEN ON ALL VIEWPORTS AS REDUNDANT WITH BUBBLE / DRAWER
  return null;
}
