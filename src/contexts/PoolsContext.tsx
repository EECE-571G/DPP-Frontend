// src/contexts/PoolsContext.tsx
import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
    useMemo,
  } from 'react';
  import { ZeroAddress, Contract, solidityPackedKeccak256, getAddress } from 'ethers'; // Ethers v6 imports
  import { Pool } from '../types'; // Keep base Pool type for now
  import { useAuthContext } from './AuthContext';
  import { useBalancesContext } from './BalancesContext';
  import {
    POOL_MANAGER_ADDRESS,
    TOKEN_A_ADDRESS,
    TOKEN_B_ADDRESS,
    TOKEN_C_ADDRESS, // Make sure this is imported
    POOL_TICK_SPACING,
    DESIRED_PRICE_POOL_HOOK_ADDRESS,
    DYNAMIC_FEE_FLAG,
    TARGET_NETWORK_CHAIN_ID,
  } from '../constants';
  import PoolManagerABI from '../abis/IPoolManager.json';
  
  // --- Define PoolKey Struct Matching Solidity ---
  export interface PoolKey {
    currency0: string; // address
    currency1: string; // address
    fee: number;       // uint24 (using number is okay for typical fees, bigint if using flags)
    tickSpacing: number; // int24
    hooks: string;     // address
  }
  
  // --- Extend Base Pool Type ---
  export interface V4Pool extends Pool {
    poolKey: PoolKey;
    poolId: string; // bytes32
  }
  
  
  interface PoolsContextType {
    pools: V4Pool[];
    selectedPool: V4Pool | null;
    isLoadingPools: boolean;
    errorPools: string | null;
    fetchPoolData: () => Promise<void>;
    handlePoolSelection: (pool: V4Pool | null) => void;
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
    const { provider, network } = useAuthContext();
    const { tokenSymbols, tokenDecimals } = useBalancesContext(); // Get symbols map
  
    const [pools, setPools] = useState<V4Pool[]>([]);
    const [selectedPool, setSelectedPool] = useState<V4Pool | null>(null);
    const [isLoadingPools, setIsLoadingPools] = useState<boolean>(false);
    const [errorPools, setErrorPools] = useState<string | null>(null);
  
    // --- Selection Handler ---
    const handlePoolSelection = useCallback((pool: V4Pool | null) => {
      setSelectedPool(pool);
      console.log('[PoolsContext] Pool selected:', pool?.name ?? 'None');
    }, []);
  
    const fetchPoolData = useCallback(async () => {
      if (!provider || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
          setPools([]); setSelectedPool(null); setErrorPools(null); setIsLoadingPools(false);
          return;
      }
      if (POOL_MANAGER_ADDRESS === ZeroAddress || TOKEN_A_ADDRESS === ZeroAddress || TOKEN_B_ADDRESS === ZeroAddress || TOKEN_C_ADDRESS === ZeroAddress) {
          setErrorPools("Required addresses (PoolManager, Tokens A, B, C) not configured.");
          setIsLoadingPools(false); setPools([]); setSelectedPool(null);
          return;
      }
  
      setIsLoadingPools(true);
      setErrorPools(null);
  
      try {
          const feeValue = DYNAMIC_FEE_FLAG;
          const tickSpacingValue = POOL_TICK_SPACING;
          const hooksAddress = DESIRED_PRICE_POOL_HOOK_ADDRESS;
  
          // --- Pool A/B Definition ---
          const [currency0_AB, currency1_AB] = TOKEN_A_ADDRESS.toLowerCase() < TOKEN_B_ADDRESS.toLowerCase()
              ? [TOKEN_A_ADDRESS, TOKEN_B_ADDRESS]
              : [TOKEN_B_ADDRESS, TOKEN_A_ADDRESS];
          const poolKeyAB: PoolKey = { currency0: currency0_AB, currency1: currency1_AB, fee: feeValue, tickSpacing: tickSpacingValue, hooks: hooksAddress };
          const poolIdAB = solidityPackedKeccak256(["address", "address", "uint24", "int24", "address"], [poolKeyAB.currency0, poolKeyAB.currency1, poolKeyAB.fee, poolKeyAB.tickSpacing, poolKeyAB.hooks]);
          console.log("[PoolsContext] PoolKey A/B:", JSON.stringify(poolKeyAB), "ID:", poolIdAB);
  
          // --- Pool B/C Definition ---
           const [currency0_BC, currency1_BC] = TOKEN_B_ADDRESS.toLowerCase() < TOKEN_C_ADDRESS.toLowerCase()
              ? [TOKEN_B_ADDRESS, TOKEN_C_ADDRESS]
              : [TOKEN_C_ADDRESS, TOKEN_B_ADDRESS];
           const poolKeyBC: PoolKey = { currency0: currency0_BC, currency1: currency1_BC, fee: feeValue, tickSpacing: tickSpacingValue, hooks: hooksAddress };
           const poolIdBC = solidityPackedKeccak256(["address", "address", "uint24", "int24", "address"], [poolKeyBC.currency0, poolKeyBC.currency1, poolKeyBC.fee, poolKeyBC.tickSpacing, poolKeyBC.hooks]);
          console.log("[PoolsContext] PoolKey B/C:", JSON.stringify(poolKeyBC), "ID:", poolIdBC);
  
          // <<< ADDED POOL A/C DEFINITION >>>
          const [currency0_AC, currency1_AC] = TOKEN_A_ADDRESS.toLowerCase() < TOKEN_C_ADDRESS.toLowerCase()
              ? [TOKEN_A_ADDRESS, TOKEN_C_ADDRESS]
              : [TOKEN_C_ADDRESS, TOKEN_A_ADDRESS];
           const poolKeyAC: PoolKey = { currency0: currency0_AC, currency1: currency1_AC, fee: feeValue, tickSpacing: tickSpacingValue, hooks: hooksAddress };
           const poolIdAC = solidityPackedKeccak256(["address", "address", "uint24", "int24", "address"], [poolKeyAC.currency0, poolKeyAC.currency1, poolKeyAC.fee, poolKeyAC.tickSpacing, poolKeyAC.hooks]);
          console.log("[PoolsContext] PoolKey A/C:", JSON.stringify(poolKeyAC), "ID:", poolIdAC);
          // <<< END ADDED POOL A/C DEFINITION >>>
  
  
          // --- Fetch Actual Pool State (Placeholders) ---
          const currentPricePlaceholder = 0;
          const desiredPricePlaceholder = 0;
  
          // --- Create Pool Data Objects ---
          const poolDataAB: V4Pool = {
              id: 1,
              name: `${tokenSymbols[TOKEN_A_ADDRESS] ?? 'A'}/${tokenSymbols[TOKEN_B_ADDRESS] ?? 'B'} Pool`,
              tokenA: tokenSymbols[TOKEN_A_ADDRESS] ?? 'A',
              tokenB: tokenSymbols[TOKEN_B_ADDRESS] ?? 'B',
              tokenA_Address: TOKEN_A_ADDRESS,
              tokenB_Address: TOKEN_B_ADDRESS,
              poolAddress: ZeroAddress,
              poolId: poolIdAB,
              poolKey: poolKeyAB,
              currentPrice: currentPricePlaceholder,
              desiredPrice: desiredPricePlaceholder,
              baseFee: poolKeyAB.fee,
          };
  
           const poolDataBC: V4Pool = {
              id: 2,
              name: `${tokenSymbols[TOKEN_B_ADDRESS] ?? 'B'}/${tokenSymbols[TOKEN_C_ADDRESS] ?? 'C'} Pool`,
              tokenA: tokenSymbols[TOKEN_B_ADDRESS] ?? 'B',
              tokenB: tokenSymbols[TOKEN_C_ADDRESS] ?? 'C',
              tokenA_Address: TOKEN_B_ADDRESS,
              tokenB_Address: TOKEN_C_ADDRESS,
              poolAddress: ZeroAddress,
              poolId: poolIdBC,
              poolKey: poolKeyBC,
              currentPrice: currentPricePlaceholder,
              desiredPrice: desiredPricePlaceholder,
              baseFee: poolKeyBC.fee,
          };
  
          // <<< ADDED POOL A/C DATA OBJECT >>>
           const poolDataAC: V4Pool = {
              id: 3, // Assign a unique frontend ID
              name: `${tokenSymbols[TOKEN_A_ADDRESS] ?? 'A'}/${tokenSymbols[TOKEN_C_ADDRESS] ?? 'C'} Pool`,
              tokenA: tokenSymbols[TOKEN_A_ADDRESS] ?? 'A',
              tokenB: tokenSymbols[TOKEN_C_ADDRESS] ?? 'C',
              tokenA_Address: TOKEN_A_ADDRESS, // Correct addresses for A/C
              tokenB_Address: TOKEN_C_ADDRESS,
              poolAddress: ZeroAddress,
              poolId: poolIdAC, // Use the calculated A/C ID
              poolKey: poolKeyAC, // Use the defined A/C key
              currentPrice: currentPricePlaceholder,
              desiredPrice: desiredPricePlaceholder,
              baseFee: poolKeyAC.fee,
          };
          // <<< END ADDED POOL A/C DATA OBJECT >>>
  
          // <<< UPDATED to include all three pools >>>
          setPools([poolDataAB, poolDataBC, poolDataAC]);
          setSelectedPool(poolDataAB); // Select the first pool by default
          console.log("[PoolsContext] Pool data set successfully with 3 pools.");
  
      } catch (err: any) {
          console.error('[PoolsContext] Failed to load pool data:', err);
          setErrorPools(`Failed to load pool data: ${err.message || String(err)}`);
          setPools([]);
          setSelectedPool(null);
      } finally {
          setIsLoadingPools(false);
      }
    }, [provider, network, tokenSymbols]); // Keep tokenSymbols dependency
  
    useEffect(() => {
        if (provider && network?.chainId === TARGET_NETWORK_CHAIN_ID) {
            fetchPoolData();
        } else {
            setPools([]); setSelectedPool(null); setErrorPools(null); setIsLoadingPools(false);
        }
    }, [provider, network, fetchPoolData]);
  
  
    const contextValue = useMemo(
        () => ({
            pools,
            selectedPool,
            isLoadingPools,
            errorPools,
            fetchPoolData,
            handlePoolSelection,
        }),
        [pools, selectedPool, isLoadingPools, errorPools, fetchPoolData, handlePoolSelection]
    );
  
    return (
        <PoolsContext.Provider value={contextValue}>{children}</PoolsContext.Provider>
    );
  };