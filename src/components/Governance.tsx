// src/components/Governance.tsx
import React, { useState } from 'react';
import { Box, Typography, Paper, TextField, Button } from '@mui/material';

export interface Proposal {
  id: number;
  desiredPrice: number;
  description: string;
  votes: {
    yes: number;
    no: number;
  };
}

interface GovernanceProps {
  proposals: Proposal[];
  addProposal: (proposal: Proposal) => void;
  voteOnProposal: (id: number, vote: "yes" | "no") => void;
}

const Governance: React.FC<GovernanceProps> = ({ proposals, addProposal, voteOnProposal }) => {
  const [desiredPrice, setDesiredPrice] = useState("");
  const [description, setDescription] = useState("");

  const handleCreateProposal = () => {
    if (!desiredPrice || isNaN(Number(desiredPrice))) {
      alert("Enter a valid desired price");
      return;
    }
    const newProposal: Proposal = {
      id: proposals.length + 1,
      desiredPrice: Number(desiredPrice),
      description,
      votes: { yes: 0, no: 0 }
    };
    addProposal(newProposal);
    setDesiredPrice("");
    setDescription("");
  };

  return (
    <Box p={2}>
      <Typography variant="h6">Governance</Typography>
      <Paper elevation={2} style={{ padding: 16, marginBottom: 16 }}>
        <Typography variant="subtitle1">Create Proposal</Typography>
        <TextField
          label="Desired Price"
          fullWidth
          margin="normal"
          value={desiredPrice}
          onChange={(e) => setDesiredPrice(e.target.value)}
        />
        <TextField
          label="Description"
          fullWidth
          margin="normal"
          multiline
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Button variant="contained" color="primary" onClick={handleCreateProposal}>
          Create Proposal
        </Button>
      </Paper>
      <Typography variant="subtitle1">Active Proposals</Typography>
      {proposals.map((proposal) => (
        <Paper key={proposal.id} elevation={2} style={{ padding: 16, marginBottom: 8 }}>
          <Typography variant="body1">
            Proposal #{proposal.id}: {proposal.description}
          </Typography>
          <Typography variant="body2">
            Desired Price: {proposal.desiredPrice}
          </Typography>
          <Typography variant="body2">
            Votes - Yes: {proposal.votes.yes} / No: {proposal.votes.no}
          </Typography>
          <Box mt={1}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => voteOnProposal(proposal.id, "yes")}
            >
              Vote Yes
            </Button>
            <Button
              variant="contained"
              color="secondary"
              style={{ marginLeft: 8 }}
              onClick={() => voteOnProposal(proposal.id, "no")}
            >
              Vote No
            </Button>
          </Box>
        </Paper>
      ))}
    </Box>
  );
};

export default Governance;
