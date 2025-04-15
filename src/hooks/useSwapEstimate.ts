// src/hooks/useSwapEstimate.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    ethers, ZeroAddress, Contract, formatUnits, parseUnits, isAddress, ZeroHash, FixedNumber
} from 'ethers'; // Ethers v6 imports - ADD FixedNumber
import { useAuthContext } from '../contexts/AuthContext';
import { usePoolsContext, V4Pool } from '../contexts/PoolsContext';
import { useBalancesContext } from '../contexts/BalancesContext';
import { useGovernanceContext } from '../contexts/GovernanceContext'; // <<< IMPORT Governance Context
import {
    TARGET_NETWORK_CHAIN_ID,
    // Constants matching the contract for fee calculation
    DEFAULT_BASE_FEE_PER_TICK, // <<< Now imported correctly
    DEFAULT_HOOK_FEE,          // <<< Now imported correctly
} from '../constants';
// ABIs are not needed for frontend estimation
// import DesiredPricePoolHelperABI from '../abis/DesiredPricePoolHelper.json';
import { BalanceDelta, getAmount0Delta, getAmount1Delta } from '../types/BalanceDelta'; // Keep for potential future use? Not strictly needed now.
import { TickMath } from '../utils/tickMath';

// Debounce function (keep as is)
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

// --- Fee Calculation Constants (from Poll.sol / DesiredPricePool.sol) ---
const HOOK_FEE_PERCENT_DENOMINATOR = 100;
const FEE_RATE_DENOMINATOR = 1_000_000; // Fees are in ppm or similar for baseFee
const TICK_SPACING_SQRT_FACTOR_SHIFT = 116; // (factor << 16) / (factor + (abs(tickDiff) << 116))
const DYNAMIC_FEE_MULTIPLIER_SHIFT = 16;

// --- Helper to Estimate Tick Difference (APPROXIMATION) ---
// This is a very rough estimate based on swap size relative to balance
// A more sophisticated model would require more pool data.
const estimateTickDiff = (
    sellAmountWei: bigint,
    sellBalanceWei: bigint,
    tickSpacing: number,
    maxTickImpactEstimate: number = 10 // Max estimated ticks moved by a large swap
): number => {
    if (sellBalanceWei <= 0n) return 0; // Avoid division by zero

    // Calculate swap size as a percentage of balance (scaled)
    const percentageScaled = (sellAmountWei * 10000n) / sellBalanceWei; // Percentage * 100

    // Simple linear scaling - assumes swapping 100% of balance moves by maxTickImpactEstimate
    const estimatedDiff = (BigInt(maxTickImpactEstimate) * percentageScaled) / 10000n;

    // Return as number, ensuring it's a multiple of tickSpacing (simplification)
    const diffNum = Number(estimatedDiff);
    return Math.round(diffNum / tickSpacing) * tickSpacing;
};
// --- End Helper ---

export const useSwapEstimate = (
    sellAmountStr: string,
    sellTokenAddress: string | null,
    buyTokenAddress: string | null
) => {
    // Contexts
    const { provider, network } = useAuthContext(); // Keep provider/network check
    const { selectedPool } = usePoolsContext();
    const { tokenDecimals, userBalancesRaw } = useBalancesContext(); // Need raw balances
    const { metaData: governanceMetaData } = useGovernanceContext(); // <<< Get Governance Metadata

    // State
    const [estimatedBuyAmountStr, setEstimatedBuyAmountStr] = useState<string>("0.0");
    const [isLoadingEstimate, setIsLoadingEstimate] = useState<boolean>(false);
    const [estimateError, setEstimateError] = useState<string | null>(null);

    // --- Frontend Estimation Logic ---
    const performFrontendEstimate = useCallback(async (
        pool: V4Pool,
        govMeta: NonNullable<typeof governanceMetaData>, // Ensure metadata is present
        sellAddr: string,
        buyAddr: string,
        sellAmountWei: bigint
    ) => {
        if (!pool.poolKey || govMeta.desiredPriceTick === null || sellAmountWei <= 0n) {
             setEstimatedBuyAmountStr("0.0");
             setIsLoadingEstimate(false);
             setEstimateError(null);
             return;
        }

        setIsLoadingEstimate(true);
        setEstimateError(null);
        setEstimatedBuyAmountStr("0.0"); // Reset while calculating

        try {
            const { poolKey } = pool;
            const { desiredPriceTick } = govMeta;
            const tickSpacing = poolKey.tickSpacing;
            const sellDecimals = tokenDecimals[sellAddr] ?? 18;
            const buyDecimals = tokenDecimals[buyAddr] ?? 18;
            const sellBalanceWei = userBalancesRaw[sellAddr] ?? 0n;

            const zeroForOne = sellAddr.toLowerCase() === poolKey.currency0.toLowerCase();

            // --- Calculate Ideal Price (token1/token0) at Desired Tick ---
            const idealPriceNum = TickMath.getPriceAtTick(desiredPriceTick, sellDecimals, buyDecimals);
            if (isNaN(idealPriceNum) || idealPriceNum <= 0) {
                throw new Error("Could not calculate price at desired tick.");
            }
            // Use FixedNumber for precision - create a format matching the buy token's decimals
            const idealPriceFixed = FixedNumber.fromString(idealPriceNum.toFixed(buyDecimals), `fixed128x${buyDecimals}`);
            const sellAmountFixed = FixedNumber.fromValue(sellAmountWei, sellDecimals, `fixed128x${sellDecimals}`);

            // --- Calculate Gross Output (before fees) ---
            let grossOutputFixed: FixedNumber;
            if (zeroForOne) {
                // Selling token0 for token1. Price is T1/T0. Output = SellAmount * Price
                 grossOutputFixed = sellAmountFixed.mulUnsafe(idealPriceFixed); // Use mulUnsafe for potential overflow handling if needed, or mul
            } else {
                 // Selling token1 for token0. Price is T1/T0. Output = SellAmount / Price
                 if (idealPriceFixed.isZero()) throw new Error("Price is zero, cannot divide.");
                 grossOutputFixed = sellAmountFixed.divUnsafe(idealPriceFixed); // Use divUnsafe
            }
            // Convert gross output to target decimals format *before* fee calculation
            grossOutputFixed = FixedNumber.fromValue(grossOutputFixed.value, buyDecimals, `fixed128x${buyDecimals}`);


            // --- Calculate Fees ---
            // 1. Base LP Fee Rate (pips - parts per million)
            const baseLpFeePips = BigInt(DEFAULT_BASE_FEE_PER_TICK) * BigInt(tickSpacing); // Use BigInt
            // <<< FIX: Use fromValue for BigInt >>>
            const baseLpFeeRateFixed = FixedNumber.fromValue(baseLpFeePips, 0).divUnsafe(FixedNumber.fromValue(BigInt(FEE_RATE_DENOMINATOR), 0));

            // 2. Base Hook Fee Rate (%)
            const baseHookFeePercent = BigInt(DEFAULT_HOOK_FEE);
            // <<< FIX: Use fromValue for BigInt >>>
            const baseHookFeeRateFixed = FixedNumber.fromValue(baseHookFeePercent, 0).divUnsafe(FixedNumber.fromValue(BigInt(HOOK_FEE_PERCENT_DENOMINATOR), 0));

            // 3. Base LP Fee Amount (applied to gross output)
            const baseLpFeeAmountFixed = grossOutputFixed.mulUnsafe(baseLpFeeRateFixed);

            // 4. Base Hook Fee Amount (applied to LP fee amount)
            const hookFeeAmountBaseFixed = baseLpFeeAmountFixed.mulUnsafe(baseHookFeeRateFixed);

            // 5. Estimate Price Impact (Tick Difference)
            const estimatedTickDiff = estimateTickDiff(sellAmountWei, sellBalanceWei, tickSpacing);
            console.log(`[Estimate] Estimated Tick Diff: ${estimatedTickDiff}`);

            // 6. Calculate Dynamic Hook Fee Adjustment
            let adjustedHookFeeAmountFixed = hookFeeAmountBaseFixed; // Start with base
            if (estimatedTickDiff !== 0 && tickSpacing > 0) {
                try {
                    // Replicate factor calculation carefully with BigInt
                    const tickSpacingBigInt = BigInt(tickSpacing);
                    const factorSqrt = Math.sqrt(Number(tickSpacingBigInt)); // JS sqrt is fine here
                    // Scale factorSqrt before converting back to BigInt to maintain precision
                    const factorScaled = BigInt(Math.floor(factorSqrt * (2**116))); // Scale similar to contract's use of sqrt(tickSpacing << 232)
                    const factor = (factorScaled << 2n); // Equivalent to * 4

                    const absTickDiffBigInt = BigInt(Math.abs(estimatedTickDiff));
                    const denominatorScaled = factor + (absTickDiffBigInt << BigInt(TICK_SPACING_SQRT_FACTOR_SHIFT));

                    if (denominatorScaled > 0n) {
                        // dynamicMultiplier = (factor << 16) / denominatorScaled;
                        // <<< FIX: Perform shift on BigInt, then create FixedNumber >>>
                        const dynamicMultiplierNumerator = factor << BigInt(DYNAMIC_FEE_MULTIPLIER_SHIFT); // Shift BigInt
                        const dynamicMultiplierFixed = FixedNumber.fromValue(dynamicMultiplierNumerator, 0) // Create FN from shifted value
                            .divUnsafe(FixedNumber.fromValue(denominatorScaled, 0)); // Divide by denominator

                        // adjustedHookFeeAmountFixed = hookFeeAmountBaseFixed * dynamicMultiplier >> 16;
                        adjustedHookFeeAmountFixed = hookFeeAmountBaseFixed.mulUnsafe(dynamicMultiplierFixed);


                        // Adjust further if price moved away from desired
                        if (estimatedTickDiff > 0) {
                            // adjustedHookFeeAmount = (hookFeeAmountBase << 1) - adjustedHookFeeAmount;
                            // <<< FIX: Perform shift on BigInt value, then create FixedNumber >>>
                            const baseHookFeeAmountBaseShifted = hookFeeAmountBaseFixed.value << 1n;
                            const baseHookFeeAmountBaseShiftedFixed = FixedNumber.fromValue(baseHookFeeAmountBaseShifted, hookFeeAmountBaseFixed.decimals, hookFeeAmountBaseFixed.format); // Use same format
                            adjustedHookFeeAmountFixed = baseHookFeeAmountBaseShiftedFixed.subUnsafe(adjustedHookFeeAmountFixed);
                        }

                        // Ensure fee doesn't become negative
                        if (adjustedHookFeeAmountFixed.isNegative()) {
                             adjustedHookFeeAmountFixed = FixedNumber.fromValue(0n, adjustedHookFeeAmountFixed.decimals, adjustedHookFeeAmountFixed.format); // Use correct format
                        }
                        console.log(`[Estimate] Dynamic Hook Fee Factor Applied. Base: ${hookFeeAmountBaseFixed.toString()}, Adjusted: ${adjustedHookFeeAmountFixed.toString()}`);

                    } else {
                        console.warn("[Estimate] Dynamic fee denominator was zero, using base hook fee.");
                    }
                } catch (mathError) {
                     console.error("[Estimate] Error during dynamic fee factor calculation:", mathError, "Using base hook fee.");
                     // Fallback to base hook fee on error
                     adjustedHookFeeAmountFixed = hookFeeAmountBaseFixed;
                }
            }

            // 7. Total Fee Amount
            const totalFeeFixed = baseLpFeeAmountFixed.addUnsafe(adjustedHookFeeAmountFixed);

            // 8. Net Output Amount
            let netOutputFixed = grossOutputFixed.subUnsafe(totalFeeFixed);

            // Ensure output is not negative
            if (netOutputFixed.isNegative()) {
                // <<< FIX: Use fromValue >>>
                netOutputFixed = FixedNumber.fromValue(0n, netOutputFixed.decimals, netOutputFixed.format);
            }

            // --- Format Output ---
            // Use formatUnits on the BigInt value extracted from FixedNumber
            const netOutputWei = netOutputFixed.value;
            const formattedBuyAmount = formatUnits(netOutputWei, buyDecimals);
            setEstimatedBuyAmountStr(formattedBuyAmount);
            console.log(`[Estimate FE] Gross: ${grossOutputFixed.toString()}, LP Fee: ${baseLpFeeAmountFixed.toString()}, Hook Fee: ${adjustedHookFeeAmountFixed.toString()}, Net: ${formattedBuyAmount}`);

        } catch (error: any) {
            console.error("Frontend Swap estimation failed:", error);
            setEstimateError(`Estimation Error: ${error.message}`);
            setEstimatedBuyAmountStr("0.0");
        } finally {
            setIsLoadingEstimate(false);
        }
    }, [tokenDecimals, userBalancesRaw]); // Dependencies for the calculation logic

    // Debounced estimation trigger (memoized)
    const debouncedFrontendEstimate = useMemo(() => debounce(performFrontendEstimate, 300), [performFrontendEstimate]);

    // Effect to trigger estimation
    useEffect(() => {
        // Basic validation before attempting estimation
        if (!selectedPool || !sellTokenAddress || !buyTokenAddress || !sellAmountStr || !governanceMetaData || governanceMetaData.desiredPriceTick === null) {
            setEstimatedBuyAmountStr("0.0");
            setIsLoadingEstimate(false);
            setEstimateError(null);
            return;
        }

        const sellDecimals = tokenDecimals[sellTokenAddress] ?? 18;
        let amountInWei: bigint;
        try {
            amountInWei = parseUnits(sellAmountStr, sellDecimals);
            if (amountInWei <= 0n) {
                setEstimatedBuyAmountStr("0.0");
                setIsLoadingEstimate(false);
                setEstimateError(null);
                return;
            }
        } catch {
            setEstimatedBuyAmountStr("0.0");
            setIsLoadingEstimate(false);
            setEstimateError("Invalid sell amount");
            return;
        }

        // Clear error and call debounced function
        setEstimateError(null);
        debouncedFrontendEstimate(selectedPool, governanceMetaData, sellTokenAddress, buyTokenAddress, amountInWei);

    }, [
        sellAmountStr,
        sellTokenAddress,
        buyTokenAddress,
        selectedPool,
        governanceMetaData, // Re-estimate if governance data (desired tick) changes
        tokenDecimals,
        debouncedFrontendEstimate // Debounced function is stable
    ]);

    return { estimatedBuyAmountStr, isLoadingEstimate, estimateError };
};