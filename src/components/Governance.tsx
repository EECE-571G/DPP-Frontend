import React, { useState } from 'react';
import {
    Box, Typography, Paper, TextField, Button, MenuItem, Select, FormControl, InputLabel,
    CircularProgress, SelectChangeEvent, List, ListItem, ListItemText, Divider, Grid, Chip, Tooltip
} from '@mui/material';
import { Proposal, Pool } from './AppProvider'; // Import types

interface GovernanceProps {
  pools: Pool[]; // To select which pool the proposal is for
  proposals: Proposal[];
  addProposal: (poolId: number, proposedPrice: number, description: string) => void;
  voteOnProposal: (id: number, vote: "yes" | "no") => void;
  loadingStates: Record<string, boolean>; // Pass loading states from App.tsx
}

const Governance: React.FC<GovernanceProps> = ({ pools, proposals, addProposal, voteOnProposal, loadingStates }) => {
  const [selectedPoolId, setSelectedPoolId] = useState<string>(pools[0]?.id.toString() || ""); // Default to first pool ID
  const [proposedPriceStr, setProposedPriceStr] = useState("");
  const [description, setDescription] = useState("");

  const handleCreateProposal = () => {
    const poolIdNum = parseInt(selectedPoolId, 10);
    const proposedPriceNum = parseFloat(proposedPriceStr);

    if (!selectedPoolId || isNaN(poolIdNum)) {
        alert("Please select a pool."); // Use Snackbar later
        return;
    }
    if (!proposedPriceStr || isNaN(proposedPriceNum) || proposedPriceNum <= 0) {
      alert("Enter a valid positive desired price."); // Use Snackbar later
      return;
    }
     if (!description.trim()) {
         alert("Please provide a short description/reason for the proposal."); // Use Snackbar later
         return;
     }

    addProposal(poolIdNum, proposedPriceNum, description.trim());
    // Clear form after initiating
    // setProposedPriceStr("");
    // setDescription("");
    // Don't clear pool selection
  };

  const getPoolName = (poolId: number): string => {
      return pools.find(p => p.id === poolId)?.name ?? `Pool #${poolId}`;
  }

   const isVoting = (proposalId: number): boolean => {
       return loadingStates[`vote_${proposalId}`] || false;
   }

  return (
    <Box p={3}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3 }}>
          Governance
      </Typography>

      {/* Create Proposal Card */}
      <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>Create New Proposal</Typography>
        <FormControl fullWidth margin="normal">
          <InputLabel id="pool-select-label">Target Pool</InputLabel>
          <Select
            labelId="pool-select-label"
            label="Target Pool"
            value={selectedPoolId}
            onChange={(e: SelectChangeEvent) => setSelectedPoolId(e.target.value)}
            disabled={loadingStates['createProposal']}
          >
            {pools.map((pool) => (
              <MenuItem key={pool.id} value={pool.id.toString()}>
                {pool.name} ({pool.tokenA}/{pool.tokenB})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Proposed Desired Price"
          type="number"
          fullWidth
          margin="normal"
          value={proposedPriceStr}
          onChange={(e) => setProposedPriceStr(e.target.value)}
          disabled={loadingStates['createProposal']}
          InputProps={{ inputProps: { min: 0 } }} // Basic validation
        />
        <TextField
          label="Description / Justification"
          fullWidth
          margin="normal"
          multiline
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loadingStates['createProposal']}
          inputProps={{ maxLength: 200 }} // Limit description length
        />
        <Button
            variant="contained"
            color="primary"
            onClick={handleCreateProposal}
            disabled={loadingStates['createProposal']}
            sx={{ mt: 2 }}
            startIcon={loadingStates['createProposal'] ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {loadingStates['createProposal'] ? 'Submitting...' : 'Create Proposal'}
        </Button>
      </Paper>

      {/* Active Proposals List */}
      <Typography variant="h5" sx={{ mb: 2 }}>Active Proposals</Typography>
       <List sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
         {proposals.filter(p => p.status === 'active').length === 0 && (
             <ListItem>
                 <ListItemText primary="No active proposals."/>
             </ListItem>
         )}
        {proposals.filter(p => p.status === 'active').map((proposal, index) => (
          <React.Fragment key={proposal.id}>
             <ListItem alignItems="flex-start">
                 <ListItemText
                    primary={
                        <Typography variant="subtitle1" fontWeight="medium">
                           Proposal #{proposal.id}: Change {getPoolName(proposal.poolId)} Desired Price to {proposal.proposedDesiredPrice}
                        </Typography>
                     }
                    secondary={
                        <>
                           <Typography component="span" variant="body2" color="text.primary" sx={{ display: 'block', mt: 0.5, mb: 1.5 }}>
                              {proposal.description}
                           </Typography>
                           <Grid container spacing={1} alignItems="center">
                                <Grid item>
                                   <Chip label={`Yes: ${proposal.votes.yes}`} color="success" size="small" variant="outlined"/>
                                </Grid>
                                <Grid item>
                                    <Chip label={`No: ${proposal.votes.no}`} color="error" size="small" variant="outlined"/>
                                </Grid>
                                <Grid item xs /> {/* Spacer */}
                                <Grid item>
                                   <Button
                                      variant="outlined"
                                      color="success"
                                      size="small"
                                      onClick={() => voteOnProposal(proposal.id, "yes")}
                                      disabled={isVoting(proposal.id)}
                                      sx={{ mr: 1 }}
                                   >
                                      {isVoting(proposal.id) ? <CircularProgress size={16} color="inherit"/> : 'Vote Yes'}
                                   </Button>
                                   <Button
                                      variant="outlined"
                                      color="error"
                                      size="small"
                                      onClick={() => voteOnProposal(proposal.id, "no")}
                                      disabled={isVoting(proposal.id)}
                                   >
                                       {isVoting(proposal.id) ? <CircularProgress size={16} color="inherit"/> : 'Vote No'}
                                   </Button>
                                </Grid>
                           </Grid>
                         </>
                     }
                 />
             </ListItem>
             {index < proposals.filter(p => p.status === 'active').length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))}
      </List>
       {/* TODO: Add sections for Past Proposals (succeeded/defeated) */}
    </Box>
  );
};

export default Governance;