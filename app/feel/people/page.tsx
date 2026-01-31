"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import PeoplePageWrapper from "@/components/feel/people/PeoplePageWrapper";
import PeopleSidebar, { PeopleSection } from "@/components/feel/people/PeopleSidebar";
import useUserProfile from "@/hooks/useUserProfile";
import { fetchPeopleDirectory } from "@/lib/api/people";
import { Person } from "@/components/feel/people/types";

// COMPONENTS
import PersonalProfile from "@/components/feel/people/PersonalProfile";
import PersonalPerformance from "@/components/feel/people/PersonalPerformance";
import OrgOverview from "@/components/feel/people/OrgOverview";
import GlobalDirectory from "@/components/feel/people/GlobalDirectory";
import PerformanceView from "@/components/feel/people/PerformanceView";
import PeopleSetup from "@/components/feel/people/setup/PeopleSetup";
import { EmptyState } from "@/shared/ui/overlays/EmptyState";
import { BarChart, Settings } from "lucide-react";
import { PageHeader } from "@/shared/ui/headers/PageHeader";

export default function FeelPeoplePage() {
   const { profile, loading: profileLoading } = useUserProfile();
   const [people, setPeople] = useState<Person[]>([]);
   const [loadingData, setLoadingData] = useState(true);

   const searchParams = useSearchParams();
   const router = useRouter();
   const pathname = usePathname();

   const sectionParam = searchParams.get("section");
   const currentSection: PeopleSection = (sectionParam as PeopleSection) || "overview";

   // Fetch Directory Data
   useEffect(() => {
      const loadDirectory = async () => {
         try {
            const data = await fetchPeopleDirectory();
            setPeople(data);
         } catch (error) {
            console.error("Failed to load people directory", error);
         } finally {
            setLoadingData(false);
         }
      };
      loadDirectory();
   }, []);

   const handleSectionChange = (section: PeopleSection) => {
      const params = new URLSearchParams(searchParams);
      params.set("section", section);
      router.push(`${pathname}?${params.toString()}`);
   };

   // Drill down handler for Dashboard -> Directory
   const handleDrillDown = (section: "directory", filter?: string) => {
      const params = new URLSearchParams(searchParams);
      params.set("section", section);
      if (filter) {
         params.set("filter", filter);
      }
      router.push(`${pathname}?${params.toString()}`);
   };

   const [directoryFilter, setDirectoryFilter] = useState("all");

   // Find ME in the real list
   const myPersonData = people.find(p => p.id === profile?.id);

   // Determine View Access
   const isGlobalView = profile?.role === "admin" || profile?.role === "supervisor" || profile?.role === "hr" || profile?.role === "superadmin";

   const getBreadcrumbLabel = () => {
      switch (currentSection) {
         case "overview": return "Overview";
         case "directory": return "Directory";
         case "performance": return "Performance Index";
         case "analytics": return "Team Analytics";
         case "setup": return "Setup";
         case "personal-profile": return "My Profile";
         case "personal-performance": return "My Performance";
         default: return "Directory";
      }
   };

   let header;
   if (currentSection === "setup") {
      // Check if we are in a sub-tab of setup
      const currentTab = searchParams?.get?.("tab");
      if (currentTab) {
         header = null;
      } else {
         header = (
            <PageHeader
               title="People Setup and Management"
               description="Configure global settings for your organization's people and culture."
            />
         );
      }
   } else {
      header = (
         <PageHeader
            title="People Directory"
            description="Manage your team, view profiles, and track performance."
         />
      );
   }

   const isLoading = profileLoading || loadingData;

   const mobileTabs = isGlobalView ? [
      { id: "personal-profile", label: "My Profile", href: "/feel/people?section=personal-profile" },
      { id: "personal-performance", label: "My Performance", href: "/feel/people?section=personal-performance" },
      { id: "overview", label: "Overview", href: "/feel/people?section=overview" },
      { id: "directory", label: "Directory", href: "/feel/people?section=directory" },
      { id: "performance", label: "Performance", href: "/feel/people?section=performance" },
      { id: "analytics", label: "Analytics", href: "/feel/people?section=analytics" },
      { id: "setup", label: "Setup", href: "/feel/people?section=setup" },
   ] : [
      { id: "personal-profile", label: "My Profile", href: "/feel/people?section=personal-profile" },
      { id: "personal-performance", label: "My Performance", href: "/feel/people?section=personal-performance" },
   ];

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
         tabs={mobileTabs}
      >
         {isLoading ? (
            <div className="p-12 text-center text-neutral-400">Loading directory...</div>
         ) : isGlobalView ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
               {/* 1. OVERVIEW - METRICS ONLY */}
               {currentSection === "overview" && (
                  <OrgOverview people={people} onNavigate={handleDrillDown} />
               )}

               {/* 2. DIRECTORY - LIST ONLY */}
               {currentSection === "directory" && (
                  <GlobalDirectory people={people} role={profile?.role || "admin"} />
               )}

               {currentSection === "performance" && (
                  <PerformanceView people={people} />
               )}
               {currentSection === "analytics" && (
                  <EmptyState icon={BarChart} title="Team Analytics" description="Advanced charts and team distribution metrics." />
               )}
               {currentSection === "setup" && (
                  <PeopleSetup />
               )}

               {/* ADMIN PERSONAL VIEW */}
               {(currentSection === "personal-profile") && (
                  myPersonData ? (
                     <PersonalProfile person={myPersonData} />
                  ) : (
                     <div className="p-8 border border-red-200 bg-red-50 rounded-xl text-center">
                        <h3 className="text-lg font-bold text-red-700 mb-2">My Profile Not Found</h3>
                        <p className="text-sm text-red-600 mb-4">
                           Your user ID <strong>{profile?.id}</strong> was not found in the directory list.
                        </p>
                     </div>
                  )
               )}

               {(currentSection === "personal-performance") && (
                  myPersonData ? (
                     <PersonalPerformance person={myPersonData} />
                  ) : (
                     <div className="p-8 text-center text-neutral-400">Profile data missing for performance view.</div>
                  )
               )}

            </div>
         ) : myPersonData ? (
            // STAFF VIEW DEFAULT
            currentSection === 'personal-performance' ? (
               <PersonalPerformance person={myPersonData} />
            ) : (
               <PersonalProfile person={myPersonData} />
            )
         ) : (
            <div className="p-12 text-center flex flex-col items-center gap-4">
               <div className="text-red-400">Profile Not Found</div>
               <div className="text-sm text-neutral-500 max-w-md">
                  Your user account (ID: {profile?.id}) was not found in the people directory.
               </div>
            </div>
         )}
      </PeoplePageWrapper>
   );
}
