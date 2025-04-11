import { useState, useEffect } from 'react';
import { Proposal } from '../types';
import { MOCK_PROPOSALS } from '../utils/mockData'; // Using mock data

export const useProposals = () => {
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [isLoadingProposals, setIsLoadingProposals] = useState<boolean>(true);
    const [errorProposals, setErrorProposals] = useState<string | null>(null);

    useEffect(() => {
        // Simulate fetching proposals data
        setIsLoadingProposals(true);
        setErrorProposals(null);
        const timer = setTimeout(() => {
            try {
                // In a real app, this would be an API call
                setProposals(MOCK_PROPOSALS);
                setIsLoadingProposals(false);
            } catch (err) {
                console.error("Failed to load proposals:", err);
                setErrorProposals("Failed to load proposals. Please try again later.");
                setIsLoadingProposals(false);
            }
        }, 900); // Simulate network delay

        // Cleanup timer on unmount
        return () => clearTimeout(timer);
    }, []); // Empty dependency array means this runs once on mount

    return {
        proposals,
        setProposals, // Expose setter if needed for optimistic updates later
        isLoadingProposals,
        errorProposals,
    };
};
