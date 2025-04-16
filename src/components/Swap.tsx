// src/components/Swap.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Select,
  MenuItem,
  CircularProgress,
  SelectChangeEvent,
  Fade,
  Skeleton,
  Alert,
  Link,
  Grid
} from '@mui/material';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { ethers, isAddress, parseUnits } from 'ethers'; // Import necessary ethers utils

// Contexts and Hooks
import { usePoolsContext, V4Pool } from '../contexts/PoolsContext';
import { useBalancesContext } from '../contexts/BalancesContext';
import { useLoadingContext } from '../contexts/LoadingContext';
import { useSwapActions } from '../hooks/useSwapActions';
import { useSwapEstimate } from '../hooks/useSwapEstimate'; // Import the estimate hook
import { formatBalance } from '../utils/formatters'; // Import formatter

// --- SwapInputSection Component ---
interface SwapInputSectionProps {
    label: string;
    tokenAddress: string | null;
    tokenSymbol: string;
    tokenDecimals: number;
    amountStr: string;
    balance: number; // Expects a number for display formatting
    poolTokenAddresses: string[];
    onAmountChange?: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onTokenChange: (event: SelectChangeEvent<string>) => void;
    onSetMax?: () => void;
    disabled?: boolean;
    readOnly?: boolean;
    tokenSymbols: Record<string, string>;
    isLoadingEstimate?: boolean; // Loading state for estimate display
}

const SwapInputSection: React.FC<SwapInputSectionProps> = ({
    label, tokenAddress, tokenSymbol, amountStr, balance, poolTokenAddresses,
    onAmountChange, onTokenChange, onSetMax, disabled, readOnly = false, tokenSymbols, isLoadingEstimate
}) => (
    <Box sx={{ mb: 1.5 }}>
        <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
             <Grid item>
                 <Typography variant="body2" fontWeight="medium" color="text.secondary">{label}</Typography>
             </Grid>
             <Grid item>
                 <Typography variant="caption" color="text.secondary">
                    {/* Format the balance prop */}
                    Balance: {formatBalance(balance, 6)}
                    {onSetMax && (
                        <Link component="button" variant="caption" onClick={onSetMax} disabled={disabled} sx={{ ml: 0.5 }}>Max</Link>
                    )}
                 </Typography>
             </Grid>
        </Grid>
        <TextField
            type={readOnly ? "text" : "number"}
            variant="outlined"
            placeholder="0.0"
            value={isLoadingEstimate ? 'Estimating...' : amountStr} // Show loading text
            onChange={onAmountChange}
            fullWidth
            disabled={disabled || isLoadingEstimate} // Disable input while estimating
            InputProps={{
                readOnly: readOnly,
                sx: { borderRadius: 2, pr: 0, bgcolor: readOnly ? 'action.disabledBackground' : undefined },
                inputProps: readOnly ? undefined : { min: 0, step: "any" },
                endAdornment: (
                <InputAdornment position="end" sx={{ mr: -0.5 }}>
                    <Select
                        value={tokenAddress || ''}
                        onChange={onTokenChange}
                        variant="standard"
                        disableUnderline
                        disabled={disabled} // Main disable prop controls Select too
                        sx={{ minWidth: 90, fontWeight: 500, mr: 1.5, '.MuiSelect-select': { py: 1.5, pr: '24px !important' }}}
                    >
                        {poolTokenAddresses.length === 0 && <MenuItem value="" disabled>N/A</MenuItem>}
                        {poolTokenAddresses.map(poolTokenAddr => (
                            <MenuItem key={poolTokenAddr} value={poolTokenAddr}>
                              {/* Display symbol, fallback to shortened address */}
                              {tokenSymbols[poolTokenAddr] ?? poolTokenAddr.slice(0,6)}
                            </MenuItem>
                        ))}
                    </Select>
                </InputAdornment>
                ),
            }}
        />
    </Box>
);
// --- End SwapInputSection ---


// Main Swap Component
const Swap: React.FC = () => {
    const { selectedPool, isLoadingPools, errorPools } = usePoolsContext();
    const { userBalances, tokenDecimals, tokenSymbols, isLoadingBalances, errorBalances } = useBalancesContext();
    const { isLoading: loadingStates } = useLoadingContext();
    const { handleSwap } = useSwapActions();

    // Component State
    const [sellAmountStr, setSellAmountStr] = useState("");
    const [sellTokenAddress, setSellTokenAddress] = useState<string | null>(null);
    const [buyTokenAddress, setBuyTokenAddress] = useState<string | null>(null);
    const [isRotating, setIsRotating] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null); // Local errors (validation, insufficient balance)

    // Estimate Hook
    const { estimatedBuyAmountStr, isLoadingEstimate, estimateError } = useSwapEstimate(
        sellAmountStr,
        sellTokenAddress,
        buyTokenAddress
    );

    // Loading States from Context
    const isLoadingSwap = loadingStates['swap'] ?? false;
    const isApprovingSell = loadingStates[`approve_${sellTokenAddress}`] ?? false;

    // Derived Values
    const sellAmountNum = useMemo(() => parseFloat(sellAmountStr) || 0, [sellAmountStr]);
    const sellBalanceStr = userBalances[sellTokenAddress || ''] ?? "0.0"; // Use raw string for comparison logic later
    const sellBalanceNum = parseFloat(sellBalanceStr); // Use number for display format
    const buyBalanceNum = parseFloat(userBalances[buyTokenAddress || ''] ?? "0.0");
    const sellSymbol = tokenSymbols[sellTokenAddress || ''] ?? '---';
    const buySymbol = tokenSymbols[buyTokenAddress || ''] ?? '---';
    const poolTokenAddresses = selectedPool ? [selectedPool.tokenA_Address, selectedPool.tokenB_Address].filter(a => !!a) as string[] : []; // Ensure addresses exist
    const hasSufficientBalance = useMemo(() => {
        if (!sellTokenAddress || !sellAmountStr) return true; // Don't show error if no amount entered
        try {
            const sellDecimals = tokenDecimals[sellTokenAddress] ?? 18;
            const sellAmountWei = parseUnits(sellAmountStr, sellDecimals);
            const sellBalanceWei = parseUnits(sellBalanceStr, sellDecimals);
            return sellAmountWei <= sellBalanceWei;
        } catch {
            return false; // Invalid input means insufficient balance for practical purposes
        }
    }, [sellAmountStr, sellTokenAddress, userBalances, tokenDecimals, sellBalanceStr]);

    // Effect to initialize/reset state when selected pool changes
    useEffect(() => {
        if (selectedPool && selectedPool.tokenA_Address && selectedPool.tokenB_Address) {
            // Prioritize setting sell/buy based on token order in pool key if possible
            const tkA = selectedPool.tokenA_Address;
            const tkB = selectedPool.tokenB_Address;
            setSellTokenAddress(tkA); // Default to selling TokenA
            setBuyTokenAddress(tkB);
            setSellAmountStr("");
            setErrorMsg(null);
        } else {
            setSellTokenAddress(null);
            setBuyTokenAddress(null);
            setSellAmountStr("");
            setErrorMsg(null);
        }
    }, [selectedPool]);

    // --- Handlers ---

    const handleSwapTokens = useCallback(() => {
         if (isRotating || isLoadingSwap || isApprovingSell || isLoadingEstimate) return;
         setIsRotating(true);
         const currentSell = sellTokenAddress;
         const currentBuy = buyTokenAddress;
         setSellTokenAddress(currentBuy);
         setBuyTokenAddress(currentSell);
         setSellAmountStr(""); // Clear amount on swap
         setErrorMsg(null);
         setTimeout(() => setIsRotating(false), 300);
    }, [sellTokenAddress, buyTokenAddress, isRotating, isLoadingSwap, isApprovingSell, isLoadingEstimate]);

    const handleSetMaxSell = useCallback(() => {
       if (!sellTokenAddress) return;
       // Use the raw string balance directly for max amount
       setSellAmountStr(userBalances[sellTokenAddress] ?? "0.0");
       setErrorMsg(null); // Clear local error
    }, [sellTokenAddress, userBalances]);

    const handleSellAmountChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
         const value = e.target.value;
         // Basic filtering to prevent non-numeric/negative inputs at source
         if (/^\d*\.?\d*$/.test(value)) {
             setSellAmountStr(value);
         } else if (value === '') {
              setSellAmountStr(''); // Allow clearing
         }
         setErrorMsg(null); // Clear local error on input change
    };

    const handleTokenChange = useCallback((event: SelectChangeEvent<string>, type: 'sell' | 'buy') => {
        const newTokenAddress = event.target.value;
        if (!newTokenAddress || !isAddress(newTokenAddress)) return; // Basic validation

        setErrorMsg(null);
        if (type === 'sell') {
            if (newTokenAddress === buyTokenAddress) handleSwapTokens(); // If user selects the 'buy' token, swap them
            else setSellTokenAddress(newTokenAddress);
        } else { // type === 'buy'
            if (newTokenAddress === sellTokenAddress) handleSwapTokens(); // If user selects the 'sell' token, swap them
            else setBuyTokenAddress(newTokenAddress);
        }
        setSellAmountStr(""); // Clear amount when token changes
    }, [buyTokenAddress, sellTokenAddress, handleSwapTokens]);

    const handlePerformSwap = useCallback(async () => {
        setErrorMsg(null); // Clear previous local errors

        // --- Robust Input Validation ---
        if (!selectedPool || !selectedPool.poolKey) {
            setErrorMsg("No pool selected or pool key missing."); return;
        }
        if (!sellTokenAddress || !buyTokenAddress || sellTokenAddress === buyTokenAddress || !isAddress(sellTokenAddress) || !isAddress(buyTokenAddress)) {
            setErrorMsg("Select distinct and valid Sell and Buy tokens."); return;
        }
        const poolTokens = [
            selectedPool.tokenA_Address?.toLowerCase(),
            selectedPool.tokenB_Address?.toLowerCase()
        ].filter(Boolean);
        if (!poolTokens.includes(sellTokenAddress.toLowerCase()) || !poolTokens.includes(buyTokenAddress.toLowerCase())) {
             setErrorMsg(`Selected tokens do not match the chosen pool (${selectedPool.tokenA} / ${selectedPool.tokenB}).`); return;
        }
        if (isLoadingSwap || isApprovingSell || isLoadingEstimate) return; // Already loading

        let sellAmountParsed: bigint;
        const sellDecimals = tokenDecimals[sellTokenAddress] ?? 18;
        try {
            sellAmountParsed = parseUnits(sellAmountStr, sellDecimals);
             if (sellAmountParsed <= 0n) {
                 setErrorMsg('Swap amount must be positive.'); return;
             }
        } catch {
             setErrorMsg('Invalid sell amount format.'); return;
        }

        // Re-check balance just before executing
        if (!hasSufficientBalance) {
            setErrorMsg(`Insufficient ${sellSymbol} balance.`);
            return;
        }
        // --- End Validation ---

        const success = await handleSwap(sellTokenAddress, buyTokenAddress, sellAmountNum); // Use number for action hook
        if (success) {
             setSellAmountStr(""); // Clear input on success
        }
    }, [
        selectedPool, sellTokenAddress, buyTokenAddress, isLoadingSwap, isApprovingSell,
        isLoadingEstimate, sellAmountStr, sellAmountNum, tokenDecimals, hasSufficientBalance,
        sellSymbol, handleSwap, tokenSymbols, // Added tokenSymbols for error message
    ]);

    // Combined loading state for disabling UI elements
    const isBusy = isLoadingSwap || isApprovingSell || isLoadingEstimate;

    // Decide which error to show (local validation takes precedence)
    const displayedError = errorMsg || estimateError;

    // --- Render Logic ---

    // Skeletons for loading states
    if (isLoadingPools || isLoadingBalances) {
        return (
             <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 4, px: { xs: 1, sm: 0 } }}>
                  <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>Swap Tokens</Typography>
                 <Card sx={{ width: "100%", maxWidth: 460, borderRadius: 3, p: 1 }}>
                      <CardContent sx={{ p: 3 }}>
                          <Skeleton variant="rounded" height={120} sx={{ mb: 2 }}/>
                          <Skeleton variant="circular" width={40} height={40} sx={{ margin: 'auto', my: 1 }}/>
                          <Skeleton variant="rounded" height={120} sx={{ mb: 3 }}/>
                          <Skeleton variant="rounded" height={50}/>
                      </CardContent>
                 </Card>
             </Box>
        )
    }

   // Message if no pool is selected (and not loading)
   if (!selectedPool && !isLoadingPools) {
      return (
          <Box sx={{ p:3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '30vh' }}>
               {errorPools ? (
                   <Alert severity="error">Error loading pool data: {errorPools}</Alert>
               ) : (
                   <Typography variant="h6" color="text.secondary" align="center">
                       Please select a pool from the Dashboard to swap tokens.
                   </Typography>
               )}
          </Box>
      );
    }
   // Should not happen if checks above are correct, but prevents rendering errors
   if (!selectedPool) return null;


    return (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 4, px: { xs: 1, sm: 0 } }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>Swap Tokens</Typography>
            <Fade in={true} timeout={500}>
                <Card elevation={1} sx={{ width: "100%", maxWidth: 460, borderRadius: 3, p: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        {/* Display context errors or local/estimate errors */}
                        {errorBalances && <Alert severity="warning" sx={{ mb: 2 }}>Balance Error: {errorBalances}</Alert>}
                        {displayedError && <Alert severity="error" onClose={() => { setErrorMsg(null); /* Estimate error cleared by hook */ }} sx={{ mb: 2 }}>{displayedError}</Alert>}

                        {/* Sell Section */}
                        <SwapInputSection
                            label="Sell"
                            tokenAddress={sellTokenAddress}
                            tokenSymbol={sellSymbol}
                            tokenDecimals={tokenDecimals[sellTokenAddress ?? ''] ?? 18}
                            amountStr={sellAmountStr}
                            balance={sellBalanceNum} // Pass formatted number
                            poolTokenAddresses={poolTokenAddresses}
                            onAmountChange={handleSellAmountChange} // Use specific handler
                            onTokenChange={(e) => handleTokenChange(e, 'sell')}
                            onSetMax={handleSetMaxSell}
                            disabled={isBusy}
                            tokenSymbols={tokenSymbols}
                        />

                        {/* Swap Icon Button */}
                        <Box sx={{ display: "flex", justifyContent: "center", my: 0.5 }}>
                            <IconButton onClick={handleSwapTokens} aria-label="Swap sell and buy tokens" disabled={isBusy || isRotating}>
                                <SwapVertIcon sx={{ transform: isRotating ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease-in-out', color: 'primary.main' }}/>
                            </IconButton>
                        </Box>

                        {/* Buy Section */}
                        <SwapInputSection
                            label="Buy (Estimated)"
                            tokenAddress={buyTokenAddress}
                            tokenSymbol={buySymbol}
                            tokenDecimals={tokenDecimals[buyTokenAddress ?? ''] ?? 18}
                            amountStr={estimatedBuyAmountStr} // Use value from estimate hook
                            balance={buyBalanceNum} // Pass formatted number
                            poolTokenAddresses={poolTokenAddresses}
                            onTokenChange={(e) => handleTokenChange(e, 'buy')}
                            isLoadingEstimate={isLoadingEstimate} // Pass loading state
                            disabled={isBusy} // Disable select if busy
                            readOnly={true} // Always read-only
                            tokenSymbols={tokenSymbols}
                        />

                        {/* Swap Button */}
                        <Button
                            variant="contained"
                            fullWidth
                            onClick={handlePerformSwap}
                            // More comprehensive disabled check
                            disabled={
                                !selectedPool ||
                                !sellTokenAddress ||
                                !buyTokenAddress ||
                                sellTokenAddress === buyTokenAddress ||
                                !sellAmountStr ||
                                sellAmountNum <= 0 ||
                                !hasSufficientBalance ||
                                isBusy // Combined loading state
                            }
                            size="large"
                            sx={{ borderRadius: 2, py: 1.5, mt: 3 }}
                        >
                            {/* More descriptive button text */}
                             {isApprovingSell ? <>Approving {sellSymbol} <CircularProgress size={20} color="inherit" sx={{ml:1}}/></>
                             : isLoadingSwap ? <>Swapping... <CircularProgress size={20} color="inherit" sx={{ml:1}}/></>
                             : isLoadingEstimate ? <>Estimating... <CircularProgress size={20} color="inherit" sx={{ml:1}}/></>
                             : !hasSufficientBalance ? `Insufficient ${sellSymbol}`
                             : 'Swap'}
                        </Button>
                    </CardContent>
                </Card>
            </Fade>
        </Box>
    );
};

export default Swap;