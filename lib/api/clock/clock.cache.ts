
type CacheItem = {
    value: any;
    expiredAt: number;
};

const CLOCK_CACHE = new Map<string, CacheItem>();

export function getClockCache(key: string) {
    const item = CLOCK_CACHE.get(key);
    if (!item) return null;
    if (Date.now() > item.expiredAt) {
        CLOCK_CACHE.delete(key);
        return null;
    }
    return item.value;
}

export function setClockCache(key: string, value: any, ttlSeconds: number) {
    CLOCK_CACHE.set(key, {
        value,
        expiredAt: Date.now() + ttlSeconds * 1000
    });
}
