// src/components/Dashboard.tsx
import React from 'react';
import {
  Box, Typography, Autocomplete, TextField, Card, CardContent,
  Paper, Grid, Collapse, Skeleton, Alert, Divider
} from '@mui/material';
import { usePoolsContext, V4Pool } from '../contexts/PoolsContext';
import { useBalancesContext } from '../contexts/BalancesContext';

const Dashboard: React.FC = () => {
  // Get handlePoolSelection from context
  const { pools, selectedPool, isLoadingPools, errorPools, handlePoolSelection } = usePoolsContext();
  const { userBalances, tokenSymbols, isLoadingBalances, errorBalances } = useBalancesContext();

  // Get the correct addresses from the selected pool
  const tokenAAddress = selectedPool?.tokenA_Address;
  const tokenBAddress = selectedPool?.tokenB_Address;

  // Access balances using the ADDRESSES as keys
  const tokenABalanceStr = tokenAAddress && userBalances[tokenAAddress] ? userBalances[tokenAAddress] : '0.0';
  const tokenBBalanceStr = tokenBAddress && userBalances[tokenBAddress] ? userBalances[tokenBAddress] : '0.0';

  // Get symbols using addresses
  const tokenASymbol = tokenAAddress && tokenSymbols[tokenAAddress] ? tokenSymbols[tokenAAddress] : 'N/A';
  const tokenBSymbol = tokenBAddress && tokenSymbols[tokenBAddress] ? tokenSymbols[tokenBAddress] : 'N/A';


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
                  onChange={(event: any, newValue: V4Pool | null) => {
                      handlePoolSelection(newValue);
                  }}
                  getOptionLabel={(option) =>
                      // Display pool name and constituent tokens clearly
                      `${option.name} (${option.tokenA} / ${option.tokenB})`
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

            {/* User Balances for the SELECTED pool's tokens */}
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
                 </>
             ) : selectedPool ? (
                <>
                    {/* Display balance for Token A of the selected pool */}
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2">
                        <strong>{tokenASymbol}:</strong>{' '}
                        {tokenABalanceStr}
                      </Typography>
                    </Grid>
                     {/* Display balance for Token B of the selected pool */}
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2">
                        <strong>{tokenBSymbol}:</strong>{' '}
                        {tokenBBalanceStr}
                      </Typography>
                    </Grid>
                </>
             ) : null}

             {/* Other sections (Liquidity, etc.) would go here */}
            {/* Divider */}
            {(isLoadingBalances || selectedPool) && (
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
              </Grid>
            )}

             {/* Liquidity - Placeholder content */}
            {(isLoadingPools || selectedPool) && (
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 1.5, fontSize: '1.1rem', fontWeight: 500 }}>
                  Liquidity (TODO)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Liquidity details for the selected pool will appear here.
                </Typography>
              </Grid>
            )}

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
              No pools are currently available. Check constants and script logs.
          </Typography>
       )}
    </Box>
  );
};

export default Dashboard;