// src/hooks/useGovernanceData.ts
import { useState, useEffect } from 'react';
import { MOCK_GOVERNANCE_STATUS, MOCK_GOVERNANCE_METADATA } from '../utils/mockData';

interface GovernanceMetaData {
    id: string;
    time: string;
    stage: string;
}

export const useGovernanceData = () => {
    const [governanceStatus, setGovernanceStatus] = useState<number[]>([]);
    const [metaData, setMetaData] = useState<GovernanceMetaData | null>(null);
    const [isLoadingGovernanceData, setIsLoadingGovernanceData] = useState<boolean>(true);
    const [errorGovernanceData, setErrorGovernanceData] = useState<string | null>(null);

    useEffect(() => {
        // Simulate fetching governance status and metadata
        setIsLoadingGovernanceData(true);
        setErrorGovernanceData(null);
        const timer = setTimeout(() => {
            try {
                // In a real app, these might be separate calls
                setGovernanceStatus(MOCK_GOVERNANCE_STATUS);
                setMetaData(MOCK_GOVERNANCE_METADATA);
                setIsLoadingGovernanceData(false);
            } catch (err) {
                console.error("Failed to load governance data:", err);
                setErrorGovernanceData("Failed to load governance data. Please try again later.");
                setIsLoadingGovernanceData(false);
            }
        }, 1100); // Simulate network delay

        // Cleanup timer on unmount
        return () => clearTimeout(timer);
    }, []); // Empty dependency array means this runs once on mount

    return {
        governanceStatus,
        metaData,
        isLoadingGovernanceData,
        errorGovernanceData,
    };
};