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
  Chip,
  Tooltip,
  SelectChangeEvent,
  Fade
} from '@mui/material';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Pool } from './AppProvider'; // Import Pool

// Mock USD prices (replace with oracle later)
const MOCK_TOKEN_PRICES: Record<string, number> = {
  ETH: 2000,
  DAI: 1,
  BTC: 30000,
  USDT: 1,
  USDC: 1,
  UNI: 5,
};

interface SwapProps {
  selectedPool: Pool | null;
  userBalances: Record<string, number>;
  onSwap: (sellToken: string, buyToken: string, sellAmount: number, expectedBuyAmount: number) => void;
  isLoading: boolean;
}

// --- Simulation Helper ---
const calculateDynamicFee = (
    sellAmount: number, // Amount of sellToken being sold
    sellTokenSymbol: string,
    pool: Pool
): { feePercentage: number; explanation: string } => {
    if (!pool || sellAmount <= 0) return { feePercentage: pool?.baseFee || 0, explanation: 'Base Fee' };

    const { currentPrice, desiredPrice, baseFee, tokenA, tokenB } = pool;
    const priceBefore = currentPrice;
    let priceAfter: number;

    // Simulate price impact (VERY basic simulation - real AMM math is complex)
    // This assumes selling tokenA pushes price down, selling tokenB pushes price up
    const impactFactor = 0.001 * sellAmount; // Arbitrary impact factor

    if (sellTokenSymbol === tokenA) {
        priceAfter = priceBefore * (1 - impactFactor); // Selling A decreases A/B price
    } else if (sellTokenSymbol === tokenB) {
        priceAfter = priceBefore * (1 + impactFactor); // Selling B increases A/B price
    } else {
         priceAfter = priceBefore; // Should not happen if tokens match pool
    }

    const movesTowardsDesired = Math.abs(priceAfter - desiredPrice) < Math.abs(priceBefore - desiredPrice);
    const movesAwayFromDesired = Math.abs(priceAfter - desiredPrice) > Math.abs(priceBefore - desiredPrice);

    let feePercentage = baseFee;
    let explanation = `Base Fee: ${(baseFee * 100).toFixed(2)}%`;

    if (movesTowardsDesired) {
        feePercentage = baseFee * 0.5; // Discount for helping price
        explanation = `Fee Discounted: ${(feePercentage * 100).toFixed(2)}% (Moved towards desired price)`;
    } else if (movesAwayFromDesired) {
        feePercentage = baseFee * 2.0; // Penalty for hurting price
        explanation = `Fee Increased: ${(feePercentage * 100).toFixed(2)}% (Moved away from desired price)`;
    }

    // Ensure fee doesn't go below a minimum or above a maximum (e.g.)
    feePercentage = Math.max(0.0001, Math.min(0.05, feePercentage)); // Clamp between 0.01% and 5%

    return { feePercentage, explanation };
};
// --- End Simulation Helper ---

const Swap: React.FC<SwapProps> = ({ selectedPool, userBalances, onSwap, isLoading }) => {
  const [sellAmountStr, setSellAmountStr] = useState(""); // Input string
  const [sellToken, setSellToken] = useState<string | null>(null);
  const [buyToken, setBuyToken] = useState<string | null>(null);

  // Derived states
  const sellAmountNum = useMemo(() => parseFloat(sellAmountStr) || 0, [sellAmountStr]);
  const [buyAmountNum, setBuyAmountNum] = useState(0); // Calculated buy amount
  const [usdValues, setUsdValues] = useState({ sell: 0, buy: 0 });
  const [dynamicFee, setDynamicFee] = useState({ feePercentage: 0, explanation: '' });
  const [isRotating, setIsRotating] = useState(false); // State for icon rotation

  // Reset state when pool changes
  useEffect(() => {
    if (selectedPool) {
      setSellToken(selectedPool.tokenA);
      setBuyToken(selectedPool.tokenB);
      setSellAmountStr(""); // Clear amounts
    } else {
      setSellToken(null);
      setBuyToken(null);
    }
  }, [selectedPool]);

  // Calculate Buy Amount and Fee whenever inputs change
  useEffect(() => {
    if (!selectedPool || !sellToken || !buyToken || sellAmountNum <= 0) {
      setBuyAmountNum(0);
      setDynamicFee({ feePercentage: selectedPool?.baseFee || 0, explanation: 'Base Fee' });
      setUsdValues({ sell: 0, buy: 0 });
      return;
    }

    const { currentPrice, tokenA, tokenB } = selectedPool;
    const ratioAB = currentPrice; // 1 A = ratioAB B
    let bAmtRaw = 0;

    if (sellToken === tokenA && buyToken === tokenB) {
      bAmtRaw = sellAmountNum * ratioAB;
    } else if (sellToken === tokenB && buyToken === tokenA) {
      bAmtRaw = ratioAB !== 0 ? sellAmountNum / ratioAB : 0;
    }

    // Calculate fee based on this potential swap
    const feeInfo = calculateDynamicFee(sellAmountNum, sellToken, selectedPool);
    setDynamicFee(feeInfo);

    // Apply the calculated fee
    const feeAmount = bAmtRaw * feeInfo.feePercentage;
    const bAmtNet = bAmtRaw - feeAmount; // Amount user receives
    setBuyAmountNum(bAmtNet > 0 ? bAmtNet : 0);

    // Calculate USD values (using mock prices)
    const sellUsd = (MOCK_TOKEN_PRICES[sellToken] || 0) * sellAmountNum;
    const buyUsd = (MOCK_TOKEN_PRICES[buyToken] || 0) * bAmtNet;
    setUsdValues({ sell: sellUsd, buy: buyUsd });

  }, [sellAmountNum, sellToken, buyToken, selectedPool]);

  // Flip Tokens with Animation
  const handleSwapTokens = useCallback(() => {
    setIsRotating(true); // Start rotation
    const oldSellToken = sellToken;
    const oldBuyToken = buyToken;
    setSellToken(oldBuyToken);
    setBuyToken(oldSellToken);
    // Optional: try to preserve value - recalculation will happen automatically
    // setSellAmountStr(buyAmountNum > 0 ? buyAmountNum.toFixed(6) : "");

    // Reset rotation after animation duration
    setTimeout(() => setIsRotating(false), 300); // Match CSS transition duration

  }, [sellToken, buyToken]);

  // Execute Swap Action
  const handlePerformSwap = () => {
    if (!selectedPool || !sellToken || !buyToken || sellAmountNum <= 0 || buyAmountNum <= 0 || isLoading) return;

    const balance = userBalances[sellToken] || 0;
    if (sellAmountNum > balance) {
        alert(`Insufficient ${sellToken} balance. You have ${balance}.`); // Replace with Snackbar later
        return;
    }
    onSwap(sellToken, buyToken, sellAmountNum, buyAmountNum);
    // Optionally clear fields after initiating swap
    // setSellAmountStr("");
  };

  // Handle Token Selection Changes
  const handleSellTokenChange = (event: SelectChangeEvent<string>) => {
      const newSellToken = event.target.value;
      if (newSellToken === buyToken) { // If selected token is the same as the other side, swap them
          handleSwapTokens();
      } else {
          setSellToken(newSellToken);
      }
  };
   const handleBuyTokenChange = (event: SelectChangeEvent<string>) => {
      const newBuyToken = event.target.value;
       if (newBuyToken === sellToken) { // If selected token is the same as the other side, swap them
           handleSwapTokens();
       } else {
           setBuyToken(newBuyToken);
       }
   };

  const sellBalance = userBalances[sellToken || ''] ?? 0;
  const canSwap = selectedPool && sellToken && buyToken && sellAmountNum > 0 && buyAmountNum > 0 && sellAmountNum <= sellBalance;

  if (!selectedPool) {
    return (
        <Box sx={{ p:3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <Typography variant="h6" color="text.secondary">
                Please select a pool from the Dashboard first.
            </Typography>
        </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        mt: 4,
      }}
    >
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'medium' }}>
        Swap Tokens
      </Typography>
      {/* Wrap Card with Fade for appearance animation */}
      <Fade in={true} timeout={500}>
          <Card
            sx={{
              width: "100%",
              maxWidth: 460, // Slightly wider
              borderRadius: 3,
              p: 1, // Padding on card itself
              boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
            }}
          >
            <CardContent sx={{ p: 3 }}> {/* Padding inside content */}
              {/* --- SELL Section --- */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1}}>
                     <Typography variant="body1" fontWeight="medium" color="text.secondary">
                        Sell
                     </Typography>
                     <Typography variant="caption" color="text.secondary">
                        Balance: {sellBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} {sellToken}
                     </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <TextField
                    type="number" // Use number input
                    variant="outlined"
                    placeholder="0.0"
                    value={sellAmountStr}
                    onChange={(e) => setSellAmountStr(e.target.value)}
                    fullWidth // Take full width within the flex container
                    InputProps={{
                        sx: { borderRadius: 2, pr: 0 }, // Style input, remove right padding for select
                        endAdornment: (
                        <InputAdornment position="end" sx={{ mr: -0.5 }}> {/* Adjust margin */}
                          <Select
                            value={sellToken || ''}
                            onChange={handleSellTokenChange}
                            variant="standard" // Cleaner look
                            disableUnderline
                            sx={{
                                minWidth: 100, // Ensure enough space
                                fontWeight: 500,
                                mr: 1.5, // Margin for spacing
                                '.MuiSelect-select': { py: 1.8 } // Align text vertically
                             }}
                          >
                            <MenuItem value={selectedPool.tokenA}>
                              {selectedPool.tokenA}
                            </MenuItem>
                            <MenuItem value={selectedPool.tokenB}>
                              {selectedPool.tokenB}
                            </MenuItem>
                          </Select>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
                 <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, minHeight: '1.2em' }}>
                   {sellAmountNum > 0 ? `~ $${usdValues.sell.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : ''}
                 </Typography>
              </Box>

              {/* --- Swap Icon Button --- */}
              <Box sx={{ display: "flex", justifyContent: "center", my: 1 }}>
                <IconButton onClick={handleSwapTokens} aria-label="Swap tokens">
                  {/* Apply rotation animation styles */}
                  <SwapVertIcon sx={{
                      transform: isRotating ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease-in-out' // CSS transition
                  }}/>
                </IconButton>
              </Box>

              {/* --- BUY Section --- */}
              <Box sx={{ mb: 3 }}>
                 <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1}}>
                      <Typography variant="body1" fontWeight="medium" color="text.secondary">
                         Buy (Estimated)
                      </Typography>
                      {/* Optional: Show buy balance */}
                 </Box>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <TextField
                    type="number"
                    variant="outlined"
                    placeholder="0.0"
                    value={buyAmountNum > 0 ? buyAmountNum.toFixed(6) : ""} // Display calculated amount
                    fullWidth
                    InputProps={{
                      readOnly: true, // Make it read-only
                      sx: { borderRadius: 2, pr: 0 },
                      endAdornment: (
                        <InputAdornment position="end" sx={{ mr: -0.5 }}>
                          <Select
                            value={buyToken || ''}
                            onChange={handleBuyTokenChange}
                            variant="standard"
                            disableUnderline
                            sx={{
                               minWidth: 100,
                               fontWeight: 500,
                               mr: 1.5,
                               '.MuiSelect-select': { py: 1.8 }
                            }}
                          >
                             <MenuItem value={selectedPool.tokenA}>
                               {selectedPool.tokenA}
                             </MenuItem>
                             <MenuItem value={selectedPool.tokenB}>
                               {selectedPool.tokenB}
                             </MenuItem>
                          </Select>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
                 <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, minHeight: '1.2em' }}>
                   {buyAmountNum > 0 ? `~ $${usdValues.buy.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : ''}
                 </Typography>
              </Box>

              {/* --- Fee Display --- */}
              {sellAmountNum > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 3 }}>
                       <Tooltip title={dynamicFee.explanation} placement="top">
                           <Chip
                               icon={<InfoOutlinedIcon fontSize="small" />}
                               label={`Est. Fee: ${(dynamicFee.feePercentage * 100).toFixed(3)}%`}
                               size="small"
                               variant="outlined"
                           />
                       </Tooltip>
                  </Box>
              )}


              {/* --- Action Button --- */}
              <Button
                variant="contained"
                fullWidth
                onClick={handlePerformSwap}
                disabled={!canSwap || isLoading}
                size="large"
                sx={{ borderRadius: 2, py: 1.5 }}
              >
                {isLoading ? <CircularProgress size={24} color="inherit" /> : (sellAmountNum > sellBalance ? 'Insufficient Balance' : 'Swap')}
              </Button>
            </CardContent>
          </Card>
      </Fade>
    </Box>
  );
};

export default Swap;