import { useState, useCallback } from 'react';

export function usePullToRefresh(onRefreshCallback?: () => Promise<void> | void) {
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            if (onRefreshCallback) {
                await onRefreshCallback();
            }
        } catch (error) {
            console.error('Pull-to-refresh failed:', error);
        } finally {
            setRefreshing(false);
        }
    }, [onRefreshCallback]);

    return { refreshing, onRefresh };
}
