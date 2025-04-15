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
import { ethers, formatUnits } from 'ethers'; // <<< Use formatUnits

// Context and Hook Imports
import { useBalancesContext } from '../../contexts/BalancesContext';
import { useGovernanceContext } from '../../contexts/GovernanceContext'; // <<< Import Governance Context
import { useLoadingContext } from '../../contexts/LoadingContext';
import { useGovernanceActions } from '../../hooks/useGovernanceActions';
import { GOVERNANCE_TOKEN_ADDRESS } from '../../constants'; // <<< IMPORT CONSTANT
import { formatBalance } from '../../utils/formatters'; // <<< ADD IMPORT

interface VoteFormProps {
    proposalId: number; // Assuming this is still needed, might relate to Pool ID conceptually now
}

const VoteForm: React.FC<VoteFormProps> = ({ proposalId }) => {
    // --- Get state/actions from Contexts/Hooks ---
    const { userBalancesRaw, tokenDecimals } = useBalancesContext(); // <<< Use raw balance and get decimals
    const { metaData, isLoadingGovernanceData } = useGovernanceContext(); // <<< Get metadata for stage check
    const { isLoading: loadingStates } = useLoadingContext();
    const { handleVoteWithRange } = useGovernanceActions();

    // --- Local State ---
    const [voteLowerStr, setVoteLowerStr] = useState('');
    const [voteUpperStr, setVoteUpperStr] = useState('');
    const [voteError, setVoteError] = useState<string | null>(null);

    // --- Derived State ---
    // *** FIX: Use address from constants to get balance ***
    const DPPBalanceRaw = userBalancesRaw[GOVERNANCE_TOKEN_ADDRESS] ?? 0n;
    // *** END FIX ***
    const DPPDecimals = tokenDecimals[GOVERNANCE_TOKEN_ADDRESS] ?? 18;
    const DPPBalanceFormatted = formatUnits(DPPBalanceRaw, DPPDecimals);

    const voteLowerNum = parseFloat(voteLowerStr);
    const voteUpperNum = parseFloat(voteUpperStr);
    // Use a unique loading key per proposal/action (or pool if proposalId maps to pool)
    const voteKey = `castVote_${proposalId}`; // Adjust key if needed
    const isLoading = loadingStates[voteKey] ?? false;
    // Determine if voting is allowed based on balance and poll stage
    const canVote = !isLoadingGovernanceData &&
                    DPPBalanceRaw > 0n &&
                    metaData?.pollStage &&
                    (metaData.pollStage === 'Vote' || metaData.pollStage === 'Final Vote');

    // handleVoteSubmit (keep as before)
    const handleVoteSubmit = async () => {
         setVoteError(null);
        if (isLoading || !proposalId) return;

        if (isNaN(voteLowerNum) || isNaN(voteUpperNum)) {
            setVoteError('Please enter valid numbers for bounds.');
            return;
        }
        // Check balance again, now using the correctly fetched value
        if (DPPBalanceRaw <= 0n) {
            setVoteError('You have no voting power (DPP) to cast a vote.');
            return;
        }
        // Check lower < upper
         if (voteLowerNum >= voteUpperNum) {
            setVoteError('Lower bound must be strictly less than upper bound.');
            return;
        }

        try {
            // Pass numbers directly to the hook
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
                    Your vote will utilize your full DPP balance: {formatBalance(DPPBalanceFormatted, 2)} DPP {/* Use formatted balance */}
                </Typography>

                {voteError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setVoteError(null)}>{voteError}</Alert>}

                <Stack spacing={1.5}>
                    <TextField
                        label="Lower Bound (Tick, Inclusive)" // <<< Clarify range
                        type="number"
                        size="small"
                        value={voteLowerStr}
                        onChange={(e) => setVoteLowerStr(e.target.value)}
                        disabled={isLoading || !canVote} // <<< Disable based on canVote
                        InputProps={{ inputProps: { step: "any" } }}
                    />
                    <TextField
                        label="Upper Bound (Tick, Exclusive)" // <<< Clarify range
                        type="number"
                        size="small"
                        value={voteUpperStr}
                        onChange={(e) => setVoteUpperStr(e.target.value)}
                        disabled={isLoading || !canVote} // <<< Disable based on canVote
                        InputProps={{ inputProps: { step: "any" } }}
                    />
                    <Button
                        variant="contained"
                        size="medium"
                        onClick={handleVoteSubmit}
                        // Disable check now uses derived canVote state and input validity
                        disabled={isLoading || !voteLowerStr || !voteUpperStr || !canVote}
                        startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                    >
                        Cast Vote
                    </Button>
                </Stack>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                    Your voting power will be locked according to protocol rules upon voting. Voting is only possible during 'Vote' or 'Final Vote' stages.
                </Typography>
            </Box>
        </Paper>
    );
};

export default VoteForm;