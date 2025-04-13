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
import { usePoolsContext } from '../contexts/PoolsContext';
import { useBalancesContext } from '../contexts/BalancesContext';
import { useLoadingContext } from '../contexts/LoadingContext';
import { useSwapActions } from '../hooks/useSwapActions';

// SwapInputSection Props Interface
interface SwapInputSectionProps {
    label: string;
    tokenAddress: string | null; // Use address
    tokenSymbol: string; // Pass symbol for display
    tokenDecimals: number; // Pass decimals if needed for input step?
    amountStr: string;
    balance: number; // Balance as a number for display formatting
    poolTokenAddresses: string[]; // Pass addresses
    onAmountChange?: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onTokenChange: (event: SelectChangeEvent<string>) => void;
    onSetMax?: () => void;
    disabled?: boolean;
    readOnly?: boolean;
    tokenSymbols: Record<string, string>; // Map of token addresses to symbols
}


// SwapInputSection Component
const SwapInputSection: React.FC<SwapInputSectionProps> = ({
    label, tokenAddress, tokenSymbol, amountStr, balance, poolTokenAddresses,
    onAmountChange, onTokenChange, onSetMax, disabled, readOnly = false, tokenSymbols
}: SwapInputSectionProps & { tokenSymbols: Record<string, string> }) => ( // Pass tokenSymbols as prop
    <Box sx={{ mb: 1.5 }}>
        <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
             <Grid item>
                 <Typography variant="body2" fontWeight="medium" color="text.secondary">{label}</Typography>
             </Grid>
             <Grid item>
                 <Typography variant="caption" color="text.secondary">
                    Balance: {balance}
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
            value={amountStr}
            onChange={onAmountChange}
            fullWidth
            disabled={disabled}
            InputProps={{
                readOnly: readOnly,
                sx: { borderRadius: 2, pr: 0, bgcolor: readOnly ? 'action.disabledBackground' : undefined },
                inputProps: readOnly ? undefined : { min: 0, step: "any" }, // step="any" for float numbers
                endAdornment: (
                <InputAdornment position="end" sx={{ mr: -0.5 }}>
                    {/* Select uses ADDRESS as value */}
                    <Select
                        value={tokenAddress || ''} // Bind to address
                        onChange={onTokenChange}
                        variant="standard"
                        disableUnderline
                        disabled={disabled}
                        sx={{ minWidth: 90, fontWeight: 500, mr: 1.5, '.MuiSelect-select': { py: 1.5, pr: '24px !important' }}}
                    >
                        {poolTokenAddresses.length === 0 && <MenuItem value="" disabled>N/A</MenuItem>}
                        {/* Iterate through addresses */}
                        {poolTokenAddresses.map(poolTokenAddr => (
                            <MenuItem key={poolTokenAddr} value={poolTokenAddr}>
                              {/* Display symbol from context using the address */}
                              {tokenSymbols[poolTokenAddr] ?? poolTokenAddr}
                            </MenuItem>
                        ))}
                    </Select>
                </InputAdornment>
                ),
            }}
        />
    </Box>
);


// Main Swap Component
const Swap: React.FC = () => {
    const { selectedPool, isLoadingPools, errorPools } = usePoolsContext();
    const { userBalances, tokenDecimals, tokenSymbols, isLoadingBalances, errorBalances } = useBalancesContext();
    const { isLoading: loadingStates } = useLoadingContext();
    const { handleSwap } = useSwapActions();

    const [sellAmountStr, setSellAmountStr] = useState("");
    const [sellTokenAddress, setSellTokenAddress] = useState<string | null>(null);
    const [buyTokenAddress, setBuyTokenAddress] = useState<string | null>(null);
    const [buyAmountStr, setBuyAmountStr] = useState("0.0"); // Estimate as string
    const [isRotating, setIsRotating] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const sellAmountNum = useMemo(() => parseFloat(sellAmountStr) || 0, [sellAmountStr]);
    const isLoadingSwap = loadingStates['swap'] ?? false;
    const isApprovingSell = loadingStates[`approve_${sellTokenAddress}`] ?? false;


    useEffect(() => {
        if (selectedPool && selectedPool.tokenA_Address && selectedPool.tokenB_Address) {
            setSellTokenAddress(selectedPool.tokenA_Address);
            setBuyTokenAddress(selectedPool.tokenB_Address);
            setSellAmountStr("");
            setBuyAmountStr("0.0");
            setErrorMsg(null);
        } else {
            setSellTokenAddress(null); setBuyTokenAddress(null);
        }
    }, [selectedPool]);

    // Swap Output Estimation Effect (Keep placeholder - requires SDK/Query)
     useEffect(() => {
         setBuyAmountStr("0.0"); // Reset estimate
         // TODO: Implement swap estimation using SDK or Quoter contract
         // Needs current pool state (sqrtPriceX96)
     }, [sellAmountStr, sellTokenAddress, buyTokenAddress, selectedPool]);


    const handleSwapTokens = useCallback(() => {
         if (isRotating || isLoadingSwap || isApprovingSell) return;
         setIsRotating(true);
         const currentSell = sellTokenAddress;
         const currentBuy = buyTokenAddress;
         setSellTokenAddress(currentBuy);
         setBuyTokenAddress(currentSell);
         setSellAmountStr(""); // Clear amount on swap
         setBuyAmountStr("0.0");
         setTimeout(() => setIsRotating(false), 300);
    }, [sellTokenAddress, buyTokenAddress, isRotating, isLoadingSwap, isApprovingSell]);


    const handleSetMaxSell = () => {
       if (!sellTokenAddress) return;
       const balanceStr = userBalances[sellTokenAddress] ?? "0.0";
       setSellAmountStr(balanceStr);
       setErrorMsg(null);
   };


    const handlePerformSwap = async () => {
        setErrorMsg(null);
        if (!selectedPool || !sellTokenAddress || !buyTokenAddress || sellAmountNum <= 0 || isLoadingSwap || isApprovingSell) return;

        const sellBalance = parseFloat(userBalances[sellTokenAddress] ?? "0");
        if (sellAmountNum > sellBalance) {
            setErrorMsg(`Insufficient ${tokenSymbols[sellTokenAddress] ?? 'token'} balance.`);
            return;
        }
        await handleSwap(sellTokenAddress, buyTokenAddress, sellAmountNum);
        // Clear input after initiating swap
        setSellAmountStr("");
        setBuyAmountStr("0.0");
    };


    const handleTokenChange = (event: SelectChangeEvent<string>, type: 'sell' | 'buy') => {
        const newTokenAddress = event.target.value;
        setErrorMsg(null);
        if (type === 'sell') {
            if (newTokenAddress === buyTokenAddress) handleSwapTokens();
            else setSellTokenAddress(newTokenAddress);
        } else {
            if (newTokenAddress === sellTokenAddress) handleSwapTokens();
            else setBuyTokenAddress(newTokenAddress);
        }
        setSellAmountStr("");
        setBuyAmountStr("0.0");
    };

    // --- Derived Data for Rendering ---
    const sellBalanceStr = userBalances[sellTokenAddress || ''] ?? "0.0";
    const buyBalanceStr = userBalances[buyTokenAddress || ''] ?? "0.0";
    const sellSymbol = tokenSymbols[sellTokenAddress || ''] ?? '---';
    const buySymbol = tokenSymbols[buyTokenAddress || ''] ?? '---';
    const poolTokenAddresses = selectedPool ? [selectedPool.tokenA_Address, selectedPool.tokenB_Address].filter(a => !!a) as string[] : [];
    const hasSufficientBalance = sellAmountNum <= parseFloat(sellBalanceStr);
    const canSwap = selectedPool && sellTokenAddress && buyTokenAddress && sellAmountNum > 0 && hasSufficientBalance;


     // --- Render Logic ---
     if (isLoadingPools || isLoadingBalances) {
          return (
               <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 4, px: { xs: 1, sm: 0 } }}>
                    <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>Swap Tokens</Typography>
                   <Card sx={{ width: "100%", maxWidth: 460, borderRadius: 3, p: 1 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Skeleton variant="rounded" height={120} sx={{ mb: 2 }}/> {/* Adjusted height */}
                            <Skeleton variant="circular" width={40} height={40} sx={{ margin: 'auto', my: 1 }}/>
                            <Skeleton variant="rounded" height={120} sx={{ mb: 3 }}/> {/* Adjusted height */}
                            <Skeleton variant="rounded" height={50}/>
                        </CardContent>
                   </Card>
               </Box>
          )
      }

     if (!selectedPool && !isLoadingPools) {
        return (
            <Box sx={{ p:3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '30vh' }}>
                 {errorPools ? (
                     <Alert severity="error">Error loading pool: {errorPools}</Alert>
                 ) : (
                     <Typography variant="h6" color="text.secondary" align="center">
                         Please select a pool from the Dashboard to swap tokens.
                     </Typography>
                 )}
            </Box>
        );
      }
     // Should not render if selectedPool is null beyond this point
     if (!selectedPool) return null;


    return (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 4, px: { xs: 1, sm: 0 } }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>Swap Tokens</Typography>
            <Fade in={true} timeout={500}>
                <Card elevation={1} sx={{ width: "100%", maxWidth: 460, borderRadius: 3, p: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        {errorBalances && <Alert severity="warning" sx={{ mb: 2 }}>Balance Error: {errorBalances}</Alert>}
                        {errorMsg && <Alert severity="error" onClose={() => setErrorMsg(null)} sx={{ mb: 2 }}>{errorMsg}</Alert>}

                        <SwapInputSection
                            label="Sell"
                            tokenAddress={sellTokenAddress}
                            tokenSymbol={sellSymbol}
                            tokenDecimals={tokenDecimals[sellTokenAddress ?? ''] ?? 18}
                            amountStr={sellAmountStr}
                            balance={parseFloat(sellBalanceStr)}
                            poolTokenAddresses={poolTokenAddresses}
                            onAmountChange={(e) => { setSellAmountStr(e.target.value); setErrorMsg(null); }}
                            onTokenChange={(e) => handleTokenChange(e, 'sell')}
                            onSetMax={handleSetMaxSell}
                            disabled={isLoadingSwap || isApprovingSell}
                            tokenSymbols={tokenSymbols} // Pass symbols map
                        />

                        <Box sx={{ display: "flex", justifyContent: "center", my: 0.5 }}>
                            <IconButton onClick={handleSwapTokens} aria-label="Swap sell and buy tokens" disabled={isLoadingSwap || isRotating || isApprovingSell}>
                                <SwapVertIcon sx={{ transform: isRotating ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease-in-out', color: 'primary.main' }}/>
                            </IconButton>
                        </Box>

                        <SwapInputSection
                            label="Buy (Estimated)"
                            tokenAddress={buyTokenAddress}
                            tokenSymbol={buySymbol}
                            tokenDecimals={tokenDecimals[buyTokenAddress ?? ''] ?? 18}
                            amountStr={buyAmountStr} // Show estimate string
                            balance={parseFloat(buyBalanceStr)}
                            poolTokenAddresses={poolTokenAddresses}
                            onTokenChange={(e) => handleTokenChange(e, 'buy')}
                            disabled={isLoadingSwap || isApprovingSell}
                            readOnly={true}
                            tokenSymbols={tokenSymbols} // Pass symbols map
                        />

                        {/* TODO: Add Price Impact / Fee info display once estimation is working */}
                        {/* <Box sx={{ my: 2, p: 1.5, ... }}> ... </Box> */}

                        <Button
                            variant="contained"
                            fullWidth
                            onClick={handlePerformSwap}
                            disabled={!canSwap || isLoadingSwap || isApprovingSell}
                            size="large"
                            sx={{ borderRadius: 2, py: 1.5, mt: 3 }} // Increased margin top
                        >
                            {isApprovingSell ? <CircularProgress size={24} color="inherit" /> : isLoadingSwap ? <CircularProgress size={24} color="inherit" /> : (!hasSufficientBalance ? `Insufficient ${sellSymbol}` : 'Swap')}
                        </Button>
                    </CardContent>
                </Card>
            </Fade>
        </Box>
    );
};

export default Swap;