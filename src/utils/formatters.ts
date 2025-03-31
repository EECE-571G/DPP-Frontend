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

/**
 * Formats a number as a percentage string.
 * @param value - The number (e.g., 0.05 for 5%).
 * @param decimals - Number of decimal places for the percentage. Defaults to 2.
 * @returns Formatted percentage string (e.g., "5.00%").
 */
export const formatPercent = (value: number | undefined | null, decimals = 2): string => {
    if (value === undefined || value === null || isNaN(value)) return '0.00%';
    return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Shortens an address by keeping a specified number of characters at the beginning and the end.
 * If the address is undefined, it returns an empty string.
 * @param address - The full address string.
 * @param chars - The number of characters to keep at both the start (excluding the first two characters) and the end. Defaults to 4.
 * @returns The shortened address string.
 */
export const shortenAddress = (address: string | undefined, chars = 4): string => {
  if (!address) return '';
  return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
};