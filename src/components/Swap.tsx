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

import { MOCK_TOKEN_PRICES } from '../utils/mockData';
import { formatBalance, formatPercent } from '../utils/formatters';
import { calculateDynamicFee } from '../utils/simulations';

// Context and Action Hook Imports
import { usePoolsContext } from '../contexts/PoolsContext';
import { useBalancesContext } from '../contexts/BalancesContext';
import { useLoadingContext } from '../contexts/LoadingContext';
import { useSwapActions } from '../hooks/useSwapActions';

// Helper Component (SwapInputSection)
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
                    {onSetMax && (
                        <Link component="button" variant="caption" onClick={onSetMax} disabled={disabled} sx={{ ml: 0.5 }}>
                            Max
                        </Link>
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
                            minWidth: 90,
                            fontWeight: 500,
                            mr: 1.5,
                            '.MuiSelect-select': { py: 1.5, pr: '24px !important' }
                            }}
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


const Swap: React.FC = () => {
  // --- Get state from Contexts ---
  const { selectedPool, isLoadingPools, errorPools } = usePoolsContext();
  const { userBalances, isLoadingBalances, errorBalances } = useBalancesContext();
  const { isLoading: loadingStates } = useLoadingContext(); // Get the loading map
  const { handleSwap } = useSwapActions(); // Get swap action handler

  // --- Local Component State ---
  const [sellAmountStr, setSellAmountStr] = useState("");
  const [sellToken, setSellToken] = useState<string | null>(null);
  const [buyToken, setBuyToken] = useState<string | null>(null);
  const [buyAmountNum, setBuyAmountNum] = useState(0);
  const [usdValues, setUsdValues] = useState({ sell: 0, buy: 0 });
  const [dynamicFee, setDynamicFee] = useState({ feePercentage: 0, explanation: '' });
  const [isRotating, setIsRotating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Derived states
  const sellAmountNum = useMemo(() => parseFloat(sellAmountStr) || 0, [sellAmountStr]);
  const isLoadingSwap = loadingStates['swap'] ?? false;

  // --- Effects ---
  useEffect(() => {
    if (selectedPool) {
      setSellToken(selectedPool.tokenA);
      setBuyToken(selectedPool.tokenB);
      setSellAmountStr("");
      setErrorMsg(null);
    } else {
      setSellToken(null);
      setBuyToken(null);
    }
    setBuyAmountNum(0);
    setDynamicFee({ feePercentage: selectedPool?.baseFee ?? 0, explanation: 'Base Fee' });
    setUsdValues({ sell: 0, buy: 0 });
  }, [selectedPool]);

  useEffect(() => {
    if (!selectedPool || !sellToken || !buyToken || sellAmountNum <= 0) {
      setBuyAmountNum(0);
      setDynamicFee({ feePercentage: selectedPool?.baseFee ?? 0, explanation: 'Base Fee' });
      setUsdValues({ sell: 0, buy: 0 });
      return;
    }
    const { currentPrice, tokenA, tokenB } = selectedPool;
    const ratioAB = currentPrice;
    let buyAmountBeforeFee = 0;
    if (sellToken === tokenA && buyToken === tokenB) {
      buyAmountBeforeFee = sellAmountNum * ratioAB;
    } else if (sellToken === tokenB && buyToken === tokenA) {
      buyAmountBeforeFee = ratioAB !== 0 ? sellAmountNum / ratioAB : 0;
    } else {
        console.warn("Swap tokens mismatch.");
        setBuyAmountNum(0); return;
    }
    const feeInfo = calculateDynamicFee(sellAmountNum, sellToken, selectedPool);
    setDynamicFee(feeInfo);
    const feeAmount = buyAmountBeforeFee * feeInfo.feePercentage;
    const buyAmountAfterFee = buyAmountBeforeFee - feeAmount;
    setBuyAmountNum(buyAmountAfterFee > 0 ? buyAmountAfterFee : 0);
    const sellUsd = (MOCK_TOKEN_PRICES[sellToken] || 0) * sellAmountNum;
    const buyUsd = (MOCK_TOKEN_PRICES[buyToken] || 0) * buyAmountAfterFee;
    setUsdValues({ sell: sellUsd > 0 ? sellUsd : 0, buy: buyUsd > 0 ? buyUsd : 0 });
  }, [sellAmountNum, sellToken, buyToken, selectedPool]);

  // --- Handlers ---
  const handleSwapTokens = useCallback(() => {
    if (isRotating || isLoadingSwap) return;
    setIsRotating(true);
    setSellToken(buyToken);
    setBuyToken(sellToken);
    setSellAmountStr(buyAmountNum > 0 ? buyAmountNum.toFixed(6) : "");
    setTimeout(() => setIsRotating(false), 300);
  }, [sellToken, buyToken, buyAmountNum, isRotating, isLoadingSwap]);

   const handleSetMaxSell = () => {
       if (!sellToken) return;
       const balance = userBalances[sellToken] ?? 0;
       setSellAmountStr(balance.toString());
       setErrorMsg(null);
   };

  const handlePerformSwap = async () => {
    setErrorMsg(null);
    if (!selectedPool || !sellToken || !buyToken || sellAmountNum <= 0 || buyAmountNum < 0 || isLoadingSwap) return; // Allow buyAmount 0

    const sellBalance = userBalances[sellToken] ?? 0;
    if (sellAmountNum > sellBalance) {
        setErrorMsg(`Insufficient ${sellToken} balance. You need ${formatBalance(sellAmountNum, 6)} but have ${formatBalance(sellBalance, 6)}.`);
        return;
    }

    try {
        // Call the action hook handler
        const success = await handleSwap(sellToken, buyToken, sellAmountNum, buyAmountNum);
        if (success) {
           setSellAmountStr(""); // Clear input on successful initiation
        }
        // Error handling is managed within the hook (snackbar)
    } catch (error: any) {
        // This catch might be redundant if the hook handles errors, but good for safety
        console.error("Swap initiation failed:", error);
        setErrorMsg(error.message || "Swap failed. Please try again.");
    }
  };

  const handleTokenChange = (event: SelectChangeEvent<string>, type: 'sell' | 'buy') => {
      const newToken = event.target.value;
      setErrorMsg(null);
      if (type === 'sell') {
          if (newToken === buyToken) handleSwapTokens();
          else setSellToken(newToken);
      } else {
          if (newToken === sellToken) handleSwapTokens();
          else setBuyToken(newToken);
      }
  };

  // --- Derived Data for Rendering ---
  const sellBalance = userBalances[sellToken || ''] ?? 0;
  const buyBalance = userBalances[buyToken || ''] ?? 0;
  const canSwap = selectedPool && sellToken && buyToken && sellAmountNum > 0 && buyAmountNum >= 0 && sellAmountNum <= sellBalance;

  // --- Render Logic ---
  if (isLoadingPools || isLoadingBalances) { // Show skeleton if essential data is loading
      return (
           <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 4, px: { xs: 1, sm: 0 } }}>
                <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>Swap Tokens</Typography>
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
             {errorPools ? (
                 <Alert severity="error">Error loading pools: {errorPools}</Alert>
             ) : (
                 <Typography variant="h6" color="text.secondary" align="center">
                     Please select a pool from the Dashboard to swap tokens.
                 </Typography>
             )}
        </Box>
    );
  }

  // Display balance loading error if relevant
   const renderBalanceError = errorBalances && !isLoadingBalances && (
       <Alert severity="warning" sx={{ mb: 2 }}>Could not load balances: {errorBalances}</Alert>
   );

  const poolTokens = [selectedPool.tokenA, selectedPool.tokenB];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 4, px: { xs: 1, sm: 0 } }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>Swap Tokens</Typography>
      <Fade in={true} timeout={500}>
          <Card elevation={1} sx={{ width: "100%", maxWidth: 460, borderRadius: 3, p: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                {renderBalanceError}
                {errorMsg && <Alert severity="error" onClose={() => setErrorMsg(null)} sx={{ mb: 2 }}>{errorMsg}</Alert>}

              {/* Sell Section */}
              <SwapInputSection
                    label="Sell" token={sellToken} amountStr={sellAmountStr} balance={sellBalance}
                    usdValue={usdValues.sell} onAmountChange={(e) => { setSellAmountStr(e.target.value); setErrorMsg(null); }}
                    onTokenChange={(e) => handleTokenChange(e, 'sell')} onSetMax={handleSetMaxSell}
                    poolTokens={poolTokens} disabled={isLoadingSwap}
              />
              {/* Swap Icon */}
              <Box sx={{ display: "flex", justifyContent: "center", my: 0.5 }}>
                <IconButton onClick={handleSwapTokens} aria-label="Swap sell and buy tokens" disabled={isLoadingSwap || isRotating}>
                  <SwapVertIcon sx={{ transform: isRotating ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease-in-out', color: 'primary.main' }}/>
                </IconButton>
              </Box>
              {/* Buy Section */}
              <SwapInputSection
                    label="Buy (Estimated)" token={buyToken} amountStr={buyAmountNum > 0 ? buyAmountNum.toFixed(6) : ""}
                    balance={buyBalance} usdValue={usdValues.buy} onTokenChange={(e) => handleTokenChange(e, 'buy')}
                    poolTokens={poolTokens} disabled={isLoadingSwap} readOnly={true}
              />
              {/* Fee Info */}
              {sellAmountNum > 0 && buyAmountNum >= 0 && (
                  <Box sx={{ my: 2, p: 1.5, borderRadius: 1, bgcolor: 'action.hover', textAlign: 'center' }}>
                       <Tooltip title={dynamicFee.explanation} placement="top">
                            <Typography variant="caption" color="text.secondary" component="span" sx={{cursor: 'help'}}>
                                Est. Fee: {formatPercent(dynamicFee.feePercentage, 3)}
                                <InfoOutlinedIcon fontSize="inherit" sx={{ ml: 0.5, verticalAlign: 'middle' }}/>
                           </Typography>
                       </Tooltip>
                        <Typography variant="caption" color="text.secondary" display="block" >
                           Price: 1 {sellToken} ≈ {formatBalance(buyAmountNum / sellAmountNum, 6)} {buyToken}
                        </Typography>
                  </Box>
              )}
              {/* Action Button */}
              <Button variant="contained" fullWidth onClick={handlePerformSwap} disabled={!canSwap || isLoadingSwap} size="large" sx={{ borderRadius: 2, py: 1.5, mt: 1 }}>
                {isLoadingSwap ? <CircularProgress size={24} color="inherit" /> : (sellAmountNum > sellBalance ? 'Insufficient Balance' : 'Swap')}
              </Button>
            </CardContent>
          </Card>
      </Fade>
    </Box>
  );
};

export default Swap;