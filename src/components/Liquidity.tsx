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
  Fade
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Pool } from './AppProvider';

// Mock USD prices (replace with oracle later)
const MOCK_TOKEN_PRICES: Record<string, number> = {
  ETH: 2000,
  DAI: 1,
  BTC: 28000,
  USDT: 1,
  USDC: 1,
  UNI: 5,
};

interface LiquidityProps {
  selectedPool: Pool | null;
  userBalances: Record<string, number>;
  onAddLiquidity: (tokenA: string, tokenB: string, amountA: number, amountB: number) => void;
  onRemoveLiquidity: (tokenA: string, tokenB: string, amountA: number, amountB: number) => void; // Simplified removal
  loadingStates: { add: boolean; remove: boolean };
}

// --- Simulation Helper: Reward Estimation ---
const calculateEstimatedVdppRewards = (
    amountA: number,
    amountB: number,
    pool: Pool
): { reward: number; explanation: string } => {
    if (!pool || (amountA <= 0 && amountB <= 0)) return { reward: 0, explanation: '' };

    // VERY basic simulation: Reward is higher if deposit moves price closer to desired
    const { currentPrice, desiredPrice, tokenA, tokenB } = pool;

    // Simulate price impact (again, highly simplified)
    // Adding liquidity typically pushes price towards the ratio of deposit
    const depositRatio = amountB > 0 ? amountA / amountB : currentPrice; // Ratio A/B of the deposit
    const impactFactor = 0.1; // How much the deposit influences the price (arbitrary)
    const priceAfter = currentPrice * (1 - impactFactor) + depositRatio * impactFactor;

    const movesTowardsDesired = Math.abs(priceAfter - desiredPrice) < Math.abs(currentPrice - desiredPrice);

    let rewardFactor = 0.05; // Base reward factor (e.g., 5% of value deposited in vDPP)
    let explanation = "Base vDPP reward estimate.";

    if (movesTowardsDesired) {
        rewardFactor = 0.1; // Double reward for helping price
        explanation = "Estimated reward increased (deposit helps move price towards desired).";
    }

    // Calculate reward based on approx USD value of deposit
    const valueA = (MOCK_TOKEN_PRICES[tokenA] || 0) * amountA;
    const valueB = (MOCK_TOKEN_PRICES[tokenB] || 0) * amountB;
    const totalValue = valueA + valueB;
    const reward = totalValue * rewardFactor;

    return { reward: reward > 0 ? reward : 0, explanation };
};
// --- End Simulation Helper ---


const Liquidity: React.FC<LiquidityProps> = ({ selectedPool, userBalances, onAddLiquidity, onRemoveLiquidity, loadingStates }) => {
  const [tabValue, setTabValue] = useState(0);

  // --- Add Liquidity State ---
  const [addAmountAStr, setAddAmountAStr] = useState("");
  const [addAmountBStr, setAddAmountBStr] = useState("");

  // --- Remove Liquidity State (Simplified: using amounts, not LP tokens) ---
  const [removeAmountAStr, setRemoveAmountAStr] = useState("");
  const [removeAmountBStr, setRemoveAmountBStr] = useState(""); // Will be auto-calculated

  // --- Derived states ---
  const addAmountA = useMemo(() => parseFloat(addAmountAStr) || 0, [addAmountAStr]);
  const addAmountB = useMemo(() => parseFloat(addAmountBStr) || 0, [addAmountBStr]);
  const removeAmountA = useMemo(() => parseFloat(removeAmountAStr) || 0, [removeAmountAStr]);
  const removeAmountB = useMemo(() => parseFloat(removeAmountBStr) || 0, [removeAmountBStr]); // Auto-calculated B for removal

  const [estimatedReward, setEstimatedReward] = useState({ reward: 0, explanation: '' });

  // Clear inputs when pool changes
  useEffect(() => {
    setAddAmountAStr("");
    setAddAmountBStr("");
    setRemoveAmountAStr("");
    setRemoveAmountBStr("");
    setEstimatedReward({ reward: 0, explanation: ''});
  }, [selectedPool]);


  // --- Calculate dependent amounts and rewards ---
  const handleAmountChange = useCallback((
    value: string,
    tokenSetter: React.Dispatch<React.SetStateAction<string>>, // e.g., setAddAmountAStr
    otherTokenSetter: React.Dispatch<React.SetStateAction<string>>, // e.g., setAddAmountBStr
    isTokenA: boolean,
    forAdd: boolean // True if for adding liquidity, false for removing
    ) => {
    tokenSetter(value);
    if (!selectedPool) return;

    const numValue = parseFloat(value) || 0;
    const { currentPrice } = selectedPool;
    const ratio = currentPrice; // 1 A = ratio B

    let otherNumValue = 0;
    if (numValue > 0) {
      if (isTokenA) {
        otherNumValue = numValue * ratio; // Calculate B from A
      } else { // Input is Token B
        otherNumValue = ratio !== 0 ? numValue / ratio : 0; // Calculate A from B
      }
    }
    otherTokenSetter(otherNumValue > 0 ? otherNumValue.toFixed(6) : "");

    // Update reward estimate only when adding
    if (forAdd) {
         const currentA = isTokenA ? numValue : otherNumValue;
         const currentB = isTokenA ? otherNumValue : numValue;
         const rewardInfo = calculateEstimatedVdppRewards(currentA, currentB, selectedPool);
         setEstimatedReward(rewardInfo);
    }

  }, [selectedPool]);

  // Switch tabs
  const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // --- Action Handlers ---
  const handleAdd = () => {
    if (!selectedPool || addAmountA <= 0 || addAmountB <= 0 || loadingStates.add) return;
    const { tokenA, tokenB } = selectedPool;
    const balanceA = userBalances[tokenA] || 0;
    const balanceB = userBalances[tokenB] || 0;

    if (addAmountA > balanceA || addAmountB > balanceB) {
        alert('Insufficient balance.'); // Replace with Snackbar
        return;
    }
    onAddLiquidity(tokenA, tokenB, addAmountA, addAmountB);
  };

  const handleRemove = () => {
      // Simplified: User enters amount of Token A they want back, we calculate B
      // Real scenario: User enters % of LP tokens or specific LP token amount
      if (!selectedPool || removeAmountA <= 0 || removeAmountB <= 0 || loadingStates.remove) return;
       const { tokenA, tokenB } = selectedPool;
       // In this simulation, we don't track LP tokens, so no balance check here.
       // A real implementation would check LP token balance.
      onRemoveLiquidity(tokenA, tokenB, removeAmountA, removeAmountB);
  };

  // --- USD Value Calculation ---
  const toUsd = (tokenSymbol: string | undefined, amountStr: string) => {
    if (!tokenSymbol) return 0;
    const price = MOCK_TOKEN_PRICES[tokenSymbol] || 0;
    const amt = parseFloat(amountStr) || 0;
    return amt * price;
  };

  // Check balances and amounts for enabling buttons
  const canAdd = selectedPool && addAmountA > 0 && addAmountB > 0 && addAmountA <= (userBalances[selectedPool.tokenA] ?? 0) && addAmountB <= (userBalances[selectedPool.tokenB] ?? 0);
  const canRemove = selectedPool && removeAmountA > 0 && removeAmountB > 0; // Simplified check

  if (!selectedPool) {
     return (
         <Box sx={{ p:3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
             <Typography variant="h6" color="text.secondary">
                 Please select a pool from the Dashboard first.
             </Typography>
         </Box>
     );
   }

  const { tokenA, tokenB } = selectedPool;

  // Calculate USD display values
  const addAUsd = toUsd(tokenA, addAmountAStr);
  const addBUsd = toUsd(tokenB, addAmountBStr);
  const removeAUsd = toUsd(tokenA, removeAmountAStr);
  const removeBUsd = toUsd(tokenB, removeAmountBStr); // Calculated B

  return (
    <Box sx={{ mt: 4, width: '100%', display: 'flex', justifyContent: 'center' }}>
      {/* Wrap main Card with Fade for appearance animation */}
      <Fade in={true} timeout={500}>
          <Card
            sx={{
              width: '100%',
              maxWidth: 460, // Match Swap card
              borderRadius: 3,
              boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
              overflow: 'hidden' // Prevent content overflow during tab transition
              // backgroundColor: 'background.paper', // Default
            }}
          >
        <Tabs
          value={tabValue}
          onChange={handleChangeTab}
          variant="fullWidth"
          textColor="primary"
          indicatorColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Add Liquidity" />
          <Tab label="Remove Liquidity" />
        </Tabs>

        {/* --- Tab Content --- */}
        <CardContent sx={{ p: 3 }}>
          {/* --- ADD LIQUIDITY --- */}
          {tabValue === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Deposit Tokens
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Select amounts for both tokens. The ratio must match the current pool price.
              </Typography>

              {/* Token A Input */}
              <Box sx={{ mb: 2 }}>
                <TextField
                  label={`Amount of ${tokenA}`}
                  type="number"
                  variant="outlined"
                  placeholder="0.0"
                  fullWidth
                  value={addAmountAStr}
                  onChange={(e) => handleAmountChange(e.target.value, setAddAmountAStr, setAddAmountBStr, true, true)}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">{tokenA}</InputAdornment>,
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Balance: {(userBalances[tokenA] ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} {addAmountA > 0 ? ` (~$${addAUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })})` : ''}
                </Typography>
              </Box>

               {/* Token B Input */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  label={`Amount of ${tokenB}`}
                  type="number"
                  variant="outlined"
                  placeholder="0.0"
                  fullWidth
                  value={addAmountBStr}
                  onChange={(e) => handleAmountChange(e.target.value, setAddAmountBStr, setAddAmountAStr, false, true)}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">{tokenB}</InputAdornment>,
                  }}
                />
                 <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                   Balance: {(userBalances[tokenB] ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} {addAmountB > 0 ? ` (~$${addBUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })})` : ''}
                 </Typography>
              </Box>

               {/* Reward Estimation */}
               {addAmountA > 0 && addAmountB > 0 && (
                   <Paper variant="outlined" sx={{ p: 1.5, mb: 3, textAlign: 'center' }}>
                        <Typography variant="body2" fontWeight="medium">
                           Est. vDPP Reward: {estimatedReward.reward.toFixed(4)} vDPP
                           {estimatedReward.explanation && (
                           <Tooltip title={estimatedReward.explanation} placement="top">
                               <InfoOutlinedIcon fontSize="inherit" sx={{ ml: 0.5, verticalAlign: 'middle', cursor: 'help' }} color="action"/>
                           </Tooltip>
                           )}
                        </Typography>
                   </Paper>
               )}

              <Button
                variant="contained"
                fullWidth
                onClick={handleAdd}
                disabled={!canAdd || loadingStates.add}
                size="large"
                sx={{ borderRadius: 2, py: 1.5 }}
              >
                {loadingStates.add ? <CircularProgress size={24} color="inherit" /> : 'Add Liquidity'}
              </Button>
            </Box>
          )}

          {/* --- REMOVE LIQUIDITY --- */}
          {tabValue === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Withdraw Tokens (Simplified)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Enter the amount of {tokenA} you wish to withdraw. The corresponding amount of {tokenB} will be calculated based on the current pool price.
                (Note: Real removal uses LP tokens).
              </Typography>

              {/* Token A Input */}
              <Box sx={{ mb: 2 }}>
                  <TextField
                      label={`Amount of ${tokenA} to withdraw`}
                      type="number"
                      variant="outlined"
                      placeholder="0.0"
                      fullWidth
                      value={removeAmountAStr}
                      onChange={(e) => handleAmountChange(e.target.value, setRemoveAmountAStr, setRemoveAmountBStr, true, false)} // isTokenA=true, forAdd=false
                      InputProps={{
                          endAdornment: <InputAdornment position="end">{tokenA}</InputAdornment>,
                      }}
                  />
                   <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {removeAmountA > 0 ? ` (~$${removeAUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })})` : ''}
                   </Typography>
              </Box>

              {/* Calculated Token B Output */}
               <Box sx={{ mb: 3 }}>
                   <TextField
                       label={`Est. ${tokenB} received`}
                       type="number"
                       variant="outlined"
                       placeholder="0.0"
                       fullWidth
                       value={removeAmountBStr} // Display calculated value
                       InputProps={{
                           readOnly: true,
                           endAdornment: <InputAdornment position="end">{tokenB}</InputAdornment>,
                       }}
                   />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {removeAmountB > 0 ? ` (~$${removeBUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })})` : ''}
                    </Typography>
               </Box>


              <Button
                variant="contained"
                color="secondary" // Use secondary color for removal
                fullWidth
                onClick={handleRemove}
                disabled={!canRemove || loadingStates.remove}
                size="large"
                sx={{ borderRadius: 2, py: 1.5 }}
              >
                {loadingStates.remove ? <CircularProgress size={24} color="inherit" /> : 'Remove Liquidity'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
      </Fade>
    </Box>
  );
};

export default Liquidity;