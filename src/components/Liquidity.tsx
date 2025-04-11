import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, Button, InputAdornment,
  Tabs, Tab, CircularProgress, Paper, Tooltip, Fade, Alert, Grid, Link, IconButton, Skeleton
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SyncAltIcon from '@mui/icons-material/SyncAlt';

import { MOCK_TOKEN_PRICES } from '../utils/mockData';
import { formatBalance } from '../utils/formatters';
import { calculateEstimatedVdppRewards } from '../utils/simulations';

// Context and Action Hook Imports
import { usePoolsContext } from '../contexts/PoolsContext';
import { useBalancesContext } from '../contexts/BalancesContext';
import { useLoadingContext } from '../contexts/LoadingContext';
import { useLiquidityActions } from '../hooks/useLiquidityActions';

// --- Helper Components (TabPanel, TextFieldWithBalance) remain the same ---
interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} id={`liquidity-tabpanel-${index}`} aria-labelledby={`liquidity-tab-${index}`} {...other}>
      {value === index && (<Box sx={{ pt: 3 }}>{children}</Box>)}
    </div>
  );
}
interface TextFieldWithBalanceProps {
    label: string; tokenSymbol: string; value: string; balance: number | undefined; usdValue: number;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void; onMax: () => void;
    disabled?: boolean; decimals?: number;
}
const TextFieldWithBalance: React.FC<TextFieldWithBalanceProps> = ({
    label, tokenSymbol, value, balance, usdValue, onChange, onMax, disabled, decimals = 4
}) => (
    <Box sx={{ mb: 2.5 }}>
        <TextField
            label={label} type="number" variant="outlined" placeholder="0.0" fullWidth value={value} onChange={onChange} disabled={disabled}
            InputProps={{ endAdornment: <InputAdornment position="end">{tokenSymbol}</InputAdornment>, inputProps: { min: 0, step: "any" } }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
             <Typography variant="caption" color="text.secondary">
               Balance: {formatBalance(balance, decimals)}
               <Link component="button" variant="caption" onClick={onMax} disabled={disabled} sx={{ ml: 0.5, verticalAlign: 'baseline' }}>Max</Link>
             </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ minHeight: '1.2em' }}>
              {usdValue > 0 ? `~ $${formatBalance(usdValue, 2)}` : ''}
            </Typography>
        </Box>
    </Box>
);
// --- End Helper Components ---


const Liquidity: React.FC = () => {
  // --- Get state from Contexts ---
  const { selectedPool, isLoadingPools, errorPools } = usePoolsContext();
  const { userBalances, isLoadingBalances, errorBalances } = useBalancesContext();
  const { isLoading: loadingStates } = useLoadingContext();
  const { handleAddLiquidity, handleRemoveLiquidity } = useLiquidityActions();

  // --- Local Component State ---
  const [tabValue, setTabValue] = useState(0);
  const [addAmountAStr, setAddAmountAStr] = useState("");
  const [addAmountBStr, setAddAmountBStr] = useState("");
  const [lockRatio, setLockRatio] = useState(true);
  const [lastEdited, setLastEdited] = useState<'A' | 'B' | null>(null);
  const [removeLpAmountStr, setRemoveLpAmountStr] = useState("");
  const [estRemoveA, setEstRemoveA] = useState(0);
  const [estRemoveB, setEstRemoveB] = useState(0);
  const [estimatedReward, setEstimatedReward] = useState({ reward: 0, explanation: '' });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Derived states
  const addAmountA = useMemo(() => parseFloat(addAmountAStr) || 0, [addAmountAStr]);
  const addAmountB = useMemo(() => parseFloat(addAmountBStr) || 0, [addAmountBStr]);
  const removeLpAmount = useMemo(() => parseFloat(removeLpAmountStr) || 0, [removeLpAmountStr]);
  const isAdding = loadingStates['addLiquidity'] ?? false;
  const isRemoving = loadingStates['removeLiquidity'] ?? false;

  // --- Effects ---
  useEffect(() => {
    setAddAmountAStr(""); setAddAmountBStr(""); setRemoveLpAmountStr("");
    setEstRemoveA(0); setEstRemoveB(0); setEstimatedReward({ reward: 0, explanation: '' });
    setErrorMsg(null); setLastEdited(null); setLockRatio(true);
  }, [selectedPool]);

  const handleAddAmountChange = useCallback((value: string, token: 'A' | 'B') => {
    setErrorMsg(null);
    const setter = token === 'A' ? setAddAmountAStr : setAddAmountBStr;
    const otherSetter = token === 'A' ? setAddAmountBStr : setAddAmountAStr;
    setter(value);
    setLastEdited(token);

    if (!selectedPool || !lockRatio) {
        const currentA = token === 'A' ? (parseFloat(value) || 0) : addAmountA;
        const currentB = token === 'B' ? (parseFloat(value) || 0) : addAmountB;
        setEstimatedReward(calculateEstimatedVdppRewards(currentA, currentB, selectedPool));
        return;
    };
    const numValue = parseFloat(value) || 0;
    const ratio = selectedPool.currentPrice;
    let otherNumValue = 0;
    if (numValue > 0) {
      if (token === 'A') otherNumValue = numValue * ratio;
      else otherNumValue = ratio !== 0 ? numValue / ratio : 0;
      otherSetter(otherNumValue > 0 ? otherNumValue.toFixed(6) : "");
    } else otherSetter("");

    const finalA = token === 'A' ? numValue : otherNumValue;
    const finalB = token === 'B' ? numValue : otherNumValue;
    setEstimatedReward(calculateEstimatedVdppRewards(finalA, finalB, selectedPool));
  }, [selectedPool, lockRatio, addAmountA, addAmountB]);

  useEffect(() => {
    if (lockRatio && lastEdited && selectedPool) {
      if (lastEdited === 'A') handleAddAmountChange(addAmountAStr, 'A');
      else handleAddAmountChange(addAmountBStr, 'B');
    }
  }, [lockRatio, selectedPool, lastEdited, addAmountAStr, addAmountBStr, handleAddAmountChange]);

   const handleRemoveAmountChange = useCallback((value: string) => {
      setRemoveLpAmountStr(value); setErrorMsg(null);
      const lpAmount = parseFloat(value) || 0;
      if (lpAmount > 0 && selectedPool) {
          // Simple simulation remains
          const mockTotalLpValue = 1000;
          const fractionToRemove = lpAmount / mockTotalLpValue;
          const approxValueA = MOCK_TOKEN_PRICES[selectedPool.tokenA] * (fractionToRemove * 50);
          const approxValueB = MOCK_TOKEN_PRICES[selectedPool.tokenB] * (fractionToRemove * 50 * selectedPool.currentPrice);
          setEstRemoveA(approxValueA / (MOCK_TOKEN_PRICES[selectedPool.tokenA] || 1));
          setEstRemoveB(approxValueB / (MOCK_TOKEN_PRICES[selectedPool.tokenB] || 1));
      } else { setEstRemoveA(0); setEstRemoveB(0); }
  }, [selectedPool]);

  const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue); setErrorMsg(null);
  };

  // --- Action Handlers --- (Call action hook handlers)
  const handleAdd = async () => {
    setErrorMsg(null);
    if (!selectedPool || addAmountA <= 0 || addAmountB <= 0 || isAdding) return;
    const { tokenA, tokenB } = selectedPool;
    const balanceA = userBalances[tokenA] ?? 0;
    const balanceB = userBalances[tokenB] ?? 0;

    if (addAmountA > balanceA) { setErrorMsg(`Insufficient ${tokenA} balance.`); return; }
    if (addAmountB > balanceB) { setErrorMsg(`Insufficient ${tokenB} balance.`); return; }

    try {
        const success = await handleAddLiquidity(tokenA, tokenB, addAmountA, addAmountB);
        if (success) {
            setAddAmountAStr(""); setAddAmountBStr("");
            setEstimatedReward({ reward: 0, explanation: ''});
        }
        // Errors handled by hook's snackbar
    } catch (error: any) {
        // Fallback UI error
        console.error("Add Liquidity UI Error:", error);
        setErrorMsg(error.message || "Failed to add liquidity.");
    }
  };

  const handleRemove = async () => {
      setErrorMsg(null);
      if (!selectedPool || removeLpAmount <= 0 || isRemoving) return;
      const { tokenA, tokenB } = selectedPool;
      const lpTokenSymbol = `LP-${tokenA}/${tokenB}`;
      const lpBalance = userBalances[lpTokenSymbol] ?? 0;

      if (removeLpAmount > lpBalance) { setErrorMsg(`Insufficient LP token balance.`); return; }

      try {
           const success = await handleRemoveLiquidity(tokenA, tokenB, removeLpAmount);
           if (success) {
              setRemoveLpAmountStr(""); setEstRemoveA(0); setEstRemoveB(0);
           }
          // Errors handled by hook's snackbar
      } catch (error: any) {
           console.error("Remove Liquidity UI Error:", error);
           setErrorMsg(error.message || "Failed to remove liquidity.");
      }
  };

  // --- Max Button Handlers --- (Use context balances)
   const setMax = (token: 'A' | 'B') => {
       if (!selectedPool) return;
       const balance = userBalances[token === 'A' ? selectedPool.tokenA : selectedPool.tokenB] ?? 0;
       handleAddAmountChange(balance.toString(), token);
   };
   const setMaxLp = () => {
       if (!selectedPool) return;
       const lpTokenSymbol = `LP-${selectedPool.tokenA}/${selectedPool.tokenB}`;
       const lpBalance = userBalances[lpTokenSymbol] ?? 0;
       handleRemoveAmountChange(lpBalance.toString());
   };

  // --- USD Value Calculation --- (Remains the same)
  const toUsd = (tokenSymbol: string | undefined, amountStr: string) => { /* ... */
    if (!tokenSymbol) return 0;
    const price = MOCK_TOKEN_PRICES[tokenSymbol] || 0;
    const amt = parseFloat(amountStr) || 0;
    return amt * price;
  };

  // Check balances and amounts for enabling buttons
  const canAdd = selectedPool && addAmountA > 0 && addAmountB > 0 && addAmountA <= (userBalances[selectedPool.tokenA] ?? 0) && addAmountB <= (userBalances[selectedPool.tokenB] ?? 0);
  const canRemove = selectedPool && removeLpAmount > 0 && removeLpAmount <= (userBalances[`LP-${selectedPool.tokenA}/${selectedPool.tokenB}`] ?? 0);


  // --- Render Logic ---
   if (isLoadingPools || isLoadingBalances) { // Show skeleton if essential data loading
       return (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 4, px: { xs: 1, sm: 0 } }}>
                <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>Manage Liquidity</Typography>
                 <Card sx={{ width: '100%', maxWidth: 500, borderRadius: 3 }}>
                     <Skeleton variant="rectangular" height={48} sx={{ borderBottom: 1, borderColor: 'divider' }}/>
                     <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                         <Skeleton variant="rounded" height={100} sx={{mb: 2}}/>
                         <Skeleton variant="rounded" height={100} sx={{mb: 2}}/>
                         <Skeleton variant="rounded" height={50} />
                     </CardContent>
                 </Card>
             </Box>
       );
   }

  if (!selectedPool) {
     return (
         <Box sx={{ p:3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '30vh' }}>
              {errorPools ? (
                  <Alert severity="error">Error loading pools: {errorPools}</Alert>
              ) : (
                  <Typography variant="h6" color="text.secondary" align="center">
                      Please select a pool from the Dashboard to manage liquidity.
                  </Typography>
              )}
         </Box>
     );
   }

  const { tokenA, tokenB } = selectedPool;
  const addAUsd = toUsd(tokenA, addAmountAStr);
  const addBUsd = toUsd(tokenB, addAmountBStr);
  const removeAUsd = toUsd(tokenA, estRemoveA.toString());
  const removeBUsd = toUsd(tokenB, estRemoveB.toString());

   // Display balance loading error if relevant
   const renderBalanceError = errorBalances && !isLoadingBalances && (
       <Alert severity="warning" sx={{ mb: 2 }}>Could not load balances: {errorBalances}</Alert>
   );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 4, px: { xs: 1, sm: 0 } }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>Manage Liquidity</Typography>
      <Fade in={true} timeout={500}>
          <Card elevation={1} sx={{ width: '100%', maxWidth: 500, borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <Tabs value={tabValue} onChange={handleChangeTab} variant="fullWidth" textColor="primary" indicatorColor="primary" sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'action.selected' }}>
              <Tab label="Add Liquidity" id="liquidity-tab-0" aria-controls="liquidity-tabpanel-0"/>
              <Tab label="Remove Liquidity" id="liquidity-tab-1" aria-controls="liquidity-tabpanel-1"/>
            </Tabs>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                {renderBalanceError}
                {errorMsg && <Alert severity="error" onClose={() => setErrorMsg(null)} sx={{ mb: 2 }}>{errorMsg}</Alert>}

              {/* Add Liquidity Panel */}
              <TabPanel value={tabValue} index={0}>
                <Box>
                   <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 2 }}>
                       <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Lock Ratio ({`1 ${tokenA} ≈ ${formatBalance(selectedPool.currentPrice, 4)} ${tokenB}`})</Typography>
                       <Tooltip title={lockRatio ? "Unlock ratio" : "Lock ratio"}>
                           <IconButton size="small" onClick={() => setLockRatio(prev => !prev)} color={lockRatio ? 'primary' : 'default'} disabled={isAdding}><SyncAltIcon fontSize="small" /></IconButton>
                       </Tooltip>
                   </Box>
                   <TextFieldWithBalance label={`Amount of ${tokenA}`} tokenSymbol={tokenA} value={addAmountAStr} balance={userBalances[tokenA]} usdValue={addAUsd} onChange={(e) => handleAddAmountChange(e.target.value, 'A')} onMax={() => setMax('A')} disabled={isAdding} />
                   <TextFieldWithBalance label={`Amount of ${tokenB}`} tokenSymbol={tokenB} value={addAmountBStr} balance={userBalances[tokenB]} usdValue={addBUsd} onChange={(e) => handleAddAmountChange(e.target.value, 'B')} onMax={() => setMax('B')} disabled={isAdding} />
                   {(addAmountA > 0 || addAmountB > 0) && (
                       <Paper variant="outlined" sx={{ p: 1.5, mt: 2, mb: 3, textAlign: 'center', bgcolor: 'action.hover' }}>
                            <Typography variant="body2" fontWeight="medium">Est. vDPP Reward: {formatBalance(estimatedReward.reward, 4)} vDPP
                               {estimatedReward.explanation && (<Tooltip title={estimatedReward.explanation} placement="top"><InfoOutlinedIcon fontSize="inherit" sx={{ ml: 0.5, verticalAlign: 'middle', cursor: 'help', color: 'text.secondary' }}/></Tooltip>)}
                            </Typography>
                       </Paper>
                   )}
                  <Button variant="contained" fullWidth onClick={handleAdd} disabled={!canAdd || isAdding} size="large" sx={{ borderRadius: 2, py: 1.5, mt: 1 }}>
                    {isAdding ? <CircularProgress size={24} color="inherit" /> : (addAmountA > (userBalances[tokenA] ?? 0) || addAmountB > (userBalances[tokenB] ?? 0) ? 'Insufficient Balance' : 'Add Liquidity')}
                  </Button>
                </Box>
              </TabPanel>

              {/* Remove Liquidity Panel */}
               <TabPanel value={tabValue} index={1}>
                <Box>
                   <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Enter the amount of LP tokens you wish to withdraw.</Typography>
                   <TextFieldWithBalance label={`Amount of LP Tokens (LP-${tokenA}/${tokenB})`} tokenSymbol={`LP-${tokenA}/${tokenB}`} value={removeLpAmountStr} balance={userBalances[`LP-${tokenA}/${tokenB}`]} usdValue={0} onChange={(e) => handleRemoveAmountChange(e.target.value)} onMax={setMaxLp} disabled={isRemoving} decimals={8} />
                   {removeLpAmount > 0 && (
                        <Paper variant="outlined" sx={{ p: 2, mt: 2, mb: 3, bgcolor: 'action.hover' }}>
                            <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>Estimated Received:</Typography>
                            <Grid container spacing={1}>
                                <Grid item xs={6}><Typography variant="body2">{tokenA}: {formatBalance(estRemoveA, 6)}{removeAUsd > 0 && ` (~$${formatBalance(removeAUsd, 2)})`}</Typography></Grid>
                                <Grid item xs={6}><Typography variant="body2">{tokenB}: {formatBalance(estRemoveB, 6)}{removeBUsd > 0 && ` (~$${formatBalance(removeBUsd, 2)})`}</Typography></Grid>
                            </Grid>
                        </Paper>
                   )}
                  <Button variant="contained" color="secondary" fullWidth onClick={handleRemove} disabled={!canRemove || isRemoving} size="large" sx={{ borderRadius: 2, py: 1.5, mt: 1 }}>
                    {isRemoving ? <CircularProgress size={24} color="inherit" /> : (removeLpAmount > (userBalances[`LP-${tokenA}/${tokenB}`] ?? 0) ? 'Insufficient LP Balance' : 'Remove Liquidity')}
                  </Button>
                </Box>
              </TabPanel>
            </CardContent>
          </Card>
      </Fade>
    </Box>
  );
};

export default Liquidity;