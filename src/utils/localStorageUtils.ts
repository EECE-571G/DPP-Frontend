// src/utils/localStorageUtils.ts
const DEFAULT_HISTORY_LIMIT = 10;

/**
 * Retrieves the token ID history array from localStorage.
 * @param key The localStorage key.
 * @returns An array of token ID strings, or an empty array if not found or invalid.
 */
export const getTokenIdHistory = (key: string): string[] => {
    try {
        const storedValue = localStorage.getItem(key);
        if (!storedValue) {
            return [];
        }
        const parsed = JSON.parse(storedValue);
        // Ensure it's an array of strings
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
            return parsed;
        }
        console.warn(`Invalid data found in localStorage for key "${key}". Resetting.`);
        localStorage.removeItem(key); // Clean up invalid data
        return [];
    } catch (error) {
        console.error(`Error reading token ID history from localStorage key "${key}":`, error);
        // Attempt to clean up corrupted data
        try {
            localStorage.removeItem(key);
        } catch (removeError) {
            console.error(`Failed to remove corrupted item for key "${key}":`, removeError);
        }
        return []; // Return empty array on parsing error
    }
};

/**
 * Adds a token ID to the history array in localStorage, removing duplicates and enforcing a limit.
 * The most recently added/used item will be at the end of the array.
 * @param key The localStorage key.
 * @param tokenId The token ID string to add.
 * @param limit The maximum number of IDs to store. Defaults to 10.
 */
export const addTokenIdToHistory = (key: string, tokenId: string, limit: number = DEFAULT_HISTORY_LIMIT): void => {
    if (!tokenId || typeof tokenId !== 'string' || tokenId.trim() === '') return; // Don't add empty or invalid strings

    try {
        const currentHistory = getTokenIdHistory(key);

        // Filter out the existing tokenId if it exists, then add the new one to the end
        const filteredHistory = currentHistory.filter(id => id !== tokenId);
        const updatedHistory = [...filteredHistory, tokenId];

        // Enforce limit by taking the last 'limit' items
        const limitedHistory = updatedHistory.slice(-limit);

        localStorage.setItem(key, JSON.stringify(limitedHistory));
    } catch (error) {
        console.error(`Error updating token ID history for localStorage key "${key}":`, error);
    }
};

/**
 * Retrieves the most recent token ID from the history, if available.
 * @param key The localStorage key.
 * @returns The most recent token ID string, or an empty string if history is empty.
 */
export const getMostRecentTokenId = (key: string): string => {
    const history = getTokenIdHistory(key);
    return history.length > 0 ? history[history.length - 1] : '';
};