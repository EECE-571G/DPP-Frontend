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
// Ethers v6 imports
import { ZeroAddress, Contract, solidityPackedKeccak256, getAddress, FixedNumber, formatUnits } from 'ethers';
import { Pool } from '../types';
import { useAuthContext } from './AuthContext';
import { useBalancesContext } from './BalancesContext';
import {
  POOL_MANAGER_ADDRESS,
  TOKEN_A_ADDRESS,
  TOKEN_B_ADDRESS,
  TOKEN_C_ADDRESS,
  POOL_TICK_SPACING,
  DESIRED_PRICE_POOL_HOOK_ADDRESS,
  DESIRED_PRICE_POOL_HELPER_ADDRESS, // Keep if other helper functions are used
  DYNAMIC_FEE_FLAG,
  TARGET_NETWORK_CHAIN_ID,
} from '../constants';
// Import necessary ABIs
import DesiredPricePoolABI from '../abis/DesiredPricePool.json';
// Import utility
import { TickMath } from '../utils/tickMath';

// --- Constants for Mocking ---
const MOCK_INITIAL_DESIRED_TICK = 0; // <<< Set desired tick to 0 for demo
const MOCK_INITIAL_CURRENT_TICK = 0; // <<< Start current tick at 0 for demo
const LS_MOCK_CURRENT_TICK_KEY = 'dpp_mock_current_tick_'; // Add poolId suffix

// --- Define PoolKey Struct Matching Solidity ---
export interface PoolKey {
  currency0: string;
  currency1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
}

// --- Extend Base Pool Type ---
export interface V4Pool extends Pool {
  poolKey: PoolKey;
  poolId: string;
  // --- Mocked/Fetched State ---
  desiredPriceTick: number | null; // Will be mocked
  lpFeeRate: number | null; // Can still fetch from hook
  hookFeeRate: number | null; // Can still fetch from hook
  currentTick: number | null; // Will be mocked
  sqrtPriceX96: bigint | null; // Derived from mocked currentTick
  liquidity: bigint | null;
  protocolFee: number | null;
  // --- Calculated fields ---
  currentPrice: number; // Derived from mocked currentTick
  desiredPrice: number; // Derived from mocked desiredPriceTick
}

interface PoolsContextType {
  pools: V4Pool[];
  selectedPool: V4Pool | null;
  isLoadingPools: boolean;
  errorPools: string | null;
  fetchPoolData: () => Promise<void>; // Keep fetch for non-mocked data if needed
  handlePoolSelection: (pool: V4Pool | null) => void;
  // <<< ADDED: Mock state and update function >>>
  mockCurrentTickMap: Record<string, number | null>; // Store mock ticks per poolId
  updateMockCurrentTick: (poolId: string, newTick: number) => void;
  mockDesiredTick: number; // Global mock desired tick for demo simplicity
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
  const { provider, network } = useAuthContext(); // Still needed for hook contract calls
  const { tokenSymbols, tokenDecimals } = useBalancesContext();

  const [pools, setPools] = useState<V4Pool[]>([]);
  const [selectedPool, setSelectedPool] = useState<V4Pool | null>(null);
  const [isLoadingPools, setIsLoadingPools] = useState<boolean>(false);
  const [errorPools, setErrorPools] = useState<string | null>(null);

  // <<< ADDED: State for Mock Ticks >>>
  const [mockCurrentTickMap, setMockCurrentTickMap] = useState<Record<string, number | null>>({});
  // Use a fixed desired tick for the demo
  const mockDesiredTick = MOCK_INITIAL_DESIRED_TICK;

  // <<< ADDED: Function to initialize mock state from localStorage >>>
  const initializeMockTicks = useCallback(() => {
      const initialMap: Record<string, number | null> = {};
       // Define pool IDs based on definitions (ensure this matches fetchPoolData)
       const poolDefinitions: { token0: string; token1: string }[] = [
          { token0: TOKEN_A_ADDRESS, token1: TOKEN_B_ADDRESS },
          { token0: TOKEN_B_ADDRESS, token1: TOKEN_C_ADDRESS },
          { token0: TOKEN_A_ADDRESS, token1: TOKEN_C_ADDRESS },
       ];

       for (const def of poolDefinitions) {
          try {
               const [currency0, currency1] = def.token0.toLowerCase() < def.token1.toLowerCase()
                  ? [def.token0, def.token1]
                  : [def.token1, def.token0];
               const poolKey: PoolKey = { currency0, currency1, fee: DYNAMIC_FEE_FLAG, tickSpacing: POOL_TICK_SPACING, hooks: DESIRED_PRICE_POOL_HOOK_ADDRESS };
               const poolId = solidityPackedKeccak256(["address", "address", "uint24", "int24", "address"], [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]);

               const storageKey = `${LS_MOCK_CURRENT_TICK_KEY}${poolId}`;
               const storedTick = localStorage.getItem(storageKey);
               if (storedTick !== null && !isNaN(Number(storedTick))) {
                   initialMap[poolId] = Number(storedTick);
                   console.log(`[PoolsContext Mock] Initialized mock tick for ${poolId} from LS: ${initialMap[poolId]}`);
               } else {
                   initialMap[poolId] = MOCK_INITIAL_CURRENT_TICK; // Default if not in LS
                   localStorage.setItem(storageKey, String(initialMap[poolId])); // Store default
                   console.log(`[PoolsContext Mock] Initialized mock tick for ${poolId} to default: ${initialMap[poolId]}`);
               }
          } catch (e) {
               console.error("Error initializing mock tick for definition:", def, e);
          }
       }
      setMockCurrentTickMap(initialMap);
  }, []); // Dependencies should be constants from '../constants'

  // <<< ADDED: Initialize mock state on mount >>>
  useEffect(() => {
      initializeMockTicks();
  }, [initializeMockTicks]);


  // <<< ADDED: Function to update mock tick state and localStorage >>>
  const updateMockCurrentTick = useCallback((poolId: string, newTick: number) => {
      setMockCurrentTickMap(prevMap => {
          const updatedMap = { ...prevMap, [poolId]: newTick };
          // Persist to localStorage
          const storageKey = `${LS_MOCK_CURRENT_TICK_KEY}${poolId}`;
          try {
              localStorage.setItem(storageKey, String(newTick));
              console.log(`[PoolsContext Mock] Updated mock tick for ${poolId} to ${newTick} and saved to LS.`);
          } catch (e) {
              console.error(`[PoolsContext Mock] Failed to save mock tick to LS for ${poolId}:`, e);
          }
          return updatedMap;
      });
      // Also update the `pools` state array directly for immediate reflection
      setPools(prevPools => prevPools.map(p => {
          if (p.poolId === poolId) {
              const decimals0 = tokenDecimals[p.poolKey.currency0] ?? 18;
              const decimals1 = tokenDecimals[p.poolKey.currency1] ?? 18;
              const newSqrtPrice = TickMath.getSqrtRatioAtTick(newTick);
              const newCurrentPrice = TickMath.getPriceAtSqrtRatio(newSqrtPrice, decimals0, decimals1);
              return { ...p, currentTick: newTick, sqrtPriceX96: newSqrtPrice, currentPrice: newCurrentPrice };
          }
          return p;
      }));
       // Update selectedPool if it matches
      setSelectedPool(prevSelected => {
          if (prevSelected?.poolId === poolId) {
               const decimals0 = tokenDecimals[prevSelected.poolKey.currency0] ?? 18;
              const decimals1 = tokenDecimals[prevSelected.poolKey.currency1] ?? 18;
              const newSqrtPrice = TickMath.getSqrtRatioAtTick(newTick);
              const newCurrentPrice = TickMath.getPriceAtSqrtRatio(newSqrtPrice, decimals0, decimals1);
              return { ...prevSelected, currentTick: newTick, sqrtPriceX96: newSqrtPrice, currentPrice: newCurrentPrice };
          }
          return prevSelected;
      });
  }, [tokenDecimals]); // Need tokenDecimals for price recalc

  const handlePoolSelection = useCallback((pool: V4Pool | null) => {
      setSelectedPool(pool);
      console.log('[PoolsContext] Pool selected:', pool?.name ?? 'None');
  }, []);

  // <<< MODIFIED: Fetch only hook data (lpFee, hookFee) if needed, use MOCK ticks/prices >>>
  const fetchPoolData = useCallback(async () => {
      // Prerequisite checks (mostly for provider/network/addresses for hook calls)
      if (!provider || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
          setPools([]); setSelectedPool(null); setErrorPools(null); setIsLoadingPools(false);
          return;
      }
      // Removed ABI checks for Helper/Manager if only fetching hook data
      if (DESIRED_PRICE_POOL_HOOK_ADDRESS === ZeroAddress || !DesiredPricePoolABI) {
           setErrorPools("Hook address or ABI missing.");
           setIsLoadingPools(false); setPools([]); setSelectedPool(null);
           return;
      }
      // Check if mock ticks are loaded, if not, maybe wait or re-initialize?
      if (Object.keys(mockCurrentTickMap).length === 0) {
          console.warn("[PoolsContext] Mock ticks not yet initialized in fetchPoolData. Attempting re-init.");
          initializeMockTicks(); // Try to initialize if map is empty
           // Consider returning or setting loading if initialization is async and needed first
      }


      setIsLoadingPools(true);
      setErrorPools(null);

      try {
          const hookContract = new Contract(DESIRED_PRICE_POOL_HOOK_ADDRESS, DesiredPricePoolABI, provider);
          // No Helper contract needed if not fetching real price

          const feeValue = DYNAMIC_FEE_FLAG;
          const tickSpacingValue = POOL_TICK_SPACING;
          const hooksAddress = DESIRED_PRICE_POOL_HOOK_ADDRESS;

          const poolDefinitions: { nameTemplate: string; token0: string; token1: string; id: number }[] = [
              { nameTemplate: `${tokenSymbols[TOKEN_A_ADDRESS] ?? 'A'}/${tokenSymbols[TOKEN_B_ADDRESS] ?? 'B'} Pool`, token0: TOKEN_A_ADDRESS, token1: TOKEN_B_ADDRESS, id: 1 },
              { nameTemplate: `${tokenSymbols[TOKEN_B_ADDRESS] ?? 'B'}/${tokenSymbols[TOKEN_C_ADDRESS] ?? 'C'} Pool`, token0: TOKEN_B_ADDRESS, token1: TOKEN_C_ADDRESS, id: 2 },
              { nameTemplate: `${tokenSymbols[TOKEN_A_ADDRESS] ?? 'A'}/${tokenSymbols[TOKEN_C_ADDRESS] ?? 'C'} Pool`, token0: TOKEN_A_ADDRESS, token1: TOKEN_C_ADDRESS, id: 3 },
          ];

          const fetchedPools: V4Pool[] = [];
          let firstPool: V4Pool | null = null;

          // Use Promise.all to fetch hook fees concurrently
          const hookFeePromises = poolDefinitions.map(async (def) => {
              const [currency0, currency1] = def.token0.toLowerCase() < def.token1.toLowerCase()
                  ? [def.token0, def.token1]
                  : [def.token1, def.token0];
              const poolKey: PoolKey = { currency0, currency1, fee: feeValue, tickSpacing: tickSpacingValue, hooks: hooksAddress };
              const poolId = solidityPackedKeccak256(["address", "address", "uint24", "int24", "address"], [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]);

              console.log(`[PoolsContext] Processing Pool (Mock Mode): ${def.nameTemplate}, ID: ${poolId}`);

              try {
                  // Fetch only hook data (optional, could be mocked too)
                   const [lpFeeBigInt, hFeeBigInt] = await Promise.all([
                        hookContract.lpFees(poolId).catch(() => null),
                        hookContract.hookFees(poolId).catch(() => null),
                   ]);

                  const lpFeePips: number | null = lpFeeBigInt !== null ? Number(lpFeeBigInt) : null;
                  const hookFeePercent: number | null = hFeeBigInt !== null ? Number(hFeeBigInt) : null;

                  // <<< USE MOCKED TICKS >>>
                  const desiredPriceTick = mockDesiredTick;
                  const currentTick = mockCurrentTickMap[poolId] ?? MOCK_INITIAL_CURRENT_TICK; // Use map value or default

                  // --- Calculate Prices from MOCKED Ticks ---
                  const decimals0 = tokenDecimals[poolKey.currency0] ?? 18;
                  const decimals1 = tokenDecimals[poolKey.currency1] ?? 18;

                  const desiredPrice = TickMath.getPriceAtTick(desiredPriceTick, decimals0, decimals1);
                  const sqrtPriceX96 = TickMath.getSqrtRatioAtTick(currentTick);
                  const currentPrice = TickMath.getPriceAtSqrtRatio(sqrtPriceX96, decimals0, decimals1);

                  // --- Create Pool Data Object with Mocked Values ---
                  const poolData: V4Pool = {
                      id: def.id,
                      name: def.nameTemplate,
                      tokenA: tokenSymbols[def.token0] ?? def.token0.slice(0, 6),
                      tokenB: tokenSymbols[def.token1] ?? def.token1.slice(0, 6),
                      tokenA_Address: def.token0,
                      tokenB_Address: def.token1,
                      poolAddress: ZeroAddress,
                      poolId: poolId,
                      poolKey: poolKey,
                      desiredPriceTick: desiredPriceTick,
                      lpFeeRate: lpFeePips,
                      hookFeeRate: hookFeePercent,
                      currentTick: currentTick,
                      sqrtPriceX96: sqrtPriceX96,
                      currentPrice: currentPrice,
                      desiredPrice: desiredPrice,
                      liquidity: null,
                      protocolFee: null,
                      baseFee: poolKey.fee,
                  };
                   console.log(`[PoolsContext Mock] Pool ${def.id} state: DesiredTick=${desiredPriceTick}, CurrentTick=${currentTick}, CurrentPrice=${currentPrice}`);
                  return poolData; // Return the processed pool data

              } catch (poolError: any) {
                  console.error(`[PoolsContext] Failed processing pool ${def.nameTemplate} (ID: ${poolId}):`, poolError);
                  setErrorPools(prev => prev ? `${prev}; Failed processing ${def.nameTemplate}` : `Failed processing ${def.nameTemplate}`);
                  return null; // Return null if processing failed for this pool
              }
          }); // End map

          // Wait for all promises and filter out nulls (failed pools)
          const results = await Promise.all(hookFeePromises);
          const successfulPools = results.filter(p => p !== null) as V4Pool[];

          setPools(successfulPools);
          // Select the first successfully processed pool
          setSelectedPool(successfulPools.length > 0 ? successfulPools[0] : null);
          console.log(`[PoolsContext] Mock pool data processing complete. ${successfulPools.length} pools processed.`);

      } catch (err: any) {
          console.error('[PoolsContext] Major error during mock pool data processing:', err);
          setErrorPools(`Failed to process mock pool data: ${err.message || String(err)}`);
          setPools([]);
          setSelectedPool(null);
      } finally {
          setIsLoadingPools(false);
      }
  // <<< Added mockCurrentTickMap and initializeMockTicks dependencies >>>
  }, [provider, network, tokenSymbols, tokenDecimals, mockDesiredTick, mockCurrentTickMap, initializeMockTicks]);

  // <<< MODIFIED: useEffect dependencies - depend on mock map readiness >>>
  useEffect(() => {
      // Fetch only when provider, network, token data, AND mock ticks are ready
      if (provider && network?.chainId === TARGET_NETWORK_CHAIN_ID && Object.keys(tokenSymbols).length > 0 && Object.keys(tokenDecimals).length > 0 && Object.keys(mockCurrentTickMap).length > 0) {
          fetchPoolData();
      } else {
          // Don't clear pools if mock map isn't ready yet, just ensure loading state is handled
          // setPools([]); setSelectedPool(null); // Avoid clearing unnecessarily
          setErrorPools(null);
          // Maybe set loading based on mock map readiness?
          setIsLoadingPools(Object.keys(mockCurrentTickMap).length === 0);
      }
  // <<< ADDED mockCurrentTickMap, REMOVED fetchPoolData (called internally) >>>
  }, [provider, network, tokenSymbols, tokenDecimals, mockCurrentTickMap]);


  // <<< ADDED: Expose mock state and updater in context value >>>
  const contextValue = useMemo(
      () => ({
          pools,
          selectedPool,
          isLoadingPools,
          errorPools,
          fetchPoolData,
          handlePoolSelection,
          mockCurrentTickMap,
          updateMockCurrentTick,
          mockDesiredTick,
      }),
      [pools, selectedPool, isLoadingPools, errorPools, fetchPoolData, handlePoolSelection, mockCurrentTickMap, updateMockCurrentTick, mockDesiredTick] // Added mock state/updater
  );

  return (
      <PoolsContext.Provider value={contextValue}>{children}</PoolsContext.Provider>
  );
};