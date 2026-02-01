"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import PeoplePageWrapper from "@/components/feel/people/PeoplePageWrapper";
import PeopleSidebar, { PeopleSection } from "@/components/feel/people/PeopleSidebar";
import useUserProfile from "@/hooks/useUserProfile";
import { fetchPeopleDirectory } from "@/lib/api/people";
import { Person } from "@/components/feel/people/types";
import PersonalProfile from "@/components/feel/people/PersonalProfile";
import PersonalPerformance from "@/components/feel/people/PersonalPerformance";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import { PageHeader } from "@/shared/ui/headers/PageHeader";

export default function PersonProfilePage() {
    const { profile, loading: profileLoading } = useUserProfile();
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const uid = params.uid as string;
    const view = searchParams.get("view") || "profile";

    const [person, setPerson] = useState<Person | null>(null);
    const [loading, setLoading] = useState(true);

    const loadPerson = async () => {
        try {
            // In a real app we'd fetch just one person, but our API fetches all for now
            const people = await fetchPeopleDirectory();
            const found = people.find(p => p.id === uid);
            setPerson(found || null);
        } catch (error) {
            console.error("Failed to load person", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (uid) loadPerson();
    }, [uid]);

    // Navigation Handler (Sidebar)
    const handleSectionChange = (section: PeopleSection) => {
        if (section === "personal-profile") {
            // Stay here
            return;
        }
        // Navigate back to main pages
        router.push(`/feel/people?section=${section}`);
    };

    const getHeader = () => {
        if (!person) return null;
        return (
            <PageHeader
                title="Employee Profile"
                allowBack
                backLabel="Back"
                onBack={() => router.push("/feel/people?section=directory")}
            />
        );
    };

    // Determine Sidebar Active State
    // Since we are IN a profile, we highlight based on view? 
    // Or do we highlight "Directory" because we drilled down?
    // Let's highlight "Directory" or maybe nothing?
    // Actually, if it's "ME", we highlight "My Profile".
    const isActiveMyProfile = profile?.id === person?.id;

    if (loading || profileLoading) return <GlobalLoading />;

    if (!person) {
        return (
            <PeoplePageWrapper
                breadcrumbItems={[{ label: "Feel" }, { label: "People" }, { label: "Not Found" }]}
                sidebar={<PeopleSidebar activeSection="directory" onSectionChange={handleSectionChange} />}
            >
                <div className="p-12 text-center text-red-500">Person not found</div>
            </PeoplePageWrapper>
        );
    }

    return (
        <PeoplePageWrapper
            breadcrumbItems={[
                { label: "Feel" },
                { label: "People" },
                { label: "Directory", href: "/feel/people?section=directory" },
                { label: person.name }
            ]}
            // sidebar={
            //     <PeopleSidebar
            //         activeSection={isActiveMyProfile ? "personal-profile" : "directory"}
            //         onSectionChange={handleSectionChange}
            //         activeFilter="all"
            //     />
            // }
            // Let's reuse the sidebar but maybe we need a "Back" button context?
            sidebar={
                <PeopleSidebar
                    activeSection={isActiveMyProfile ? "personal-profile" : "directory"}
                    onSectionChange={handleSectionChange}
                    activeFilter="all"
                />
            }
            header={getHeader()}
        >
            <div className="animate-in fade-in zoom-in-95 duration-300">
                <PersonalProfile
                    person={person}
                    isMe={isActiveMyProfile}
                    onUpdate={loadPerson}
                />
            </div>
        </PeoplePageWrapper>
    );
}
