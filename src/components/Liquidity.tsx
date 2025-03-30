import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  InputAdornment,
  Tabs,
  Tab,
  CircularProgress,
  Paper,
  Tooltip,
  Fade,
  Alert,
  Grid,
  Link,
  IconButton
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SyncAltIcon from '@mui/icons-material/SyncAlt';

import { Pool } from '../types';
import { MOCK_TOKEN_PRICES } from '../utils/mockData';
import { formatBalance } from '../utils/formatters';
import { calculateEstimatedVdppRewards } from '../utils/simulations';

interface LiquidityProps {
  selectedPool: Pool | null;
  userBalances: Record<string, number>; // Assuming number type for simplicity
  onAddLiquidity: (tokenA: string, tokenB: string, amountA: number, amountB: number) => Promise<void> | void; // Can be async
  onRemoveLiquidity: (tokenA: string, tokenB: string, lpAmount: number) => Promise<void> | void; // Needs LP token amount for real removal
  loadingStates: { add?: boolean; remove?: boolean };
}

// --- Helper Component for TabPanel ---
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`liquidity-tabpanel-${index}`}
      aria-labelledby={`liquidity-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}
// --- End Helper Component ---

const Liquidity: React.FC<LiquidityProps> = ({
    selectedPool,
    userBalances,
    onAddLiquidity,
    onRemoveLiquidity,
    loadingStates
}) => {
  const [tabValue, setTabValue] = useState(0);

  // --- Add Liquidity State ---
  const [addAmountAStr, setAddAmountAStr] = useState("");
  const [addAmountBStr, setAddAmountBStr] = useState("");
  const [lockRatio, setLockRatio] = useState(true); // Lock A/B ratio by default
  const [lastEdited, setLastEdited] = useState<'A' | 'B' | null>(null); // Track which field was last edited

  // --- Remove Liquidity State (Simplified: using amounts, not LP tokens) ---
  // For a real app, this should be based on LP token amount/percentage
  const [removeLpAmountStr, setRemoveLpAmountStr] = useState(""); // Input for LP token amount

  // --- Derived states ---
  const addAmountA = useMemo(() => parseFloat(addAmountAStr) || 0, [addAmountAStr]);
  const addAmountB = useMemo(() => parseFloat(addAmountBStr) || 0, [addAmountBStr]);
  const removeLpAmount = useMemo(() => parseFloat(removeLpAmountStr) || 0, [removeLpAmountStr]);

  // --- Estimated amounts for removal ---
  const [estRemoveA, setEstRemoveA] = useState(0);
  const [estRemoveB, setEstRemoveB] = useState(0);

  // --- Reward Estimation State ---
  const [estimatedReward, setEstimatedReward] = useState({ reward: 0, explanation: '' });

  // --- Feedback State ---
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- Reset state when pool changes ---
  useEffect(() => {
    setAddAmountAStr("");
    setAddAmountBStr("");
    setRemoveLpAmountStr("");
    setEstRemoveA(0);
    setEstRemoveB(0);
    setEstimatedReward({ reward: 0, explanation: '' });
    setErrorMsg(null);
    setLastEdited(null);
    setLockRatio(true);
  }, [selectedPool]);


  // --- Handle Amount Change for Adding Liquidity ---
  const handleAddAmountChange = useCallback((value: string, token: 'A' | 'B') => {
    setErrorMsg(null); // Clear error on input change
    const setter = token === 'A' ? setAddAmountAStr : setAddAmountBStr;
    const otherSetter = token === 'A' ? setAddAmountBStr : setAddAmountAStr;
    const currentlyEdited = token;

    setter(value);
    setLastEdited(currentlyEdited);

    if (!selectedPool || !lockRatio) {
        // If ratio isn't locked, just update the reward estimate if applicable
        const currentA = token === 'A' ? (parseFloat(value) || 0) : addAmountA;
        const currentB = token === 'B' ? (parseFloat(value) || 0) : addAmountB;
        setEstimatedReward(calculateEstimatedVdppRewards(currentA, currentB, selectedPool));
        return;
    };

    // --- Ratio Calculation (if locked) ---
    const numValue = parseFloat(value) || 0;
    const { currentPrice } = selectedPool;
    const ratio = currentPrice; // 1 A = ratio B

    let otherNumValue = 0;
    if (numValue > 0) {
      if (token === 'A') {
        otherNumValue = numValue * ratio; // Calculate B from A
      } else { // Input is Token B
        otherNumValue = ratio !== 0 ? numValue / ratio : 0; // Calculate A from B
      }
      otherSetter(otherNumValue > 0 ? otherNumValue.toFixed(6) : ""); // Update the other field
    } else {
      otherSetter(""); // Clear the other field if input is 0 or invalid
    }

    // Update reward estimate
    const finalA = token === 'A' ? numValue : otherNumValue;
    const finalB = token === 'B' ? numValue : otherNumValue;
    setEstimatedReward(calculateEstimatedVdppRewards(finalA, finalB, selectedPool));

  }, [selectedPool, lockRatio, addAmountA, addAmountB]); // Add dependencies

    // Recalculate the non-edited field if the ratio lock is toggled ON
    useEffect(() => {
        if (lockRatio && lastEdited && selectedPool) {
            if (lastEdited === 'A') {
                handleAddAmountChange(addAmountAStr, 'A');
            } else {
                handleAddAmountChange(addAmountBStr, 'B');
            }
        }
    }, [lockRatio, selectedPool, lastEdited, addAmountAStr, addAmountBStr, handleAddAmountChange]);


   // --- Handle LP Amount Change for Removing Liquidity ---
  const handleRemoveAmountChange = useCallback((value: string) => {
      setRemoveLpAmountStr(value);
      setErrorMsg(null);

      // ** SIMULATION **: Calculate estimated return amounts
      // This requires knowing the total LP supply and pool reserves (not available here)
      // We'll fake it based on the current price for demonstration
      const lpAmount = parseFloat(value) || 0;
      if (lpAmount > 0 && selectedPool) {
          // VERY rough estimate assuming LP value is proportional to current price
          const mockTotalLpValue = 1000; // Assume total LP value (e.g., 1000 LP tokens exist)
          const fractionToRemove = lpAmount / mockTotalLpValue;
          // Estimate value based on mock prices (again, very inaccurate without reserves)
          const approxValueA = MOCK_TOKEN_PRICES[selectedPool.tokenA] * (fractionToRemove * 50); // Fake reserves
          const approxValueB = MOCK_TOKEN_PRICES[selectedPool.tokenB] * (fractionToRemove * 50 * selectedPool.currentPrice); // Fake reserves
          setEstRemoveA(approxValueA / (MOCK_TOKEN_PRICES[selectedPool.tokenA] || 1));
          setEstRemoveB(approxValueB / (MOCK_TOKEN_PRICES[selectedPool.tokenB] || 1));
      } else {
          setEstRemoveA(0);
          setEstRemoveB(0);
      }

  }, [selectedPool]);


  // Switch tabs
  const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setErrorMsg(null); // Clear errors when switching tabs
  };

  // --- Action Handlers ---
  const handleAdd = async () => {
    setErrorMsg(null);
    if (!selectedPool || addAmountA <= 0 || addAmountB <= 0 || loadingStates.add) return;
    const { tokenA, tokenB } = selectedPool;
    const balanceA = userBalances[tokenA] ?? 0;
    const balanceB = userBalances[tokenB] ?? 0;

    if (addAmountA > balanceA) {
        setErrorMsg(`Insufficient ${tokenA} balance. Need ${formatBalance(addAmountA, 6)}, have ${formatBalance(balanceA, 6)}.`);
        return;
    }
     if (addAmountB > balanceB) {
        setErrorMsg(`Insufficient ${tokenB} balance. Need ${formatBalance(addAmountB, 6)}, have ${formatBalance(balanceB, 6)}.`);
        return;
    }

    try {
        await onAddLiquidity(tokenA, tokenB, addAmountA, addAmountB);
        // Clear inputs on successful submission
        setAddAmountAStr("");
        setAddAmountBStr("");
        setEstimatedReward({ reward: 0, explanation: ''});
    } catch (error: any) {
        console.error("Add Liquidity Error:", error);
        setErrorMsg(error.message || "Failed to add liquidity.");
    }
  };

  const handleRemove = async () => {
      setErrorMsg(null);
      if (!selectedPool || removeLpAmount <= 0 || loadingStates.remove) return;

       const { tokenA, tokenB } = selectedPool;
       // LP Token Balance Check (using mock symbol for now)
       const lpTokenSymbol = `LP-${tokenA}/${tokenB}`;
       const lpBalance = userBalances[lpTokenSymbol] ?? 0;

       if (removeLpAmount > lpBalance) {
            setErrorMsg(`Insufficient LP token balance. Need ${formatBalance(removeLpAmount, 8)}, have ${formatBalance(lpBalance, 8)}.`);
            return;
       }

       try {
            // Pass the LP token amount to the handler
           await onRemoveLiquidity(tokenA, tokenB, removeLpAmount);
           // Clear input on success
           setRemoveLpAmountStr("");
           setEstRemoveA(0);
           setEstRemoveB(0);
       } catch (error: any) {
           console.error("Remove Liquidity Error:", error);
           setErrorMsg(error.message || "Failed to remove liquidity.");
       }
  };

  // --- Max Button Handlers ---
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

  // --- USD Value Calculation ---
  const toUsd = (tokenSymbol: string | undefined, amountStr: string) => {
    if (!tokenSymbol) return 0;
    const price = MOCK_TOKEN_PRICES[tokenSymbol] || 0; // Use mock prices
    const amt = parseFloat(amountStr) || 0;
    return amt * price;
  };

  // Check balances and amounts for enabling buttons
  const canAdd = selectedPool && addAmountA > 0 && addAmountB > 0 && addAmountA <= (userBalances[selectedPool.tokenA] ?? 0) && addAmountB <= (userBalances[selectedPool.tokenB] ?? 0);
  const canRemove = selectedPool && removeLpAmount > 0 && removeLpAmount <= (userBalances[`LP-${selectedPool.tokenA}/${selectedPool.tokenB}`] ?? 0);

  // Loading states
  const isAdding = loadingStates.add ?? false;
  const isRemoving = loadingStates.remove ?? false;


  if (!selectedPool) {
     return (
         <Box sx={{ p:3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '30vh' }}>
             <Typography variant="h6" color="text.secondary" align="center">
                 Please select a pool from the Dashboard to manage liquidity.
             </Typography>
         </Box>
     );
   }

  // Destructure pool tokens for easier access
  const { tokenA, tokenB } = selectedPool;

  // Calculate USD display values
  const addAUsd = toUsd(tokenA, addAmountAStr);
  const addBUsd = toUsd(tokenB, addAmountBStr);
  // Removal USD values are based on estimates
  const removeAUsd = toUsd(tokenA, estRemoveA.toString());
  const removeBUsd = toUsd(tokenB, estRemoveB.toString());

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 4, px: { xs: 1, sm: 0 } }}
    >
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        Manage Liquidity
      </Typography>
      <Fade in={true} timeout={500}>
          <Card
            elevation={1}
            sx={{
              width: '100%',
              maxWidth: 500,
              borderRadius: 3,
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              overflow: 'hidden'
            }}
          >
            <Tabs
                value={tabValue}
                onChange={handleChangeTab}
                variant="fullWidth"
                textColor="primary"
                indicatorColor="primary"
                sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'action.selected' }}
            >
              <Tab label="Add Liquidity" id="liquidity-tab-0" aria-controls="liquidity-tabpanel-0"/>
              <Tab label="Remove Liquidity" id="liquidity-tab-1" aria-controls="liquidity-tabpanel-1"/>
            </Tabs>

            {/* --- Tab Content --- */}
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>

                {/* Error Message Display */}
                {errorMsg && (
                    <Alert severity="error" onClose={() => setErrorMsg(null)} sx={{ mb: 2 }}>
                        {errorMsg}
                    </Alert>
                )}

              {/* --- ADD LIQUIDITY PANEL --- */}
              <TabPanel value={tabValue} index={0}>
                <Box>
                   {/* Ratio Lock Toggle */}
                   <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 2 }}>
                       <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                           Lock Ratio ({`1 ${tokenA} ≈ ${formatBalance(selectedPool.currentPrice, 4)} ${tokenB}`})
                       </Typography>
                       <Tooltip title={lockRatio ? "Unlock ratio to enter amounts independently" : "Lock ratio to maintain current pool price"}>
                           <IconButton size="small" onClick={() => setLockRatio(prev => !prev)} color={lockRatio ? 'primary' : 'default'}>
                               <SyncAltIcon fontSize="small" />
                           </IconButton>
                       </Tooltip>
                   </Box>

                  {/* Token A Input */}
                   <TextFieldWithBalance
                        label={`Amount of ${tokenA}`}
                        tokenSymbol={tokenA}
                        value={addAmountAStr}
                        balance={userBalances[tokenA]}
                        usdValue={addAUsd}
                        onChange={(e) => handleAddAmountChange(e.target.value, 'A')}
                        onMax={() => setMax('A')}
                        disabled={isAdding}
                   />

                  {/* Token B Input */}
                   <TextFieldWithBalance
                        label={`Amount of ${tokenB}`}
                        tokenSymbol={tokenB}
                        value={addAmountBStr}
                        balance={userBalances[tokenB]}
                        usdValue={addBUsd}
                        onChange={(e) => handleAddAmountChange(e.target.value, 'B')}
                        onMax={() => setMax('B')}
                        disabled={isAdding}
                   />

                   {/* Reward Estimation */}
                   {(addAmountA > 0 || addAmountB > 0) && ( // Show even if one amount is entered
                       <Paper variant="outlined" sx={{ p: 1.5, mt: 2, mb: 3, textAlign: 'center', bgcolor: 'action.hover' }}>
                            <Typography variant="body2" fontWeight="medium">
                               Est. vDPP Reward: {formatBalance(estimatedReward.reward, 4)} vDPP
                               {estimatedReward.explanation && (
                               <Tooltip title={estimatedReward.explanation} placement="top">
                                   <InfoOutlinedIcon fontSize="inherit" sx={{ ml: 0.5, verticalAlign: 'middle', cursor: 'help', color: 'text.secondary' }}/>
                               </Tooltip>
                               )}
                            </Typography>
                       </Paper>
                   )}

                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleAdd}
                    disabled={!canAdd || isAdding}
                    size="large"
                    sx={{ borderRadius: 2, py: 1.5, mt: 1 }}
                  >
                    {isAdding ? <CircularProgress size={24} color="inherit" /> : (addAmountA > (userBalances[tokenA] ?? 0) || addAmountB > (userBalances[tokenB] ?? 0) ? 'Insufficient Balance' : 'Add Liquidity')}
                  </Button>
                </Box>
              </TabPanel>

              {/* --- REMOVE LIQUIDITY PANEL --- */}
               <TabPanel value={tabValue} index={1}>
                <Box>
                   <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Enter the amount of LP tokens you wish to withdraw.
                   </Typography>

                   {/* LP Token Input */}
                   <TextFieldWithBalance
                        label={`Amount of LP Tokens (LP-${tokenA}/${tokenB})`}
                        tokenSymbol={`LP-${tokenA}/${tokenB}`} // Mock symbol
                        value={removeLpAmountStr}
                        balance={userBalances[`LP-${tokenA}/${tokenB}`]} // Check LP balance
                        usdValue={0} // LP token USD value estimation is complex
                        onChange={(e) => handleRemoveAmountChange(e.target.value)}
                        onMax={setMaxLp}
                        disabled={isRemoving}
                        decimals={8}
                   />

                   {/* Estimated Received Amounts */}
                   {removeLpAmount > 0 && (
                        <Paper variant="outlined" sx={{ p: 2, mt: 2, mb: 3, bgcolor: 'action.hover' }}>
                            <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                                Estimated Received:
                            </Typography>
                            <Grid container spacing={1}>
                                <Grid item xs={6}>
                                    <Typography variant="body2">
                                        {tokenA}: {formatBalance(estRemoveA, 6)}
                                        {removeAUsd > 0 && ` (~$${formatBalance(removeAUsd, 2)})`}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                     <Typography variant="body2">
                                        {tokenB}: {formatBalance(estRemoveB, 6)}
                                         {removeBUsd > 0 && ` (~$${formatBalance(removeBUsd, 2)})`}
                                    </Typography>
                                </Grid>
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


// --- Helper Component for Text Field + Balance + Max Button ---
interface TextFieldWithBalanceProps {
    label: string;
    tokenSymbol: string;
    value: string;
    balance: number | undefined;
    usdValue: number;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onMax: () => void;
    disabled?: boolean;
    decimals?: number; // Max decimals for balance display
}

const TextFieldWithBalance: React.FC<TextFieldWithBalanceProps> = ({
    label, tokenSymbol, value, balance, usdValue, onChange, onMax, disabled, decimals = 4
}) => (
    <Box sx={{ mb: 2.5 }}> {/* Increased margin bottom */}
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
                inputProps: { min: 0, step: "any" }, // Allow decimals
            }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
             <Typography variant="caption" color="text.secondary">
               Balance: {formatBalance(balance, decimals)}
               <Link component="button" variant="caption" onClick={onMax} disabled={disabled} sx={{ ml: 0.5, verticalAlign: 'baseline' }}>
                    Max
               </Link>
             </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ minHeight: '1.2em' }}>
              {usdValue > 0 ? `~ $${formatBalance(usdValue, 2)}` : ''}
            </Typography>
        </Box>
    </Box>
);
// --- End Helper Component ---


export default Liquidity;