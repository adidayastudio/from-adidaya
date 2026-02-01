"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export interface DomainLock {
    domain: string;
    sub_domain: string;
    is_locked: boolean;
}

export function useDataControl() {
    const [locks, setLocks] = useState<DomainLock[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLocks = useCallback(async () => {
        const supabase = createClient();
        const { data } = await supabase
            .from('data_control_settings')
            .select('domain, sub_domain, is_locked');

        if (data) {
            setLocks(data);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchLocks();

        // Optional: Set up real-time subscription for lock changes
        const supabase = createClient();
        const channel = supabase
            .channel('data_control_changes')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'data_control_settings'
            }, () => {
                fetchLocks();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchLocks]);

    const isLocked = (domain: string, subDomain: string) => {
        return locks.find(l => l.domain === domain && l.sub_domain === subDomain)?.is_locked || false;
    };

    return { locks, loading, isLocked, refreshLocks: fetchLocks };
}
