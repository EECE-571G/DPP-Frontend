// src/hooks/useSwapEstimate.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    formatUnits, parseUnits, FixedNumber
} from 'ethers';
import { useAuthContext } from '../contexts/AuthContext';
import { usePoolsContext, V4Pool } from '../contexts/PoolsContext';
import { useBalancesContext } from '../contexts/BalancesContext';
import { useGovernanceContext } from '../contexts/GovernanceContext';
import {
    DEFAULT_BASE_FEE_PER_TICK,
    DEFAULT_HOOK_FEE,
    POOL_TICK_SPACING,
} from '../constants';
import { TickMath } from '../utils/tickMath';

// Debounce function
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

// --- Fee Calculation Constants ---
const HOOK_FEE_PERCENT_DENOMINATOR = 100;
const FEE_RATE_DENOMINATOR = 1_000_000;
// --- ADJUST THIS FOR SENSITIVITY ---
// Lower value -> MORE sensitive adjustment (fee changes more drastically with tick diff)
const DYNAMIC_FEE_SENSITIVITY_FACTOR = 1.0; // *** DECREASED FOR MORE SENSITIVITY ***

// --- Helper to Estimate Tick Difference (APPROXIMATION - DEMO) ---
const estimateTickDiff = (
    sellAmountWei: bigint,
    sellBalanceWei: bigint,
    tickSpacing: number,
    maxTickImpactEstimate: number = 50 // Base impact estimate
): number => {
    if (sellBalanceWei <= 0n || sellAmountWei <= 0n) return 0;

    const basePercentageOffset = 10n; // Add 0.1% base effect
    const percentageScaled = ((sellAmountWei * 10000n) / sellBalanceWei) + basePercentageOffset;

    // --- INCREASED SENSITIVITY MULTIPLIER ---
    const multiplier = 40n; // *** INCREASED multiplier ***
    const estimatedDiffBigInt = (BigInt(maxTickImpactEstimate) * percentageScaled * multiplier) / 10000n;

    const diffNum = Number(estimatedDiffBigInt);
    let roundedTickDiff = Math.round(diffNum / tickSpacing) * tickSpacing;

    // Ensure non-zero diff for non-zero input (Demo Mod)
    if (roundedTickDiff === 0 && sellAmountWei > 0n) {
        if (diffNum > 0 || basePercentageOffset > 0n) {
             console.log(`[EstimateTickDiff] Forcing minimum tick difference of ${tickSpacing} (Original unrounded: ${diffNum.toFixed(4)})`);
             roundedTickDiff = tickSpacing;
        }
    }

    // Cap the estimated difference (Sanity Check)
    const maxReasonableDiff = tickSpacing * 30; // Increased cap slightly
    if (Math.abs(roundedTickDiff) > maxReasonableDiff) {
         roundedTickDiff = roundedTickDiff > 0 ? maxReasonableDiff : -maxReasonableDiff;
         console.log(`[EstimateTickDiff] Capping estimated tick difference to ${roundedTickDiff}`);
    }

    return roundedTickDiff;
};
// --- End Helper ---


export const useSwapEstimate = (
    sellAmountStr: string,
    sellTokenAddress: string | null,
    buyTokenAddress: string | null
) => {
    // Contexts
    const { provider, network } = useAuthContext();
    const { selectedPool } = usePoolsContext();
    const { tokenDecimals, userBalancesRaw } = useBalancesContext();
    const { metaData: governanceMetaData } = useGovernanceContext();

    // State
    const [estimatedBuyAmountStr, setEstimatedBuyAmountStr] = useState<string>("0.0");
    const [isLoadingEstimate, setIsLoadingEstimate] = useState<boolean>(false);
    const [estimateError, setEstimateError] = useState<string | null>(null);

    // --- Frontend Estimation Logic ---
    const performFrontendEstimate = useCallback(async (
        pool: V4Pool,
        govMeta: NonNullable<typeof governanceMetaData>,
        sellAddr: string,
        buyAddr: string,
        sellAmountWei: bigint
    ) => {
        if (!pool.poolKey || govMeta.desiredPriceTick === null || sellAmountWei <= 0n) {
             setEstimatedBuyAmountStr("0.0"); setIsLoadingEstimate(false); setEstimateError(null); return;
        }

        setIsLoadingEstimate(true); setEstimateError(null); setEstimatedBuyAmountStr("0.0");
        console.log(`\n--- Estimating Swap ---`);
        console.log(`Input Amount (Wei): ${sellAmountWei.toString()}`);
        console.log(`Selected Pool:`, pool);

        try {
            const { poolKey } = pool;
            const { desiredPriceTick } = govMeta;
            const tickSpacing = poolKey.tickSpacing ?? POOL_TICK_SPACING;
            const sellDecimals = tokenDecimals[sellAddr] ?? 18;
            const buyDecimals = tokenDecimals[buyAddr] ?? 18;
            const sellBalanceWei = userBalancesRaw[sellAddr] ?? 10n**BigInt(sellDecimals + 3);
            console.log(`Using Tick Spacing: ${tickSpacing}`);
            console.log(`Sell Balance (Wei, for estimate): ${sellBalanceWei.toString()}`);
            const zeroForOne = sellAddr.toLowerCase() === poolKey.currency0.toLowerCase();

            // --- Calculate Ideal Price & Gross Output ---
            const idealPriceNum = TickMath.getPriceAtTick(desiredPriceTick, sellDecimals, buyDecimals);
            if (isNaN(idealPriceNum) || idealPriceNum <= 0) throw new Error("Could not calculate price at desired tick.");
            const idealPriceFixed = FixedNumber.fromString(idealPriceNum.toFixed(buyDecimals), `fixed128x${buyDecimals}`);
            const sellAmountFixed = FixedNumber.fromValue(sellAmountWei, sellDecimals, `fixed128x${sellDecimals}`);
            let grossOutputFixed: FixedNumber;
            if (zeroForOne) { grossOutputFixed = sellAmountFixed.mulUnsafe(idealPriceFixed); }
            else { if (idealPriceFixed.isZero()) throw new Error("Price is zero."); grossOutputFixed = sellAmountFixed.divUnsafe(idealPriceFixed); }
            grossOutputFixed = FixedNumber.fromValue(grossOutputFixed.value, buyDecimals, `fixed128x${buyDecimals}`);
            console.log(`Gross Output Estimate (FixedNumber): ${grossOutputFixed.toString()}`);

            // --- Calculate Base Fees ---
            const baseLpFeePips = BigInt(DEFAULT_BASE_FEE_PER_TICK) * BigInt(tickSpacing);
            const baseLpFeeRateFixed = FixedNumber.fromValue(baseLpFeePips, 0).divUnsafe(FixedNumber.fromValue(BigInt(FEE_RATE_DENOMINATOR), 0));
            const lpFeeRatePercent = parseFloat(baseLpFeeRateFixed.mulUnsafe(FixedNumber.fromString('100')).toString()).toFixed(4);
            // Log base LP rate only once for clarity
            // console.log(`LP Fee Rate (Fixed): ${baseLpFeeRateFixed.toString()} (~${lpFeeRatePercent}%)`);
            const baseHookFeePercent = BigInt(DEFAULT_HOOK_FEE);
            const baseHookFeeRateFixed = FixedNumber.fromValue(baseHookFeePercent, 0).divUnsafe(FixedNumber.fromValue(BigInt(HOOK_FEE_PERCENT_DENOMINATOR), 0));
            // console.log(`Hook Fee Rate (Base % of LP Fee): ${baseHookFeeRateFixed.toString()} (${DEFAULT_HOOK_FEE}%)`);
            const baseLpFeeAmountFixed = grossOutputFixed.mulUnsafe(baseLpFeeRateFixed);
            // console.log(`LP Fee Amount (FixedNumber): ${baseLpFeeAmountFixed.toString()}`);
            const hookFeeAmountBaseFixed = baseLpFeeAmountFixed.mulUnsafe(baseHookFeeRateFixed);
            // console.log(`Hook Fee Amount (Base, FixedNumber): ${hookFeeAmountBaseFixed.toString()}`);

            // --- Estimated Tick Difference ---
            const estimatedTickDiffMagnitude = estimateTickDiff(sellAmountWei, sellBalanceWei, tickSpacing);
            let estimatedTickDiff = zeroForOne ? estimatedTickDiffMagnitude : -estimatedTickDiffMagnitude;
            console.log(`Estimated Tick Difference (Signed): ${estimatedTickDiff}`);

            // --- Dynamic Hook Fee Adjustment (SIMPLIFIED Ratio) ---
            let adjustedHookFeeAmountFixed = hookFeeAmountBaseFixed;
            let dynamicFactorString = "1.0 (No adjustment)";

            if (estimatedTickDiff !== 0 && tickSpacing > 0) {
                 try {
                    const absTickDiff = Math.abs(estimatedTickDiff);
                    const sensitivityDenominator = tickSpacing * DYNAMIC_FEE_SENSITIVITY_FACTOR;

                    if (sensitivityDenominator <= 0) {
                        console.warn("[Estimate] Invalid sensitivity denominator, using base hook fee.");
                        dynamicFactorString = "1.0 (Sensitivity Denominator Zero)";
                    } else {
                        const ratioTerm = FixedNumber.fromValue(BigInt(absTickDiff), 0)
                                                .divUnsafe(FixedNumber.fromValue(BigInt(Math.round(sensitivityDenominator)), 0));
                        const oneFixed = FixedNumber.fromString("1.0");
                        const denominatorMultiplier = oneFixed.addUnsafe(ratioTerm);

                        if (denominatorMultiplier.isZero()) {
                            console.warn("[Estimate] Simplified dynamic fee denominator became zero, using base hook fee.");
                            dynamicFactorString = "1.0 (Simplified Denominator Zero)";
                        } else {
                            const dynamicMultiplierFixed = oneFixed.addUnsafe(ratioTerm);
                            dynamicFactorString = dynamicMultiplierFixed.toString();
                            console.log(`Dynamic Hook Fee Factor Applied (Increasing): ${dynamicFactorString}`);    
                            adjustedHookFeeAmountFixed = hookFeeAmountBaseFixed.mulUnsafe(dynamicMultiplierFixed);

                            if (estimatedTickDiff > 0) {
                                 const maxSafeShiftVal = (1n << 255n) - 1n;
                                 if (hookFeeAmountBaseFixed.value < maxSafeShiftVal) {
                                     const baseHookFeeAmountBaseShifted = hookFeeAmountBaseFixed.value << 1n;
                                     const baseHookFeeAmountBaseShiftedFixed = FixedNumber.fromValue(baseHookFeeAmountBaseShifted, hookFeeAmountBaseFixed.decimals, hookFeeAmountBaseFixed.format);
                                     adjustedHookFeeAmountFixed = baseHookFeeAmountBaseShiftedFixed.subUnsafe(adjustedHookFeeAmountFixed);
                                 } else {
                                     console.warn("[Estimate] Base hook fee amount too large for bit-shift adjustment, skipping.");
                                 }
                            }

                            if (adjustedHookFeeAmountFixed.isNegative()) {
                                 adjustedHookFeeAmountFixed = FixedNumber.fromValue(0n, adjustedHookFeeAmountFixed.decimals, adjustedHookFeeAmountFixed.format);
                            }
                        }
                    }
                } catch (mathError: any) {
                     console.error("[Estimate] Error during simplified dynamic fee factor calculation:", mathError, "Using base hook fee.");
                      dynamicFactorString = `1.0 (Simplified Calc Error: ${mathError.code || mathError.message})`;
                     adjustedHookFeeAmountFixed = hookFeeAmountBaseFixed;
                }
            } else {
                 console.log("Tick difference is zero, dynamic hook fee factor not applied.");
            }
            // console.log(`Hook Fee Amount (Adjusted, FixedNumber): ${adjustedHookFeeAmountFixed.toString()}`);

            // --- Calculate Total Fee & Net Output ---
            const totalFeeFixed = baseLpFeeAmountFixed.addUnsafe(adjustedHookFeeAmountFixed);
            let netOutputFixed = grossOutputFixed.subUnsafe(totalFeeFixed);
            if (netOutputFixed.isNegative()) {
                netOutputFixed = FixedNumber.fromValue(0n, netOutputFixed.decimals, netOutputFixed.format);
            }

            // --- *** ADDED: Calculate and Log Fee Rates (relative to Gross Output) *** ---
            const zero = FixedNumber.fromString("0.0");
            const hundred = FixedNumber.fromString("100.0");
            let totalFeeRatePercent = zero;
            let lpFeeRatePercentActual = zero;
            let hookFeeRatePercentActual = zero;

            // Avoid division by zero if gross output is zero
            if (!grossOutputFixed.isZero()) {
                 totalFeeRatePercent = totalFeeFixed.divUnsafe(grossOutputFixed).mulUnsafe(hundred);
                 lpFeeRatePercentActual = baseLpFeeAmountFixed.divUnsafe(grossOutputFixed).mulUnsafe(hundred);
                 hookFeeRatePercentActual = adjustedHookFeeAmountFixed.divUnsafe(grossOutputFixed).mulUnsafe(hundred);
            }

            console.log(`--- Fee Rates (vs Gross Output) ---`);
            console.log(`LP Fee Rate: ${lpFeeRatePercentActual.round(4).toString()}%`);
            console.log(`Hook Fee Rate (Adjusted): ${hookFeeRatePercentActual.round(4).toString()}%`);
            console.log(`Total Effective Fee Rate: ${totalFeeRatePercent.round(4).toString()}%`);
            // --- *** END: Fee Rate Logging *** ---


            // --- Format Final Output for Display ---
            const netOutputWei = netOutputFixed.value;
            const displayDecimals = Math.max(6, buyDecimals);
            const formattedBuyAmount = formatUnits(netOutputWei, buyDecimals);
            const displayAmount = FixedNumber.fromString(formattedBuyAmount, `fixed256x${buyDecimals}`)
                                            .round(displayDecimals).toString();

            setEstimatedBuyAmountStr(displayAmount);
            console.log(`Net Output Estimate (Rounded Display): ${displayAmount}`);
            console.log(`--- Estimate End ---`);

        } catch (error: any) {
            console.error("Frontend Swap estimation failed:", error);
            setEstimateError(`Estimation Error: ${error.message}`);
            setEstimatedBuyAmountStr("0.0");
             console.log(`--- Estimate End (Error) ---`);
        } finally {
             setTimeout(() => setIsLoadingEstimate(false), 50);
        }
    }, [tokenDecimals, userBalancesRaw]); // Dependencies

    // Debounced estimation trigger
    const debouncedFrontendEstimate = useMemo(() => debounce(performFrontendEstimate, 400), [performFrontendEstimate]);

    // Effect to trigger estimation
    useEffect(() => {
        if (!selectedPool || !selectedPool.poolKey || !sellTokenAddress || !buyTokenAddress || !sellAmountStr || !governanceMetaData || governanceMetaData.desiredPriceTick === null) {
            setEstimatedBuyAmountStr("0.0"); setIsLoadingEstimate(false); setEstimateError(null); return;
        }
        const sellDecimals = tokenDecimals[sellTokenAddress] ?? 18;
        let amountInWei: bigint;
        try {
            const cleanAmountStr = sellAmountStr.endsWith('.') ? sellAmountStr.slice(0, -1) : sellAmountStr;
            if (cleanAmountStr === '' || parseFloat(cleanAmountStr) === 0) {
                 setEstimatedBuyAmountStr("0.0"); setIsLoadingEstimate(false); setEstimateError(null); return;
            }
            amountInWei = parseUnits(cleanAmountStr, sellDecimals);
            if (amountInWei <= 0n) {
                setEstimatedBuyAmountStr("0.0"); setIsLoadingEstimate(false); setEstimateError(null); return;
            }
        } catch (e){ setEstimatedBuyAmountStr("0.0"); setIsLoadingEstimate(false); return; }
        setEstimateError(null);
        setIsLoadingEstimate(true);
        debouncedFrontendEstimate(selectedPool, governanceMetaData, sellTokenAddress, buyTokenAddress, amountInWei);
    }, [sellAmountStr, sellTokenAddress, buyTokenAddress, selectedPool, governanceMetaData, tokenDecimals, debouncedFrontendEstimate]);

    return { estimatedBuyAmountStr, isLoadingEstimate, estimateError };
};