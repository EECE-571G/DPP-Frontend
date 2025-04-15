// frontend/src/components/Governance/VoteForm.tsx
import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    CircularProgress,
    Alert,
    Stack,
    Paper
} from '@mui/material';
import PollIcon from '@mui/icons-material/Poll';
import SendIcon from '@mui/icons-material/Send';
import { ethers, formatUnits } from 'ethers';

// Context and Hook Imports
import { useBalancesContext } from '../../contexts/BalancesContext';
import { useGovernanceContext } from '../../contexts/GovernanceContext';
import { useLoadingContext } from '../../contexts/LoadingContext';
import { GOVERNANCE_TOKEN_ADDRESS } from '../../constants';
import { formatBalance } from '../../utils/formatters';

interface VoteFormProps {
    proposalId: number;
    mockVotingPowerRaw: bigint; // <<< UPDATED PROP: Receive mocked power
    onVoteSubmit: (proposalId: number, lower: number, upper: number) => Promise<boolean>; // <<< UPDATED PROP: Receive submit handler
    canVote: boolean; // <<< UPDATED PROP: Receive voting eligibility
}

// <<< UPDATED: Accept mocked props and callback >>>
const VoteForm: React.FC<VoteFormProps> = ({ proposalId, mockVotingPowerRaw, onVoteSubmit, canVote }) => {
    // --- Contexts (only needed for decimals now) ---
    const { tokenDecimals } = useBalancesContext();
    const { metaData, isLoadingGovernanceData } = useGovernanceContext(); // Keep metaData for stage check
    const { isLoading: loadingStates } = useLoadingContext();

    // --- Local State ---
    const [voteLowerStr, setVoteLowerStr] = useState('');
    const [voteUpperStr, setVoteUpperStr] = useState('');
    const [voteError, setVoteError] = useState<string | null>(null);

    // --- Derived State ---
    const DPPDecimals = tokenDecimals[GOVERNANCE_TOKEN_ADDRESS] ?? 18;
    // <<< Use mocked voting power for display >>>
    const votingPowerFormatted = formatUnits(mockVotingPowerRaw, DPPDecimals);

    const voteLowerNum = parseFloat(voteLowerStr);
    const voteUpperNum = parseFloat(voteUpperStr);
    const voteKey = `castVote_${proposalId}`;
    const isLoading = loadingStates[voteKey] ?? false;
    // canVote is now passed as a prop

    // <<< Updated: Call the passed handler >>>
    const handleVoteSubmitInternal = async () => {
         setVoteError(null);
        if (isLoading || !proposalId) return;

        if (isNaN(voteLowerNum) || isNaN(voteUpperNum)) {
            setVoteError('Please enter valid numbers for bounds.');
            return;
        }
        // <<< Use mocked power for check >>>
        if (mockVotingPowerRaw <= 0n) {
            setVoteError('You have no voting power (DPP) to cast a vote.');
            return;
        }
         if (voteLowerNum >= voteUpperNum) {
            setVoteError('Lower bound must be strictly less than upper bound.');
            return;
        }

        try {
            // Call the passed handler from Governance.tsx
            const success = await onVoteSubmit(proposalId, voteLowerNum, voteUpperNum);
            if (success) {
                setVoteLowerStr('');
                setVoteUpperStr('');
            } else {
                // Assume onVoteSubmit handles its own errors/snackbars if it returns false
                // Optionally set a local error here too
                // setVoteError("Vote submission failed. Check console or try again.");
            }
        } catch (error: any) {
            console.error("Voting failed (UI):", error);
            setVoteError(`Vote submission failed: ${error.message || String(error)}`);
        }
    };

    // Reset fields when proposalId changes (selected pool changes)
     useEffect(() => {
        setVoteLowerStr('');
        setVoteUpperStr('');
        setVoteError(null);
    }, [proposalId]);

    return (
        <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
            <Box component="form" noValidate autoComplete="off" sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <PollIcon sx={{ mr: 1 }} /> Pool Target Price Voting
                </Typography>
                 <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {/* <<< Use mocked power for display >>> */}
                    Your vote will utilize your full voting power: {formatBalance(votingPowerFormatted, 2)} DPP
                </Typography>

                {voteError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setVoteError(null)}>{voteError}</Alert>}

                <Stack spacing={1.5}>
                    <TextField
                        label="Lower Bound (Tick, Inclusive)"
                        type="number"
                        size="small"
                        value={voteLowerStr}
                        onChange={(e) => { setVoteLowerStr(e.target.value); setVoteError(null); }} // Clear error on change
                        disabled={isLoading || !canVote} // Use passed prop
                        InputProps={{ inputProps: { step: "any" } }}
                    />
                    <TextField
                        label="Upper Bound (Tick, Exclusive)"
                        type="number"
                        size="small"
                        value={voteUpperStr}
                        onChange={(e) => { setVoteUpperStr(e.target.value); setVoteError(null); }} // Clear error on change
                        disabled={isLoading || !canVote} // Use passed prop
                        InputProps={{ inputProps: { step: "any" } }}
                    />
                    <Button
                        variant="contained"
                        size="medium"
                        onClick={handleVoteSubmitInternal} // Use internal handler
                        disabled={isLoading || !voteLowerStr || !voteUpperStr || !canVote} // Use passed prop
                        startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                    >
                        Cast Vote
                    </Button>
                </Stack>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                    {/* --- CORRECTED TEXT WRAPPING --- */}
                    {`Mock Action: Updates chart and sets voting power to 0. Requires DPP balance > 0 and correct poll stage.`}
                    {/* --- END CORRECTION --- */}
                </Typography>
            </Box>
        </Paper>
    );
};

export default VoteForm;