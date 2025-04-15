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
import { formatBalance } from '../../utils/formatters';

// Context and Hook Imports
import { useBalancesContext } from '../../contexts/BalancesContext';
import { useLoadingContext } from '../../contexts/LoadingContext';
import { useGovernanceActions } from '../../hooks/useGovernanceActions';

interface VoteFormProps {
    proposalId: number;
}

const VoteForm: React.FC<VoteFormProps> = ({ proposalId }) => {
    // --- Get state/actions from Contexts/Hooks ---
    const { userBalances } = useBalancesContext();
    const { isLoading: loadingStates } = useLoadingContext();
    const { handleVoteWithRange } = useGovernanceActions();

    // --- Local State ---
    const [voteLowerStr, setVoteLowerStr] = useState('');
    const [voteUpperStr, setVoteUpperStr] = useState('');
    const [voteError, setVoteError] = useState<string | null>(null);

    // --- Derived State ---
    // Assuming 'vDPP' is the key for the governance token balance in userBalances
    const vDPPBalance = parseFloat(userBalances['vDPP'] ?? '0');
    const voteLowerNum = parseFloat(voteLowerStr);
    const voteUpperNum = parseFloat(voteUpperStr);
    // Use a unique loading key per proposal/action
    const voteKey = `castVote_${proposalId}`;
    const isLoading = loadingStates[voteKey] ?? false;

    const handleVoteSubmit = async () => {
        setVoteError(null);
        // Check if already loading or proposalId is invalid (though it shouldn't be if passed)
        if (isLoading || !proposalId) return;

        // Basic validation
        if (isNaN(voteLowerNum) || isNaN(voteUpperNum)) {
            setVoteError('Please enter valid numbers for bounds.');
            return;
        }
        if (vDPPBalance <= 0) {
            setVoteError('You have no voting power (vDPP) to cast a vote.');
            return;
        }
        if (voteLowerNum > voteUpperNum) {
            setVoteError('Lower bound cannot be greater than upper bound.');
            return;
        }

        try {
            // Call the updated hook function - it no longer takes the power argument
            // The hook should internally know to use the full voting power
            const success = await handleVoteWithRange(proposalId, voteLowerNum, voteUpperNum);
            if (success) {
                // Clear the form on successful submission
                setVoteLowerStr('');
                setVoteUpperStr('');
            }
            // Errors are handled by the hook's snackbar messages
        } catch (error: any) {
            // Provide a fallback error message in the UI just in case
            console.error("Voting failed (UI):", error);
            setVoteError(`Vote submission failed: ${error.message || String(error)}`);
        }
    };

    // Effect to clear the form if the proposal ID changes
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
                    Your vote will utilize your full vDPP balance: {formatBalance(vDPPBalance, 2)} vDPP
                </Typography>

                {voteError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setVoteError(null)}>{voteError}</Alert>}

                <Stack spacing={1.5}>
                    <TextField
                        label="Lower Bound (Tick)"
                        type="number"
                        size="small"
                        value={voteLowerStr}
                        onChange={(e) => setVoteLowerStr(e.target.value)}
                        disabled={isLoading}
                        InputProps={{ inputProps: { step: "any" } }} // Allow any number step
                    />
                    <TextField
                        label="Upper Bound (Tick)"
                        type="number"
                        size="small"
                        value={voteUpperStr}
                        onChange={(e) => setVoteUpperStr(e.target.value)}
                        disabled={isLoading}
                        InputProps={{ inputProps: { step: "any" } }}
                    />
                    <Button
                        variant="contained"
                        size="medium"
                        onClick={handleVoteSubmit}
                        // Disable if loading, no valid bounds entered, or no voting power
                        disabled={isLoading || !voteLowerStr || !voteUpperStr || vDPPBalance <= 0}
                        startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                    >
                        Cast Vote
                    </Button>
                </Stack>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                    Your voting power will be locked according to protocol rules upon voting.
                </Typography>
            </Box>
        </Paper>
    );
};

export default VoteForm;