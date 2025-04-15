// src/hooks/useSwapEstimate.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ethers, ZeroAddress, Contract, formatUnits, parseUnits, isAddress, ZeroHash } from 'ethers'; // Ethers v6 imports
import { useAuthContext } from '../contexts/AuthContext';
import { usePoolsContext, V4Pool } from '../contexts/PoolsContext';
import { useBalancesContext } from '../contexts/BalancesContext';
import {
    DESIRED_PRICE_POOL_HELPER_ADDRESS,
    TARGET_NETWORK_CHAIN_ID,
} from '../constants';
import DesiredPricePoolHelperABI from '../abis/DesiredPricePoolHelper.json';
// <<< FIX: Import local type definition and helper functions >>>
import { BalanceDelta, getAmount0Delta, getAmount1Delta } from '../types/BalanceDelta';
import { TickMath } from '../utils/tickMath'; // Assuming you have this utility

// Debounce function (simple implementation)
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            func(...args);
        };
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(later, wait);
    };
}

export const useSwapEstimate = (
    sellAmountStr: string,
    sellTokenAddress: string | null,
    buyTokenAddress: string | null
) => {
    const { provider, network } = useAuthContext();
    const { selectedPool } = usePoolsContext();
    const { tokenDecimals } = useBalancesContext();

    const [estimatedBuyAmountStr, setEstimatedBuyAmountStr] = useState<string>("0.0");
    const [isLoadingEstimate, setIsLoadingEstimate] = useState<boolean>(false);
    const [estimateError, setEstimateError] = useState<string | null>(null);

    const performEstimate = useCallback(async (
        pool: V4Pool,
        sellAddr: string,
        buyAddr: string,
        sellAmountParsed: bigint
    ) => {
        if (!provider || network?.chainId !== TARGET_NETWORK_CHAIN_ID || sellAmountParsed <= 0n) {
            setEstimatedBuyAmountStr("0.0");
            setIsLoadingEstimate(false);
            setEstimateError(null); // Clear error on invalid input
            return;
        }

        if (DESIRED_PRICE_POOL_HELPER_ADDRESS === ZeroAddress || !DesiredPricePoolHelperABI) {
             setEstimateError("Helper contract not configured for estimation.");
             setIsLoadingEstimate(false);
             setEstimatedBuyAmountStr("0.0");
             return;
        }

        setIsLoadingEstimate(true);
        setEstimateError(null); // Clear previous errors before fetching
        setEstimatedBuyAmountStr("0.0");

        try {
            const helperContract = new Contract(DESIRED_PRICE_POOL_HELPER_ADDRESS, DesiredPricePoolHelperABI, provider);
            const { poolKey } = pool;

            if (!isAddress(poolKey.currency0) || !isAddress(poolKey.currency1) || poolKey.currency0 === ZeroAddress || poolKey.currency1 === ZeroAddress) {
                 throw new Error("Invalid pool key currencies for estimation.");
            }

            const zeroForOne = sellAddr.toLowerCase() === poolKey.currency0.toLowerCase();
            if ((zeroForOne && buyAddr.toLowerCase() !== poolKey.currency1.toLowerCase()) ||
                (!zeroForOne && buyAddr.toLowerCase() !== poolKey.currency0.toLowerCase())) {
                throw new Error("Swap direction doesn't match selected pool tokens.");
            }

             const sqrtPriceLimitX96 = zeroForOne
                ? 4295128739n + 1n
                : 1461446703485210103287273052203988822378723970342n - 1n;

            console.log(`[Estimate] Simulating swapExactIn: zeroForOne=${zeroForOne}, amountIn=${sellAmountParsed.toString()}, limit=${sqrtPriceLimitX96.toString()}`);

            // Static call returns the packed int256 BalanceDelta
            const returnedDeltaPacked: ethers.BigNumberish = await helperContract.swapExactIn.staticCall(
                poolKey,
                zeroForOne,
                sellAmountParsed,
                sqrtPriceLimitX96
            );

            console.log('[Estimate] Raw returned delta (packed):', returnedDeltaPacked.toString());

            // <<< FIX: Use imported helper functions >>>
            const amount0Delta = getAmount0Delta(returnedDeltaPacked);
            const amount1Delta = getAmount1Delta(returnedDeltaPacked);
            console.log(`[Estimate] Decoded Delta: amount0=${amount0Delta}, amount1=${amount1Delta}`);

            let buyAmountWei: bigint;
            let buyDecimals: number;

            if (zeroForOne) {
                buyAmountWei = -amount1Delta;
                buyDecimals = tokenDecimals[buyAddr] ?? 18;
            } else {
                buyAmountWei = -amount0Delta;
                buyDecimals = tokenDecimals[buyAddr] ?? 18;
            }

             if (buyAmountWei < 0n) {
                 console.warn("[Estimate] Calculated buy amount is negative, likely an issue.", buyAmountWei);
                 buyAmountWei = 0n;
             }

             console.log(`[Estimate] Estimated Buy Amount (Wei): ${buyAmountWei.toString()}, Decimals: ${buyDecimals}`);

            const formattedBuyAmount = formatUnits(buyAmountWei, buyDecimals);
            setEstimatedBuyAmountStr(formattedBuyAmount);
            console.log(`[Estimate] Estimated Buy Amount (Formatted): ${formattedBuyAmount}`);

        } catch (error: any) {
            console.error("Swap estimation failed:", error);
            const reason = error?.reason || error?.data?.message || error?.shortMessage || error.message || "Estimation failed.";
            if (reason.includes('Panic due to OVERFLOW(17)') || (error.code === 'CALL_EXCEPTION' && error.revert?.name ==='Panic' && error.revert?.args?.[0]?.toString() === '17')) {
                setEstimateError("Calculation overflow: Input amount may be too large.");
            } else if (reason.includes('PoolNotInitialized')) {
                 setEstimateError("Pool is not initialized.");
            } else if (reason.includes('Invalid SqrtPriceLimit')) {
                 setEstimateError("Price limit reached during estimation.");
            } else {
                const shortReason = reason.split(' (')[0]; // Get text before parenthesis
                setEstimateError(`Could not estimate: ${shortReason}`);
            }
            setEstimatedBuyAmountStr("0.0");
        } finally {
            setIsLoadingEstimate(false);
        }
    }, [provider, network, tokenDecimals]);

    // Debounced estimation trigger
    const debouncedEstimate = useMemo(() => debounce(performEstimate, 500), [performEstimate]);

    // Effect to trigger estimation when inputs change
    useEffect(() => {
        if (!selectedPool || !sellTokenAddress || !buyTokenAddress || !sellAmountStr) {
            setEstimatedBuyAmountStr("0.0");
            setIsLoadingEstimate(false);
            setEstimateError(null); // Clear error if inputs are invalid/cleared
            return;
        }

        const sellDecimals = tokenDecimals[sellTokenAddress] ?? 18;
        let amountInWei: bigint;
        try {
            amountInWei = parseUnits(sellAmountStr, sellDecimals);
             if (amountInWei <= 0n) {
                 setEstimatedBuyAmountStr("0.0");
                 setIsLoadingEstimate(false);
                 setEstimateError(null); // Clear error for zero/negative
                 return;
             }
        } catch {
             setEstimatedBuyAmountStr("0.0");
             setIsLoadingEstimate(false);
             setEstimateError("Invalid sell amount"); // Set error on invalid format
            return;
        }

        // Clear error *before* debounced call starts
        setEstimateError(null);
        debouncedEstimate(selectedPool, sellTokenAddress, buyTokenAddress, amountInWei);

    }, [sellAmountStr, sellTokenAddress, buyTokenAddress, selectedPool, tokenDecimals, debouncedEstimate]);

    return { estimatedBuyAmountStr, isLoadingEstimate, estimateError };
};