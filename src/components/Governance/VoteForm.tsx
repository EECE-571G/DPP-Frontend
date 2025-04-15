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
import { GOVERNANCE_TOKEN_ADDRESS } from '../../constants'; // <<< IMPORT CONSTANT

interface VoteFormProps {
    proposalId: number; // Assuming this is still needed, might relate to Pool ID conceptually now
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
    // *** FIX: Use address from constants to get balance ***
    const vDPPBalance = parseFloat(userBalances[GOVERNANCE_TOKEN_ADDRESS] ?? '0');
    // *** END FIX ***

    const voteLowerNum = parseFloat(voteLowerStr);
    const voteUpperNum = parseFloat(voteUpperStr);
    // Use a unique loading key per proposal/action (or pool if proposalId maps to pool)
    const voteKey = `castVote_${proposalId}`; // Adjust key if needed
    const isLoading = loadingStates[voteKey] ?? false;

    // handleVoteSubmit (keep as before)
    const handleVoteSubmit = async () => {
         setVoteError(null);
        if (isLoading || !proposalId) return;

        if (isNaN(voteLowerNum) || isNaN(voteUpperNum)) {
            setVoteError('Please enter valid numbers for bounds.');
            return;
        }
        // Check balance again, now using the correctly fetched value
        if (vDPPBalance <= 0) {
            setVoteError('You have no voting power (vDPP) to cast a vote.');
            return;
        }
         if (voteLowerNum > voteUpperNum) {
            setVoteError('Lower bound cannot be greater than upper bound.');
            return;
        }

        try {
            const success = await handleVoteWithRange(proposalId, voteLowerNum, voteUpperNum);
            if (success) {
                setVoteLowerStr('');
                setVoteUpperStr('');
            }
        } catch (error: any) {
            console.error("Voting failed (UI):", error);
            setVoteError(`Vote submission failed: ${error.message || String(error)}`);
        }
    };

    // useEffect to clear form (keep as before)
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
                 {/* Display the correct balance */}
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
                        InputProps={{ inputProps: { step: "any" } }}
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
                        // Disable check now uses correct balance
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