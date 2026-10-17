"use client";

import SetupPageLayout, { SetupTab } from "../SetupPageLayout";
import { Zap, Tags } from "lucide-react";
import SkillLibraryTable from "./SkillLibraryTable";
import SkillCategoriesTable from "./SkillCategoriesTable";

const TABS: SetupTab[] = [
    { id: "categories", label: "Skill Categories", component: SkillCategoriesTable, actionLabel: "Add Category", icon: Tags, domain: 'People', subDomain: 'Skill Categories' },
    { id: "library", label: "Skill Library", component: SkillLibraryTable, actionLabel: "Add Skill", icon: Zap, domain: 'People', subDomain: 'Skill Library' }
];

export default function SkillsView({ onBack }: { onBack: () => void }) {
    return (
        <SetupPageLayout
            title="Skills & Capability"
            description="Maintain skill library and competency categories."
            icon={Zap}
            tabs={TABS}
            onBack={onBack}
        />
    );
}
