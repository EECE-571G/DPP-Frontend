import React, { useState, useMemo } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    TextField,
    Button,
    CircularProgress,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    ListItemIcon,
    Collapse,
    Tooltip,
    Alert,
    Stack,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PendingIcon from '@mui/icons-material/Pending';
import GavelIcon from '@mui/icons-material/Gavel';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import SendIcon from '@mui/icons-material/Send';

import { Proposal, Pool, ProposalStatus } from '../../types';
import { formatBalance, shortenAddress } from '../../utils/formatters';

interface GovernanceProps {
    pools: Pool[];
    proposals: Proposal[];
    governanceStatus: number[]; // The array of 21 integers
    userBalances: Record<string, number>;
    currentUserAddress?: string;
    voteWithRange: (proposalId: number, lower: number, upper: number, power: number) => Promise<void> | void; // New voting action
    delegateVotes: (targetAddress: string, amount: number) => Promise<void> | void;
    loadingStates: Record<string, boolean>;
}

// Helper to get status icon and color
const getStatusProps = (status: ProposalStatus): { icon: React.ReactElement} => {
    switch (status) {
      case 'active': return { icon: <HowToVoteIcon color='primary' /> };
      case 'pending': return { icon: <PendingIcon color='warning' /> };
      case 'succeeded': return { icon: <CheckCircleIcon color='success' /> };
      case 'defeated': return { icon: <CancelIcon color='error' /> };
      case 'executed': return { icon: <GavelIcon color='secondary' /> };
      default: return { icon: <PendingIcon color='disabled' /> };
    }
};

// Helper component for info boxes
const InfoBox: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
     <Paper elevation={1} sx={{ p: 2, textAlign: 'center', height: '100%' }}>
        <Typography variant="overline" color="text.secondary" display="block" gutterBottom sx={{ lineHeight: 1.2 }}>
            {title}
        </Typography>
        <Typography variant="h6" component="div" sx={{ wordBreak: 'break-word' }}>
            {children}
        </Typography>
    </Paper>
);

// Main Governance Component
const Governance: React.FC<GovernanceProps> = ({
    proposals,
    governanceStatus,
    userBalances,
    currentUserAddress,
    voteWithRange,
    delegateVotes,
    loadingStates,
}) => {
    // --- Delegation State ---
    const [delegateTarget, setDelegateTarget] = useState('');
    const [delegatePowerStr, setDelegatePowerStr] = useState('');
    const [delegateError, setDelegateError] = useState<string | null>(null);

    // --- Voting State ---
    const [selectedProposalId, setSelectedProposalId] = useState<number | null>(null);
    const [voteLowerStr, setVoteLowerStr] = useState('');
    const [voteUpperStr, setVoteUpperStr] = useState('');
    const [votePowerStr, setVotePowerStr] = useState('');
    const [voteError, setVoteError] = useState<string | null>(null);

    const vDPPBalance = userBalances['vDPP'] ?? 0;

    // --- Delegation Logic ---
    const delegatePowerNum = parseFloat(delegatePowerStr) || 0;
    const handleDelegateClick = async () => {
        setDelegateError(null);
        if (!delegateTarget || delegatePowerNum <= 0 || loadingStates['delegate']) return;

        if (!/^0x[a-fA-F0-9]{40}$/.test(delegateTarget)) {
            setDelegateError('Invalid target address format.');
            return;
        }
        if (delegatePowerNum > vDPPBalance) {
            setDelegateError('Cannot delegate more vDPP than you have.');
            return;
        }

        try {
            await delegateVotes(delegateTarget, delegatePowerNum);
            setDelegateTarget('');
            setDelegatePowerStr('');
        } catch (error: any) {
            console.error("Delegation failed:", error);
            setDelegateError(`Delegation failed: ${error.message || String(error)}`);
        }
    };
    const canDelegate = delegateTarget && delegatePowerNum > 0 && delegatePowerNum <= vDPPBalance && /^0x[a-fA-F0-9]{40}$/.test(delegateTarget);


    // --- Voting Logic ---
    const voteLowerNum = parseFloat(voteLowerStr);
    const voteUpperNum = parseFloat(voteUpperStr);
    const votePowerNum = parseFloat(votePowerStr) || 0;

    const handleVoteSubmit = async (proposalId: number) => {
        setVoteError(null);
        const voteKey = `vote_${proposalId}`;
        if (loadingStates[voteKey] || !proposalId) return;

        if (isNaN(voteLowerNum) || isNaN(voteUpperNum) || votePowerNum <= 0) {
            setVoteError('Please enter valid numbers for lower bound, upper bound, and power.');
            return;
        }
        if (voteLowerNum > voteUpperNum) {
            setVoteError('Lower bound cannot be greater than upper bound.');
            return;
        }
        if (votePowerNum > vDPPBalance) {
            setVoteError('Voting power cannot exceed your vDPP balance.');
            return;
        }

        // Note: "Locking based on status" logic is assumed to be handled by the backend/contract.
        // The frontend only ensures power <= balance.

        try {
            await voteWithRange(proposalId, voteLowerNum, voteUpperNum, votePowerNum);
            // Clear inputs on success
            setVoteLowerStr('');
            setVoteUpperStr('');
            setVotePowerStr('');
        } catch (error: any) {
            console.error("Voting failed:", error);
            setVoteError(`Vote submission failed: ${error.message || String(error)}`);
        }
    };

    // Reset vote form when proposal selection changes
    React.useEffect(() => {
        setVoteLowerStr('');
        setVoteUpperStr('');
        setVotePowerStr('');
        setVoteError(null);
    }, [selectedProposalId]);


    // --- Data for Status Chart ---
    const chartData = useMemo(() => governanceStatus.map((value, index) => ({
        id: index, // Required by BarChart series
        value: value,
        label: `Param ${index + 1}` // For tooltip/axis label
    })), [governanceStatus]);
    const chartXAxis = [{ scaleType: 'band' as const, dataKey: 'label' }]; // Use label as category
    const chartSeries = [{ dataKey: 'value', label: 'Status Value', color: '#6fa8dc' }]; // Use value for bar height


    // Mock Meta Data (Replace with real data if available)
    const mockMeta = {
        id: 'Epoch 15',
        time: '2d 5h left',
        stage: 'Voting Phase'
    };

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center', mb: 3 }}>
                Governance Center
            </Typography>

            {/* Top Row: Meta, Voting Power, Balance */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                 <Grid item xs={12} sm={4}>
                    <InfoBox title="Meta (Mock)">
                        ID: {mockMeta.id}<br/>
                        Time: {mockMeta.time}<br/>
                        Stage: {mockMeta.stage}
                    </InfoBox>
                 </Grid>
                 <Grid item xs={6} sm={4}>
                    <InfoBox title="Your Voting Power">
                        {formatBalance(vDPPBalance, 2)} vDPP
                    </InfoBox>
                 </Grid>
                 <Grid item xs={6} sm={4}>
                    <InfoBox title="vDPP Balance">
                        {formatBalance(vDPPBalance, 2)}
                    </InfoBox>
                 </Grid>
            </Grid>

            {/* Status Bar Chart Display */}
            <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                    Governance Status Parameters
                </Typography>
                <Box sx={{ height: 300, width: '100%' }}>
                   {chartData.length > 0 ? (
                        <BarChart
                            dataset={chartData} // Use dataset prop
                            xAxis={chartXAxis}
                            series={chartSeries}
                            // layout="horizontal" // Optional: if you want horizontal bars
                            slotProps={{
                                legend: { hidden: true }, // Hide legend if only one series
                            }}
                            margin={{ top: 10, right: 10, bottom: 60, left: 40 }} // Adjust margin for labels
                            sx={{
                                // Optional: Rotate labels if they overlap
                                '& .MuiChartsAxis-bottom .MuiChartsAxis-tickLabel': {
                                    transform: 'rotate(-30deg)',
                                    textAnchor: 'end',
                                },
                            }}
                        />
                   ) : (
                        <Typography>No status data available.</Typography>
                   )}

                </Box>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                    Note: Visual representation of the 21 status parameters. Locking logic based on these is handled by the protocol.
                </Typography>
            </Paper>

            {/* Proposals List & Voting Area */}
            <Grid container spacing={3}>
                {/* Proposals List */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" gutterBottom>
                            Proposals
                        </Typography>
                        <List dense sx={{ maxHeight: 'calc(100% - 40px)', overflow: 'auto' }}> {/* Adjust max height */}
                            {proposals.length === 0 && <ListItem><ListItemText primary="No proposals found." /></ListItem>}
                            {proposals.map(proposal => {
                                const statusProps = getStatusProps(proposal.status);
                                const isSelected = selectedProposalId === proposal.id;

                                return (
                                    <React.Fragment key={proposal.id}>
                                        <ListItem
                                            disablePadding
                                            sx={{ display: 'block', mb: 0.5 }}
                                        >
                                          <ListItemButton
                                                onClick={() => setSelectedProposalId(proposal.id === selectedProposalId ? null : proposal.id)}
                                                selected={isSelected}
                                                sx={{ borderRadius: 1, '&.Mui-selected': { bgcolor: 'action.hover' } }}
                                            >
                                            <ListItemIcon sx={{ minWidth: 35 }}>
                                                <Tooltip title={proposal.status.toUpperCase()}>
                                                  {statusProps.icon}                                                
                                                </Tooltip>
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={`#${proposal.id}: ${proposal.description.substring(0, 45)}${proposal.description.length > 45 ? '...' : ''}`}
                                                secondary={`Proposed: ${formatBalance(proposal.proposedDesiredPrice, 4)} | By: ${shortenAddress(proposal.proposer)}`}
                                            />
                                             <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                                                {formatBalance(proposal.totalVotingPowerCommitted ?? 0, 0)} vDPP
                                            </Typography>
                                            </ListItemButton>

                                        </ListItem>
                                        {/* Voting Actions Collapse */}
                                        <Collapse in={isSelected} timeout="auto" unmountOnExit>
                                            <Box sx={{ pl: 5, pr: 1, py: 2, borderLeft: `2px solid`, borderColor: 'divider', ml: 2 }}>
                                                <Typography variant="body2" gutterBottom>
                                                    {proposal.description}
                                                </Typography>
                                                 <Typography variant="body1" gutterBottom>
                                                    Pool Target Price Proposal: <strong>{formatBalance(proposal.proposedDesiredPrice, 6)}</strong>
                                                </Typography>

                                                {proposal.status === 'active' && currentUserAddress && (
                                                    <Box component="form" noValidate autoComplete="off" sx={{ mt: 2 }}>
                                                        <Typography variant="subtitle2" gutterBottom>Cast Your Vote:</Typography>
                                                        {voteError && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setVoteError(null)}>{voteError}</Alert>}
                                                        <Stack spacing={1.5}>
                                                             <TextField
                                                                label="Lower Bound (Desired Price Range)"
                                                                type="number"
                                                                size="small"
                                                                value={voteLowerStr}
                                                                onChange={(e) => setVoteLowerStr(e.target.value)}
                                                                disabled={loadingStates[`vote_${proposal.id}`]}
                                                                InputProps={{ inputProps: { step: "any" } }}
                                                            />
                                                            <TextField
                                                                label="Upper Bound (Desired Price Range)"
                                                                type="number"
                                                                size="small"
                                                                value={voteUpperStr}
                                                                onChange={(e) => setVoteUpperStr(e.target.value)}
                                                                disabled={loadingStates[`vote_${proposal.id}`]}
                                                                InputProps={{ inputProps: { step: "any" } }}
                                                            />
                                                            <TextField
                                                                label={`Voting Power (Max: ${formatBalance(vDPPBalance, 2)} vDPP)`}
                                                                type="number"
                                                                size="small"
                                                                value={votePowerStr}
                                                                onChange={(e) => setVotePowerStr(e.target.value)}
                                                                disabled={loadingStates[`vote_${proposal.id}`]}
                                                                 InputProps={{ inputProps: { min: 0, step: "any", max: vDPPBalance } }}
                                                            />
                                                            <Button
                                                                variant="contained"
                                                                size="medium"
                                                                onClick={() => handleVoteSubmit(proposal.id)}
                                                                disabled={loadingStates[`vote_${proposal.id}`] || !voteLowerStr || !voteUpperStr || !votePowerStr}
                                                                startIcon={loadingStates[`vote_${proposal.id}`] ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                                                            >
                                                                Submit Vote
                                                            </Button>
                                                        </Stack>
                                                        <Typography variant="caption" display="block" color="text.secondary" sx={{mt: 1}}>
                                                            Your voting power will be locked according to protocol rules.
                                                        </Typography>
                                                    </Box>
                                                )}
                                                {proposal.status !== 'active' && (
                                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Voting has ended for this proposal.</Typography>
                                                )}
                                                {!currentUserAddress && proposal.status === 'active' && (
                                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Connect wallet to vote.</Typography>
                                                )}
                                            </Box>
                                        </Collapse>
                                    </React.Fragment>
                                )
                            })}
                        </List>
                    </Paper>
                </Grid>

                {/* Delegation */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                            <PersonAddAlt1Icon sx={{ mr: 1 }} /> Delegate Your Voting Power
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            You can delegate your vDPP voting power to another address. You retain ownership of your tokens.
                        </Typography>
                         {delegateError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDelegateError(null)}>{delegateError}</Alert>}
                        <TextField
                            label="Target Address"
                            variant="outlined"
                            fullWidth
                            value={delegateTarget}
                            onChange={(e) => setDelegateTarget(e.target.value.trim())}
                            placeholder="0x..."
                            sx={{ mb: 2 }}
                            disabled={loadingStates['delegate']}
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label={`Amount of vDPP to Delegate (Max: ${formatBalance(vDPPBalance, 2)})`}
                            variant="outlined"
                            type="number"
                            fullWidth
                            value={delegatePowerStr}
                            onChange={(e) => setDelegatePowerStr(e.target.value)}
                            placeholder="0.0"
                            sx={{ mb: 2 }}
                            disabled={loadingStates['delegate']}
                            InputProps={{ inputProps: { min: 0, step: "any", max: vDPPBalance } }}
                            InputLabelProps={{ shrink: true }}
                        />
                        <Button
                            variant="contained"
                            fullWidth
                            onClick={handleDelegateClick}
                            disabled={!canDelegate || loadingStates['delegate']}
                            size="large"
                        >
                            {loadingStates['delegate'] ? <CircularProgress size={24} color="inherit" /> : 'Delegate Power'}
                        </Button>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Governance;