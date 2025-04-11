import React from 'react';
import {
  Box, Typography, Autocomplete, TextField, Card, CardContent,
  Paper, Grid, Collapse, Divider, Skeleton, Alert
} from '@mui/material';
import { Pool } from '../types';
import { formatBalance } from '../utils/formatters';
import { usePoolsContext } from '../contexts/PoolsContext';
import { useBalancesContext } from '../contexts/BalancesContext';

const Dashboard: React.FC = () => {
  // Get data from contexts
  const { pools, selectedPool, setSelectedPoolById, isLoadingPools, errorPools } = usePoolsContext();
  const { userBalances, isLoadingBalances, errorBalances } = useBalancesContext();

  const tokenABalance = selectedPool ? userBalances[selectedPool.tokenA] : undefined;
  const tokenBBalance = selectedPool ? userBalances[selectedPool.tokenB] : undefined;
  const lpTokenSymbol = selectedPool ? `LP-${selectedPool.tokenA}/${selectedPool.tokenB}` : undefined;
  const lpTokenBalance = lpTokenSymbol ? userBalances[lpTokenSymbol] : undefined;

  // Handler to pass ID
  const handlePoolChange = (event: React.SyntheticEvent, newValue: Pool | null) => {
      setSelectedPoolById(newValue ? newValue.id : null);
  };

  // --- Render logic ---
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3, textAlign: 'center' }}>
        Pool Dashboard
      </Typography>

      {/* Display Fetching Errors */}
       {errorPools && <Alert severity="error" sx={{ mb: 2 }}>{errorPools}</Alert>}
       {errorBalances && !isLoadingBalances && <Alert severity="error" sx={{ mb: 2 }}>{errorBalances}</Alert>}

      {/* Pool Selection Card */}
      <Card elevation={1} sx={{ borderRadius: 2, mb: 3, }}>
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
      <Collapse in={!!selectedPool || isLoadingBalances || isLoadingPools} timeout={400} unmountOnExit>
        <Paper elevation={0} variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          {/* Pool Details */}
          {(isLoadingPools || selectedPool) && (
             <Typography variant="h5" sx={{ mb: 2, fontWeight: 500 }}>
                {selectedPool ? selectedPool.name : <Skeleton width="50%"/>} Details
             </Typography>
          )}
          <Grid container spacing={2} rowSpacing={1.5}>
            {/* Pool Info */}
            <Grid item xs={12} sm={6}>
              <Typography variant="body1" component="div">
                <strong>Token Pair:</strong> {isLoadingPools ? <Skeleton width="60%"/> : (selectedPool ? `${selectedPool.tokenA} / ${selectedPool.tokenB}` : 'N/A')}
              </Typography>
            </Grid>
            {/* ... other pool details using isLoadingPools and selectedPool ... */}
             <Grid item xs={12} sm={6}>
               <Typography variant="body1">
                 <strong>Current Price:</strong>{' '}
                  {isLoadingPools ? <Skeleton width="70%"/> : (selectedPool ? `1 ${selectedPool.tokenA} = ${formatBalance(selectedPool.currentPrice, 6)} ${selectedPool.tokenB}` : 'N/A')}
               </Typography>
             </Grid>
             <Grid item xs={12} sm={6}>
               <Typography
                 variant="body1"
                 color="primary.main"
                 sx={{ fontWeight: 'medium' }}
               >
                 <strong>Desired Price:</strong>{' '}
                  {isLoadingPools ? <Skeleton width="70%"/> : (selectedPool ? `1 ${selectedPool.tokenA} = ${formatBalance(selectedPool.desiredPrice, 6)} ${selectedPool.tokenB}` : 'N/A')}
               </Typography>
             </Grid>
             <Grid item xs={12} sm={6}>
               <Typography variant="body2" color="text.secondary">
                 <strong>Base Fee:</strong>{' '}
                  {isLoadingPools ? <Skeleton width="30%"/> : (selectedPool ? `${(selectedPool.baseFee * 100).toFixed(2)}%` : 'N/A')}
               </Typography>
             </Grid>

            <Grid item xs={12}><Divider sx={{ my: 2 }} /></Grid>

            {/* User Balances */}
            {(isLoadingBalances || selectedPool) && (
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 1.5, fontSize: '1.1rem', fontWeight: 500 }}>
                  Your Balances
                </Typography>
              </Grid>
            )}
             {isLoadingBalances ? (
                 <>
                    <Grid item xs={12} sm={6}><Skeleton width="50%" /></Grid>
                    <Grid item xs={12} sm={6}><Skeleton width="50%" /></Grid>
                    {selectedPool && <Grid item xs={12}><Skeleton width="60%" /></Grid>}
                 </>
             ) : selectedPool ? (
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
                    {lpTokenBalance !== undefined && lpTokenSymbol && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>LP Tokens ({lpTokenSymbol}):</strong>{' '}
                          {formatBalance(lpTokenBalance, 8)}
                        </Typography>
                      </Grid>
                    )}
                    {/* ... rest of balance display ... */}
                     {lpTokenBalance === undefined && selectedPool && (
                       <Grid item xs={12}>
                         <Typography variant="caption" color="text.secondary">
                           You have no liquidity provider tokens for this pool.
                         </Typography>
                       </Grid>
                     )}
                </>
             ) : null}
          </Grid>
        </Paper>
      </Collapse>

        {/* Message when no pool is selected */}
       {!selectedPool && !isLoadingPools && !errorPools && pools.length > 0 && (
         <Typography variant="body1" color="text.secondary" align="center" sx={{ mt: 4 }}>
           Select a pool above to view details and manage liquidity or swaps.
         </Typography>
       )}
       {!isLoadingPools && !errorPools && pools.length === 0 && (
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mt: 4 }}>
              No pools are currently available.
          </Typography>
       )}
    </Box>
  );
};

export default Dashboard;