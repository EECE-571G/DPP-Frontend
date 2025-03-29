import React from 'react';
import {
  Box,
  Typography,
  Autocomplete,
  TextField,
  Card,
  CardContent,
  Paper,
  Grid,
  Collapse,
  Divider
} from '@mui/material';
import { Pool } from './AppProvider';

interface DashboardProps {
  pools: Pool[];
  selectedPool: Pool | null;
  onSelectPool: (pool: Pool | null) => void;
  userBalances: Record<string, number | string>;
}

// Helper to format balance
const formatBalance = (
  balance: number | string | undefined,
  decimals = 4
): string => {
  if (balance === undefined || balance === null) return '0.00';
  const num = typeof balance === 'string' ? parseFloat(balance) : balance;
  if (isNaN(num)) return '0.00';
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
};

const Dashboard: React.FC<DashboardProps> = ({
  pools,
  selectedPool,
  onSelectPool,
  userBalances,
}) => {
  const tokenABalance = selectedPool ? userBalances[selectedPool.tokenA] : undefined;
  const tokenBBalance = selectedPool ? userBalances[selectedPool.tokenB] : undefined;
  // Assume LP token symbol follows a pattern, e.g., "LP-ETH/DAI" or fetch it if available
  const lpTokenSymbol = selectedPool ? `LP-${selectedPool.tokenA}/${selectedPool.tokenB}` : undefined;
  const lpTokenBalance = lpTokenSymbol ? userBalances[lpTokenSymbol] : undefined; // Check if LP balance exists

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h4"
        sx={{ fontWeight: 'bold', mb: 3, textAlign: 'center' }}
      >
        Pool Dashboard
      </Typography>

      {/* Pool Selection Card */}
      <Card
        sx={{
          borderRadius: 2,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          p: 2,
          mb: 3,
        }}
      >
        <CardContent>
          <Autocomplete
            options={pools}
            value={selectedPool}
            onChange={(event, newValue) => {
              onSelectPool(newValue);
            }}
            getOptionLabel={(option) =>
              `${option.name} (${option.tokenA}/${option.tokenB})`
            }
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select a DPP Pool"
                variant="outlined"
                fullWidth
              />
            )}
            sx={{ mb: 1 }}
          />
        </CardContent>
      </Card>

      {/* Selected Pool Details + Balances Card */}
      <Collapse in={!!selectedPool} timeout={400}>
        <Paper
          elevation={0}
          variant="outlined"
          sx={{ p: 3, borderRadius: 2, mt: 0 }}
        >
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 500 }}>
            {selectedPool?.name} Details
          </Typography>
          <Grid container spacing={2} rowSpacing={1}>
            {/* Pool Info */}
            <Grid item xs={12} sm={6}>
              <Typography variant="body1">
                <strong>Token Pair:</strong> {selectedPool?.tokenA} / {selectedPool?.tokenB}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body1">
                <strong>Current Price:</strong> 1 {selectedPool?.tokenA} ={' '}
                {selectedPool?.currentPrice} {selectedPool?.tokenB}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography
                variant="body1"
                color="primary.main"
                sx={{ fontWeight: 'medium' }}
              >
                <strong>Desired Price:</strong> 1 {selectedPool?.tokenA} ={' '}
                {selectedPool?.desiredPrice} {selectedPool?.tokenB}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Base Fee:{' '}
                {selectedPool?.baseFee
                  ? (selectedPool.baseFee * 100).toFixed(2)
                  : 'N/A'}
                %
              </Typography>
            </Grid>

            {/* Divider */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1.5 }} />
            </Grid>

            {/* User Balances for Selected Pool */}
            <Grid item xs={12}>
              <Typography
                variant="h6"
                sx={{ mb: 1, fontSize: '1.1rem', fontWeight: 500 }}
              >
                Your Balances
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>{selectedPool?.tokenA}:</strong>{' '}
                {formatBalance(tokenABalance)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>{selectedPool?.tokenB}:</strong>{' '}
                {formatBalance(tokenBBalance)}
              </Typography>
            </Grid>
            {lpTokenBalance !== undefined && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  <strong>LP Tokens ({lpTokenSymbol}):</strong>{' '}
                  {formatBalance(lpTokenBalance, 6)}
                </Typography>
              </Grid>
            )}
            {lpTokenBalance === undefined && selectedPool && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  You have no liquidity in this pool.
                </Typography>
              </Grid>
            )}
          </Grid>
        </Paper>
      </Collapse>

      {/* Message when no pool is selected */}
      {!selectedPool && (
        <Typography
          variant="body1"
          color="text.secondary"
          align="center"
          sx={{ mt: 4 }}
        >
          Select a pool above to see details.
        </Typography>
      )}
    </Box>
  );
};

export default Dashboard;