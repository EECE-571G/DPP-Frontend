/**
 * Formats a numerical balance into a locale-aware string with specified decimal places.
 * Handles undefined, null, and non-numeric inputs gracefully.
 * @param balance - The numerical balance (or string representation).
 * @param decimals - The maximum number of fraction digits. Defaults to 4.
 * @param minDecimals - The minimum number of fraction digits. Defaults to 2.
 * @returns Formatted balance string or '0.00'.
 */
export const formatBalance = (
  balance: number | string | undefined | null,
  decimals = 4,
  minDecimals = 2
): string => {
  if (balance === undefined || balance === null) return (0).toFixed(minDecimals);
  const num = typeof balance === 'string' ? parseFloat(balance) : balance;
  if (isNaN(num)) return (0).toFixed(minDecimals);

  return num.toLocaleString(undefined, {
    minimumFractionDigits: Math.min(minDecimals, decimals), // Ensure min isn't > max
    maximumFractionDigits: decimals,
  });
};