// src/utils/localStorageUtils.ts

const DEFAULT_HISTORY_LIMIT = 10;
const LS_KEY_POSITION_HISTORY = 'liquidity_positionHistory';

// --- Define the structure for each history item ---
export interface PositionHistoryItem {
    tokenId: string;
    lowerTick: string; // Store as string as they often come from input fields
    upperTick: string;
    // Add timestamp or poolId if needed later
    // timestamp?: number;
    // poolId?: string;
}

export type PositionHistory = PositionHistoryItem[];

/**
 * Retrieves the position history array from localStorage.
 * @returns An array of PositionHistoryItem objects, or an empty array if not found or invalid.
 */
export const getPositionHistory = (): PositionHistory => {
    try {
        const storedValue = localStorage.getItem(LS_KEY_POSITION_HISTORY);
        if (!storedValue) {
            return [];
        }
        const parsed = JSON.parse(storedValue);

        // --- Robust validation ---
        if (!Array.isArray(parsed)) {
            console.warn(`Invalid data found in localStorage for key "${LS_KEY_POSITION_HISTORY}" (not an array). Resetting.`);
            localStorage.removeItem(LS_KEY_POSITION_HISTORY);
            return [];
        }

        // Check if each item has the required structure
        const isValid = parsed.every(item =>
            typeof item === 'object' &&
            item !== null &&
            typeof item.tokenId === 'string' &&
            typeof item.lowerTick === 'string' &&
            typeof item.upperTick === 'string'
        );

        if (!isValid) {
            console.warn(`Invalid data structure found within array in localStorage for key "${LS_KEY_POSITION_HISTORY}". Resetting.`);
            localStorage.removeItem(LS_KEY_POSITION_HISTORY);
            return [];
        }

        return parsed as PositionHistory; // Type assertion after validation
    } catch (error) {
        console.error(`Error reading position history from localStorage key "${LS_KEY_POSITION_HISTORY}":`, error);
        try {
            localStorage.removeItem(LS_KEY_POSITION_HISTORY);
        } catch (removeError) {
            console.error(`Failed to remove corrupted item for key "${LS_KEY_POSITION_HISTORY}":`, removeError);
        }
        return [];
    }
};

/**
 * Adds or updates a position in the history array in localStorage.
 * If an item with the same tokenId exists, it's moved to the end (most recent).
 * New items are added to the end. Enforces a limit.
 * @param newItem The PositionHistoryItem object to add or update.
 * @param limit The maximum number of items to store. Defaults to DEFAULT_HISTORY_LIMIT.
 */
export const addPositionToHistory = (newItem: PositionHistoryItem, limit: number = DEFAULT_HISTORY_LIMIT): void => {
    if (!newItem || typeof newItem.tokenId !== 'string' || newItem.tokenId.trim() === '') {
        console.warn("Attempted to add invalid position item to history:", newItem);
        return;
    }

    try {
        const currentHistory = getPositionHistory();

        // Filter out the existing item with the same tokenId
        const filteredHistory = currentHistory.filter(item => item.tokenId !== newItem.tokenId);

        // Add the new/updated item to the end
        const updatedHistory = [...filteredHistory, newItem];

        // Enforce limit
        const limitedHistory = updatedHistory.slice(-limit);

        localStorage.setItem(LS_KEY_POSITION_HISTORY, JSON.stringify(limitedHistory));
    } catch (error) {
        console.error(`Error updating position history for localStorage key "${LS_KEY_POSITION_HISTORY}":`, error);
    }
};

/**
 * "Touches" a token ID in the history, moving its entry to the end if it exists.
 * Does not add a new entry if the token ID is not found.
 * Useful for Add/Remove Liquidity actions where you only have the ID.
 * @param tokenId The token ID string to touch.
 * @param limit The maximum number of items to store. Defaults to DEFAULT_HISTORY_LIMIT.
 */
export const touchTokenIdInHistory = (tokenId: string, limit: number = DEFAULT_HISTORY_LIMIT): void => {
    if (!tokenId || typeof tokenId !== 'string' || tokenId.trim() === '') return;

    try {
        const currentHistory = getPositionHistory();
        const existingItemIndex = currentHistory.findIndex(item => item.tokenId === tokenId);

        if (existingItemIndex === -1) {
            // Token ID not found, do nothing
            return;
        }

        // Item found, move it to the end
        const itemToMove = currentHistory[existingItemIndex];
        const filteredHistory = currentHistory.filter((_, index) => index !== existingItemIndex);
        const updatedHistory = [...filteredHistory, itemToMove]; // Add the found item to the end

        // Enforce limit
        const limitedHistory = updatedHistory.slice(-limit);

        localStorage.setItem(LS_KEY_POSITION_HISTORY, JSON.stringify(limitedHistory));
    } catch (error) {
        console.error(`Error touching token ID history for localStorage key "${LS_KEY_POSITION_HISTORY}":`, error);
    }
};


/**
 * Retrieves the most recent PositionHistoryItem from the history, if available.
 * @returns The most recent PositionHistoryItem object, or null if history is empty.
 */
export const getMostRecentPosition = (): PositionHistoryItem | null => {
    const history = getPositionHistory();
    return history.length > 0 ? history[history.length - 1] : null;
};

/**
 * Extracts just the token IDs from the position history.
 * @returns An array of token ID strings.
 */
export const getTokenIdHistoryList = (): string[] => {
    const history = getPositionHistory();
    return history.map(item => item.tokenId); // Return only the IDs
};