// src/components/Liquidity.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, Button, InputAdornment,
  Tabs, Tab, CircularProgress, Paper, Fade, Alert, Grid, Link, Skeleton
} from '@mui/material';
import { formatBalance } from '../utils/formatters';

// Context and Action Hook Imports
import { usePoolsContext } from '../contexts/PoolsContext';
import { useBalancesContext } from '../contexts/BalancesContext';
import { useLoadingContext } from '../contexts/LoadingContext';
import { useLiquidityActions } from '../hooks/useLiquidityActions';
import { ethers } from 'ethers';

// --- Helper Components (TabPanel, TextFieldWithBalance) ---
interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} id={`liquidity-tabpanel-${index}`} aria-labelledby={`liquidity-tab-${index}`} {...other}>
      {value === index && (<Box sx={{ pt: 3 }}>{children}</Box>)}
    </div>
  );
}
// TextFieldWithBalance props updated for symbol/decimals
interface TextFieldWithBalanceProps {
    label: string;
    tokenSymbol: string;
    tokenAddress?: string;
    value: string;
    balance: number | undefined;
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
    onMax?: () => void;
    disabled?: boolean;
    decimals?: number;
}
const TextFieldWithBalance: React.FC<TextFieldWithBalanceProps> = ({
    label, tokenSymbol, value, balance, onChange, onMax, disabled, decimals = 6
}) => (
    <Box sx={{ mb: 2.5 }}>
        <TextField
            label={label}
            type="number"
            variant="outlined"
            placeholder="0.0"
            fullWidth
            value={value}
            onChange={onChange}
            disabled={disabled}
            InputProps={{
                endAdornment: <InputAdornment position="end">{tokenSymbol}</InputAdornment>,
                inputProps: { min: 0, step: "any" }
            }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
             <Typography variant="caption" color="text.secondary">
               Balance: {formatBalance(balance, decimals)}
               {onMax && (
                  <Link component="button" variant="caption" onClick={onMax} disabled={disabled || balance === undefined || balance <= 0} sx={{ ml: 0.5, verticalAlign: 'baseline' }}>Max</Link>
               )}
             </Typography>
        </Box>
    </Box>
);
// --- End Helper Components ---


const Liquidity: React.FC = () => {
  const { selectedPool, isLoadingPools, errorPools } = usePoolsContext();
  const { userBalances, tokenDecimals, tokenSymbols, isLoadingBalances, errorBalances } = useBalancesContext();
  const { isLoading: loadingStates } = useLoadingContext();
  const { handleAddLiquidity, handleRemoveLiquidity } = useLiquidityActions();

  const [tabValue, setTabValue] = useState(0);
  const [addAmountAStr, setAddAmountAStr] = useState("");
  const [addAmountBStr, setAddAmountBStr] = useState("");

  // Using liquidityDelta as an example, needs UI adjustment
  const [removeLiquidityDeltaStr, setRemoveLiquidityDeltaStr] = useState("");
  const [removeLiquidityDelta, setRemoveLiquidityDelta] = useState<bigint>(0n);
  // Estimation for removal is also complex in V4
  const [estRemoveA, setEstRemoveA] = useState(0);
  const [estRemoveB, setEstRemoveB] = useState(0);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Derived states
  const addAmountA = useMemo(() => parseFloat(addAmountAStr) || 0, [addAmountAStr]);
  const addAmountB = useMemo(() => parseFloat(addAmountBStr) || 0, [addAmountBStr]);
  const isAdding = loadingStates['addLiquidity'] ?? false;
  const isApprovingAdd = loadingStates['approve_liquidity'] ?? false;
  const isRemoving = loadingStates['removeLiquidity'] ?? false;

  // --- Effects ---
  useEffect(() => {
    // Reset state when pool changes
    setAddAmountAStr(""); setAddAmountBStr("");
    setRemoveLiquidityDeltaStr(""); setRemoveLiquidityDelta(0n);
    setEstRemoveA(0); setEstRemoveB(0);
    setErrorMsg(null);
  }, [selectedPool]);


  // --- Handlers ---
  const handleAddAmountAChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setAddAmountAStr(e.target.value);
      setErrorMsg(null);
  };
   const handleAddAmountBChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setAddAmountBStr(e.target.value);
      setErrorMsg(null);
  };

   // Handler for removing liquidity delta
   const handleRemoveDeltaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
       const value = e.target.value;
       setRemoveLiquidityDeltaStr(value);
       setErrorMsg(null);
       try {
           // Assuming user inputs liquidity amount directly (needs appropriate decimals, e.g., 18)
           const delta = ethers.parseUnits(value || "0", 18);
           setRemoveLiquidityDelta(delta);
           // TODO: Estimate token outputs based on delta removal (requires SDK/Query)
           setEstRemoveA(0); // Placeholder
           setEstRemoveB(0); // Placeholder
       } catch (parseError) {
           setRemoveLiquidityDelta(0n); // Invalid input
           setEstRemoveA(0);
           setEstRemoveB(0);
       }
   };


  const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue); setErrorMsg(null);
  };

  const handleAdd = async () => {
    setErrorMsg(null);
    if (!selectedPool || !selectedPool.tokenA_Address || !selectedPool.tokenB_Address || addAmountA <= 0 || addAmountB <= 0 || isAdding || isApprovingAdd) return;

    const tokenA = selectedPool.tokenA_Address;
    const tokenB = selectedPool.tokenB_Address;
    const balanceA = parseFloat(userBalances[tokenA] ?? "0");
    const balanceB = parseFloat(userBalances[tokenB] ?? "0");

    if (addAmountA > balanceA) { setErrorMsg(`Insufficient ${tokenSymbols[tokenA] ?? 'Token A'} balance.`); return; }
    if (addAmountB > balanceB) { setErrorMsg(`Insufficient ${tokenSymbols[tokenB] ?? 'Token B'} balance.`); return; }

    await handleAddLiquidity(addAmountA, addAmountB);
    // Hook handles snackbar/loading/refetch
    // Clear fields on success initiation
    setAddAmountAStr(""); setAddAmountBStr("");
  };

  const handleRemove = async () => {
      setErrorMsg(null);
      if (!selectedPool || removeLiquidityDelta <= 0n || isRemoving) return;

      // Balance check for liquidity delta is complex - depends on user's position(s)
      // Skipping balance check for now - contract will revert if insufficient
      // TODO: Implement check based on user's actual V4 positions if possible

      await handleRemoveLiquidity(removeLiquidityDelta);
      // Hook handles snackbar/loading/refetch
      // Clear field on success initiation
      setRemoveLiquidityDeltaStr(""); setRemoveLiquidityDelta(0n);
  };

  // --- Max Button Handlers ---
   const setMaxA = () => {
       if (!selectedPool?.tokenA_Address) return;
       const balanceStr = userBalances[selectedPool.tokenA_Address] ?? "0.0";
       setAddAmountAStr(balanceStr);
   };
    const setMaxB = () => {
       if (!selectedPool?.tokenB_Address) return;
       const balanceStr = userBalances[selectedPool.tokenB_Address] ?? "0.0";
       setAddAmountBStr(balanceStr);
   };

  // --- Derived data for render ---
  const tokenAAddress = selectedPool?.tokenA_Address;
  const tokenBAddress = selectedPool?.tokenB_Address;
  const tokenASymbol = tokenAAddress ? tokenSymbols[tokenAAddress] ?? 'TKA' : '---';
  const tokenBSymbol = tokenBAddress ? tokenSymbols[tokenBAddress] ?? 'TKB' : '---';
  const tokenADecimals = tokenAAddress ? tokenDecimals[tokenAAddress] : 18;
  const tokenBDecimals = tokenBAddress ? tokenDecimals[tokenBAddress] : 18;
  const balanceA = tokenAAddress ? parseFloat(userBalances[tokenAAddress] ?? "0") : 0;
  const balanceB = tokenBAddress ? parseFloat(userBalances[tokenBAddress] ?? "0") : 0;

  const canAdd = selectedPool && addAmountA > 0 && addAmountB > 0 && addAmountA <= balanceA && addAmountB <= balanceB;
  // Can remove check needs adjustment for V4 positions
  const canRemove = selectedPool && removeLiquidityDelta > 0n; // Simple check for now


  // --- Render Logic ---
   if (isLoadingPools || isLoadingBalances) {
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
                  <Alert severity="error">Error loading pool: {errorPools}</Alert>
              ) : (
                  <Typography variant="h6" color="text.secondary" align="center">
                      Please select a pool from the Dashboard to manage liquidity.
                  </Typography>
              )}
         </Box>
     );
   }

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
                   <TextFieldWithBalance
                        label={`Amount of ${tokenASymbol}`}
                        tokenSymbol={tokenASymbol}
                        tokenAddress={tokenAAddress}
                        value={addAmountAStr}
                        balance={balanceA}
                        onChange={handleAddAmountAChange}
                        onMax={setMaxA}
                        disabled={isAdding || isApprovingAdd}
                        decimals={tokenADecimals}
                    />
                   <TextFieldWithBalance
                        label={`Amount of ${tokenBSymbol}`}
                        tokenSymbol={tokenBSymbol}
                        tokenAddress={tokenBAddress}
                        value={addAmountBStr}
                        balance={balanceB}
                        onChange={handleAddAmountBChange}
                        onMax={setMaxB}
                        disabled={isAdding || isApprovingAdd}
                        decimals={tokenBDecimals}
                    />
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleAdd}
                    disabled={!canAdd || isAdding || isApprovingAdd}
                    size="large"
                    sx={{ borderRadius: 2, py: 1.5, mt: 1 }}
                   >
                    {isApprovingAdd ? <CircularProgress size={24} color="inherit" /> : isAdding ? <CircularProgress size={24} color="inherit" /> : (addAmountA > balanceA || addAmountB > balanceB ? 'Insufficient Balance' : 'Add Liquidity')}
                  </Button>
                </Box>
              </TabPanel>

              {/* Remove Liquidity Panel */}
               <TabPanel value={tabValue} index={1}>
                <Box>
                   <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                       Enter the amount of liquidity (delta) to remove. This requires knowing your position's liquidity value.
                       {/* TODO: Add UI to select position if using NFTs */}
                   </Typography>
                   {/* Input for Liquidity Delta */}
                    <TextField
                        label={`Liquidity Delta to Remove`}
                        type="text" // Use text to allow large numbers potentially
                        variant="outlined"
                        placeholder="0"
                        fullWidth
                        value={removeLiquidityDeltaStr}
                        onChange={handleRemoveDeltaChange}
                        disabled={isRemoving}
                        InputProps={{ inputProps: { min: 0 } }} // Basic validation
                        sx={{ mb: 2 }}
                    />
                    {/* TODO: Add Max button based on selected position */}
                    {/* <Button onClick={setMaxRemove} disabled={isRemoving}>Max From Position</Button> */}

                   {/* Estimated Received Tokens (Placeholder) */}
                   {removeLiquidityDelta > 0n && (
                        <Paper variant="outlined" sx={{ p: 2, mt: 2, mb: 3, bgcolor: 'action.hover' }}>
                            <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>Estimated Received (Requires SDK/Query):</Typography>
                            <Grid container spacing={1}>
                                <Grid item xs={6}><Typography variant="body2">{tokenASymbol}: {formatBalance(estRemoveA, 6)}</Typography></Grid>
                                <Grid item xs={6}><Typography variant="body2">{tokenBSymbol}: {formatBalance(estRemoveB, 6)}</Typography></Grid>
                            </Grid>
                        </Paper>
                   )}
                  <Button
                    variant="contained"
                    color="secondary"
                    fullWidth
                    onClick={handleRemove}
                    disabled={!canRemove || isRemoving}
                    size="large"
                    sx={{ borderRadius: 2, py: 1.5, mt: 1 }}
                   >
                    {isRemoving ? <CircularProgress size={24} color="inherit" /> : 'Remove Liquidity'}
                  </Button>
                   <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                       Note: Removing liquidity via delta is an advanced action. You may need to 'Collect' tokens separately.
                   </Typography>
                </Box>
              </TabPanel>
            </CardContent>
          </Card>
      </Fade>
    </Box>
  );
};

export default Liquidity;