import { useState, useEffect } from 'react';
import { Pool } from '../types';
import { MOCK_POOLS } from '../utils/mockData'; // Using mock data

export const usePools = () => {
    const [pools, setPools] = useState<Pool[]>([]);
    const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
    const [isLoadingPools, setIsLoadingPools] = useState<boolean>(true);
    const [errorPools, setErrorPools] = useState<string | null>(null);

    useEffect(() => {
        // Simulate fetching pools data
        setIsLoadingPools(true);
        setErrorPools(null);
        const timer = setTimeout(() => {
            try {
                // In a real app, this would be an API call
                setPools(MOCK_POOLS);
                // Set initial selection after pools are "loaded"
                if (MOCK_POOLS.length > 0) {
                    setSelectedPool(MOCK_POOLS[0]);
                } else {
                    setSelectedPool(null);
                }
                setIsLoadingPools(false);
            } catch (err) {
                console.error("Failed to load pools:", err);
                setErrorPools("Failed to load pools. Please try again later.");
                setIsLoadingPools(false);
            }
        }, 700); // Simulate network delay

        // Cleanup timer on unmount
        return () => clearTimeout(timer);
    }, []); // Empty dependency array means this runs once on mount

    return {
        pools,
        selectedPool,
        setSelectedPool, // Expose setter for dashboard selection
        isLoadingPools,
        errorPools,
    };
};