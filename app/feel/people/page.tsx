"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import PeopleSidebar, { PeopleSection } from "@/components/feel/people/PeopleSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import useUserProfile from "@/hooks/useUserProfile";
import { PEOPLE_DATA } from "@/components/feel/people/data";

import PersonalDashboard from "@/components/feel/people/PersonalDashboard";
import GlobalDirectory from "@/components/feel/people/GlobalDirectory";
import PerformanceView from "@/components/feel/people/PerformanceView";
import { EmptyState } from "@/shared/ui/overlays/EmptyState";
import { BarChart, Settings } from "lucide-react";

export default function FeelPeoplePage() {
   const { profile, loading } = useUserProfile();
   const [currentSection, setCurrentSection] = useState<PeopleSection>("directory");
   const [directoryFilter, setDirectoryFilter] = useState("all");

   // Find the full person object for the logged-in user
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

   return (
      <div className="min-h-screen bg-neutral-50 p-6">
         {/* Breadcrumb */}
         <Breadcrumb
            items={[
               { label: "Feel" },
               { label: "People" },
               { label: isGlobalView ? getBreadcrumbLabel() : "My Dashboard" }
            ]}
         />

         <PageWrapper sidebar={
            <PeopleSidebar
               activeSection={currentSection}
               onSectionChange={setCurrentSection}
               activeFilter={directoryFilter as any}
               onFilterChange={(v) => setDirectoryFilter(v)}
            />
         }>
            {loading ? (
               <div className="p-12 text-center text-neutral-400">Loading modules...</div>
            ) : isGlobalView ? (
               /* GLOBAL VIEW (Admin/Supervisor) */
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
               /* PERSONAL VIEW (Staff) */
               <PersonalDashboard person={myPersonData} />
            ) : (
               <div className="p-12 text-center text-red-400">Error: User profile not linked to directory data.</div>
            )}
         </PageWrapper>
      </div>
   );
}
