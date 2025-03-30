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
  Tooltip,
  SelectChangeEvent,
  Fade,
  Skeleton,
  Alert,
  Link,
  Grid
} from '@mui/material';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import { Pool } from '../types';
import { MOCK_TOKEN_PRICES } from '../utils/mockData';
import { formatBalance, formatPercent } from '../utils/formatters';
import { calculateDynamicFee } from '../utils/simulations';

interface SwapProps {
  selectedPool: Pool | null;
  userBalances: Record<string, number>; // Assuming numbers
  onSwap: (sellToken: string, buyToken: string, sellAmount: number, expectedBuyAmount: number) => Promise<void> | void; // Can be async
  isLoading: boolean; // General loading state for the swap action
  isPoolLoading?: boolean; // Indicate if pool data itself is loading
}

const Swap: React.FC<SwapProps> = ({
    selectedPool,
    userBalances,
    onSwap,
    isLoading,
    isPoolLoading = false
}) => {
  // --- State ---
  const [sellAmountStr, setSellAmountStr] = useState(""); // Input string for sell amount
  const [sellToken, setSellToken] = useState<string | null>(null); // Symbol of token to sell
  const [buyToken, setBuyToken] = useState<string | null>(null); // Symbol of token to buy

  // Derived states
  const sellAmountNum = useMemo(() => parseFloat(sellAmountStr) || 0, [sellAmountStr]);
  const [buyAmountNum, setBuyAmountNum] = useState(0); // Calculated buy amount (after fee)
  const [usdValues, setUsdValues] = useState({ sell: 0, buy: 0 }); // Estimated USD values
  const [dynamicFee, setDynamicFee] = useState({ feePercentage: 0, explanation: '' }); // Calculated fee info
  const [isRotating, setIsRotating] = useState(false); // State for swap icon animation
  const [errorMsg, setErrorMsg] = useState<string | null>(null); // Error messages

  // --- Effects ---

  // Reset state when the selected pool changes
  useEffect(() => {
    if (selectedPool) {
      // Default to swapping A for B
      setSellToken(selectedPool.tokenA);
      setBuyToken(selectedPool.tokenB);
      setSellAmountStr(""); // Clear amounts
      setErrorMsg(null); // Clear errors
    } else {
      // Clear tokens if no pool is selected
      setSellToken(null);
      setBuyToken(null);
    }
    // Also reset dependent calculations
    setBuyAmountNum(0);
    setDynamicFee({ feePercentage: selectedPool?.baseFee ?? 0, explanation: 'Base Fee' });
    setUsdValues({ sell: 0, buy: 0 });
  }, [selectedPool]);

  // Calculate Buy Amount, Fee, and USD values whenever inputs change
  useEffect(() => {
    // Ensure necessary data is available
    if (!selectedPool || !sellToken || !buyToken || sellAmountNum <= 0) {
      setBuyAmountNum(0);
      setDynamicFee({ feePercentage: selectedPool?.baseFee ?? 0, explanation: 'Base Fee' });
      setUsdValues({ sell: 0, buy: 0 });
      return;
    }

    const { currentPrice, tokenA, tokenB } = selectedPool;
    const ratioAB = currentPrice; // Price: 1 A = ratioAB B
    let buyAmountBeforeFee = 0;

    // Determine the raw conversion amount based on which token is being sold
    if (sellToken === tokenA && buyToken === tokenB) {
      buyAmountBeforeFee = sellAmountNum * ratioAB; // Sell A, get B
    } else if (sellToken === tokenB && buyToken === tokenA) {
       // Sell B, get A. Calculate A = B / ratioAB
      buyAmountBeforeFee = ratioAB !== 0 ? sellAmountNum / ratioAB : 0;
    } else {
        // This case should ideally not happen if token selection is restricted to pool tokens
        console.warn("Swap tokens do not match selected pool tokens.");
        setBuyAmountNum(0);
        return;
    }

    // Calculate the dynamic fee based on the sell action
    const feeInfo = calculateDynamicFee(sellAmountNum, sellToken, selectedPool);
    setDynamicFee(feeInfo);

    // Apply the calculated fee to the *buy* amount
    const feeAmount = buyAmountBeforeFee * feeInfo.feePercentage;
    const buyAmountAfterFee = buyAmountBeforeFee - feeAmount;
    setBuyAmountNum(buyAmountAfterFee > 0 ? buyAmountAfterFee : 0); // Ensure buy amount isn't negative

    // --- Calculate USD values (using mock prices) ---
    const sellUsd = (MOCK_TOKEN_PRICES[sellToken] || 0) * sellAmountNum;
    // Calculate buy USD based on the net amount received
    const buyUsd = (MOCK_TOKEN_PRICES[buyToken] || 0) * buyAmountAfterFee;
    setUsdValues({ sell: sellUsd > 0 ? sellUsd : 0, buy: buyUsd > 0 ? buyUsd : 0 });

  }, [sellAmountNum, sellToken, buyToken, selectedPool]); // Dependencies for calculation


  // --- Handlers ---

  // Flip Sell/Buy Tokens with Animation
  const handleSwapTokens = useCallback(() => {
    if (isRotating) return; // Prevent spamming during animation

    setIsRotating(true); // Trigger animation
    // Swap the tokens
    setSellToken(buyToken);
    setBuyToken(sellToken);
    // Swap the amounts shown in the input fields as well
    setSellAmountStr(buyAmountNum > 0 ? buyAmountNum.toFixed(6) : ""); // Use calculated buy amount as new sell input

    // Reset animation state after duration
    setTimeout(() => setIsRotating(false), 300); // Match CSS transition duration
  }, [sellToken, buyToken, buyAmountNum, isRotating]); // Include buyAmountNum

  // Set sell amount to max available balance
   const handleSetMaxSell = () => {
       if (!sellToken) return;
       const balance = userBalances[sellToken] ?? 0;
       setSellAmountStr(balance.toString());
       setErrorMsg(null); // Clear error when setting max
   };

  // Execute Swap Action
  const handlePerformSwap = async () => {
    setErrorMsg(null); // Clear previous errors
    if (!selectedPool || !sellToken || !buyToken || sellAmountNum <= 0 || buyAmountNum <= 0 || isLoading) return;

    const sellBalance = userBalances[sellToken] ?? 0;
    if (sellAmountNum > sellBalance) {
        setErrorMsg(`Insufficient ${sellToken} balance. You need ${formatBalance(sellAmountNum, 6)} but have ${formatBalance(sellBalance, 6)}.`);
        return;
    }

    try {
        // Call the provided onSwap handler (can be async)
        await onSwap(sellToken, buyToken, sellAmountNum, buyAmountNum);
        // Clear input field on successful initiation
        setSellAmountStr("");
    } catch (error: any) {
        console.error("Swap Error:", error);
        setErrorMsg(error.message || "Swap failed. Please try again."); // Display error
    }
  };

  // Handle Token Selection Changes (prevent selecting the same token for buy/sell)
  const handleTokenChange = (event: SelectChangeEvent<string>, type: 'sell' | 'buy') => {
      const newToken = event.target.value;
      if (type === 'sell') {
          if (newToken === buyToken) { // If trying to select the 'buy' token
              handleSwapTokens(); // Swap them instead
          } else {
              setSellToken(newToken);
          }
      } else { // type === 'buy'
          if (newToken === sellToken) { // If trying to select the 'sell' token
              handleSwapTokens(); // Swap them instead
          } else {
              setBuyToken(newToken);
          }
      }
       setErrorMsg(null); // Clear error on token change
  };

  // --- Derived Data for Rendering ---
  const sellBalance = userBalances[sellToken || ''] ?? 0;
  const buyBalance = userBalances[buyToken || ''] ?? 0;
  // Determine if the swap button should be enabled
  const canSwap = selectedPool && sellToken && buyToken && sellAmountNum > 0 && buyAmountNum >= 0 && sellAmountNum <= sellBalance; // buyAmount can be 0 if fee is 100%


  // --- Render Logic ---

  if (isPoolLoading) {
      return (
           <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 4, px: { xs: 1, sm: 0 } }}>
                <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
                   Swap Tokens
                </Typography>
               <Card sx={{ width: "100%", maxWidth: 460, borderRadius: 3, p: 1 }}>
                    <CardContent sx={{ p: 3 }}>
                        <Skeleton variant="rounded" height={80} sx={{ mb: 2 }}/>
                        <Skeleton variant="circular" width={40} height={40} sx={{ margin: 'auto', my: 1 }}/>
                        <Skeleton variant="rounded" height={80} sx={{ mb: 3 }}/>
                        <Skeleton variant="rounded" height={50}/>
                    </CardContent>
               </Card>
           </Box>
      )
  }


  if (!selectedPool) {
    return (
        <Box sx={{ p:3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '30vh' }}>
            <Typography variant="h6" color="text.secondary" align="center">
                Please select a pool from the Dashboard to swap tokens.
            </Typography>
        </Box>
    );
  }

  // Available tokens for selection dropdowns
  const poolTokens = [selectedPool.tokenA, selectedPool.tokenB];

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 4, px: { xs: 1, sm: 0 } }}
    >
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        Swap Tokens
      </Typography>
      <Fade in={true} timeout={500}>
          <Card
            elevation={1}
            sx={{
              width: "100%",
              maxWidth: 460,
              borderRadius: 3,
              p: 1,
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>

               {/* Error Message Display */}
                {errorMsg && (
                    <Alert severity="error" onClose={() => setErrorMsg(null)} sx={{ mb: 2 }}>
                        {errorMsg}
                    </Alert>
                )}

              {/* --- SELL Section --- */}
              <SwapInputSection
                    label="Sell"
                    token={sellToken}
                    amountStr={sellAmountStr}
                    balance={sellBalance}
                    usdValue={usdValues.sell}
                    onAmountChange={(e) => { setSellAmountStr(e.target.value); setErrorMsg(null); }}
                    onTokenChange={(e) => handleTokenChange(e, 'sell')}
                    onSetMax={handleSetMaxSell}
                    poolTokens={poolTokens}
                    disabled={isLoading}
              />

              {/* --- Swap Icon Button --- */}
              <Box sx={{ display: "flex", justifyContent: "center", my: 0.5 }}>
                <IconButton onClick={handleSwapTokens} aria-label="Swap sell and buy tokens" disabled={isLoading || isRotating}>
                  <SwapVertIcon sx={{
                      transform: isRotating ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease-in-out',
                      color: 'primary.main'
                  }}/>
                </IconButton>
              </Box>

              {/* --- BUY Section --- */}
              <SwapInputSection
                    label="Buy (Estimated)"
                    token={buyToken}
                    // Display formatted buy amount, disable input
                    amountStr={buyAmountNum > 0 ? buyAmountNum.toFixed(6) : ""}
                    balance={buyBalance}
                    usdValue={usdValues.buy}
                    onTokenChange={(e) => handleTokenChange(e, 'buy')}
                    poolTokens={poolTokens}
                    disabled={isLoading}
                    readOnly={true} // Make buy amount read-only
              />

              {/* --- Fee and Price Info Display --- */}
              {sellAmountNum > 0 && buyAmountNum >= 0 && (
                  <Box sx={{ my: 2, p: 1.5, borderRadius: 1, bgcolor: 'action.hover', textAlign: 'center' }}>
                       <Tooltip title={dynamicFee.explanation} placement="top">
                            <Typography variant="caption" color="text.secondary" component="span" sx={{cursor: 'help'}}>
                                Est. Fee: {formatPercent(dynamicFee.feePercentage, 3)} {/* Show 3 decimal places for fee */}
                                <InfoOutlinedIcon fontSize="inherit" sx={{ ml: 0.5, verticalAlign: 'middle' }}/>
                           </Typography>
                       </Tooltip>
                        {/* Show effective price */}
                        <Typography variant="caption" color="text.secondary" display="block" >
                           Price: 1 {sellToken} ≈ {formatBalance(buyAmountNum / sellAmountNum, 6)} {buyToken}
                        </Typography>
                  </Box>
              )}


              {/* --- Action Button --- */}
              <Button
                variant="contained"
                fullWidth
                onClick={handlePerformSwap}
                disabled={!canSwap || isLoading}
                size="large"
                sx={{ borderRadius: 2, py: 1.5, mt: 1 }}
              >
                {isLoading
                    ? <CircularProgress size={24} color="inherit" />
                    : (sellAmountNum > sellBalance ? 'Insufficient Balance' : 'Swap')
                }
              </Button>
            </CardContent>
          </Card>
      </Fade>
    </Box>
  );
};


// --- Helper Component: Swap Input Section ---
interface SwapInputSectionProps {
    label: string;
    token: string | null;
    amountStr: string;
    balance: number;
    usdValue: number;
    poolTokens: string[];
    onAmountChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onTokenChange: (event: SelectChangeEvent<string>) => void;
    onSetMax?: () => void;
    disabled?: boolean;
    readOnly?: boolean;
}

const SwapInputSection: React.FC<SwapInputSectionProps> = ({
    label, token, amountStr, balance, usdValue, poolTokens,
    onAmountChange, onTokenChange, onSetMax, disabled, readOnly = false
}) => (
    <Box sx={{ mb: 1.5 }}>
        <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
             <Grid item>
                 <Typography variant="body2" fontWeight="medium" color="text.secondary">
                    {label}
                 </Typography>
             </Grid>
             <Grid item>
                 <Typography variant="caption" color="text.secondary">
                    Balance: {formatBalance(balance, 4)}
                    {onSetMax && ( // Only show Max if handler is provided (i.e., for Sell section)
                        <Link component="button" variant="caption" onClick={onSetMax} disabled={disabled} sx={{ ml: 0.5 }}>
                            Max
                        </Link>
                    )}
                 </Typography>
             </Grid>
        </Grid>
        <TextField
            type={readOnly ? "text" : "number"} // Use text if readonly to prevent spinners
            variant="outlined"
            placeholder="0.0"
            value={amountStr}
            onChange={onAmountChange}
            fullWidth
            disabled={disabled}
            InputProps={{
                readOnly: readOnly,
                sx: { borderRadius: 2, pr: 0, bgcolor: readOnly ? 'action.disabledBackground' : undefined }, // Style readonly
                inputProps: readOnly ? undefined : { min: 0, step: "any" },
                endAdornment: (
                <InputAdornment position="end" sx={{ mr: -0.5 }}>
                    <Select
                        value={token || ''}
                        onChange={onTokenChange}
                        variant="standard"
                        disableUnderline
                        disabled={disabled}
                        sx={{
                            minWidth: 90, // Adjusted width
                            fontWeight: 500,
                            mr: 1.5,
                            '.MuiSelect-select': { py: 1.5, pr: '24px !important' }
                            }}
                        // MenuProps={{ sx: { maxHeight: 200 } }} // Limit dropdown height if needed
                    >
                        {poolTokens.length === 0 && <MenuItem value="" disabled>N/A</MenuItem>}
                        {poolTokens.map(poolToken => (
                            <MenuItem key={poolToken} value={poolToken}>
                              {poolToken}
                            </MenuItem>
                        ))}
                    </Select>
                </InputAdornment>
                ),
            }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, minHeight: '1.2em', textAlign: 'right' }}>
            {usdValue > 0 ? `~ $${formatBalance(usdValue, 2)}` : ''}
        </Typography>
    </Box>
);

export default Swap;