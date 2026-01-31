"use client";

import SetupPageLayout, { SetupTab } from "../SetupPageLayout";
import { Scale, Calendar, Calculator } from "lucide-react";
import WeightingForm from "./WeightingForm";
import EvaluationPeriodForm from "./EvaluationPeriodForm";
import ScoringLogicPanel from "./ScoringLogicPanel";

const TABS: SetupTab[] = [
    { id: "weighting", label: "Weighting", component: WeightingForm, icon: Scale },
    { id: "period", label: "Evaluation Period", component: EvaluationPeriodForm, icon: Calendar },
    { id: "logic", label: "Scoring Logic", component: ScoringLogicPanel, icon: Calculator }
];

export default function PerformanceRulesView({ onBack }: { onBack: () => void }) {
    return (
        <SetupPageLayout
            title="Performance Rules"
            description="Configure how employee performance is calculated and tracked."
            icon={Scale}
            tabs={TABS}
            onBack={onBack}
        />
    );
}
