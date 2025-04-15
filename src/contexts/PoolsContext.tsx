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
// Ethers v6 imports: Use ZeroAddress, Contract, solidityPackedKeccak256, getAddress, FixedNumber, formatUnits
import { ZeroAddress, Contract, solidityPackedKeccak256, getAddress, FixedNumber, formatUnits } from 'ethers';
import { Pool } from '../types'; // Keep base Pool type for now
import { useAuthContext } from './AuthContext';
import { useBalancesContext } from './BalancesContext';
import {
  POOL_MANAGER_ADDRESS,
  TOKEN_A_ADDRESS,
  TOKEN_B_ADDRESS,
  TOKEN_C_ADDRESS, // Make sure this is imported
  POOL_TICK_SPACING,
  DESIRED_PRICE_POOL_HOOK_ADDRESS, // Governance/Hook contract address
  DYNAMIC_FEE_FLAG,
  TARGET_NETWORK_CHAIN_ID,
} from '../constants';
// Import necessary ABIs
import PoolManagerABI from '../abis/IPoolManager.json';
import DesiredPricePoolABI from '../abis/DesiredPricePool.json'; // Contains desiredPrice, lpFees, hookFees
// Import utility
import { TickMath } from '../utils/tickMath'; // Assuming you have tick math helpers

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
  // --- Data fetched from contracts ---
  // From Hook/Governance (DesiredPricePool.sol)
  desiredPriceTick: number | null; // Fetched from the hook
  lpFeeRate: number | null; // Fetched from hook's lpFees mapping (pips)
  hookFeeRate: number | null; // Fetched from hook's hookFees mapping (%)
  // --- Data NOT easily available without indexer/direct pool access ---
  currentTick: number | null; // Cannot reliably fetch from PoolManager view funcs
  sqrtPriceX96: bigint | null; // Cannot reliably fetch
  liquidity: bigint | null; // Cannot reliably fetch
  protocolFee: number | null; // Cannot reliably fetch
  // --- Recalculated fields based on available data ---
  // currentPrice: number; // Will be derived from currentTick/sqrtPriceX96 if available
  // desiredPrice: number; // Will be derived from desiredPriceTick
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
  const { provider, network } = useAuthContext(); // Use read-only provider
  const { tokenSymbols, tokenDecimals } = useBalancesContext();

  const [pools, setPools] = useState<V4Pool[]>([]);
  const [selectedPool, setSelectedPool] = useState<V4Pool | null>(null);
  const [isLoadingPools, setIsLoadingPools] = useState<boolean>(false);
  const [errorPools, setErrorPools] = useState<string | null>(null);

  const handlePoolSelection = useCallback((pool: V4Pool | null) => {
      setSelectedPool(pool);
      console.log('[PoolsContext] Pool selected:', pool?.name ?? 'None');
  }, []);

  const fetchPoolData = useCallback(async () => {
      if (!provider || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
          setPools([]); setSelectedPool(null); setErrorPools(null); setIsLoadingPools(false);
          return;
      }
      if (POOL_MANAGER_ADDRESS === ZeroAddress || TOKEN_A_ADDRESS === ZeroAddress || TOKEN_B_ADDRESS === ZeroAddress || TOKEN_C_ADDRESS === ZeroAddress || DESIRED_PRICE_POOL_HOOK_ADDRESS === ZeroAddress) {
          setErrorPools("Required addresses (PoolManager, Tokens A/B/C, Hook) not configured.");
          setIsLoadingPools(false); setPools([]); setSelectedPool(null);
          return;
      }
      if (!DesiredPricePoolABI || DesiredPricePoolABI.length === 0) {
           setErrorPools("DesiredPricePool ABI is missing.");
           setIsLoadingPools(false); setPools([]); setSelectedPool(null);
           return;
      }

      setIsLoadingPools(true);
      setErrorPools(null);

      try {
          // Use Hook contract to get DesiredPrice, lpFees, hookFees
          const hookContract = new Contract(DESIRED_PRICE_POOL_HOOK_ADDRESS, DesiredPricePoolABI, provider);
          // PoolManager is still needed for other interactions potentially, but not for slot0/liquidity here
          // const poolManagerContract = new Contract(POOL_MANAGER_ADDRESS, PoolManagerABI, provider);

          const feeValue = DYNAMIC_FEE_FLAG; // Or your specific fee if not dynamic
          const tickSpacingValue = POOL_TICK_SPACING;
          const hooksAddress = DESIRED_PRICE_POOL_HOOK_ADDRESS;

          const poolDefinitions: { nameTemplate: string; token0: string; token1: string; id: number }[] = [
              { nameTemplate: `${tokenSymbols[TOKEN_A_ADDRESS] ?? 'A'}/${tokenSymbols[TOKEN_B_ADDRESS] ?? 'B'} Pool`, token0: TOKEN_A_ADDRESS, token1: TOKEN_B_ADDRESS, id: 1 },
              { nameTemplate: `${tokenSymbols[TOKEN_B_ADDRESS] ?? 'B'}/${tokenSymbols[TOKEN_C_ADDRESS] ?? 'C'} Pool`, token0: TOKEN_B_ADDRESS, token1: TOKEN_C_ADDRESS, id: 2 },
              { nameTemplate: `${tokenSymbols[TOKEN_A_ADDRESS] ?? 'A'}/${tokenSymbols[TOKEN_C_ADDRESS] ?? 'C'} Pool`, token0: TOKEN_A_ADDRESS, token1: TOKEN_C_ADDRESS, id: 3 },
          ];

          const fetchedPools: V4Pool[] = [];
          let firstPool: V4Pool | null = null;

          for (const def of poolDefinitions) {
              const [currency0, currency1] = def.token0.toLowerCase() < def.token1.toLowerCase()
                  ? [def.token0, def.token1]
                  : [def.token1, def.token0];

              const poolKey: PoolKey = { currency0, currency1, fee: feeValue, tickSpacing: tickSpacingValue, hooks: hooksAddress };
              const poolId = solidityPackedKeccak256(["address", "address", "uint24", "int24", "address"], [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]);

              console.log(`[PoolsContext] Processing Pool: ${def.nameTemplate}, ID: ${poolId}`);

              try {
                  // Fetch data *available* from the Hook contract
    const [desiredPriceTickBigInt, lpFeePipsBigInt, hookFeePercentBigInt] = await Promise.all([
        hookContract.desiredPrice(poolId).catch(() => null), // Default to null on error
        hookContract.lpFees(poolId).catch(() => null),       // Default to null on error
        hookContract.hookFees(poolId).catch(() => null),     // Default to null on error
    ]);

    // Since we cannot get currentTick/sqrtPriceX96 reliably, set them to null
    const currentTick = null;
    const sqrtPriceX96 = null; // Explicitly null as we didn't fetch it
    const liquidity = null;
    const protocolFeeRaw = null; // Explicitly null

    const desiredPriceTick = desiredPriceTickBigInt !== null ? Number(desiredPriceTickBigInt) : null;
    const lpFeePips = lpFeePipsBigInt !== null ? Number(lpFeePipsBigInt) : null;
    const hookFeePercent = hookFeePercentBigInt !== null ? Number(hookFeePercentBigInt) : null;

    // Calculate desired price ONLY if tick was fetched
    const decimals0 = tokenDecimals[poolKey.currency0] ?? 18;
    const decimals1 = tokenDecimals[poolKey.currency1] ?? 18;
    const desiredPrice = (desiredPriceTick !== null)
        ? TickMath.getPriceAtTick(desiredPriceTick, decimals0, decimals1)
        : 0; // Default if tick not fetched

    // Set current price to 0 as we don't have the necessary data
    const currentPrice = 0;

    // --- Create Pool Data Object ---
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
        // --- From Hook Contract ---
        desiredPriceTick: desiredPriceTick,
        lpFeeRate: lpFeePips,
        hookFeeRate: hookFeePercent,
        desiredPrice: desiredPrice, // Derived price
        // --- Unavailable from direct view calls ---
        currentTick: currentTick,
        sqrtPriceX96: sqrtPriceX96,
        liquidity: liquidity,
        protocolFee: protocolFeeRaw !== null ? Number(protocolFeeRaw) : null, // Use fetched if available (though it's null now)
        currentPrice: currentPrice, // Set explicitly to 0 or NaN
        // --- Base fee from key ---
        baseFee: poolKey.fee,
    };

    fetchedPools.push(poolData);
    if (!firstPool) {
        firstPool = poolData;
    }
    console.log(`[PoolsContext] Fetched hook data for ${poolData.name}: DesiredTick=${desiredPriceTick}, LpFee=${lpFeePips}, HookFee=${hookFeePercent}`);

} catch (poolError: any) {
    console.error(`[PoolsContext] Failed processing pool ${def.nameTemplate} (ID: ${poolId}):`, poolError);
    setErrorPools(prev => prev ? `${prev}; Failed for ${def.nameTemplate}` : `Failed for ${def.nameTemplate}`);
}

          }

          setPools(fetchedPools);
          setSelectedPool(firstPool); // Select the first successfully processed pool
          console.log(`[PoolsContext] Pool data fetch process complete. ${fetchedPools.length} pools processed.`);

      } catch (err: any) {
          console.error('[PoolsContext] Major error during pool data fetch:', err);
          setErrorPools(`Failed to load pool data: ${err.message || String(err)}`);
          setPools([]);
          setSelectedPool(null);
      } finally {
          setIsLoadingPools(false);
      }
  }, [provider, network, tokenSymbols, tokenDecimals]); // Added tokenDecimals dependency

  useEffect(() => {
      // Fetch when provider, network, AND token data are ready
      if (provider && network?.chainId === TARGET_NETWORK_CHAIN_ID && Object.keys(tokenSymbols).length > 0) {
          fetchPoolData();
      } else {
          setPools([]); setSelectedPool(null); setErrorPools(null); setIsLoadingPools(false);
      }
  }, [provider, network, tokenSymbols, fetchPoolData]); // tokenSymbols is a proxy for token data readiness


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