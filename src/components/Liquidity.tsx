import React, { useState } from 'react';
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
} from '@mui/material';
import { Pool } from './Dashboard';

/** Example hardcoded token prices for approximate USD display.
 * Replace with real oracles or remove if not needed.
 */
const tokenPrices: Record<string, number> = {
  ETH: 2000,
  DAI: 1,
  BTC: 28000,
  USDT: 1,
  USDC: 1,
  UNI: 5,
};

interface LiquidityProps {
  selectedPool: Pool | null;
}

const Liquidity: React.FC<LiquidityProps> = ({ selectedPool }) => {
  const [tabValue, setTabValue] = useState(0);

  // -------------------
  // ADD LIQUIDITY STATE
  // -------------------
  const [addTokenA, setAddTokenA] = useState("");
  const [addTokenB, setAddTokenB] = useState("");

  // ----------------------
  // REMOVE LIQUIDITY STATE
  // ----------------------
  const [removeTokenA, setRemoveTokenA] = useState("");
  const [removeTokenB, setRemoveTokenB] = useState("");

  // Switch tabs
  const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // -------------
  // RATIO LOGIC
  // -------------
  // For a pool with `currentPrice = X`, we interpret it as:
  //   1 tokenA = X tokenB
  // So if the user sets A, then B = A * X
  // If the user sets B, then A = B / X

  // Helper: calculates approximate USD from a token symbol + amount
  const toUsd = (tokenSymbol: string, amountStr: string) => {
    const price = tokenPrices[tokenSymbol] || 0;
    const amt = parseFloat(amountStr) || 0;
    return amt * price;
  };

  if (!selectedPool) {
    return (
      <Typography variant="body1">
        Please select a pool from the Dashboard.
      </Typography>
    );
  }

  const ratio = selectedPool.currentPrice; // e.g., 1 A = ratio * B
  const { tokenA, tokenB } = selectedPool;

  // --------------------------------
  // ADD LIQUIDITY: EVENT HANDLERS
  // --------------------------------
  const handleChangeAddTokenA = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newA = e.target.value;
    setAddTokenA(newA);

    const aVal = parseFloat(newA) || 0;
    const bVal = aVal * ratio;
    setAddTokenB(bVal ? bVal.toFixed(6) : "");
  };

  const handleChangeAddTokenB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newB = e.target.value;
    setAddTokenB(newB);

    const bVal = parseFloat(newB) || 0;
    if (ratio !== 0) {
      const aVal = bVal / ratio;
      setAddTokenA(aVal ? aVal.toFixed(6) : "");
    }
  };

  const handleAddLiquidity = () => {
    if (!addTokenA || !addTokenB) {
      alert("Enter valid amounts for both tokens.");
      return;
    }
    alert(
      `Adding Liquidity: ${addTokenA} ${tokenA} + ${addTokenB} ${tokenB}`
    );
  };

  // -----------------------------------
  // REMOVE LIQUIDITY: EVENT HANDLERS
  // -----------------------------------
  const handleChangeRemoveTokenA = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newA = e.target.value;
    setRemoveTokenA(newA);

    const aVal = parseFloat(newA) || 0;
    const bVal = aVal * ratio;
    setRemoveTokenB(bVal ? bVal.toFixed(6) : "");
  };

  const handleChangeRemoveTokenB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newB = e.target.value;
    setRemoveTokenB(newB);

    const bVal = parseFloat(newB) || 0;
    if (ratio !== 0) {
      const aVal = bVal / ratio;
      setRemoveTokenA(aVal ? aVal.toFixed(6) : "");
    }
  };

  const handleRemoveLiquidity = () => {
    if (!removeTokenA || !removeTokenB) {
      alert("Enter valid amounts for both tokens.");
      return;
    }
    alert(
      `Removing Liquidity: ${removeTokenA} ${tokenA} + ${removeTokenB} ${tokenB}`
    );
  };

  // Calculate approximate USD
  const addAUsd = toUsd(tokenA, addTokenA);
  const addBUsd = toUsd(tokenB, addTokenB);
  const removeAUsd = toUsd(tokenA, removeTokenA);
  const removeBUsd = toUsd(tokenB, removeTokenB);

  return (
    <Box sx={{ mt: 4, width: '100%', display: 'flex', justifyContent: 'center' }}>
      <Card
        sx={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 3,
          backgroundColor: 'background.paper',
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
        <CardContent>
          {/* --------------------------
              ADD LIQUIDITY CONTENT
          -------------------------- */}
          {tabValue === 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Deposit tokens
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Enter one amount and the other will be calculated automatically.
              </Typography>

              {/* Token A */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  label={`Amount of ${tokenA}`}
                  variant="outlined"
                  placeholder="0.0"
                  fullWidth
                  value={addTokenA}
                  onChange={handleChangeAddTokenA}
                  sx={{ mt: 2 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        {tokenA}
                      </InputAdornment>
                    ),
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  ~${addAUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </Typography>
              </Box>

              {/* Token B */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  label={`Amount of ${tokenB}`}
                  variant="outlined"
                  placeholder="0.0"
                  fullWidth
                  value={addTokenB}
                  onChange={handleChangeAddTokenB}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        {tokenB}
                      </InputAdornment>
                    ),
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  ~${addBUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </Typography>
              </Box>

              <Button variant="contained" fullWidth onClick={handleAddLiquidity}>
                Add Liquidity
              </Button>
            </Box>
          )}

          {/* -----------------------------
              REMOVE LIQUIDITY CONTENT
          ----------------------------- */}
          {tabValue === 1 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Withdraw tokens
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Enter one amount and the other will be calculated automatically.
              </Typography>

              {/* Token A */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  label={`Amount of ${tokenA}`}
                  variant="outlined"
                  placeholder="0.0"
                  fullWidth
                  value={removeTokenA}
                  onChange={handleChangeRemoveTokenA}
                  sx={{ mt: 2 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        {tokenA}
                      </InputAdornment>
                    ),
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  ~${removeAUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </Typography>
              </Box>

              {/* Token B */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  label={`Amount of ${tokenB}`}
                  variant="outlined"
                  placeholder="0.0"
                  fullWidth
                  value={removeTokenB}
                  onChange={handleChangeRemoveTokenB}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        {tokenB}
                      </InputAdornment>
                    ),
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  ~${removeBUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </Typography>
              </Box>

              <Button
                variant="contained"
                color="secondary"
                fullWidth
                onClick={handleRemoveLiquidity}
              >
                Remove Liquidity
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Liquidity;
