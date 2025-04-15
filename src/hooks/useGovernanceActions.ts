// src/hooks/useGovernanceActions.ts
import { useCallback } from 'react';
import { ethers, ZeroAddress, isAddress, Contract, parseUnits } from 'ethers'; // Ethers v6 imports
import { useAuthContext } from '../contexts/AuthContext';
import { useLoadingContext } from '../contexts/LoadingContext';
import { useSnackbarContext } from '../contexts/SnackbarProvider';
import { useBalancesContext } from '../contexts/BalancesContext';
import { usePoolsContext } from '../contexts/PoolsContext'; // <<< Import Pool Context
import {
    GOVERNANCE_CONTRACT_ADDRESS,
    GOVERNANCE_TOKEN_ADDRESS, // Still needed for delegate
    EXPLORER_URL_BASE,
    TARGET_NETWORK_CHAIN_ID
} from '../constants';
// Import the ABI that contains the 'castVote' and 'delegateVote' functions (DesiredPricePool)
import GovernanceABI from '../abis/DesiredPricePool.json'; // <<< USE CORRECT ABI

// Vote Range Constant from Poll.sol (for validation)
const VOTE_RANGE = 10;

export const useGovernanceActions = () => {
    const { signer, account, network } = useAuthContext();
    const { fetchBalances, tokenDecimals } = useBalancesContext(); // Keep for balance refresh, need decimals
    const { setLoading } = useLoadingContext();
    const { showSnackbar } = useSnackbarContext();
    const { selectedPool } = usePoolsContext(); // <<< Get selected pool

    // --- Updated handleVoteWithRange ---
    const handleVoteWithRange = useCallback(async (
        // proposalId is now conceptually linked to the selectedPool
        proposalId: number, // Keep for loading key, but use selectedPool.poolId for tx
        lower: number,
        upper: number
    ): Promise<boolean> => {
        // Ensure prerequisites including selectedPool and its poolId
        if (!signer || !account || !selectedPool?.poolId || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
            showSnackbar('Cannot vote: Wallet/Pool/Network issue or pool not selected.', 'error'); return false;
        }
        if (GOVERNANCE_CONTRACT_ADDRESS === ZeroAddress) {
            showSnackbar('Governance contract address not configured.', 'error'); return false;
        }
        if (!GovernanceABI || GovernanceABI.length === 0) {
            showSnackbar('Governance ABI is missing.', 'error'); return false;
        }
        // Power check is now implicitly handled by requiring a connected account with potentially >0 balance

        // Validate and convert bounds to int8
        let lowerSlotInt8: number;
        let upperSlotInt8: number;
        try {
            lowerSlotInt8 = Math.round(lower); // Round to nearest integer
            upperSlotInt8 = Math.round(upper);

            // Validate against contract constraints (-VOTE_RANGE to VOTE_RANGE + 1 for upper exclusive)
            // and lower < upper
             if (lowerSlotInt8 < -VOTE_RANGE || lowerSlotInt8 > VOTE_RANGE || upperSlotInt8 < -VOTE_RANGE + 1 || upperSlotInt8 > VOTE_RANGE + 1 || lowerSlotInt8 >= upperSlotInt8) {
                throw new Error(`Bounds must be within [-${VOTE_RANGE}, ${VOTE_RANGE}] and lower < upper.`);
            }
        } catch (e: any) {
             showSnackbar(`Invalid bounds: ${e.message}`, 'error');
             return false;
        }


        // Use a unique key including the poolId for loading state
        const voteKey = `castVote_${selectedPool.poolId}`;
        setLoading(voteKey, true);

        try {
            const governanceContract = new Contract(GOVERNANCE_CONTRACT_ADDRESS, GovernanceABI, signer);
            const poolIdBytes32 = selectedPool.poolId; // Get the bytes32 Pool ID

            console.log(`Voting on pool ${poolIdBytes32} with range [${lowerSlotInt8}, ${upperSlotInt8}) using full power.`);

            // *** CALL THE CORRECT CONTRACT FUNCTION ***
            // Based on DesiredPrice.sol, it's castVote(PoolId, int8, int8)
            const tx = await governanceContract.castVote(poolIdBytes32, lowerSlotInt8, upperSlotInt8);

            let message = `Vote transaction submitted for pool ${selectedPool.name}`;
            if (EXPLORER_URL_BASE) {
                message = `${message}. Waiting for confirmation...`;
            } else {
                message = `${message}: ${tx.hash}. Waiting...`;
            }
            showSnackbar(message, 'info');

            const receipt = await tx.wait(1);

            if (receipt?.status === 1) {
                let successMessage = `Vote successful for pool ${selectedPool.name}!`;
                showSnackbar(successMessage, 'success');
                await fetchBalances(); // Refresh balances (might affect voting power display elsewhere)
                // TODO: Optionally refresh proposals/governance data if needed
                return true;
            } else {
                throw new Error('Vote transaction failed.');
            }

        } catch (error: any) {
            console.error(`Vote operation failed for pool ${selectedPool.poolId}:`, error);
            const reason = error?.reason || error?.data?.message?.replace('execution reverted: ', '') || error.message || "Vote failed.";
            showSnackbar(`Vote failed: ${reason}`, 'error');
            return false;
        } finally {
            setLoading(voteKey, false);
        }
        // Removed GovTokenABI dependency as it's not used here
    }, [signer, account, network, selectedPool, fetchBalances, setLoading, showSnackbar]); // Dependencies


    // --- Delegate Function (Updated to call Governance Contract) ---
    const handleDelegate = useCallback(async (targetAddress: string, amount: number): Promise<boolean> => {
        if (!signer || !account || !selectedPool?.poolId || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
             showSnackbar('Cannot delegate: Wallet/Pool/Network issue.', 'error'); return false;
         }
         const governanceContractAddress = GOVERNANCE_CONTRACT_ADDRESS;
         if (governanceContractAddress === ZeroAddress) {
             showSnackbar('Governance contract address not configured.', 'error'); return false;
         }
          if (!GovernanceABI || GovernanceABI.length === 0) {
             showSnackbar('Governance ABI is missing.', 'error'); return false;
         }
          if (!isAddress(targetAddress)) {
              showSnackbar('Invalid target delegate address.', 'error'); return false;
          }
         if (amount <= 0) {
              showSnackbar('Delegation amount must be positive.', 'warning'); return false;
          }

        // Get decimals for the governance token
        const govTokenDecimals = tokenDecimals[GOVERNANCE_TOKEN_ADDRESS] ?? 18;

        const govContract = new Contract(governanceContractAddress, GovernanceABI, signer);
        const delegateKey = 'delegateVotes';
        setLoading(delegateKey, true);

        try {
            // Parse amount using gov token decimals
            const powerWei = parseUnits(amount.toString(), govTokenDecimals);
            // Convert to uint128 for the contract call, checking for overflow
            const powerUint128 = ethers.toBigInt(powerWei); // Use ethers v6 function
             if (powerUint128 > (2n ** 128n - 1n)) {
                 throw new Error("Delegation amount exceeds uint128 limit.");
             }

            const poolIdBytes32 = selectedPool.poolId; // Get Pool ID

            console.log(`Delegating ${amount} (${powerUint128.toString()} base units) votes for pool ${poolIdBytes32} to ${targetAddress}`);
            // Call delegateVote on the Governance Contract (DesiredPricePool)
            const tx = await govContract.delegateVote(poolIdBytes32, targetAddress, powerUint128);

            let message = `Delegation transaction submitted`;
             if (EXPLORER_URL_BASE) {
                 message = `${message}. Waiting for confirmation...`;
             } else {
                 message = `${message}: ${tx.hash}. Waiting...`;
             }
            showSnackbar(message, 'info');

            const receipt = await tx.wait(1);

            if (receipt?.status === 1) {
                 let successMessage = `Successfully delegated votes to target address!`;
                 showSnackbar(successMessage, 'success');
                 await fetchBalances(); // Re-fetch balances (DPP locked balance will change)
                 // Optionally re-fetch governance data if delegation affects displayed power immediately
                 // await fetchGovernanceData(selectedPool);
                 return true;
            } else {
                 throw new Error('Delegation transaction failed.');
            }

        } catch (error: any) {
             console.error(`Delegation failed:`, error);
             const reason = error?.reason || error?.data?.message?.replace('execution reverted: ', '') || error.message || "Delegation failed.";
             showSnackbar(`Delegation failed: ${reason}`, 'error');
             return false;
        } finally {
            setLoading(delegateKey, false);
        }
    }, [signer, account, network, selectedPool, tokenDecimals, fetchBalances, setLoading, showSnackbar]);


    return { handleVoteWithRange, handleDelegate };
};