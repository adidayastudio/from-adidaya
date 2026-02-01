"use client";

import SetupPageLayout, { SetupTab } from "../SetupPageLayout";
import ScoringLogicPanel from "./ScoringLogicPanel";
import IncentiveRulesView from "./IncentiveRulesView";
import WeightingForm from "./WeightingForm";
import EvaluationPeriodForm from "./EvaluationPeriodForm";
import { Scale, Calendar, Calculator, Gem } from "lucide-react";

const TABS: SetupTab[] = [
    { id: "weighting", label: "Weighting", component: WeightingForm, icon: Scale, domain: 'People', subDomain: 'Weighting' },
    { id: "period", label: "Evaluation Period", component: EvaluationPeriodForm, icon: Calendar, domain: 'People', subDomain: 'Evaluation Period' },
    { id: "logic", label: "Scoring Logic", component: ScoringLogicPanel, icon: Calculator, domain: 'People', subDomain: 'Scoring Logic' },
    { id: "incentive", label: "Incentive Rules", component: IncentiveRulesView, icon: Gem, domain: 'People', subDomain: 'Incentive Rules' }
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
