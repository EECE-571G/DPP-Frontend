import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
    useMemo,
  } from 'react';
  import { Pool } from '../types';
  import { MOCK_POOLS } from '../utils/mockData';
  
  interface PoolsContextType {
    pools: Pool[];
    selectedPool: Pool | null;
    isLoadingPools: boolean;
    errorPools: string | null;
    setSelectedPoolById: (poolId: number | null) => void;
  }
  
  const PoolsContext = createContext<PoolsContextType | undefined>(undefined);
  
  export const usePoolsContext = () => {
    const context = useContext(PoolsContext);
    if (!context) {
      throw new Error('usePoolsContext must be used within a PoolsProvider');
    }
    return context;
  };
  
  interface PoolsProviderProps {
    children: ReactNode;
  }
  
  export const PoolsProvider: React.FC<PoolsProviderProps> = ({ children }) => {
    const [pools, setPools] = useState<Pool[]>([]);
    const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
    const [isLoadingPools, setIsLoadingPools] = useState<boolean>(true);
    const [errorPools, setErrorPools] = useState<string | null>(null);
  
    useEffect(() => {
      setIsLoadingPools(true);
      setErrorPools(null);
      const timer = setTimeout(() => {
        try {
          setPools(MOCK_POOLS);
          if (MOCK_POOLS.length > 0) {
            setSelectedPool(MOCK_POOLS[0]); // Default select first pool
          } else {
            setSelectedPool(null);
          }
          setIsLoadingPools(false);
        } catch (err: any) {
          console.error('Failed to load pools:', err);
          setErrorPools('Failed to load pools. Please try again later.');
          setIsLoadingPools(false);
        }
      }, 700);
      return () => clearTimeout(timer);
    }, []);
  
    const setSelectedPoolById = useCallback(
      (poolId: number | null) => {
        if (poolId === null) {
          setSelectedPool(null);
        } else {
          const poolToSelect = pools.find((p) => p.id === poolId);
          setSelectedPool(poolToSelect || null); // Set to found pool or null if ID not found
        }
      },
      [pools] // Dependency on pools array
    );
  
    const contextValue = useMemo(
      () => ({
        pools,
        selectedPool,
        isLoadingPools,
        errorPools,
        setSelectedPoolById, // Expose the new setter
      }),
      [pools, selectedPool, isLoadingPools, errorPools, setSelectedPoolById]
    );
  
    return (
      <PoolsContext.Provider value={contextValue}>{children}</PoolsContext.Provider>
    );
  };