"use client";

import { useState, useMemo } from "react";
import { Insight, InsightView, MOCK_INSIGHTS } from "../insights/types";
import InsightsPageHeader from "../insights/InsightsPageHeader";
import InsightsListView from "../insights/InsightsListView";
import InsightsBoardView from "../insights/InsightsBoardView";
import InsightsCalendarView from "../insights/InsightsCalendarView";
import InsightDetail from "../insights/InsightDetail";
import InsightForm from "../insights/InsightForm";

export default function WebsiteInsightsPage() {
    // DATA STATE
    const [insights, setInsights] = useState<Insight[]>(MOCK_INSIGHTS);

    // VIEW STATE
    const [view, setView] = useState<InsightView>("BOARD");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    // NAVIGATION STATE
    const [activeInsight, setActiveInsight] = useState<Insight | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Filter Logic
    const filteredInsights = useMemo(() => {
        return insights.filter(insight => {
            const matchesCategory = categoryFilter === "All" || insight.category === categoryFilter;
            const matchesStatus = statusFilter === "All" || insight.status === statusFilter;
            return matchesCategory && matchesStatus;
        });
    }, [insights, categoryFilter, statusFilter]);

    // Calendar Navigation State
    const [currentDate, setCurrentDate] = useState(new Date());

    const handleNavigateMonth = (direction: -1 | 1) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + direction);
        setCurrentDate(newDate);
    };

    // --- ACTIONS ---

    const handleAddInsight = () => {
        setActiveInsight(null);
        setIsEditing(true);
    };

    const handleViewInsight = (insight: Insight) => {
        setActiveInsight(insight);
        setIsEditing(false);
    };

    const handleSaveInsight = (insightData: Insight) => {
        if (insightData.id) {
            // Update existing - reset to WRITING if was APPROVED/SCHEDULED/PUBLISHED (requires re-approval)
            const original = insights.find(p => p.id === insightData.id);
            if (original && ["APPROVED", "SCHEDULED", "PUBLISHED"].includes(original.status)) {
                insightData = { ...insightData, status: "WRITING" };
            }
            setInsights(prev => prev.map(p => p.id === insightData.id ? insightData : p));
        } else {
            // Create new
            const newInsight = { ...insightData, id: Math.random().toString(36).substr(2, 9), status: "WRITING" };
            setInsights(prev => [newInsight, ...prev]);
        }
        setIsEditing(false);
        if (insightData.id) setActiveInsight(insightData);
        else setActiveInsight(null);
    };

    const handleDeleteInsight = (insight: Insight) => {
        if (confirm("Are you sure you want to delete " + insight.title + "?")) {
            setInsights(prev => prev.filter(p => p.id !== insight.id));
            setActiveInsight(null);
            setIsEditing(false);
        }
    };

    const handleBack = () => {
        if (isEditing && activeInsight) {
            setIsEditing(false);
        } else {
            setActiveInsight(null);
            setIsEditing(false);
        }
    };

    // Workflow Actions
    const handleSubmitForReview = (insight: Insight) => {
        setInsights(prev => prev.map(p => p.id === insight.id ? { ...p, status: "IN_REVIEW" } : p));
        setActiveInsight({ ...insight, status: "IN_REVIEW" });
    };

    const handleNeedRevision = (insight: Insight) => {
        setInsights(prev => prev.map(p => p.id === insight.id ? { ...p, status: "NEED_REVISION" } : p));
        setActiveInsight({ ...insight, status: "NEED_REVISION" });
    };

    const handleApprove = (insight: Insight) => {
        setInsights(prev => prev.map(p => p.id === insight.id ? { ...p, status: "APPROVED" } : p));
        setActiveInsight({ ...insight, status: "APPROVED" });
    };

    const handlePublish = (insight: Insight) => {
        const publishDate = new Date().toISOString().split('T')[0];
        setInsights(prev => prev.map(p => p.id === insight.id ? { ...p, status: "PUBLISHED", publishDate } : p));
        setActiveInsight({ ...insight, status: "PUBLISHED", publishDate });
    };

    const handleUnpublish = (insight: Insight) => {
        setInsights(prev => prev.map(p => p.id === insight.id ? { ...p, status: "APPROVED" } : p));
        setActiveInsight({ ...insight, status: "APPROVED" });
    };

    // --- RENDER ---

    // 1. EDIT/CREATE MODE
    if (isEditing) {
        return (
            <div>
                <InsightForm
                    initialData={activeInsight || undefined}
                    onSave={handleSaveInsight}
                    onCancel={handleBack}
                />
            </div>
        );
    }

    // 2. DETAIL MODE
    if (activeInsight) {
        return (
            <div>
                <InsightDetail
                    insight={activeInsight}
                    onEdit={() => setIsEditing(true)}
                    onDelete={() => handleDeleteInsight(activeInsight)}
                    onBack={() => setActiveInsight(null)}
                    onSubmit={() => handleSubmitForReview(activeInsight)}
                    onApprove={() => handleApprove(activeInsight)}
                    onNeedRevision={() => handleNeedRevision(activeInsight)}
                    onPublish={() => handlePublish(activeInsight)}
                    onUnpublish={() => handleUnpublish(activeInsight)}
                />
            </div>
        );
    }

    // 3. DASHBOARD MODE (List/Board/Calendar)
    return (
        <div className="space-y-6 pb-20">
            <InsightsPageHeader
                view={view}
                onChangeView={setView}
                onAddInsight={handleAddInsight}
                categoryFilter={categoryFilter}
                onCategoryFilterChange={setCategoryFilter}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
            />

            {view === "LIST" && (
                <InsightsListView
                    insights={filteredInsights}
                    onEditInsight={handleViewInsight}
                    onDeleteInsight={handleDeleteInsight}
                />
            )}

            {view === "BOARD" && (
                <InsightsBoardView
                    insights={filteredInsights}
                    onEditInsight={handleViewInsight}
                />
            )}

            {view === "CALENDAR" && (
                <InsightsCalendarView
                    insights={filteredInsights}
                    currentDate={currentDate}
                    onNavigateMonth={handleNavigateMonth}
                    onCreateInsight={(date) => {
                        console.log("Create on date", date);
                        handleAddInsight();
                    }}
                    onEditInsight={handleViewInsight}
                />
            )}
        </div>
    );
}
