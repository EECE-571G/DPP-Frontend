// src/hooks/useGovernanceActions.ts
import React, { useCallback } from 'react';
import { isAddress, parseUnits, formatUnits } from 'ethers';
import { useAuthContext } from '../contexts/AuthContext';
import { useLoadingContext } from '../contexts/LoadingContext';
import { useSnackbarContext } from '../contexts/SnackbarProvider';
import { useBalancesContext } from '../contexts/BalancesContext';
import { usePoolsContext } from '../contexts/PoolsContext';
import {
    GOVERNANCE_TOKEN_ADDRESS,
} from '../constants';

const VOTE_RANGE = 10;

export const useGovernanceActions = () => {
    const { signer, account, network } = useAuthContext();
    const { fetchBalances, tokenDecimals } = useBalancesContext();
    const { setLoading } = useLoadingContext();
    const { showSnackbar } = useSnackbarContext();
    const { selectedPool } = usePoolsContext();

    // --- HandleVoteWithRange ---
    const handleVoteWithRange = useCallback(async (
        proposalId: number,
        lower: number,
        upper: number,
        currentVotingPowerRaw: bigint,
        currentGovernanceStatus: number[],
        setMockVotingPowerRaw: React.Dispatch<React.SetStateAction<bigint | null>>,
        setMockGovernanceStatus: React.Dispatch<React.SetStateAction<number[] | null>>
    ): Promise<boolean> => {
        if (!account || !selectedPool?.poolId) {
            showSnackbar('Wallet or Pool ID missing.', 'error');
            return false;
        }

        // Validate bounds
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

        const voteKey = `castVote_${proposalId}`;
        setLoading(voteKey, true);

        try {
            console.log(`[Vote] User ${account} voting on pool ${selectedPool.poolId} with range [${lowerSlotInt8}, ${upperSlotInt8}) using power ${currentVotingPowerRaw.toString()}`);

            await new Promise(resolve => setTimeout(resolve, 800));

            const govTokenDecimals = tokenDecimals[GOVERNANCE_TOKEN_ADDRESS] ?? 18;

            // Calculate distribution
            const slotsAffected = upperSlotInt8 - lowerSlotInt8;
            let powerPerSlotRaw = 0n;
            // Use the *current* voting power to calculate distribution
            if (slotsAffected > 0 && currentVotingPowerRaw > 0n) {
                powerPerSlotRaw = currentVotingPowerRaw / BigInt(slotsAffected);
            }
            const powerPerSlotNum = parseFloat(formatUnits(powerPerSlotRaw, govTokenDecimals));

            // Update chart data
            const newGovernanceStatus = [...currentGovernanceStatus];
            for (let i = lowerSlotInt8; i < upperSlotInt8; i++) {
                const chartIndex = i + VOTE_RANGE;
                if (chartIndex >= 0 && chartIndex < newGovernanceStatus.length) {
                    newGovernanceStatus[chartIndex] += powerPerSlotNum;
                } else {
                    console.warn(`[Vote] Calculated chart index ${chartIndex} out of bounds for slot ${i}`);
                }
            }

            // Update the state via setters
            setMockGovernanceStatus(newGovernanceStatus);
            console.log(`[Vote] Vote cast, voting power remains: ${currentVotingPowerRaw.toString()}`);


            showSnackbar(`Vote successful for pool ${selectedPool.name}!`, 'success');
            return true;
            // *** END LOGIC ***

        } catch (error: any) {
            console.error(`Vote operation failed for pool ${selectedPool.poolId}:`, error);
            const reason = error?.message || "Vote failed.";
            showSnackbar(`Vote failed: ${reason}`, 'error');
            return false;
        } finally {
            setLoading(voteKey, false);
        }
    }, [account, selectedPool, tokenDecimals, GOVERNANCE_TOKEN_ADDRESS, setLoading, showSnackbar]);


    // --- handleDelegate ---
    const handleDelegate = useCallback(async (
        targetAddress: string,
        amount: number,
        // --- State and setters ---
        currentVotingPowerRaw: bigint,
        currentDppBalanceRaw: bigint,
        setMockVotingPowerRaw: React.Dispatch<React.SetStateAction<bigint | null>>,
        setMockDppBalanceRaw: React.Dispatch<React.SetStateAction<bigint | null>>
        // --- End args ---
    ): Promise<boolean> => {
        if (!account || !selectedPool?.poolId) {
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

             if (delegatePowerWei > currentDppBalanceRaw) {
                 throw new Error(`Cannot delegate ${amount} DPP, you only have ${formatUnits(currentDppBalanceRaw, govTokenDecimals)}.`);
             }

            console.log(`[Delegate] User ${account} delegating ${amount} DPP for pool ${selectedPool.poolId} to ${targetAddress}`);

            // *** LOGIC ***
            await new Promise(resolve => setTimeout(resolve, 600));

            let newVotingPowerRaw: bigint;
            let newDppBalanceRaw: bigint;

            if (targetAddress.toLowerCase() === account.toLowerCase()) {
                newVotingPowerRaw = currentVotingPowerRaw + delegatePowerWei;
                newDppBalanceRaw = currentDppBalanceRaw - delegatePowerWei;
                 console.log(`[Delegate] Delegating to self. New Power: ${newVotingPowerRaw}, New Balance: ${newDppBalanceRaw}`);
            } else {
                newVotingPowerRaw = currentVotingPowerRaw - delegatePowerWei;
                newDppBalanceRaw = currentDppBalanceRaw - delegatePowerWei;
                console.log(`[Delegate] Delegating to other. New Power: ${newVotingPowerRaw}, New Balance: ${newDppBalanceRaw}`);
            }

            newVotingPowerRaw = newVotingPowerRaw < 0n ? 0n : newVotingPowerRaw;
            newDppBalanceRaw = newDppBalanceRaw < 0n ? 0n : newDppBalanceRaw;

            setMockVotingPowerRaw(newVotingPowerRaw);
            setMockDppBalanceRaw(newDppBalanceRaw);

            showSnackbar(`Delegation successful to ${targetAddress}!`, 'success');
            return true;
            // *** END LOGIC ***

        } catch (error: any) {
             console.error(`Delegation failed:`, error);
             const reason = error?.message || "delegation failed.";
             showSnackbar(`Delegation failed: ${reason}`, 'error');
             return false;
        } finally {
            setLoading(delegateKey, false);
        }
    }, [account, selectedPool, tokenDecimals, GOVERNANCE_TOKEN_ADDRESS, setLoading, showSnackbar]);

    return { handleVoteWithRange, handleDelegate };
};