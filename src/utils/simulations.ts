import { Pool } from '../types';
import { MOCK_TOKEN_PRICES } from './mockData'; // Use mock prices for value estimation

/**
 * Calculates the dynamic trading fee based on a simulated price impact.
 * This is a simplified simulation for the frontend.
 *
 * @param sellAmount - Amount of sellToken being sold.
 * @param sellTokenSymbol - The symbol of the token being sold (e.g., 'ETH').
 * @param pool - The specific pool object.
 * @returns Object containing the calculated fee percentage and an explanation.
 */
export const calculateDynamicFee = (
  sellAmount: number,
  sellTokenSymbol: string,
  pool: Pool | null // Allow null pool
): { feePercentage: number; explanation: string } => {
  if (!pool || sellAmount <= 0) {
    return {
      feePercentage: pool?.baseFee ?? 0, // Default to base fee or 0 if no pool
      explanation: pool ? `Base Fee: ${(pool.baseFee * 100).toFixed(2)}%` : 'No pool selected',
    };
  }

  const { currentPrice, desiredPrice, baseFee, tokenA, tokenB } = pool;
  const priceBefore = currentPrice;
  let priceAfter: number;

  // --- Price Impact Simulation (Highly Simplified) ---
  // A more realistic simulation would consider pool depth (reserves)
  // This version uses an arbitrary impact factor based on amount
  const impactFactor = 0.0005 * Math.sqrt(sellAmount); // Example: Non-linear impact

  if (sellTokenSymbol === tokenA) {
    priceAfter = priceBefore * (1 - impactFactor); // Selling A decreases A/B price
  } else if (sellTokenSymbol === tokenB) {
    priceAfter = priceBefore / (1 - impactFactor); // Selling B increases A/B price (equivalent to decreasing B/A)
    // Avoid division by zero/negative factors if impactFactor >= 1 (unlikely here)
    priceAfter = Math.max(priceAfter, 0.000001); // Ensure price stays positive
  } else {
    priceAfter = priceBefore; // Should not happen if tokens match pool
  }
  // --- End Price Impact Simulation ---


  const distBefore = Math.abs(priceBefore - desiredPrice);
  const distAfter = Math.abs(priceAfter - desiredPrice);

  // Add a small tolerance to avoid floating point issues in comparisons
  const tolerance = 1e-9;

  const movesTowardsDesired = distAfter < distBefore - tolerance;
  const movesAwayFromDesired = distAfter > distBefore + tolerance;

  let feeMultiplier = 1.0; // Start with base fee multiplier
  let explanationSuffix = '';

  if (movesTowardsDesired) {
    feeMultiplier = 0.5; // Discount (e.g., 50%)
    explanationSuffix = ' (discounted - moved towards desired)';
  } else if (movesAwayFromDesired) {
    feeMultiplier = 2.0; // Penalty (e.g., 200%)
    explanationSuffix = ' (increased - moved away from desired)';
  }

  let feePercentage = baseFee * feeMultiplier;

  // --- Fee Clamping ---
  // Ensure fee doesn't go below a minimum or above a maximum (example bounds)
  const minFee = 0.0001; // 0.01%
  const maxFee = 0.05; // 5%
  feePercentage = Math.max(minFee, Math.min(maxFee, feePercentage));
  // --- End Fee Clamping ---

  const explanation = `Est. Fee: ${(feePercentage * 100).toFixed(3)}%${explanationSuffix}`;

  return { feePercentage, explanation };
};


/**
 * Estimates potential vDPP rewards for adding liquidity.
 * This is a highly simplified frontend simulation.
 * Rewards are higher if the deposit helps move the price towards the desired price.
 *
 * @param amountA - Amount of token A being deposited.
 * @param amountB - Amount of token B being deposited.
 * @param pool - The specific pool object.
 * @returns Object containing the estimated reward amount and an explanation.
 */
export const calculateEstimatedVdppRewards = (
    amountA: number,
    amountB: number,
    pool: Pool | null // Allow null pool
): { reward: number; explanation: string } => {
    if (!pool || (amountA <= 0 && amountB <= 0)) {
        return { reward: 0, explanation: 'Enter amounts to estimate rewards.' };
    }

    const { currentPrice, desiredPrice, tokenA, tokenB } = pool;

    // --- Price Impact Simulation (Simplified for Liquidity Add) ---
    // Adding liquidity tends to push the price *towards* the ratio of the added assets.
    const depositRatio = amountB > 0 ? amountA / amountB : currentPrice; // Ratio A/B of the deposit

    // Simulate the price *after* a hypothetical large swap were to occur *after* your liquidity is added
    // A simpler approach: check if depositRatio itself is closer to desiredPrice than currentPrice
    const distCurrent = Math.abs(currentPrice - desiredPrice);
    const distDeposit = Math.abs(depositRatio - desiredPrice);

    // Add a small tolerance
    const tolerance = 1e-9;
    const movesTowardsDesired = distDeposit < distCurrent - tolerance;
    // --- End Price Impact Simulation ---


    // --- Reward Calculation (Example Logic) ---
    // Base reward could be proportional to the USD value deposited and time locked (not simulated here)
    // Bonus multiplier if the deposit ratio helps stabilize the price.

    let rewardFactor = 0.02; // Base reward factor (e.g., 2% of value deposited, annualized - very arbitrary!)
    let explanation = "Base vDPP reward estimate based on deposit value.";

    if (movesTowardsDesired) {
        rewardFactor = 0.05; // Higher reward factor for helping price
        explanation = "Estimated reward increased: Deposit ratio is closer to the desired price than the current pool price.";
    } else if (Math.abs(depositRatio - currentPrice) > tolerance) {
         // Optional: Penalize slightly if deposit ratio moves away? Or just no bonus.
         explanation = "Deposit ratio differs from current price. Base reward estimate applied."
    }

    // Calculate reward based on approximate USD value of deposit
    const valueA = (MOCK_TOKEN_PRICES[tokenA] || 0) * amountA;
    const valueB = (MOCK_TOKEN_PRICES[tokenB] || 0) * amountB;
    const totalValue = valueA + valueB;
    const reward = totalValue * rewardFactor; // This is a highly simplified instantaneous reward estimate

    // --- End Reward Calculation ---

    return {
        reward: reward > 0 ? reward : 0,
        explanation: explanation
    };
};