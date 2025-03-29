import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, TextField, Button, MenuItem, Select, FormControl, InputLabel,
  CircularProgress, SelectChangeEvent, List, ListItem, ListItemText, Divider, Grid, Chip, Tooltip,
  ListItemIcon,
  ButtonGroup,
  Stack
} from '@mui/material';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { Proposal, Pool } from './AppProvider';

// --- dnd-kit Imports ---
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// --- End dnd-kit Imports ---

// --- Gauge components ---
import {
  GaugeContainer,
  GaugeReferenceArc,
  GaugeValueArc,
  useGaugeState,
} from '@mui/x-charts/Gauge';

// --- ProposalGauge Component ---
const ProposalGauge: React.FC<{ yes: number; no: number }> = ({ yes, no }) => {
  // Compute the percentage of yes votes. If no votes, default to 50.
  const value = (yes + no) === 0 ? 50 : (yes / (yes + no)) * 100;
  const pointerColor = 'red';

  function GaugePointer() {
    const { valueAngle, outerRadius, cx, cy } = useGaugeState();
    if (valueAngle === null) {
      return null;
    }
    const target = {
      x: cx + outerRadius * Math.sin(valueAngle),
      y: cy - outerRadius * Math.cos(valueAngle),
    };
    return (
      <g>
        <circle cx={cx} cy={cy} r={5} fill={pointerColor} />
        <path
          d={`M ${cx} ${cy} L ${target.x} ${target.y}`}
          stroke={pointerColor}
          strokeWidth={3}
        />
      </g>
    );
  }

  return (
    <GaugeContainer
      width={80}
      height={80}
      startAngle={-110}
      endAngle={110}
      value={value}
    >
      <GaugeReferenceArc />
      <GaugeValueArc />
      <GaugePointer />
    </GaugeContainer>
  );
};

// --- End ProposalGauge Component ---

interface GovernanceProps {
  pools: Pool[];
  proposals: Proposal[];
  addProposal: (poolId: number, proposedPrice: number, description: string) => void;
  voteOnProposal: (id: number, vote: "yes" | "no") => void;
  loadingStates: Record<string, boolean>;
}

// --- Sortable Item Component ---
interface SortableProposalItemProps {
  proposal: Proposal;
  isVoting: (id: number) => boolean;
  voteOnProposal: (id: number, vote: "yes" | "no") => void;
  getPoolName: (id: number) => string;
}

function SortableProposalItem({ proposal, isVoting, voteOnProposal, getPoolName }: SortableProposalItemProps) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: proposal.id.toString() });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };
  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      {...attributes}
      alignItems="center"
      sx={{
        py: 1.5,
        pr: 2,
        pl: 0,
        bgcolor: isDragging ? 'action.selected' : 'inherit',
        transition: 'background-color 0.2s ease-in-out',
      }}
    >
      <ListItemIcon
        {...listeners}
        sx={{
          minWidth: 'auto',
          p: 1.5,
          cursor: 'grab',
          borderRadius: 1,
          transition: 'background-color 0.15s ease-out',
          '&:hover': { backgroundColor: 'action.hover' },
          '&:active': { cursor: 'grabbing' },
        }}
      >
        <DragHandleIcon sx={{ color: 'text.secondary' }} />
      </ListItemIcon>
            {/* Gauge displaying yes/no ratio */}
            <Box m={2}>
              <ProposalGauge yes={proposal.votes.yes} no={proposal.votes.no} />
            </Box>
      <ListItemText
        primary={
          <Typography variant="subtitle1" fontWeight="medium">
            Proposal #{proposal.id}: Change {getPoolName(proposal.poolId)} Desired Price to {proposal.proposedDesiredPrice}
          </Typography>
        }
        secondary={
          <Box component="div" sx={{ width: '100%' }}>
            <Typography
              component="span"
              variant="body2"
              color="text.primary"
              sx={{ display: 'block', mt: 0.5, mb: 1.5 }}
            >
              {proposal.description}
            </Typography>
            <Grid container spacing={1} alignItems="center" mt={1}>
              <Grid item>
                <Chip label={`Yes: ${proposal.votes.yes}`} color="success" size="small" variant="outlined" />
              </Grid>
              <Grid item>
                <Chip label={`No: ${proposal.votes.no}`} color="error" size="small" variant="outlined" />
              </Grid>
              <Grid item xs />
              <Grid item>
                <Button
                  variant="outlined"
                  color="success"
                  size="small"
                  onClick={() => voteOnProposal(proposal.id, "yes")}
                  disabled={isVoting(proposal.id)}
                  sx={{ mr: 1 }}
                  startIcon={isVoting(proposal.id) ? <CircularProgress size={16} color="inherit" /> : null}
                >
                  {isVoting(proposal.id) ? 'Voting...' : 'Vote Yes'}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={() => voteOnProposal(proposal.id, "no")}
                  disabled={isVoting(proposal.id)}
                  startIcon={isVoting(proposal.id) ? <CircularProgress size={16} color="inherit" /> : null}
                >
                  {isVoting(proposal.id) ? 'Voting...' : 'Vote No'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        }
        secondaryTypographyProps={{ component: 'div' }}
      />
    </ListItem>
  );
}

// --- End Sortable Item Component ---

const Governance: React.FC<GovernanceProps> = ({ pools, proposals, addProposal, voteOnProposal, loadingStates }) => {
  // --- State for Creation Form ---
  const [createPoolId, setCreatePoolId] = useState<string>(pools[0]?.id.toString() || "");
  const [proposedPriceStr, setProposedPriceStr] = useState("");
  const [description, setDescription] = useState("");

  // --- State for Filtering & Sorting ---
  const [filterPoolId, setFilterPoolId] = useState<string>("all"); // "all" or a pool ID string
  const [sortDirection, setSortDirection] = useState<'none' | 'asc' | 'desc'>("none");

  // --- Process Proposals: Filter -> Sort ---
  const processedProposals = useMemo(() => {
    let active = proposals.filter(p => p.status === 'active');
    let filtered = active;
    if (filterPoolId !== "all") {
      filtered = active.filter(p => p.poolId.toString() === filterPoolId);
    }
    let sorted = [...filtered]; // Sort operates on a new array
    if (sortDirection === 'asc') {
      sorted.sort((a, b) => a.proposedDesiredPrice - b.proposedDesiredPrice);
    } else if (sortDirection === 'desc') {
      sorted.sort((a, b) => b.proposedDesiredPrice - a.proposedDesiredPrice);
    }
    return sorted;
  }, [proposals, filterPoolId, sortDirection]);

  // --- State for DND Order ---
  const [orderedProposalIds, setOrderedProposalIds] = useState<string[]>(() =>
    processedProposals.map(p => p.id.toString())
  );

  // Reset DND order when filter/sort changes
  useEffect(() => {
    setOrderedProposalIds(processedProposals.map(p => p.id.toString()));
  }, [processedProposals]);

  // Map ordered IDs back to proposal objects for rendering the draggable list
  const displayProposals = useMemo(() => {
    const proposalMap = new Map(proposals.map(p => [p.id.toString(), p]));
    return orderedProposalIds.map(id => proposalMap.get(id)).filter((p): p is Proposal => !!p);
  }, [orderedProposalIds, proposals]);

  // --- dnd-kit Sensors ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } })
  );

  // --- Drag End Handler ---
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrderedProposalIds((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  // --- Event Handlers ---
  const handleCreateProposal = () => {
    const poolIdNum = parseInt(createPoolId, 10);
    const proposedPriceNum = parseFloat(proposedPriceStr);
    if (!createPoolId || isNaN(poolIdNum)) { alert("Please select a pool."); return; }
    if (!proposedPriceStr || isNaN(proposedPriceNum) || proposedPriceNum <= 0) { alert("Enter a valid positive desired price."); return; }
    if (!description.trim()) { alert("Please provide a short description/reason."); return; }
    addProposal(poolIdNum, proposedPriceNum, description.trim());
  };

  const handleFilterChange = (event: SelectChangeEvent) => {
    setFilterPoolId(event.target.value);
  };

  const handleSort = (clickedDirection: 'asc' | 'desc') => {
    setSortDirection(prev => (prev === clickedDirection ? 'none' : clickedDirection));
  };

  const getPoolName = (poolId: number): string => {
    return pools.find(p => p.id === poolId)?.name ?? `Pool #${poolId}`;
  };

  const isVoting = (proposalId: number): boolean => {
    return loadingStates[`vote_${proposalId}`] || false;
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3 }}>
        Governance
      </Typography>

      <Box
        sx={{
          mt: 4,
          width: '100%',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'center',
          alignItems: { xs: 'center', md: 'flex-start' },
          gap: 4,
        }}
      >
        <Box sx={{ width: { xs: '100%', md: '35%' } }}>
          <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Create New Proposal
            </Typography>
            <FormControl fullWidth margin="normal">
              <InputLabel id="create-pool-select-label">Target Pool</InputLabel>
              <Select
                labelId="create-pool-select-label"
                label="Target Pool"
                value={createPoolId}
                onChange={(e: SelectChangeEvent) => setCreatePoolId(e.target.value)}
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
              InputProps={{ inputProps: { min: 0 } }}
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
              inputProps={{ maxLength: 200 }}
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
        </Box>
        <Box sx={{ width: { xs: '100%', md: '65%' } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5">Active Proposals</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="filter-pool-label">Filter by Pool</InputLabel>
                <Select labelId="filter-pool-label" label="Filter by Pool" value={filterPoolId} onChange={handleFilterChange}>
                  <MenuItem value="all">
                    <em>All Pools</em>
                  </MenuItem>
                  {pools.map((pool) => (
                    <MenuItem key={pool.id} value={pool.id.toString()}>
                      {pool.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <ButtonGroup variant="outlined" size="small" aria-label="Sort proposals by price">
                <Tooltip title="Sort Ascending by Price">
                  <Button onClick={() => handleSort('asc')} variant={sortDirection === 'asc' ? 'contained' : 'outlined'}>
                    <ArrowUpwardIcon fontSize="small" />
                  </Button>
                </Tooltip>
                <Tooltip title="Sort Descending by Price">
                  <Button onClick={() => handleSort('desc')} variant={sortDirection === 'desc' ? 'contained' : 'outlined'}>
                    <ArrowDownwardIcon fontSize="small" />
                  </Button>
                </Tooltip>
              </ButtonGroup>
            </Stack>
          </Stack>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orderedProposalIds} strategy={verticalListSortingStrategy}>
              <List sx={{ bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden', p: 0 }}>
                {displayProposals.length === 0 && (
                  <ListItem sx={{ pl: 2 }}>
                    <ListItemText primary="No active proposals match the current filter." />
                  </ListItem>
                )}
                {displayProposals.map((proposal, index) => (
                  <React.Fragment key={proposal.id}>
                    <SortableProposalItem
                      proposal={proposal}
                      isVoting={isVoting}
                      voteOnProposal={voteOnProposal}
                      getPoolName={getPoolName}
                    />
                    {index < displayProposals.length - 1 && <Divider component="li" variant="inset" />}
                  </React.Fragment>
                ))}
              </List>
            </SortableContext>
          </DndContext>
        </Box>
      </Box>
    </Box>
  );
};

export default Governance;