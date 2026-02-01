"use client";

import { useState, useEffect } from "react";
import SetupPageLayout, { SetupTab } from "../SetupPageLayout";
import ScoringLogicPanel from "./ScoringLogicPanel";
import IncentiveRulesView from "./IncentiveRulesView";
import WeightingForm from "./WeightingForm";
import EvaluationPeriodForm from "./EvaluationPeriodForm";
import PerformanceSaveTester from "./PerformanceSaveTester";
import { Scale, Calendar, Calculator, Gem } from "lucide-react";
import { fetchCurrentPerformanceRule, type PerformanceRule } from "@/lib/api/performance";
import { toast } from "react-hot-toast";

const TABS: SetupTab[] = [
    { id: "weighting", label: "Weighting", component: WeightingForm, icon: Scale, domain: 'People', subDomain: 'Weighting' },
    { id: "period", label: "Evaluation Period", component: EvaluationPeriodForm, icon: Calendar, domain: 'People', subDomain: 'Evaluation Period' },
    { id: "logic", label: "Scoring Logic", component: ScoringLogicPanel, icon: Calculator, domain: 'People', subDomain: 'Scoring Logic' },
    { id: "incentive", label: "Incentive Rules", component: IncentiveRulesView, icon: Gem, domain: 'People', subDomain: 'Incentive Rules' }
];

export default function PerformanceRulesView({ onBack }: { onBack: () => void }) {
    const [rule, setRule] = useState<PerformanceRule | null>(null);
    const [loading, setLoading] = useState(true);

    const loadRule = async () => {
        try {
            setLoading(true);
            const data = await fetchCurrentPerformanceRule();
            setRule(data);
        } catch (error) {
            console.error("Error loading performance rules:", error);
            toast.error("Failed to load configuration");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRule();
    }, []);

    return (
        <div className="flex flex-col h-full bg-white">
            <PerformanceSaveTester />
            <SetupPageLayout
                title="Performance Rules"
                description="Configure how employee performance is calculated and tracked."
                icon={Scale}
                tabs={TABS}
                onBack={onBack}
                childProps={{ rule, ruleLoading: loading, onRuleUpdate: loadRule }}
            />
        </div>
    );
}
