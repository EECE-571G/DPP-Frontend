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
    GOVERNANCE_TOKEN_ADDRESS, // No longer needed for vote, maybe for delegate
    EXPLORER_URL_BASE,
    TARGET_NETWORK_CHAIN_ID
} from '../constants';
import Erc20ABI from '../abis/ERC20.json';
// Import the ABI that contains the 'castVote' function (likely DesiredPricePool)
import GovernanceABI from '../abis/DesiredPricePool.json'; // <<< USE CORRECT ABI

// Assume standard ERC20 delegate for GovToken for now
const GovTokenABI = Erc20ABI;

// Vote Range Constant from Poll.sol (for validation)
const VOTE_RANGE = 10;


export const useGovernanceActions = () => {
    const { signer, account, network } = useAuthContext();
    const { fetchBalances } = useBalancesContext(); // Keep for balance refresh
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

            // Validate against contract constraints (-VOTE_RANGE to VOTE_RANGE + 1)
             if (lowerSlotInt8 < -VOTE_RANGE || upperSlotInt8 > VOTE_RANGE + 1 || lowerSlotInt8 >= upperSlotInt8) {
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

            console.log(`Voting on pool ${poolIdBytes32} with range [${lowerSlotInt8}, ${upperSlotInt8}] using full power.`);

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


    // --- Delegate Function (remains largely the same) ---
    const handleDelegate = useCallback(async (targetAddress: string, amount: number): Promise<boolean> => {
        // ... (Keep the existing implementation for delegation) ...
        if (!signer || !account || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
            showSnackbar('Cannot delegate: Wallet not connected or wrong network.', 'error'); return false;
        }
        const governanceTokenAddress = GOVERNANCE_TOKEN_ADDRESS; // Get from constants
         if (governanceTokenAddress === ZeroAddress) {
             showSnackbar('Governance token address not configured.', 'error'); return false;
         }
          if (!GovTokenABI || GovTokenABI.length === 0) {
             showSnackbar('Governance Token ABI is missing.', 'error'); return false;
         }
          if (!isAddress(targetAddress)) {
              showSnackbar('Invalid target delegate address.', 'error'); return false;
          }
         if (amount <= 0) {
              showSnackbar('Delegation amount must be positive.', 'warning'); return false;
          }

        // Use the correct ABI for the token's delegate function
        const govTokenContract = new Contract(governanceTokenAddress, GovTokenABI, signer);
        const delegateKey = 'delegateVotes';
        setLoading(delegateKey, true);

        try {
            // Check if the token uses `delegate(address)` or `delegate(address, uint256)`
            // Assuming `delegate(address to, uint128 power)` based on DesiredPrice.sol interface usage
            // We need to parse the amount using the *governance token's decimals*
            const decimals = 18; // Assuming 18 for vDPP, adjust if needed
            const powerWei = parseUnits(amount.toString(), decimals);

            console.log(`Delegating ${amount} (${powerWei.toString()} wei) votes to ${targetAddress}`);
            const tx = await govTokenContract.delegateVote(selectedPool?.poolId, targetAddress, powerWei); // Assuming DesiredPrice interface

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
                 await fetchBalances(); // Re-fetch balances
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
        // Added selectedPool as a dependency if needed for delegateVote
    }, [signer, account, network, selectedPool, fetchBalances, setLoading, showSnackbar]);


    return { handleVoteWithRange, handleDelegate };
};