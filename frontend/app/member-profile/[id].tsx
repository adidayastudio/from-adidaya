import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { MemberProfileView } from '@/components/people/member-profile/MemberProfileView';

export default function MemberProfileScreen() {
    const params = useLocalSearchParams<{
        id: string;
        name?: string;
        dept?: string;
        role?: string;
        status?: string;
        email?: string;
    }>();

    return <MemberProfileView params={params} />;
}

