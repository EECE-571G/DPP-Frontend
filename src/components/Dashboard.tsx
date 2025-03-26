import React from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, Paper } from '@mui/material';

export interface Pool {
  id: number;
  name: string;
  tokenA: string;
  tokenB: string;
  currentPrice: number;
}

interface DashboardProps {
  pools: Pool[];
  selectedPool: Pool | null;
  onSelectPool: (pool: Pool) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ pools, selectedPool, onSelectPool }) => {
  return (
    <Box p={2}>
      <Typography variant="h6">Dashboard</Typography>
      <FormControl fullWidth margin="normal">
        <InputLabel>Select Pool</InputLabel>
        <Select
          value={selectedPool ? selectedPool.id : ""}
          label="Select Pool"
          onChange={(e) => {
            const pool = pools.find(p => p.id === Number(e.target.value));
            if (pool) {
              onSelectPool(pool);
            }
          }}
        >
          {pools.map(pool => (
            <MenuItem key={pool.id} value={pool.id}>
              {pool.name} ({pool.tokenA}/{pool.tokenB})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {selectedPool && (
        <Paper elevation={2} style={{ padding: 16, marginTop: 16 }}>
          <Typography variant="subtitle1">
            Current Price: {selectedPool.currentPrice}
          </Typography>
          <Typography variant="subtitle2">Pool: {selectedPool.name}</Typography>
        </Paper>
      )}
    </Box>
  );
};

export default Dashboard;
