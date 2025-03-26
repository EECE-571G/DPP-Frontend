import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { Pool } from './Dashboard';

interface SwapProps {
  selectedPool: Pool | null;
}

const Swap: React.FC<SwapProps> = ({ selectedPool }) => {
  // How much of the “sell” token the user is entering
  const [sellAmount, setSellAmount] = useState("");
  // Which token is currently “sell” and which is “buy”
  const [sellToken, setSellToken] = useState(selectedPool?.tokenA ?? "");
  const [buyToken, setBuyToken] = useState(selectedPool?.tokenB ?? "");

  // The computed “buy” amount
  const [buyAmount, setBuyAmount] = useState("");
  // Approx USD values
  const [sellUsdValue, setSellUsdValue] = useState(0);
  const [buyUsdValue, setBuyUsdValue] = useState(0);

  useEffect(() => {
    if (!selectedPool) return;

    // currentPrice means: 1 tokenA = currentPrice of tokenB
    const ratioAB = selectedPool.currentPrice;

    // Convert input string to a number
    const sAmt = parseFloat(sellAmount) || 0;

    let bAmt = 0;

    // If the user is selling tokenA
    if (sellToken === selectedPool.tokenA && buyToken === selectedPool.tokenB) {
      // buy = sell * ratioAB
      bAmt = sAmt * ratioAB;
    }
    // If the user is selling tokenB
    else if (sellToken === selectedPool.tokenB && buyToken === selectedPool.tokenA) {
      // buy = sell / ratioAB
      bAmt = ratioAB !== 0 ? sAmt / ratioAB : 0;
    }
    setBuyAmount(bAmt ? bAmt.toFixed(6) : "");

    // Approximate USD logic:
    // We'll treat DAI, USDC, or USDT as $1. Everything else is “unknown”
    const stableTokens = ["DAI", "USDC", "USDT"];
    let sUsd = 0;
    let bUsd = 0;

    // If sell token is stable, 1 token = $1
    if (stableTokens.includes(sellToken)) {
      sUsd = sAmt;
    }
    // If buy token is stable, we can back into the “sell” token’s USD
    else if (stableTokens.includes(buyToken)) {
      // bAmt is the number of stable tokens we get, each = $1
      // So effectively, we sold sAmt of “sellToken” for bAmt USD
      sUsd = bAmt;
    }
    // If neither is stable, or both are stable, you might need more advanced logic.

    // For the “buy” side, if buy token is stable
    if (stableTokens.includes(buyToken)) {
      bUsd = bAmt;
    }
    // If sell token is stable, we can back into buyUsd from ratio
    else if (stableTokens.includes(sellToken)) {
      // sAmt is the number of stable tokens (which is $1 each),
      // so we sold sAmt USD worth to get bAmt of buy token
      bUsd = sAmt; // the same “value” but in the new token
    }

    setSellUsdValue(sUsd);
    setBuyUsdValue(bUsd);
  }, [sellAmount, sellToken, buyToken, selectedPool]);

  // Flip the tokens
  const handleSwapTokens = () => {
    const oldSellToken = sellToken;
    setSellToken(buyToken);
    setBuyToken(oldSellToken);
    // Also swap the amounts
    const oldSellAmt = sellAmount;
    setSellAmount(buyAmount);
    setBuyAmount(oldSellAmt);
  };

  const handlePerformSwap = () => {
    if (!selectedPool) return;
    const sAmt = parseFloat(sellAmount) || 0;
    const bAmt = parseFloat(buyAmount) || 0;
    if (!sAmt || !bAmt) {
      alert("Invalid swap amounts");
      return;
    }
    alert(`Swapping ${sellAmount} ${sellToken} for ~${buyAmount} ${buyToken}`);
  };

  if (!selectedPool) {
    return (
      <Typography variant="body1">
        Please select a pool from the Dashboard.
      </Typography>
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
      <Typography variant="h4" gutterBottom>
        Swap anytime, anywhere.
      </Typography>
      <Card
        sx={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 3,
          backgroundColor: "background.paper",
        }}
      >
        <CardContent>
          {/* SELL Section */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Sell
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
              <TextField
                variant="outlined"
                placeholder="0.0"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                sx={{ flex: 1 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Select
                        value={sellToken}
                        onChange={(e) => setSellToken(e.target.value as string)}
                        sx={{ minWidth: 80 }}
                        variant="standard"
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
            <Typography variant="caption" color="text.secondary">
              ~${sellUsdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </Typography>
          </Box>

          {/* Swap Icon Button */}
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <IconButton onClick={handleSwapTokens}>
              <SwapVertIcon />
            </IconButton>
          </Box>

          {/* BUY Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Buy
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
              <TextField
                variant="outlined"
                placeholder="0.0"
                value={buyAmount}
                sx={{ flex: 1 }}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Select
                        value={buyToken}
                        onChange={(e) => setBuyToken(e.target.value as string)}
                        sx={{ minWidth: 80 }}
                        variant="standard"
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
            <Typography variant="caption" color="text.secondary">
              ~${buyUsdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </Typography>
          </Box>

          {/* Action Button */}
          <Button variant="contained" fullWidth onClick={handlePerformSwap}>
            Get started
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Swap;
