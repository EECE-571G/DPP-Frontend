// src/hooks/useGovernanceActions.ts
import { useCallback } from 'react';
import { ethers, parseUnits, ZeroAddress, isAddress, Contract } from 'ethers'; // Ethers v6 imports
import { useAuthContext } from '../contexts/AuthContext';
import { useLoadingContext } from '../contexts/LoadingContext';
import { useSnackbarContext } from '../contexts/SnackbarProvider';
import { useBalancesContext } from '../contexts/BalancesContext';
import {
    GOVERNANCE_CONTRACT_ADDRESS,
    GOVERNANCE_TOKEN_ADDRESS,
    EXPLORER_URL_BASE,
    TARGET_NETWORK_CHAIN_ID
} from '../constants';
import Erc20ABI from '../abis/ERC20.json'; // Use generic ERC20 for gov token delegate
// !!! IMPORT YOUR ACTUAL GOVERNANCE ABI !!!
// import GovernanceABI from '../abis/YourGovernanceContract.json';

// !!! PASTE YOUR ACTUAL GOVERNANCE ABI HERE !!!
const GovernanceABI: any[] | ethers.Interface | ethers.InterfaceAbi = [
 /* e.g.,
    "function vote(uint256 proposalId, int256 lowerBound, int256 upperBound, uint256 votingPower)"
 */
]; // <<< PASTE ABI ARRAY

// !!! PASTE YOUR ACTUAL GOVERNANCE TOKEN ABI if different from standard ERC20 (e.g., for delegate) !!!
const GovTokenABI = Erc20ABI; // Assume standard ERC20 delegate for now


export const useGovernanceActions = () => {
    const { signer, account, network } = useAuthContext();
    const { tokenDecimals, fetchBalances } = useBalancesContext();
    const { setLoading } = useLoadingContext();
    const { showSnackbar } = useSnackbarContext();

    const handleVoteWithRange = useCallback(async (proposalId: number, lower: number, upper: number, power: number): Promise<boolean> => {
        if (!signer || !account || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
            showSnackbar('Cannot vote: Wallet not connected or wrong network.', 'error'); return false;
        }
        if (GOVERNANCE_CONTRACT_ADDRESS === ZeroAddress) { // Ethers v6 ZeroAddress
            showSnackbar('Governance contract address not configured.', 'error'); return false;
        }
         if (!GovernanceABI || GovernanceABI.length === 0) {
            showSnackbar('Governance ABI is missing.', 'error'); return false;
        }
        if (power <= 0) {
             showSnackbar('Voting power must be positive.', 'warning'); return false;
        }
        // Add validation for lower/upper bounds if needed

        const voteKey = `vote_${proposalId}`;
        setLoading(voteKey, true);

        try {
            const governanceContract = new Contract(GOVERNANCE_CONTRACT_ADDRESS, GovernanceABI, signer); // Ethers v6 Contract
            const govTokenDecimals = tokenDecimals[GOVERNANCE_TOKEN_ADDRESS] ?? 18;
            const powerWei = parseUnits(power.toString(), govTokenDecimals); // Ethers v6 parseUnits

            // *** ADJUST PARAMETER PARSING BASED ON YOUR CONTRACT ***
            // Assuming bounds are simple numbers for now, convert if needed
            const lowerBoundParam = BigInt(Math.round(lower)); // Example conversion to BigInt
            const upperBoundParam = BigInt(Math.round(upper)); // Example conversion to BigInt

            console.log(`Voting on proposal ${proposalId} with range [${lower}, ${upper}], power ${power}`);
            // *** ADJUST FUNCTION NAME AND PARAMETERS ***
            const tx = await governanceContract.vote(proposalId, lowerBoundParam, upperBoundParam, powerWei);

             let message = `Vote transaction submitted`;
              if (EXPLORER_URL_BASE) {
                  message = `${message}. Waiting for confirmation...`;
              } else {
                  message = `${message}: ${tx.hash}. Waiting...`;
              }
            showSnackbar(message, 'info');

            const receipt = await tx.wait(1);

            if (receipt?.status === 1) {
                 let successMessage = `Vote on proposal #${proposalId} successful!`;
                 showSnackbar(successMessage, 'success');
                await fetchBalances(); // Refresh balances
                // Optionally refresh proposals list: find a way to trigger fetchGovernanceData
                return true;
            } else {
                throw new Error('Vote transaction failed.');
            }

        } catch (error: any) {
            console.error(`Vote operation failed for proposal ${proposalId}:`, error);
            const reason = error?.reason || error?.data?.message?.replace('execution reverted: ', '') || error.message || "Vote failed.";
            showSnackbar(`Vote failed: ${reason}`, 'error');
            return false;
        } finally {
            setLoading(voteKey, false);
        }
    }, [signer, account, network, tokenDecimals, fetchBalances, setLoading, showSnackbar]); // Dependencies

    const handleDelegate = useCallback(async (targetAddress: string, amount: number): Promise<boolean> => {
        if (!signer || !account || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
            showSnackbar('Cannot delegate: Wallet not connected or wrong network.', 'error'); return false;
        }
        if (GOVERNANCE_TOKEN_ADDRESS === ZeroAddress) { // Ethers v6
             showSnackbar('Governance token address not configured.', 'error'); return false;
        }
         if (!GovTokenABI || GovTokenABI.length === 0) { // Check Gov Token ABI
            showSnackbar('Governance Token ABI is missing.', 'error'); return false;
        }
         if (!isAddress(targetAddress)) { // Ethers v6
             showSnackbar('Invalid target delegate address.', 'error'); return false;
         }

        const delegateKey = 'delegateVotes';
        setLoading(delegateKey, true);

        try {
            // Use Ethers v6 Contract
            const govTokenContract = new Contract(GOVERNANCE_TOKEN_ADDRESS, GovTokenABI, signer);

            console.log(`Delegating votes to ${targetAddress}`);
            // *** ADJUST FUNCTION NAME IF DIFFERENT *** (e.g., delegate(address))
            const tx = await govTokenContract.delegate(targetAddress);

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
    }, [signer, account, network, fetchBalances, setLoading, showSnackbar]); // Dependencies


    // Adjust return based on function signature changes
    return { handleVoteWithRange, handleDelegate };
};