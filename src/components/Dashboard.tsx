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
  Divider,
  Skeleton
} from '@mui/material';
import { Pool } from '../types';
import { formatBalance } from '../utils/formatters';

interface DashboardProps {
  pools: Pool[]; // List of available pools
  selectedPool: Pool | null; // Currently selected pool
  onSelectPool: (pool: Pool | null) => void; // Callback when pool selection changes
  userBalances: Record<string, number | string>; // User's token balances
  isLoadingPools?: boolean; // Indicate if pools are loading
  isLoadingBalances?: boolean; // Indicate if balances are loading
}

const Dashboard: React.FC<DashboardProps> = ({
  pools,
  selectedPool,
  onSelectPool,
  userBalances,
  isLoadingPools = false,
  isLoadingBalances = false,
}) => {
  // Derive balance information safely
  const tokenABalance = selectedPool ? userBalances[selectedPool.tokenA] : undefined;
  const tokenBBalance = selectedPool ? userBalances[selectedPool.tokenB] : undefined;

  // Assume LP token symbol follows a pattern or comes from Pool data if available
  // const lpTokenSymbol = selectedPool?.lpTokenSymbol ?? (selectedPool ? `LP-${selectedPool.tokenA}/${selectedPool.tokenB}` : undefined);
  // Simplified for now:
   const lpTokenSymbol = selectedPool ? `LP-${selectedPool.tokenA}/${selectedPool.tokenB}` : undefined;
  const lpTokenBalance = lpTokenSymbol ? userBalances[lpTokenSymbol] : undefined; // Check if LP balance exists


  const handlePoolChange = (event: React.SyntheticEvent, newValue: Pool | null) => {
      onSelectPool(newValue);
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}> {/* Responsive padding */}
      <Typography
        variant="h4"
        sx={{ fontWeight: 'bold', mb: 3, textAlign: 'center' }}
      >
        Pool Dashboard
      </Typography>

      {/* Pool Selection Card */}
      <Card
        elevation={1}
        sx={{
          borderRadius: 2,
          mb: 3,
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          {isLoadingPools ? (
              <Skeleton variant="rounded" height={56} />
          ) : (
              <Autocomplete
                  options={pools}
                  value={selectedPool}
                  onChange={handlePoolChange}
                  getOptionLabel={(option) =>
                      `${option.name} (${option.tokenA}/${option.tokenB})`
                  }
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  renderInput={(params) => (
                      <TextField
                          {...params}
                          label="Select a DPP Pool"
                          variant="outlined"
                          placeholder='Search or select a pool...'
                          fullWidth
                      />
                  )}
                  noOptionsText="No pools found"
                  sx={{ mb: 1 }}
              />
          )}
        </CardContent>
      </Card>

      {/* Selected Pool Details + Balances Card */}
      <Collapse in={!!selectedPool || isLoadingBalances} timeout={400} unmountOnExit>
        <Paper
          elevation={0}
          variant="outlined"
          sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}
        >
          {selectedPool && ( // Only show title if pool is selected
             <Typography variant="h5" sx={{ mb: 2, fontWeight: 500 }}>
                {selectedPool.name} Details
             </Typography>
          )}
          <Grid container spacing={2} rowSpacing={1.5}>
            {/* Pool Info */}
            <Grid item xs={12} sm={6}>
              <Typography variant="body1" component="div"> 
                <strong>Token Pair:</strong> {selectedPool ? `${selectedPool.tokenA} / ${selectedPool.tokenB}` : <Skeleton width="60%"/> }
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body1">
                <strong>Current Price:</strong>{' '}
                 {selectedPool ? `1 ${selectedPool.tokenA} = ${formatBalance(selectedPool.currentPrice, 6)} ${selectedPool.tokenB}` : <Skeleton width="70%"/> }
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography
                variant="body1"
                color="primary.main"
                sx={{ fontWeight: 'medium' }}
              >
                <strong>Desired Price:</strong>{' '}
                 {selectedPool ? `1 ${selectedPool.tokenA} = ${formatBalance(selectedPool.desiredPrice, 6)} ${selectedPool.tokenB}` : <Skeleton width="70%"/> }
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Base Fee:</strong>{' '}
                 {selectedPool ? `${(selectedPool.baseFee * 100).toFixed(2)}%` : <Skeleton width="30%"/> }
              </Typography>
            </Grid>

            {/* Divider */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>

            {/* User Balances for Selected Pool */}
            <Grid item xs={12}>
              <Typography
                variant="h6"
                sx={{ mb: 1.5, fontSize: '1.1rem', fontWeight: 500 }}
              >
                Your Balances
              </Typography>
            </Grid>
             {isLoadingBalances ? (
                 <>
                    <Grid item xs={12} sm={6}><Skeleton width="50%" /></Grid>
                    <Grid item xs={12} sm={6}><Skeleton width="50%" /></Grid>
                    <Grid item xs={12}><Skeleton width="60%" /></Grid>
                 </>
             ) : selectedPool ? ( // Only show balances if a pool is selected and not loading
                <>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2">
                        <strong>{selectedPool.tokenA}:</strong>{' '}
                        {formatBalance(tokenABalance, 6)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2">
                        <strong>{selectedPool.tokenB}:</strong>{' '}
                        {formatBalance(tokenBBalance, 6)}
                      </Typography>
                    </Grid>
                    {/* Conditionally render LP token balance */}
                    {lpTokenBalance !== undefined && lpTokenSymbol && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>LP Tokens ({lpTokenSymbol}):</strong>{' '}
                          {formatBalance(lpTokenBalance, 8)}
                        </Typography>
                      </Grid>
                    )}
                    {lpTokenBalance === undefined && ( // Explicitly check for undefined
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">
                          You have no liquidity provider tokens for this pool.
                        </Typography>
                      </Grid>
                    )}
                </>
             ) : null /* End balance rendering condition */}
          </Grid>
        </Paper>
      </Collapse>

      {/* Message when no pool is selected and not loading */}
      {!selectedPool && !isLoadingPools && pools.length > 0 && (
        <Typography
          variant="body1"
          color="text.secondary"
          align="center"
          sx={{ mt: 4 }}
        >
          Select a pool above to view details and manage liquidity or swaps.
        </Typography>
      )}
      {!selectedPool && !isLoadingPools && pools.length === 0 && (
         <Typography variant="body1" color="text.secondary" align="center" sx={{ mt: 4 }}>
             No pools are currently available.
         </Typography>
      )}
    </Box>
  );
};

export default Dashboard;