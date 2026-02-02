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
import { BarChart, Settings, Plus } from "lucide-react";
import { PageHeader } from "@/shared/ui/headers/PageHeader";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import { Button } from "@/shared/ui/primitives/button/button";

export default function FeelPeoplePage() {
   const { profile, loading: profileLoading } = useUserProfile();
   const [people, setPeople] = useState<Person[]>([]);
   const [loadingData, setLoadingData] = useState(true);

   const searchParams = useSearchParams();
   const router = useRouter();
   const pathname = usePathname();

   const sectionParam = searchParams.get("section");
   const uidParam = searchParams.get("uid");
   const currentSection: PeopleSection = (sectionParam as PeopleSection) || "personal-profile";

   // Trigger for Add People Drawer
   const [triggerAddPerson, setTriggerAddPerson] = useState(0);

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

   // Initial Data Fetch
   useEffect(() => {
      loadDirectory();
   }, []);

   // Redirect removed to prevent auto-loading Personal Profile
   // Default view will be handled by the render logic (likely showing Directory or Empty State)
   /* 
   useEffect(() => {
      if (!sectionParam) {
         const params = new URLSearchParams(searchParams);
         params.set("section", "personal-profile");
         router.replace(`${pathname}?${params.toString()}`);
      }
   }, [sectionParam, pathname, router, searchParams]);
   */

   const handleSectionChange = (section: PeopleSection) => {
      const params = new URLSearchParams(searchParams);
      params.set("section", section);
      // If switching to directory or overview, clear UID to avoid stuck profile
      if (section === "directory" || section === "overview") {
         params.delete("uid");
      }
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

   // Determine Target Person (Defaults to "Me" if no UID)
   // If I am admin/HR, I can view anyone. If I am staff, I can only view myself really (unless directory is public)
   // For now assuming directory is public to logged in users.
   const targetPersonId = uidParam || profile?.id;
   const targetPersonData = people.find(p => p?.id === targetPersonId);
   const myPersonData = people.find(p => p?.id === profile?.id);

   // Determine View Access
   const isGlobalView = profile?.role === "admin" || profile?.role === "supervisor" || profile?.role === "hr" || profile?.role === "superadmin";

   const getBreadcrumbLabel = () => {
      switch (currentSection) {
         case "overview": return "Overview";
         case "directory": return "Directory";
         case "performance": return "Performance Index";
         case "analytics": return "Team Analytics";
         case "setup": return "Setup";
         case "personal-profile": return targetPersonData ? (targetPersonData.id === profile?.id ? "My Profile" : targetPersonData.name) : "Profile";
         case "personal-performance": return targetPersonData ? (targetPersonData.id === profile?.id ? "My Performance" : `${targetPersonData.name}'s Performance`) : "Performance";
         default: return "Directory";
      }
   };

   // FAB / Action Config
   const onAddPerson = () => setTriggerAddPerson(prev => prev + 1);

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
   } else if (currentSection === "personal-profile" || currentSection === "personal-performance") {
      header = null; // Let the profile component handle its own header or rely on breadcrumbs
   } else {
      header = (
         <PageHeader
            title="People Directory"
            description="Manage your team, view profiles, and track performance."
            actions={
               (currentSection === "directory" && isGlobalView) ? (
                  <Button
                     variant="primary"
                     onClick={onAddPerson}
                     icon={<Plus className="w-4 h-4" />}
                     className="hidden md:flex !rounded-full !px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-2"
                  >
                     Add People
                  </Button>
               ) : null
            }
         />
      );
   }

   const isLoading = profileLoading || loadingData;

   const PROFILE_TABS = [
      { id: "account", label: "Account", href: `${pathname}?section=personal-profile&tab=account` },
      { id: "profile", label: "Profile", href: `${pathname}?section=personal-profile&tab=profile` },
      { id: "employment", label: "Employment", href: `${pathname}?section=personal-profile&tab=employment` },
      { id: "skills", label: "Skills", href: `${pathname}?section=personal-profile&tab=skills` },
      { id: "performance", label: "Performance", href: `${pathname}?section=personal-profile&tab=performance` },
      { id: "access", label: "Access", href: `${pathname}?section=personal-profile&tab=access` },
   ];

   const mobileTabs = (currentSection === "personal-profile") ? PROFILE_TABS : isGlobalView ? [
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

   const fabAction = (currentSection === "directory" && isGlobalView) ? {
      icon: <Plus className="w-6 h-6" />,
      onClick: onAddPerson,
      title: "Add People"
   } : undefined;

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
         fabAction={fabAction}
      >
         {isGlobalView ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
               {/* 1. OVERVIEW - METRICS ONLY */}
               {currentSection === "overview" && (
                  isLoading ? <div className="p-8 flex justify-center"><GlobalLoading /></div> :
                     <OrgOverview people={people} onNavigate={handleDrillDown} />
               )}

               {/* 2. DIRECTORY - LIST ONLY */}
               {currentSection === "directory" && (
                  isLoading ? <div className="p-8 flex justify-center"><GlobalLoading /></div> :
                     <GlobalDirectory
                        people={people}
                        role={profile?.role || "admin"}
                        triggerAddPerson={triggerAddPerson}
                     />
               )}

               {currentSection === "performance" && (
                  isLoading ? <div className="p-8 flex justify-center"><GlobalLoading /></div> :
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
                  // If loading, show spinner. If loaded and no target, show error.
                  isLoading ? <div className="p-8 flex justify-center"><GlobalLoading /></div> :
                     targetPersonData ? (
                        <PersonalProfile person={targetPersonData} onUpdate={loadDirectory} />
                     ) : (
                        <div className="p-8 border border-red-200 bg-red-50 rounded-xl text-center">
                           <h3 className="text-lg font-bold text-red-700 mb-2">Profile Not Found</h3>
                           <p className="text-sm text-red-600 mb-4">
                              The user ID <strong>{targetPersonId}</strong> was not found in the directory.
                           </p>
                        </div>
                     )
               )}

               {(currentSection === "personal-performance") && (
                  isLoading ? <div className="p-8 flex justify-center"><GlobalLoading /></div> :
                     targetPersonData ? (
                        <PersonalPerformance person={targetPersonData} />
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
               <PersonalProfile person={myPersonData} onUpdate={loadDirectory} />
            )
         ) : (
            // Fallback if myPersonData missing but not loading (or optimistic profile exists but not in directory yet)
            isLoading ? <div className="p-8 flex justify-center"><GlobalLoading /></div> :
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
