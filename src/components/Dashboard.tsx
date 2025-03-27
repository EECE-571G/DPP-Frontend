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
  Collapse
} from '@mui/material';
import { Pool } from './AppProvider';

interface DashboardProps {
  pools: Pool[];
  selectedPool: Pool | null;
  onSelectPool: (pool: Pool | null) => void; // Allow null selection
}

const Dashboard: React.FC<DashboardProps> = ({ pools, selectedPool, onSelectPool }) => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3 }}>
        Pool Dashboard
      </Typography>

      {/* Pool Selection Card */}
      <Card
        sx={{
          borderRadius: 2, // Consistent radius
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)', // Softer shadow
          p: 2,
          mb: 3,
          // backgroundColor: 'background.paper', // Inherits by default
        }}
      >
        <CardContent>
          <Autocomplete
            options={pools}
            value={selectedPool}
            onChange={(event, newValue) => {
              onSelectPool(newValue); // Pass null if cleared
            }}
            getOptionLabel={(option) => `${option.name} (${option.tokenA}/${option.tokenB})`}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select a DPP Pool"
                variant="outlined"
                fullWidth
              />
            )}
            sx={{ mb: 1 }} // Reduced margin
          />
        </CardContent>
      </Card>

      {/* Selected Pool Details Card */}
      {/* Wrap the Paper with Collapse for animation */}
      <Collapse in={!!selectedPool} timeout={400}>
          <Paper
            elevation={0} // Use border instead of elevation for a flatter look
            variant="outlined"
            sx={{
              p: 3,
              borderRadius: 2,
              // Add margin top only if selectedPool exists to prevent jump
              mt: !!selectedPool ? 0 : 0,
            }}
          >
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 500 }}>
              {selectedPool?.name} Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body1" >
                  <strong>Token Pair:</strong> {selectedPool?.tokenA} / {selectedPool?.tokenB}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
               <Typography variant="body1" >
                 <strong>Current Price:</strong> 1 {selectedPool?.tokenA} = {selectedPool?.currentPrice} {selectedPool?.tokenB}
               </Typography>
            </Grid>
             <Grid item xs={12} sm={6}>
               <Typography variant="body1" color="primary.main" sx={{ fontWeight: 'medium' }}>
                 <strong>Desired Price:</strong> 1 {selectedPool?.tokenA} = {selectedPool?.desiredPrice} {selectedPool?.tokenB}
               </Typography>
            </Grid>
             <Grid item xs={12} sm={6}>
               <Typography variant="body2" color="text.secondary" >
                 Base Fee: {selectedPool?.baseFee ? (selectedPool.baseFee * 100).toFixed(2) : 'N/A'}%
               </Typography>
             </Grid>
             {/* Add more details here later: TVL, Volume, Your Position etc. */}
          </Grid>
          </Paper>
      </Collapse>
      {/* --- End Selected Pool Details Card --- */}

      {/* Message when no pool is selected */}
      {!selectedPool && (
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mt: 4 }}>
              Select a pool above to see details.
          </Typography>
      )}
    </Box>
  );
};

export default Dashboard;