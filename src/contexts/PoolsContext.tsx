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
import { ZeroAddress, Contract, solidityPackedKeccak256 } from 'ethers'; // Ethers v6 imports
import { Pool } from '../types'; // Keep base Pool type for now
import { useAuthContext } from './AuthContext';
import { useBalancesContext } from './BalancesContext';
import {
  POOL_MANAGER_ADDRESS,
  TOKEN_A_ADDRESS,
  TOKEN_B_ADDRESS,
  POOL_TICK_SPACING,
  DESIRED_PRICE_POOL_HOOK_ADDRESS,
  DYNAMIC_FEE_FLAG, // Import dynamic fee flag
  TARGET_NETWORK_CHAIN_ID,
} from '../constants';
import PoolManagerABI from '../abis/IPoolManager.json';

// --- Define PoolKey Struct Matching Solidity ---
// Ensure this EXACTLY matches the field names and types expected by the contract ABI
// Check IPoolManager.sol or PoolIdLibrary.sol
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
  const { tokenSymbols, tokenDecimals } = useBalancesContext();

  const [pools, setPools] = useState<V4Pool[]>([]);
  const [selectedPool, setSelectedPool] = useState<V4Pool | null>(null);
  const [isLoadingPools, setIsLoadingPools] = useState<boolean>(false);
  const [errorPools, setErrorPools] = useState<string | null>(null);

  const fetchPoolData = useCallback(async () => {
      if (!provider || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
          setPools([]); setSelectedPool(null); setErrorPools(null); setIsLoadingPools(false);
          return;
      }
      if (POOL_MANAGER_ADDRESS === ZeroAddress || TOKEN_A_ADDRESS === ZeroAddress || TOKEN_B_ADDRESS === ZeroAddress) {
           setErrorPools("Required addresses (PoolManager, Tokens) not configured.");
           setIsLoadingPools(false); setPools([]); setSelectedPool(null);
           return;
      }

      setIsLoadingPools(true);
      setErrorPools(null);

      try {
          const poolManager = new Contract(POOL_MANAGER_ADDRESS, PoolManagerABI, provider);

          const [currency0, currency1] = TOKEN_A_ADDRESS.toLowerCase() < TOKEN_B_ADDRESS.toLowerCase()
              ? [TOKEN_A_ADDRESS, TOKEN_B_ADDRESS]
              : [TOKEN_B_ADDRESS, TOKEN_A_ADDRESS];

          // !!! CRITICAL: Verify this fee value matches your pool initialization !!!
          // If your pool uses dynamic fees, use DYNAMIC_FEE_FLAG constant instead.
          // Common static fees: 500 (0.05%), 3000 (0.3%), 10000 (1%)
        //   const feeValue = 3000; // <<< EXAMPLE: CHECK YOUR DEPLOYMENT SCRIPT
          const feeValue = DYNAMIC_FEE_FLAG; // <<< USE THIS IF DYNAMIC FEE POOL

          const tickSpacingValue = Number(POOL_TICK_SPACING);
          const hooksAddress = DESIRED_PRICE_POOL_HOOK_ADDRESS;

          // Explicitly construct the PoolKey object matching the interface/struct
          const poolKey: PoolKey = {
              currency0: currency0,
              currency1: currency1,
              fee: feeValue, // Ensure this has the correct value
              tickSpacing: tickSpacingValue,
              hooks: hooksAddress
          };

          // --- Log the created key ---
          console.log("[PoolsContext] PoolKey created (using Dynamic Fee Flag):", JSON.stringify(poolKey));

          // --- Calculate Pool ID (verify calculation matches PoolId library if needed) ---
          // This calculation MUST match how the contract derives the ID.
           const poolId = solidityPackedKeccak256(
               ["address", "address", "uint24", "int24", "address"],
               [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
           );
           console.log("[PoolsContext] Calculated Pool ID:", poolId);

          // --- Fetch Pool State (Simplified) ---
          // TODO: Implement actual fetching of slot0 for current price and hook state for desired price
          const currentPricePlaceholder = 0;
          const desiredPricePlaceholder = 0;

          // --- Create Pool Data Object ---
          const poolData: V4Pool = {
              id: 1, // Static ID for now
              name: `${tokenSymbols[TOKEN_A_ADDRESS] ?? 'TKA'} / ${tokenSymbols[TOKEN_B_ADDRESS] ?? 'TKB'} Pool`,
              tokenA: tokenSymbols[TOKEN_A_ADDRESS] ?? 'TKA',
              tokenB: tokenSymbols[TOKEN_B_ADDRESS] ?? 'TKB',
              tokenA_Address: TOKEN_A_ADDRESS,
              tokenB_Address: TOKEN_B_ADDRESS,
              poolAddress: ZeroAddress, // Placeholder - requires derivation/fetching
              poolId: poolId,           // Store the calculated ID
              poolKey: poolKey,         // Store the key object
              currentPrice: currentPricePlaceholder, // Placeholder
              desiredPrice: desiredPricePlaceholder, // Placeholder
              baseFee: poolKey.fee,     // Use fee from the key
          };

          setPools([poolData]);
          setSelectedPool(poolData);
          console.log("[PoolsContext] Pool data set successfully.");

      } catch (err: any) {
          console.error('[PoolsContext] Failed to load pool data:', err);
          setErrorPools(`Failed to load pool data: ${err.message || String(err)}`);
          setPools([]);
          setSelectedPool(null);
      } finally {
          setIsLoadingPools(false);
      }
  }, [provider, network, tokenSymbols, tokenDecimals]); // Dependencies

  useEffect(() => {
      if (provider && network?.chainId === TARGET_NETWORK_CHAIN_ID) {
          fetchPoolData();
      } else {
          setPools([]); setSelectedPool(null); setErrorPools(null); setIsLoadingPools(false);
      }
  }, [provider, network, fetchPoolData]);

  const setSelectedPoolById = useCallback((poolId: number | null) => {
      // Simple selection logic for single pool
      if (poolId === 1 && pools.length > 0) {
          setSelectedPool(pools[0]);
      } else {
          setSelectedPool(null);
      }
  }, [pools]);

  const contextValue = useMemo(
      () => ({
          pools,
          selectedPool,
          isLoadingPools,
          errorPools,
          fetchPoolData,
          // setSelectedPoolById, // Expose if needed later
      }),
      [pools, selectedPool, isLoadingPools, errorPools, fetchPoolData]
  );

  return (
      <PoolsContext.Provider value={contextValue}>{children}</PoolsContext.Provider>
  );
};