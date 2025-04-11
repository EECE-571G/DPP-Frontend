import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';

export type LoadingKeys =
    | 'swap'
    | 'addLiquidity'
    | 'removeLiquidity'
    | 'delegateVotes'
    | string; // Allow dynamic keys like vote_{proposalId}

interface LoadingContextType {
    isLoading: Record<LoadingKeys, boolean>;
    setLoading: (key: LoadingKeys, value: boolean) => void;
    isAnyLoading: (keys: LoadingKeys[]) => boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoadingContext = () => {
    const context = useContext(LoadingContext);
    if (!context) {
        throw new Error('useLoadingContext must be used within a LoadingProvider');
    }
    return context;
};

interface LoadingProviderProps {
    children: ReactNode;
    initialStates?: Record<LoadingKeys, boolean>;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children, initialStates = {} }) => {
    const [isLoading, setIsLoading] = useState<Record<LoadingKeys, boolean>>(initialStates);

    const setLoading = useCallback((key: LoadingKeys, value: boolean) => {
        setIsLoading(prev => ({ ...prev, [key]: value }));
    }, []);

    const isAnyLoading = useCallback((keys: LoadingKeys[]): boolean => {
        return keys.some(key => !!isLoading[key]);
    }, [isLoading]);

    const contextValue = useMemo(() => ({
        isLoading,
        setLoading,
        isAnyLoading
    }), [isLoading, setLoading, isAnyLoading]);

    return (
        <LoadingContext.Provider value={contextValue}>
            {children}
        </LoadingContext.Provider>
    );
};