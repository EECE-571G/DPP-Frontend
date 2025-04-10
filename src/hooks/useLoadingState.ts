import { useState, useCallback } from 'react';

export type LoadingKeys =
    | 'connectWallet'
    | 'swap'
    | 'addLiquidity'
    | 'removeLiquidity'
    | 'delegateVotes'
    | string; // Allow dynamic keys like vote_{proposalId}

export const useLoadingState = (initialStates: Record<LoadingKeys, boolean> = {}) => {
    const [isLoading, setIsLoading] = useState<Record<LoadingKeys, boolean>>(initialStates);

    const setLoading = useCallback((key: LoadingKeys, value: boolean) => {
        setIsLoading(prev => ({ ...prev, [key]: value }));
    }, []);

    // Helper to check if any specified key is loading
    const isAnyLoading = useCallback((keys: LoadingKeys[]): boolean => {
        return keys.some(key => !!isLoading[key]);
    }, [isLoading]);

    return { isLoading, setLoading, isAnyLoading };
};