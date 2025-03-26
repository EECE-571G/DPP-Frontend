import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, TextField, Button } from '@mui/material';
import { Pool } from './Dashboard';

interface LiquidityProps {
  selectedPool: Pool | null;
}

const Liquidity: React.FC<LiquidityProps> = ({ selectedPool }) => {
  const [tab, setTab] = useState(0);
  const [liquidityAmount, setLiquidityAmount] = useState("");

  const handleAddLiquidity = () => {
    if (!liquidityAmount || isNaN(Number(liquidityAmount))) {
      alert("Enter a valid amount");
      return;
    }
    alert(`Adding liquidity of ${liquidityAmount}`);
  };

  const handleRemoveLiquidity = () => {
    if (!liquidityAmount || isNaN(Number(liquidityAmount))) {
      alert("Enter a valid amount");
      return;
    }
    alert(`Removing liquidity of ${liquidityAmount}`);
  };

  if (!selectedPool) {
    return <Typography variant="body1">Please select a pool from the Dashboard.</Typography>;
  }

  return (
    <Box p={2}>
      <Typography variant="h6">Liquidity</Typography>
      <Tabs
        value={tab}
        onChange={(e, newValue) => setTab(newValue)}
        indicatorColor="primary"
        textColor="primary"
      >
        <Tab label="Add Liquidity" />
        <Tab label="Remove Liquidity" />
      </Tabs>
      <Box mt={2}>
        {tab === 0 && (
          <>
            <TextField
              label="Amount to Add"
              fullWidth
              margin="normal"
              value={liquidityAmount}
              onChange={(e) => setLiquidityAmount(e.target.value)}
            />
            <Button variant="contained" color="primary" onClick={handleAddLiquidity}>
              Add Liquidity
            </Button>
          </>
        )}
        {tab === 1 && (
          <>
            <TextField
              label="Amount to Remove"
              fullWidth
              margin="normal"
              value={liquidityAmount}
              onChange={(e) => setLiquidityAmount(e.target.value)}
            />
            <Button variant="contained" color="secondary" onClick={handleRemoveLiquidity}>
              Remove Liquidity
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
};

export default Liquidity;
