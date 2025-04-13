import React from 'react';
import {
  Box, Typography, Autocomplete, TextField, Card, CardContent,
  Paper, Grid, Collapse, Skeleton, Alert
} from '@mui/material';
import { usePoolsContext } from '../contexts/PoolsContext';
import { useBalancesContext } from '../contexts/BalancesContext';

const Dashboard: React.FC = () => {
  const { pools, selectedPool, isLoadingPools, errorPools } = usePoolsContext();
  const { userBalances, tokenSymbols, isLoadingBalances, errorBalances } = useBalancesContext();

  // Get the correct addresses from the selected pool
  const tokenAAddress = selectedPool?.tokenA_Address;
  const tokenBAddress = selectedPool?.tokenB_Address;

  // Access balances using the ADDRESSES as keys
  const tokenABalanceStr = tokenAAddress ? userBalances[tokenAAddress] : undefined;
  const tokenBBalanceStr = tokenBAddress ? userBalances[tokenBAddress] : undefined;

  // Get symbols using addresses
  const tokenASymbol = tokenAAddress ? tokenSymbols[tokenAAddress] : 'N/A';
  const tokenBSymbol = tokenBAddress ? tokenSymbols[tokenBAddress] : 'N/A';

  const lpTokenSymbol = selectedPool ? `LP-${selectedPool.tokenA}/${selectedPool.tokenB}` : undefined;
  const lpTokenBalance = lpTokenSymbol ? userBalances[lpTokenSymbol] : undefined;

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
                  // onChange={handlePoolChange}
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
                        <strong>{tokenASymbol}:</strong>{' '}
                        {tokenABalanceStr}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2">
                        <strong>{tokenBSymbol}:</strong>{' '}
                        {tokenBBalanceStr}
                      </Typography>
                    </Grid>
                    {lpTokenBalance !== undefined && lpTokenSymbol && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>LP Tokens ({lpTokenSymbol}):</strong>{' '}
                          {lpTokenBalance}
                        </Typography>
                      </Grid>
                    )}
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