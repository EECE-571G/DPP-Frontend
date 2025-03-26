import React, { useState } from 'react';
import { Box, Typography, FormControl, RadioGroup, FormControlLabel, Radio, TextField, Button } from '@mui/material';
import { Pool } from './Dashboard';

interface SwapProps {
  selectedPool: Pool | null;
}

const Swap: React.FC<SwapProps> = ({ selectedPool }) => {
  const [swapDirection, setSwapDirection] = useState("AtoB");
  const [amount, setAmount] = useState("");

  const handleSwap = () => {
    if (!amount || isNaN(Number(amount))) {
      alert("Enter a valid amount");
      return;
    }
    alert(
      `Swapping ${amount} ${
        swapDirection === "AtoB"
          ? `from ${selectedPool?.tokenA} to ${selectedPool?.tokenB}`
          : `from ${selectedPool?.tokenB} to ${selectedPool?.tokenA}`
      }`
    );
  };

  if (!selectedPool) {
    return <Typography variant="body1">Please select a pool from the Dashboard.</Typography>;
  }

  return (
    <Box p={2}>
      <Typography variant="h6">Swap</Typography>
      <FormControl component="fieldset" margin="normal">
        <RadioGroup
          row
          value={swapDirection}
          onChange={(e) => setSwapDirection(e.target.value)}
        >
          <FormControlLabel
            value="AtoB"
            control={<Radio />}
            label={`${selectedPool.tokenA} → ${selectedPool.tokenB}`}
          />
          <FormControlLabel
            value="BtoA"
            control={<Radio />}
            label={`${selectedPool.tokenB} → ${selectedPool.tokenA}`}
          />
        </RadioGroup>
      </FormControl>
      <TextField
        label="Amount"
        fullWidth
        margin="normal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Button variant="contained" color="primary" onClick={handleSwap}>
        Swap
      </Button>
    </Box>
  );
};

export default Swap;
