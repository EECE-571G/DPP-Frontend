import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Typography, Paper, TextField, Button, MenuItem, Select, FormControl, InputLabel,
  CircularProgress, SelectChangeEvent, List, ListItem, ListItemText, Grid, Tooltip,
  ButtonGroup, Stack
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

// Import types and components
import { Proposal, Pool, ProposalStatus } from '../../types';
import { SortableProposalItem } from './SortableProposalItem';

// dnd-kit Imports
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
} from '@dnd-kit/sortable';

interface GovernanceProps {
  pools: Pool[];
  proposals: Proposal[]; // Expecting the full list of proposals
  addProposal: (poolId: number, proposedPrice: number, description: string) => void; // Function to add proposal
  voteOnProposal: (id: number, vote: "yes" | "no") => void; // Function to vote
  // Loading states for specific actions (more granular)
  loadingStates: {
      createProposal?: boolean; // Loading state for creating proposal
      [voteLoadingKey: string]: boolean | undefined; // Dynamic keys like 'vote_101'
  };
  currentUserAddress?: string; // Needed if proposals have proposer info shown/used
}

// Helper type for sorting direction
type SortDirection = 'none' | 'asc' | 'desc';
type SortableField = 'id' | 'price';

const Governance: React.FC<GovernanceProps> = ({
    pools,
    proposals,
    addProposal,
    voteOnProposal,
    loadingStates
}) => {
  // --- State for Creation Form ---
  const [createPoolId, setCreatePoolId] = useState<string>(pools[0]?.id.toString() || "");
  const [proposedPriceStr, setProposedPriceStr] = useState("");
  const [description, setDescription] = useState("");

  // --- State for Filtering & Sorting ---
  const [filterPoolId, setFilterPoolId] = useState<string>("all"); // "all" or a pool ID string
  const [filterStatus, setFilterStatus] = useState<ProposalStatus | 'all'>('active'); // Filter by status
  const [sortBy, setSortBy] = useState<SortableField>('id'); // Field to sort by
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc"); // Sort direction

  // --- Memoized Proposal Processing (Filter -> Sort) ---
  const processedProposals = useMemo(() => {
    // 1. Filter
    let filtered = proposals.filter(p => {
        const poolMatch = filterPoolId === "all" || p.poolId.toString() === filterPoolId;
        const statusMatch = filterStatus === 'all' || p.status === filterStatus;
        return poolMatch && statusMatch;
    });

    // 2. Sort
    let sorted = [...filtered]; // Create a new array for sorting
    sorted.sort((a, b) => {
        let compareA: number | string;
        let compareB: number | string;

        if (sortBy === 'price') {
            compareA = a.proposedDesiredPrice;
            compareB = b.proposedDesiredPrice;
        } else { // Default to sorting by ID
            compareA = a.id;
            compareB = b.id;
        }

        if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
        if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    return sorted;
  }, [proposals, filterPoolId, filterStatus, sortBy, sortDirection]);

  // --- State for Drag-and-Drop Order ---
  // Stores the IDs of the *processed* proposals in their current draggable order
  const [orderedProposalIds, setOrderedProposalIds] = useState<string[]>([]);

  // Update DND order state whenever the underlying processed proposals change
  useEffect(() => {
    setOrderedProposalIds(processedProposals.map(p => p.id.toString()));
  }, [processedProposals]); // Re-run when filtering/sorting changes the list

  // Map ordered IDs back to proposal objects for rendering the draggable list
  const displayProposals = useMemo(() => {
    const proposalMap = new Map(proposals.map(p => [p.id.toString(), p]));
    // Map the ordered IDs back to the full proposal objects
    return orderedProposalIds
        .map(id => proposalMap.get(id))
        .filter((p): p is Proposal => !!p); // Type guard to filter out undefined
  }, [orderedProposalIds, proposals]);

  // --- dnd-kit Setup ---
  const sensors = useSensors(
    // Use PointerSensor for drag detection with a slight delay/distance
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // Require moving 8px before drag starts
    })
    // Add KeyboardSensor if keyboard navigation/sorting is needed
  );

  // Drag End Handler for dnd-kit
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    // Ensure we have both active (dragged) and over (target) elements,
    // and they are not the same element.
    if (over && active.id !== over.id) {
      setOrderedProposalIds((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        // Use arrayMove utility to update the order immutably
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  // --- Event Handlers ---
  const handleCreateProposal = () => {
    const poolIdNum = parseInt(createPoolId, 10);
    const proposedPriceNum = parseFloat(proposedPriceStr);

    // Simple validation
    if (!createPoolId || isNaN(poolIdNum)) { alert("Please select a valid pool."); return; }
    if (!proposedPriceStr || isNaN(proposedPriceNum) || proposedPriceNum <= 0) { alert("Please enter a valid positive desired price."); return; }
    if (!description.trim()) { alert("Please provide a short description or reason for the proposal."); return; }

    addProposal(poolIdNum, proposedPriceNum, description.trim());
    // Clear fields after submission attempt
    setProposedPriceStr("");
    setDescription("");
  };

  const handleFilterPoolChange = (event: SelectChangeEvent) => {
    setFilterPoolId(event.target.value);
  };

  const handleFilterStatusChange = (event: SelectChangeEvent) => {
    setFilterStatus(event.target.value as ProposalStatus | 'all');
  };

  // Toggle sort direction or change sort field
  const handleSort = (field: SortableField) => {
      if (field === sortBy) {
          // Cycle direction: asc -> desc -> none (or back to desc?) -> asc
          setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
          // Set new field and default to descending
          setSortBy(field);
          setSortDirection('desc');
      }
  };

  // Helper to get pool name for display
  const getPoolName = useCallback((poolId: number): string => {
    return pools.find(p => p.id === poolId)?.name ?? `Pool #${poolId}`;
  }, [pools]); // Depends on pools array

  // Helper to check loading state for a specific vote action
  const isVoting = useCallback((proposalId: number): boolean => {
    return loadingStates[`vote_${proposalId}`] ?? false;
  }, [loadingStates]);

  const isCreating = loadingStates['createProposal'] ?? false;

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}> {/* Responsive padding */}
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3, textAlign: 'center' }}>
        DPP Governance
      </Typography>

      {/* Layout: Form on left/top, List on right/bottom */}
      <Grid container spacing={4}>
        {/* Create Proposal Form Section */}
        <Grid item xs={12} md={4}>
           <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Create New Proposal
            </Typography>
          <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
            <FormControl fullWidth margin="normal" variant="outlined">
              <InputLabel id="create-pool-select-label">Target Pool</InputLabel>
              <Select
                labelId="create-pool-select-label"
                label="Target Pool"
                value={createPoolId}
                onChange={(e: SelectChangeEvent) => setCreatePoolId(e.target.value)}
                disabled={isCreating || pools.length === 0}
              >
                 {pools.length === 0 && <MenuItem value="" disabled>No pools available</MenuItem>}
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
              variant="outlined"
              fullWidth
              margin="normal"
              value={proposedPriceStr}
              onChange={(e) => setProposedPriceStr(e.target.value)}
              disabled={isCreating}
              InputProps={{ inputProps: { min: 0, step: "any" } }} // Allow decimals
            />
            <TextField
              label="Description / Justification"
              variant="outlined"
              fullWidth
              margin="normal"
              multiline
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isCreating}
              inputProps={{ maxLength: 250 }}
              helperText={`${description.length}/250 characters`}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleCreateProposal}
              disabled={isCreating || !createPoolId || !proposedPriceStr || !description.trim()}
              sx={{ mt: 2, width: '100%', py: 1.5 }}
              startIcon={isCreating ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isCreating ? 'Submitting...' : 'Create Proposal'}
            </Button>
          </Paper>
        </Grid>

        {/* Proposals List Section */}
        <Grid item xs={12} md={8}>
          {/* Header and Controls */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', sm: 'center' }}
            mb={2}
          >
            <Typography variant="h5">Proposals</Typography>
            {/* Filter and Sort Controls */}
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={1}>
                {/* Status Filter */}
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel id="filter-status-label">Status</InputLabel>
                    <Select labelId="filter-status-label" label="Status" value={filterStatus} onChange={handleFilterStatusChange}>
                        <MenuItem value="all">All Statuses</MenuItem>
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="succeeded">Succeeded</MenuItem>
                        <MenuItem value="defeated">Defeated</MenuItem>
                        <MenuItem value="executed">Executed</MenuItem>
                    </Select>
                </FormControl>
              {/* Pool Filter */}
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="filter-pool-label">Filter Pool</InputLabel>
                <Select labelId="filter-pool-label" label="Filter Pool" value={filterPoolId} onChange={handleFilterPoolChange}>
                  <MenuItem value="all">All Pools</MenuItem>
                  {pools.map((pool) => (
                    <MenuItem key={pool.id} value={pool.id.toString()}>
                      {pool.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {/* Sort Buttons */}
              <ButtonGroup variant="outlined" size="small" aria-label="Sort proposals">
                 <Tooltip title={sortBy === 'id' ? `Sort by ID (${sortDirection === 'asc' ? 'Ascending' : 'Descending'})` : 'Sort by ID'}>
                    <Button onClick={() => handleSort('id')} variant={sortBy === 'id' ? 'contained' : 'outlined'}>
                      ID {sortBy === 'id' && (sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />)}
                    </Button>
                  </Tooltip>
                 <Tooltip title={sortBy === 'price' ? `Sort by Price (${sortDirection === 'asc' ? 'Ascending' : 'Descending'})` : 'Sort by Price'}>
                    <Button onClick={() => handleSort('price')} variant={sortBy === 'price' ? 'contained' : 'outlined'}>
                      Price {sortBy === 'price' && (sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />)}
                    </Button>
                  </Tooltip>
              </ButtonGroup>
            </Stack>
          </Stack>

          {/* Draggable Proposals List */}
          <Paper elevation={0} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
              >
                  {/* Provide context for sortable items */}
                  <SortableContext items={orderedProposalIds} strategy={verticalListSortingStrategy}>
                      <List sx={{ bgcolor: 'background.paper', p: 0 }}>
                          {displayProposals.length === 0 && (
                          <ListItem sx={{ pl: 2, py: 3 }}>
                              <ListItemText
                                  primary="No proposals found"
                                  secondary="Try adjusting the filters or wait for new proposals."
                                  sx={{ textAlign: 'center', color: 'text.secondary' }}
                              />
                          </ListItem>
                          )}
                          {/* Render the sortable items */}
                          {displayProposals.map((proposal) => (
                              <SortableProposalItem
                                  key={proposal.id}
                                  proposal={proposal}
                                  isVoting={isVoting}
                                  voteOnProposal={voteOnProposal}
                                  getPoolName={getPoolName}
                              />
                          ))}
                      </List>
                  </SortableContext>
              </DndContext>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Governance;