import React from 'react';
import {
  Box,
  Typography,
  Autocomplete,
  TextField,
  Card,
  CardContent,
  Paper,
} from '@mui/material';

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
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>
        Pool Dashboard
      </Typography>
      <Card
        sx={{
          borderRadius: 3,
          boxShadow: 3,
          p: 2,
          mb: 3,
          backgroundColor: 'background.paper',
        }}
      >
        <CardContent>
          <Autocomplete
            options={pools}
            value={selectedPool}
            onChange={(event, newValue) => {
              if (newValue) {
                onSelectPool(newValue);
              }
            }}
            getOptionLabel={(option) => `${option.name} (${option.tokenA}/${option.tokenB})`}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select a Pool"
                variant="outlined"
                fullWidth
              />
            )}
            sx={{ mb: 2 }}
          />
        </CardContent>
      </Card>
      {selectedPool && (
        <Paper
          elevation={3}
          sx={{
            p: 2,
            borderRadius: 2,
            backgroundColor: 'background.default',
          }}
        >
          <Typography variant="h6" sx={{ mb: 1 }}>
            {selectedPool.name}
          </Typography>
          <Typography variant="body1" sx={{ mb: 0.5 }}>
            <strong>Current Price:</strong> {selectedPool.currentPrice}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedPool.tokenA} / {selectedPool.tokenB}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default Dashboard;
