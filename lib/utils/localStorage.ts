// utils/localStorageUtils.ts

// Expire after 12 hours by default
export const saveToLocalStorageWithExpiry = (key: string, data: any, ttl = 43_200_000) => {
    const item = {
        data,
        timestamp: Date.now() + ttl
    };
    localStorage.setItem(key, JSON.stringify(item));
}

export const getFromLocalStorageWithExpiry = (key: string) => {
    if (typeof window === 'undefined') {
        return null;
    }

    const itemStr = localStorage?.getItem(key);

    if (!itemStr) {
        return null;
    }

    const item = JSON.parse(itemStr);
    const now = Date.now();

    if (now > item.timestamp) {
        localStorage.removeItem(key);
        return null;
    }

    return item.data;
}
