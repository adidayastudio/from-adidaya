"use client";

import { useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import PeoplePageWrapper from "@/components/feel/people/PeoplePageWrapper";
import PeopleSidebar, { PeopleSection } from "@/components/feel/people/PeopleSidebar";
import useUserProfile from "@/hooks/useUserProfile";
import { PEOPLE_DATA } from "@/components/feel/people/data";

import PersonalDashboard from "@/components/feel/people/PersonalDashboard";
import GlobalDirectory from "@/components/feel/people/GlobalDirectory";
import PerformanceView from "@/components/feel/people/PerformanceView";
import { EmptyState } from "@/shared/ui/overlays/EmptyState";
import { BarChart, Settings } from "lucide-react";
import { PageHeader } from "@/shared/ui/headers/PageHeader";

export default function FeelPeoplePage() {
   const { profile, loading } = useUserProfile();
   const searchParams = useSearchParams();
   const router = useRouter();
   const pathname = usePathname();

   const sectionParam = searchParams.get("section");
   const currentSection: PeopleSection = (sectionParam as PeopleSection) || "overview";

   const handleSectionChange = (section: PeopleSection) => {
      const params = new URLSearchParams(searchParams);
      params.set("section", section);
      router.push(`${pathname}?${params.toString()}`);
   };

   const [directoryFilter, setDirectoryFilter] = useState("all");

   const myPersonData = PEOPLE_DATA.find(p => p.id === profile?.id);
   const isGlobalView = profile?.role === "admin" || profile?.role === "supervisor";

   const getBreadcrumbLabel = () => {
      switch (currentSection) {
         case "overview": return "Overview";
         case "directory": return "Directory";
         case "performance": return "Performance Index";
         case "analytics": return "Team Analytics";
         case "management": return "Management";
         case "personal-profile": return "My Profile";
         case "personal-performance": return "My Performance";
         default: return "Directory";
      }
   };

   const header = (
      <PageHeader
         title="People Directory"
         description="Manage your team, view profiles, and track performance."
      />
   );

   return (
      <PeoplePageWrapper
         breadcrumbItems={[
            { label: "Feel" },
            { label: "People" },
            { label: isGlobalView ? getBreadcrumbLabel() : "My Dashboard" }
         ]}
         header={header}
         sidebar={
            <PeopleSidebar
               activeSection={currentSection}
               onSectionChange={handleSectionChange}
               activeFilter={directoryFilter as any}
               onFilterChange={(v) => setDirectoryFilter(v)}
            />
         }
      >
         {loading ? (
            <div className="p-12 text-center text-neutral-400">Loading modules...</div>
         ) : isGlobalView ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
               {currentSection === "directory" && (
                  <GlobalDirectory people={PEOPLE_DATA} role={profile?.role || "admin"} />
               )}
               {currentSection === "overview" && (
                  <GlobalDirectory people={PEOPLE_DATA} role={profile?.role || "admin"} />
               )}
               {currentSection === "performance" && (
                  <PerformanceView people={PEOPLE_DATA} />
               )}
               {currentSection === "analytics" && (
                  <EmptyState icon={BarChart} title="Team Analytics" description="Advanced charts and team distribution metrics." />
               )}
               {currentSection === "management" && (
                  <EmptyState icon={Settings} title="People Management" description="Onboarding, Offboarding, and Role assignments." />
               )}
            </div>
         ) : myPersonData ? (
            <PersonalDashboard person={myPersonData} />
         ) : (
            <div className="p-12 text-center text-red-400">Error: User profile not linked to directory data.</div>
         )}
      </PeoplePageWrapper>
   );
}
