// src/contexts/TimeContext.tsx
import React, { createContext, useState, useContext, useCallback, useEffect, ReactNode, useMemo } from 'react';
import { useAuthContext } from './AuthContext';
import { useSnackbarContext } from './SnackbarProvider';

interface TimeContextType {
    simulatedTimestamp: number | null; // The timestamp used for display and calculations (can be real or advanced)
    isSimulating: boolean; // Flag to know if the displayed time is potentially different from real time
    isLoadingTime: boolean; // Expose loading state
    fetchRealTimestamp: () => Promise<void>; // Function to sync back to real time
    advanceSimulatedTime: (seconds: number) => void; // Function to advance the simulated time
}

const TimeContext = createContext<TimeContextType | undefined>(undefined);

export const useTimeContext = () => {
    const context = useContext(TimeContext);
    if (!context) {
        throw new Error('useTimeContext must be used within a TimeProvider');
    }
    return context;
};

interface TimeProviderProps {
    children: ReactNode;
}

export const TimeProvider: React.FC<TimeProviderProps> = ({ children }) => {
    const { provider } = useAuthContext();
    const { showSnackbar } = useSnackbarContext();
    const [simulatedTimestamp, setSimulatedTimestamp] = useState<number | null>(null);
    const [isSimulating, setIsSimulating] = useState<boolean>(false); // Track if we've advanced time
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Fetches REAL time and sets it as the current simulated time
    const fetchRealTimestamp = useCallback(async () => {
        if (!provider) {
             setSimulatedTimestamp(null);
             setIsSimulating(false); // Not simulating if we can't fetch
             return;
         }
        setIsLoading(true);
        try {
            console.log("[TimeContext] Fetching REAL latest block timestamp...");
            const block = await provider.getBlock('latest');
            if (block) {
                setSimulatedTimestamp(block.timestamp);
                setIsSimulating(false); // Reset simulation flag when fetching real time
                console.log("[TimeContext] Synced simulatedTimestamp to REAL timestamp:", block.timestamp);
            } else {
                 setSimulatedTimestamp(null);
                 setIsSimulating(false);
                 console.log("[TimeContext] Failed to get latest block for real time sync.");
            }
        } catch (error) {
            console.error("Failed to fetch block timestamp:", error);
            setSimulatedTimestamp(null);
             setIsSimulating(false);
            showSnackbar("Failed to fetch real block time.", "warning");
        } finally {
            setIsLoading(false);
        }
    }, [provider, showSnackbar]);

    // Advances the SIMULATED timestamp state
    const advanceSimulatedTime = useCallback((seconds: number) => {
        setSimulatedTimestamp(prevTimestamp => {
            if (prevTimestamp === null) {
                showSnackbar("Cannot advance time: Current time unknown. Refresh first.", "warning");
                return null; // Don't advance if we don't know the current time
            }
            const newTimestamp = prevTimestamp + seconds;
            console.log(`[TimeContext] Advanced simulated timestamp from ${prevTimestamp} to ${newTimestamp}`);
            setIsSimulating(true); // Mark that we are now simulating
            return newTimestamp;
        });
        // No snackbar here, let the calling component handle UI feedback
    }, [showSnackbar]);

    // Fetch initial real time when provider becomes available
    useEffect(() => {
        if (provider) {
            fetchRealTimestamp();
        } else {
            setSimulatedTimestamp(null);
            setIsSimulating(false);
        }
    }, [provider, fetchRealTimestamp]);

    // Include isLoadingTime in the provided value
    const contextValue = useMemo(() => ({
        simulatedTimestamp,
        isSimulating,
        isLoadingTime: isLoading,
        fetchRealTimestamp,
        advanceSimulatedTime,
    }), [simulatedTimestamp, isSimulating, isLoading, fetchRealTimestamp, advanceSimulatedTime]);

    return (
        <TimeContext.Provider value={contextValue}>
            {children}
        </TimeContext.Provider>
    );
};