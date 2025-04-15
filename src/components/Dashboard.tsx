// src/components/Dashboard.tsx
import React, { useState, useCallback } from 'react';
import {
  Box, Typography, Autocomplete, TextField, Card, CardContent,
  Paper, Grid, Collapse, Skeleton, Alert, Divider, Button,
  CircularProgress, Link // Added Button, CircularProgress, Link
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info'; // Added InfoIcon
import { ethers, Contract, ZeroAddress, isAddress } from 'ethers'; // Added ethers imports

import { usePoolsContext, V4Pool } from '../contexts/PoolsContext';
import { useBalancesContext } from '../contexts/BalancesContext';
import { useAuthContext } from '../contexts/AuthContext'; // Added AuthContext
import { POSITION_MANAGER_ADDRESS, TARGET_NETWORK_CHAIN_ID, EXPLORER_URL_BASE } from '../constants'; // Added Position Manager Address
import PositionManagerABI from '../abis/PositionManager.json'; // Added Position Manager ABI
import { formatBalance } from '../utils/formatters'; // Import formatter

// Local storage key for the token ID input
const LS_DASHBOARD_TOKEN_ID = 'dashboard_inspect_tokenId';

const Dashboard: React.FC = () => {
  // Get necessary contexts
  const { pools, selectedPool, isLoadingPools, errorPools, handlePoolSelection } = usePoolsContext();
  const { userBalances, tokenSymbols, isLoadingBalances, errorBalances } = useBalancesContext();
  const { provider, network, account } = useAuthContext(); // Get provider/signer and network

  // State for the liquidity inspection section
  const [inspectTokenId, setInspectTokenId] = useState<string>(() => localStorage.getItem(LS_DASHBOARD_TOKEN_ID) || '');
  const [positionLiquidity, setPositionLiquidity] = useState<string | null>(null);
  const [isLoadingLiquidity, setIsLoadingLiquidity] = useState<boolean>(false);
  const [liquidityError, setLiquidityError] = useState<string | null>(null);

  // --- Fetch Liquidity Logic ---
  const fetchPositionLiquidity = useCallback(async () => {
    // Use provider for view functions, check network and essential addresses
    if (!provider || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
      setLiquidityError("Connect to the correct network first.");
      return;
    }
    if (POSITION_MANAGER_ADDRESS === ZeroAddress || !PositionManagerABI) {
      setLiquidityError("Position Manager not configured.");
      return;
    }

    let tokenIdBigInt: bigint;
    try {
      tokenIdBigInt = BigInt(inspectTokenId);
      if (tokenIdBigInt <= 0n) throw new Error("Token ID must be positive.");
    } catch {
      setLiquidityError("Invalid Token ID format.");
      return;
    }

    setIsLoadingLiquidity(true);
    setLiquidityError(null);
    setPositionLiquidity(null); // Clear previous result

    try {
      const positionManagerContract = new Contract(POSITION_MANAGER_ADDRESS, PositionManagerABI, provider);
      console.log(`Fetching liquidity for Token ID: ${inspectTokenId}`);

      const liquidityResult: bigint = await positionManagerContract.getPositionLiquidity(tokenIdBigInt);

      // Format liquidity for display (using toLocaleString for large numbers)
      const formattedLiquidity = liquidityResult.toLocaleString();
      setPositionLiquidity(formattedLiquidity);
      console.log(`Fetched Liquidity: ${formattedLiquidity}`);

    } catch (err: any) {
      console.error("Failed to fetch position liquidity:", err);
      // Attempt to extract a more specific revert reason if available
      const reason = err?.reason || err?.data?.message?.replace('execution reverted: ', '') || err.message || "Could not fetch liquidity.";
      // Check for common errors
      if (reason.includes('ERC721NonexistentToken') || reason.includes('Invalid token ID')) {
           setLiquidityError(`Token ID ${inspectTokenId} does not exist.`);
      } else {
          setLiquidityError(`Error: ${reason}`);
      }
      setPositionLiquidity(null);
    } finally {
      setIsLoadingLiquidity(false);
    }
  }, [provider, network, inspectTokenId]);

  // Handle input change and save to localStorage
  const handleTokenIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInspectTokenId(newValue);
    localStorage.setItem(LS_DASHBOARD_TOKEN_ID, newValue);
    setLiquidityError(null); // Clear error on input change
    setPositionLiquidity(null); // Clear result on input change
  };

  // Get the correct addresses and symbols from the selected pool
  const tokenAAddress = selectedPool?.tokenA_Address;
  const tokenBAddress = selectedPool?.tokenB_Address;
  const tokenABalanceStr = tokenAAddress && userBalances[tokenAAddress] ? formatBalance(userBalances[tokenAAddress], 6) : '0.00';
  const tokenBBalanceStr = tokenBAddress && userBalances[tokenBAddress] ? formatBalance(userBalances[tokenBAddress], 6) : '0.00';
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
       {errorBalances && !isLoadingBalances && <Alert severity="error" sx={{ mb: 2 }}>Balance Error: {errorBalances}</Alert>}

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
                      // Clear liquidity info when pool changes
                      setInspectTokenId('');
                      setPositionLiquidity(null);
                      setLiquidityError(null);
                      localStorage.removeItem(LS_DASHBOARD_TOKEN_ID);
                  }}
                  getOptionLabel={(option) =>
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

      {/* Selected Pool Details + Balances + Liquidity Inspection Card */}
      <Collapse in={!!selectedPool || isLoadingBalances || isLoadingPools} timeout={400} unmountOnExit>
        <Paper elevation={0} variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          {/* Pool Details Title*/}
          {(isLoadingPools || selectedPool) && (
             <Typography variant="h5" sx={{ mb: 2, fontWeight: 500 }}>
                {selectedPool ? selectedPool.name : <Skeleton width="50%"/>} Details
             </Typography>
          )}
          <Grid container spacing={2} rowSpacing={1.5}>

            {/* User Balances Section */}
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
                </>
             ) : null}

            {/* Divider */}
            {(isLoadingBalances || selectedPool) && (
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
              </Grid>
            )}

            {/* Liquidity Inspection Section */}
            {(isLoadingPools || selectedPool) && (
                <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mb: 1.5, fontSize: '1.1rem', fontWeight: 500 }}>
                        Inspect Position Liquidity
                    </Typography>
                     <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                        Enter the Token ID of a position NFT to view its current liquidity amount. You can find your Token IDs under the "Liquidity" tab after minting.
                        <Link href={EXPLORER_URL_BASE ? `${EXPLORER_URL_BASE}/address/${POSITION_MANAGER_ADDRESS}` : '#'} target="_blank" rel="noopener noreferrer" sx={{ ml: 0.5 }}>
                            (View Position Manager Contract)
                        </Link>
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                         <TextField
                            label="Position Token ID"
                            variant="outlined"
                            size="small"
                            value={inspectTokenId}
                            onChange={handleTokenIdChange}
                            disabled={isLoadingLiquidity || !account} // Disable if no account connected
                            sx={{ flexGrow: 1 }}
                            type="number" // Enforce number input
                            InputProps={{ inputProps: { min: 0 } }}
                        />
                        <Button
                            variant="contained"
                            onClick={fetchPositionLiquidity}
                            disabled={!inspectTokenId || isLoadingLiquidity || !account}
                            sx={{ height: '40px' }} // Match TextField small height
                        >
                            {isLoadingLiquidity ? <CircularProgress size={24} /> : "Fetch"}
                        </Button>
                    </Box>

                    {/* Display Result or Error */}
                     {liquidityError && <Alert severity="error" sx={{mt: 1}}>{liquidityError}</Alert>}
                     {positionLiquidity !== null && !liquidityError && (
                         <Paper variant="outlined" sx={{ p: 1.5, mt: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                             <Typography variant="body1" >
                                <strong>Liquidity:</strong> {positionLiquidity}
                             </Typography>
                         </Paper>
                     )}
                     {!positionLiquidity && !isLoadingLiquidity && !liquidityError && inspectTokenId && (
                         <Typography variant="caption" color="text.secondary" sx={{mt: 1, display: 'flex', alignItems: 'center'}}>
                             <InfoIcon fontSize="inherit" sx={{ mr: 0.5 }} /> Click 'Fetch' to view liquidity.
                         </Typography>
                    )}
                </Grid>
            )}

          </Grid>
        </Paper>
      </Collapse>

        {/* Message when no pool is selected */}
       {!selectedPool && !isLoadingPools && !errorPools && pools.length > 0 && (
         <Typography variant="body1" color="text.secondary" align="center" sx={{ mt: 4 }}>
           Select a pool above to view details and inspect position liquidity.
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