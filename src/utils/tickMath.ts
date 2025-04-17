// frontend/src/utils/tickMath.ts

const Q96 = 2n ** 96n;
const Q192 = Q96 * Q96; // 2n ** 192n;

const MIN_SQRT_RATIO = 4295128739n;
const MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342n;
const MIN_TICK = -887272;
const MAX_TICK = 887272;

// Define a reasonable number of decimal places for the final price output
const PRICE_DISPLAY_DECIMALS = 18;

export class TickMath {
    private constructor() {}

    /**
     * Returns the sqrt ratio as a Q64.96 corresponding to a given tick.
     */
    public static getSqrtRatioAtTick(tick: number): bigint {
         const absTick = Math.abs(tick);
         const MAX_ABS_TICK_EXP = 709;

         if (absTick > MAX_ABS_TICK_EXP) {
             // console.warn(`Tick ${tick} exponent is too large for JS Math.exp.`);
             return tick < 0 ? MIN_SQRT_RATIO + 1n : MAX_SQRT_RATIO - 1n;
         }

         const exponent = absTick * Math.log(1.0001) / 2;
         if (exponent > MAX_ABS_TICK_EXP) { // Double check after calculation
             // console.warn(`Tick ${tick} exponent is too large for JS Math.exp.`);
             return tick < 0 ? MIN_SQRT_RATIO + 1n : MAX_SQRT_RATIO - 1n;
         }

         const ratio = Math.exp(exponent);
         let resultBigInt: bigint;

         if (tick < 0) {
             if (ratio === 0 || !Number.isFinite(1 / ratio)) {
                 return MIN_SQRT_RATIO + 1n;
             }
             const scaleFactor = 10n ** 36n;
             const scaledNumerator = Q96 * scaleFactor;
             const scaledDenominator = BigInt(Math.floor(ratio * Number(scaleFactor)));
             if (scaledDenominator === 0n) return MIN_SQRT_RATIO + 1n;
             resultBigInt = scaledNumerator / scaledDenominator;

         } else {
             if (!Number.isFinite(ratio) || Number.isNaN(ratio)) {
                 // console.error(`Calculated ratio is not finite for tick ${tick}. Ratio: ${ratio}`);
                 return MAX_SQRT_RATIO - 1n;
             }
              const scaleFactor = 10n ** 18n;
              resultBigInt = (BigInt(Math.floor(ratio * Number(scaleFactor))) * Q96) / scaleFactor;
         }

         if (resultBigInt < MIN_SQRT_RATIO) return MIN_SQRT_RATIO;
         if (resultBigInt > MAX_SQRT_RATIO) return MAX_SQRT_RATIO;

         return resultBigInt;
    }

    /**
     * Calculates the price (token1/token0) from a sqrtPriceX96 value using BigInt math.
     * Returns a standard JavaScript number, aiming for reasonable display precision.
     */
    public static getPriceAtSqrtRatio(sqrtRatioX96: bigint | null, decimals0: number, decimals1: number): number {
        if (sqrtRatioX96 === null || sqrtRatioX96 < MIN_SQRT_RATIO || sqrtRatioX96 > MAX_SQRT_RATIO) {
            return NaN;
        }

        try {
            // Calculate numerator = sqrtRatioX96^2 * 10^decimals0
            const numerator = (sqrtRatioX96 * sqrtRatioX96) * (10n ** BigInt(decimals0));

            // Calculate denominator = Q192 * 10^decimals1
            const denominator = Q192 * (10n ** BigInt(decimals1));

            if (denominator === 0n) {
                console.error("Price calculation denominator is zero.");
                return NaN; // Avoid division by zero
            }

            // Perform division with scaling for precision
            const scaleFactor = 10n ** BigInt(PRICE_DISPLAY_DECIMALS);
            const scaledPrice = (numerator * scaleFactor) / denominator;

            // Convert the scaled BigInt result to a number string
            const priceString = this.bigintToFloatString(scaledPrice, PRICE_DISPLAY_DECIMALS);
            const priceFloat = parseFloat(priceString);

            if (Number.isNaN(priceFloat) || !Number.isFinite(priceFloat)) {
                console.error(`Could not convert scaled price BigInt ${scaledPrice} to float string: ${priceString}`);
                return NaN;
            }

            return priceFloat;

        } catch (e: any) {
            console.error(`Error during BigInt price calculation for sqrtRatio ${sqrtRatioX96}:`, e);
            // Check if the error is RangeError (likely BigInt size limit)
            if (e instanceof RangeError) {
                 console.error("RangeError encountered, likely BigInt exceeded maximum size during intermediate calculation.");
                 // Return Infinity or 0 based on magnitude guess
                 return (sqrtRatioX96 > Q96) ? Infinity : 0;
            }
            return NaN;
        }
    }

    /**
     * Helper function to convert a scaled BigInt to a float string.
     * (Keep the previous robust version of this function)
     */
     private static bigintToFloatString(value: bigint, decimals: number): string {
        const valueStr = value.toString();
        const negative = value < 0n;
        const absStr = negative ? valueStr.substring(1) : valueStr;

        let integerPart = "0";
        let fractionPart = "";

        if (absStr.length <= decimals) {
            integerPart = "0";
            fractionPart = absStr.padStart(decimals, '0');
        } else {
            integerPart = absStr.substring(0, absStr.length - decimals);
            fractionPart = absStr.substring(absStr.length - decimals);
        }

        // Trim trailing zeros from fraction for cleaner output
        fractionPart = fractionPart.replace(/0+$/, '');
        if (fractionPart.length === 0) {
             // Return integer part if no fraction left, or "0.0" if integer was also zero
            return negative ? `-${integerPart}` : (integerPart === "0" ? "0.0" : integerPart);
        }

        return `${negative ? '-' : ''}${integerPart}.${fractionPart}`;
    }


    /**
     * Calculates the price (token1/token0) at a given tick.
     * (Keep the previous robust version of this function)
     */
    public static getPriceAtTick(tick: number | null, decimals0: number, decimals1: number): number {
        if (tick === null || tick < MIN_TICK || tick > MAX_TICK) {
            return NaN;
        }

        try {
            // Handle tick 0 separately for directness
            if (tick === 0) {
                 const decimalDiff = decimals0 - decimals1;
                 // Use Number's built-in power for potentially better range than BigInt power
                 return 10**decimalDiff;
             }
            const sqrtRatioX96 = TickMath.getSqrtRatioAtTick(tick);
            return TickMath.getPriceAtSqrtRatio(sqrtRatioX96, decimals0, decimals1);
        } catch (e) {
            console.error(`Error calculating price for tick ${tick}:`, e);
            return NaN;
        }
    }
}