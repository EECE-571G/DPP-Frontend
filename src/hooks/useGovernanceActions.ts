// src/hooks/useGovernanceActions.ts
import React, { useCallback } from 'react'; // <<< Add React import for SetStateAction
import { ethers, ZeroAddress, isAddress, Contract, parseUnits, formatUnits } from 'ethers';
import { useAuthContext } from '../contexts/AuthContext';
import { useLoadingContext } from '../contexts/LoadingContext';
import { useSnackbarContext } from '../contexts/SnackbarProvider';
import { useBalancesContext } from '../contexts/BalancesContext';
import { usePoolsContext } from '../contexts/PoolsContext';
import {
    GOVERNANCE_CONTRACT_ADDRESS,
    GOVERNANCE_TOKEN_ADDRESS,
    EXPLORER_URL_BASE,
    TARGET_NETWORK_CHAIN_ID
} from '../constants';
import GovernanceABI from '../abis/DesiredPricePool.json'; // <<< USE CORRECT ABI

const VOTE_RANGE = 10;

export const useGovernanceActions = () => {
    const { signer, account, network } = useAuthContext();
    const { fetchBalances, tokenDecimals } = useBalancesContext();
    const { setLoading } = useLoadingContext();
    const { showSnackbar } = useSnackbarContext();
    const { selectedPool } = usePoolsContext(); // Need pool for Pool ID

    // --- Modified handleVoteWithRange for Mocking ---
    const handleVoteWithRange = useCallback(async (
        proposalId: number, // Keep for loading key
        lower: number,
        upper: number,
        // --- Mock state and setters ---
        currentVotingPowerRaw: bigint,
        currentGovernanceStatus: number[],
        setMockVotingPowerRaw: React.Dispatch<React.SetStateAction<bigint | null>>,
        setMockGovernanceStatus: React.Dispatch<React.SetStateAction<number[] | null>>
        // --- End mock args ---
    ): Promise<boolean> => {
        if (!account || !selectedPool?.poolId) { // Simplified check - account needed for delegate check later
            showSnackbar('Wallet or Pool ID missing.', 'error');
            return false;
        }

        // Validate bounds (already done in VoteForm, but good practice)
        let lowerSlotInt8: number;
        let upperSlotInt8: number;
        try {
            lowerSlotInt8 = Math.round(lower);
            upperSlotInt8 = Math.round(upper);
             if (lowerSlotInt8 < -VOTE_RANGE || lowerSlotInt8 > VOTE_RANGE || upperSlotInt8 < -VOTE_RANGE + 1 || upperSlotInt8 > VOTE_RANGE + 1 || lowerSlotInt8 >= upperSlotInt8) {
                throw new Error(`Bounds must be within [-${VOTE_RANGE}, ${VOTE_RANGE}] and lower < upper.`);
            }
        } catch (e: any) {
             showSnackbar(`Invalid bounds: ${e.message}`, 'error');
             return false;
        }

        // --- Use Correct Loading Key ---
        const voteKey = `castVote_${proposalId}`; // Use proposalId for key consistency if needed elsewhere
        setLoading(voteKey, true);

        try {
            console.log(`[Mock Vote] User ${account} voting on pool ${selectedPool.poolId} with range [${lowerSlotInt8}, ${upperSlotInt8}) using power ${currentVotingPowerRaw.toString()}`);

            // *** MOCK LOGIC ***
            await new Promise(resolve => setTimeout(resolve, 800)); // Simulate transaction delay

            const govTokenDecimals = tokenDecimals[GOVERNANCE_TOKEN_ADDRESS] ?? 18;

            // Calculate distribution
            const slotsAffected = upperSlotInt8 - lowerSlotInt8;
            let powerPerSlotRaw = 0n;
            if (slotsAffected > 0 && currentVotingPowerRaw > 0n) {
                powerPerSlotRaw = currentVotingPowerRaw / BigInt(slotsAffected);
            }
            // Convert raw power per slot to formatted number for chart
            const powerPerSlotNum = parseFloat(formatUnits(powerPerSlotRaw, govTokenDecimals));

            // Update chart data
            const newGovernanceStatus = [...currentGovernanceStatus]; // Create a copy
            for (let i = lowerSlotInt8; i < upperSlotInt8; i++) {
                const chartIndex = i + VOTE_RANGE; // Convert slot (-10 to 10) to array index (0 to 20)
                if (chartIndex >= 0 && chartIndex < newGovernanceStatus.length) {
                    newGovernanceStatus[chartIndex] += powerPerSlotNum;
                } else {
                    console.warn(`[Mock Vote] Calculated chart index ${chartIndex} out of bounds for slot ${i}`);
                }
            }

            // Update the mock state via setters
            setMockGovernanceStatus(newGovernanceStatus);
            setMockVotingPowerRaw(0n); // Voting power is consumed

            showSnackbar(`Mock Vote successful for pool ${selectedPool.name}!`, 'success');
            // Don't fetch balances as it's mocked
            // await fetchBalances();
            return true;
            // *** END MOCK LOGIC ***

        } catch (error: any) {
            console.error(`Mock Vote operation failed for pool ${selectedPool.poolId}:`, error);
            const reason = error?.message || "Mock vote failed.";
            showSnackbar(`Mock Vote failed: ${reason}`, 'error');
            return false;
        } finally {
            setLoading(voteKey, false);
        }
    }, [account, selectedPool, tokenDecimals, GOVERNANCE_TOKEN_ADDRESS, setLoading, showSnackbar]); // Dependencies for mock logic


    // --- Modified handleDelegate for Mocking ---
    const handleDelegate = useCallback(async (
        targetAddress: string,
        amount: number, // Keep as number from UI
        // --- Mock state and setters ---
        currentVotingPowerRaw: bigint,
        currentDppBalanceRaw: bigint,
        setMockVotingPowerRaw: React.Dispatch<React.SetStateAction<bigint | null>>,
        setMockDppBalanceRaw: React.Dispatch<React.SetStateAction<bigint | null>>
        // --- End mock args ---
    ): Promise<boolean> => {
         if (!account || !selectedPool?.poolId) { // Pool ID needed for log message clarity
            showSnackbar('Cannot delegate: Wallet or Pool ID missing.', 'error'); return false;
        }
        if (!isAddress(targetAddress)) {
            showSnackbar('Invalid target delegate address.', 'error'); return false;
        }
        if (amount <= 0) {
             showSnackbar('Delegation amount must be positive.', 'warning'); return false;
        }

        const govTokenDecimals = tokenDecimals[GOVERNANCE_TOKEN_ADDRESS] ?? 18;
        const delegateKey = 'delegateVotes';
        setLoading(delegateKey, true);

        try {
            let delegatePowerWei: bigint;
            try {
                delegatePowerWei = parseUnits(amount.toString(), govTokenDecimals);
                if (delegatePowerWei <= 0n) throw new Error("Amount must be positive");
            } catch {
                throw new Error("Invalid amount format");
            }

             // Balance check
             if (delegatePowerWei > currentDppBalanceRaw) {
                 throw new Error(`Cannot delegate ${amount} DPP, you only have ${formatUnits(currentDppBalanceRaw, govTokenDecimals)}.`);
             }

            console.log(`[Mock Delegate] User ${account} delegating ${amount} DPP for pool ${selectedPool.poolId} to ${targetAddress}`);

            // *** MOCK LOGIC ***
            await new Promise(resolve => setTimeout(resolve, 600)); // Simulate transaction delay

            let newVotingPowerRaw: bigint;
            let newDppBalanceRaw: bigint;

            if (targetAddress.toLowerCase() === account.toLowerCase()) {
                // Delegating to self: Power increases, balance decreases (like locking more)
                // Assumes delegating to self *increases* usable power while decreasing the *free* balance.
                newVotingPowerRaw = currentVotingPowerRaw + delegatePowerWei;
                newDppBalanceRaw = currentDppBalanceRaw - delegatePowerWei;
                 console.log(`[Mock Delegate] Delegating to self. New Power: ${newVotingPowerRaw}, New Balance: ${newDppBalanceRaw}`);
            } else {
                // Delegating to others: Power decreases, balance decreases
                newVotingPowerRaw = currentVotingPowerRaw - delegatePowerWei;
                newDppBalanceRaw = currentDppBalanceRaw - delegatePowerWei;
                console.log(`[Mock Delegate] Delegating to other. New Power: ${newVotingPowerRaw}, New Balance: ${newDppBalanceRaw}`);
            }

            // Ensure non-negative results
            newVotingPowerRaw = newVotingPowerRaw < 0n ? 0n : newVotingPowerRaw;
            newDppBalanceRaw = newDppBalanceRaw < 0n ? 0n : newDppBalanceRaw;


            // Update mock state
            setMockVotingPowerRaw(newVotingPowerRaw);
            setMockDppBalanceRaw(newDppBalanceRaw);

            showSnackbar(`Mock Delegation successful to ${targetAddress}!`, 'success');
            // Don't fetch balances
            // await fetchBalances();
            return true;
            // *** END MOCK LOGIC ***

        } catch (error: any) {
             console.error(`Mock Delegation failed:`, error);
             const reason = error?.message || "Mock delegation failed.";
             showSnackbar(`Mock Delegation failed: ${reason}`, 'error');
             return false;
        } finally {
            setLoading(delegateKey, false);
        }
    }, [account, selectedPool, tokenDecimals, GOVERNANCE_TOKEN_ADDRESS, setLoading, showSnackbar]);


    // --- CORRECTED RETURN STATEMENT ---
    return { handleVoteWithRange, handleDelegate };
    // --- END CORRECTION ---
};