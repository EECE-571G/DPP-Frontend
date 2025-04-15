// src/hooks/useLiquidityActions.ts
import { useCallback } from 'react';
import { ethers, parseUnits, MaxUint256, ZeroAddress, isAddress, Contract, Interface } from 'ethers';
import { useAuthContext } from '../contexts/AuthContext';
import { useBalancesContext } from '../contexts/BalancesContext';
import { useLoadingContext } from '../contexts/LoadingContext';
import { useSnackbarContext } from '../contexts/SnackbarProvider';
import { usePoolsContext } from '../contexts/PoolsContext';
import {
    POSITION_MANAGER_ADDRESS,
    DESIRED_PRICE_POOL_HELPER_ADDRESS,
    EXPLORER_URL_BASE,
    TARGET_NETWORK_CHAIN_ID,
} from '../constants';
import DesiredPricePoolHelperABI from '../abis/DesiredPricePoolHelper.json';
import Erc20ABI from '../abis/ERC20.json';
import { addTokenIdToHistory } from '../utils/localStorageUtils'; // Import utility

// Local storage key
const LS_TOKEN_ID = 'liquidity_tokenId'; // Shared key for add/remove history
const ERC721_TRANSFER_EVENT = "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)";

export const useLiquidityActions = () => {
    const { signer, account, network } = useAuthContext();
    const { fetchBalances, tokenDecimals, tokenSymbols } = useBalancesContext();
    const { setLoading } = useLoadingContext();
    const { showSnackbar } = useSnackbarContext();
    const { selectedPool } = usePoolsContext();

    const checkAndRequestApproval = useCallback(async (tokenAddress: string): Promise<boolean> => {
        if (!signer || !account || !tokenAddress || tokenAddress === ZeroAddress) {
            console.error("Approval check prerequisites failed");
            showSnackbar("Approval failed: Wallet/Token missing.", "error");
            return false;
        }
         if (DESIRED_PRICE_POOL_HELPER_ADDRESS === ZeroAddress) {
             showSnackbar("Helper contract address not configured for approval.", "error");
             return false;
         }
         try {
             const tokenContract = new Contract(tokenAddress, Erc20ABI, signer);
             const currentAllowance = await tokenContract.allowance(account, DESIRED_PRICE_POOL_HELPER_ADDRESS);

             // Check if allowance is less than a very large number (close to MaxUint256)
             if (currentAllowance < (MaxUint256 / 2n)) {
                const symbol = tokenSymbols[tokenAddress] ?? 'token';
                showSnackbar(`Max approval required for ${symbol} by Helper Contract. Please confirm.`, 'info');
                const loadingKey = `approve_liq_${tokenAddress}`;
                setLoading(loadingKey, true);

                 const tx = await tokenContract.approve(DESIRED_PRICE_POOL_HELPER_ADDRESS, MaxUint256);
                 let message = `Approval transaction submitted`;
                 if (EXPLORER_URL_BASE) { message += `. Waiting...`; } else { message += `: ${tx.hash}. Waiting...`; }
                 showSnackbar(message, 'info');
                 const receipt = await tx.wait(1);
                 setLoading(loadingKey, false);
                 if (receipt?.status !== 1) throw new Error('Approval transaction failed.');
                 showSnackbar('Approval successful!', 'success');
             } else {
                console.log(`Allowance sufficient for ${tokenAddress} by helper ${DESIRED_PRICE_POOL_HELPER_ADDRESS}`);
             }
             return true;
         } catch (error: any) {
             console.error(`Approval failed for ${tokenAddress}:`, error);
             const message = error?.reason || error?.data?.message || error.message || "Approval failed.";
             showSnackbar(`Approval failed: ${message}`, 'error');
             setLoading(`approve_liq_${tokenAddress}`, false);
             return false;
         }
     }, [signer, account, tokenSymbols, showSnackbar, setLoading]);

    const handleMintPosition = useCallback(async (lowerTick: number, upperTick: number, liquidityStr: string): Promise<boolean> => {
        if (!signer || !account || !selectedPool?.poolKey || !selectedPool.tokenA_Address || !selectedPool.tokenB_Address || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
             showSnackbar('Cannot mint: Wallet/Pool/Network issue.', 'error'); return false;
         }
         if (DESIRED_PRICE_POOL_HELPER_ADDRESS === ZeroAddress) {
              showSnackbar("Helper contract address not configured.", "error"); return false;
          }
         if (POSITION_MANAGER_ADDRESS === ZeroAddress) {
             showSnackbar("Position Manager address not configured.", "error"); return false;
         }
         if (lowerTick >= upperTick) {
             showSnackbar("Lower tick must be less than upper tick.", "warning"); return false;
         }

        let liquidityWei: bigint;
        try {
            liquidityWei = parseUnits(liquidityStr, 0); // Liquidity is unitless, decimals=0
            if (liquidityWei <= 0n) {
                showSnackbar('Liquidity amount must be positive.', 'warning'); return false;
            }
        } catch (e: any) {
            showSnackbar(`Invalid liquidity amount entered: ${e.message}`, 'error'); return false;
        }

        const { poolKey, tokenA_Address, tokenB_Address } = selectedPool;

        try {
            setLoading('mintPosition_approve', true);
             const approvedA = tokenA_Address === ZeroAddress ? true : await checkAndRequestApproval(tokenA_Address);
             const approvedB = tokenB_Address === ZeroAddress ? true : await checkAndRequestApproval(tokenB_Address);
            setLoading('mintPosition_approve', false);
             if (!approvedA || !approvedB) {
                 showSnackbar('One or more approvals failed or were rejected.', 'error');
                 return false;
             }

            setLoading('mintPosition', true);
            showSnackbar('Preparing mint position transaction...', 'info');

            const helperContract = new Contract(DESIRED_PRICE_POOL_HELPER_ADDRESS, DesiredPricePoolHelperABI, signer);
            const txValue = 0n; // Do not send ETH value for helper mint

            console.log(`[useLiquidityActions] Calling helper.mint: key=${JSON.stringify(poolKey)}, lower=${lowerTick}, upper=${upperTick}, liq=${liquidityWei.toString()}`);

            const tx = await helperContract.mint(
                poolKey,
                lowerTick,
                upperTick,
                liquidityWei
            );

            let message = `Mint Position tx submitted`;
             if (EXPLORER_URL_BASE) { message += `. Waiting...`; } else { message += `: ${tx.hash}. Waiting...`; }
            showSnackbar(message, 'info');

            const receipt = await tx.wait(1);
            console.log('Mint Receipt:', JSON.stringify(receipt, null, 2)); // Detailed logging

            if (receipt?.status === 1) {
                let mintedTokenId = "Unknown";
                 const erc721Interface = new Interface([ERC721_TRANSFER_EVENT]);

                 if (receipt.logs && POSITION_MANAGER_ADDRESS !== ZeroAddress) {
                    const lowerCasePosM = POSITION_MANAGER_ADDRESS.toLowerCase();

                    for (const log of receipt.logs) {
                         if (log.address.toLowerCase() !== lowerCasePosM) {
                             continue;
                         }
                         try {
                            const parsedLog = erc721Interface.parseLog({ topics: [...log.topics], data: log.data });

                            if (parsedLog && parsedLog.name === "Transfer" && parsedLog.args.from === ZeroAddress) {
                                mintedTokenId = parsedLog.args.tokenId.toString();
                                addTokenIdToHistory(LS_TOKEN_ID, mintedTokenId); // Use utility
                                console.log("Minted Token ID found and added to history:", mintedTokenId);
                                break;
                            }
                         } catch (parseError) {
                            console.warn(`Could not parse log from Position Manager (${log.address}):`, parseError, log);
                         }
                    }
                 } else {
                    console.warn("Receipt has no logs or Position Manager address is ZeroAddress");
                 }

                if (mintedTokenId === "Unknown") {
                    console.error("Failed to extract Token ID from mint transaction logs.");
                    showSnackbar(`Position minted, but failed to retrieve Token ID. Check console/explorer. Tx: ${receipt.hash}`, 'warning');
                } else {
                    showSnackbar(`Position minted successfully! Token ID: ${mintedTokenId}`, 'success');
                }

                await fetchBalances();
                return true;
            } else {
                throw new Error('Mint position transaction failed.');
            }

        } catch (error: any) {
            console.error("Mint Position Error:", error);
            const reason = error?.reason || error?.data?.message?.replace('execution reverted: ', '') || error.message || "Mint position failed.";
            showSnackbar(`Mint Position failed: ${reason}`, 'error');
            return false;
        } finally {
            setLoading('mintPosition', false);
            setLoading('mintPosition_approve', false);
        }
    }, [signer, account, network, selectedPool, checkAndRequestApproval, fetchBalances, setLoading, showSnackbar]);

    const handleAddLiquidity = useCallback(async (tokenIdStr: string, liquidityStr: string): Promise<boolean> => {
         if (!signer || !account || !selectedPool?.poolKey || !selectedPool.tokenA_Address || !selectedPool.tokenB_Address || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
             showSnackbar('Cannot add liquidity: Wallet/Pool/Network issue.', 'error'); return false;
         }
         if (DESIRED_PRICE_POOL_HELPER_ADDRESS === ZeroAddress) {
             showSnackbar("Helper contract address not configured.", "error"); return false;
         }

         let tokenId: bigint;
         let liquidityWei: bigint;
         try {
             tokenId = BigInt(tokenIdStr);
             if (tokenId <= 0n) throw new Error("Invalid Token ID");
             liquidityWei = parseUnits(liquidityStr, 0); // Liquidity is unitless
             if (liquidityWei <= 0n) {
                 showSnackbar('Liquidity amount must be positive.', 'warning'); return false;
             }
         } catch (e: any) {
             showSnackbar(`Invalid Token ID or Liquidity amount: ${e.message}`, 'error'); return false;
         }

         const { tokenA_Address, tokenB_Address } = selectedPool;

        try {
            setLoading(`addLiquidity_approve_${tokenIdStr}`, true);
             const approvedA = tokenA_Address === ZeroAddress ? true : await checkAndRequestApproval(tokenA_Address);
             const approvedB = tokenB_Address === ZeroAddress ? true : await checkAndRequestApproval(tokenB_Address);
             setLoading(`addLiquidity_approve_${tokenIdStr}`, false);
             if (!approvedA || !approvedB) {
                 showSnackbar('One or more approvals failed or were rejected.', 'error');
                 return false;
             }

             setLoading(`addLiquidity_${tokenIdStr}`, true);
             showSnackbar(`Preparing to add liquidity to token ${tokenIdStr}...`, 'info');

             const helperContract = new Contract(DESIRED_PRICE_POOL_HELPER_ADDRESS, DesiredPricePoolHelperABI, signer);
             const txValue = 0n; // No ETH needed for helper add

            console.log(`[useLiquidityActions] Calling helper.addLiquidity: tokenId=${tokenIdStr}, liq=${liquidityWei.toString()}`);

             const tx = await helperContract.addLiquidity(tokenId, liquidityWei);

             let message = `Add Liquidity tx submitted for token ${tokenIdStr}`;
             if (EXPLORER_URL_BASE) { message += `. Waiting...`; } else { message += `: ${tx.hash}. Waiting...`; }
             showSnackbar(message, 'info');

            const receipt = await tx.wait(1);

            if (receipt?.status === 1) {
                showSnackbar(`Liquidity added successfully to token ${tokenIdStr}!`, 'success');
                addTokenIdToHistory(LS_TOKEN_ID, tokenIdStr); // Use utility
                await fetchBalances();
                return true;
            } else {
                throw new Error('Add liquidity transaction failed.');
            }

        } catch (error: any) {
             console.error(`Add Liquidity Error for token ${tokenIdStr}:`, error);
             const reason = error?.reason || error?.data?.message?.replace('execution reverted: ', '') || error.message || "Add liquidity failed.";
             showSnackbar(`Add Liquidity failed: ${reason}`, 'error');
             return false;
        } finally {
             setLoading(`addLiquidity_${tokenIdStr}`, false);
             setLoading(`addLiquidity_approve_${tokenIdStr}`, false);
        }
    }, [signer, account, network, selectedPool, checkAndRequestApproval, fetchBalances, setLoading, showSnackbar]);

    const handleRemoveLiquidity = useCallback(async (tokenIdStr: string, liquidityStr: string): Promise<boolean> => {
         if (!signer || !account || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
            showSnackbar('Cannot remove liquidity: Wallet/Network issue.', 'error'); return false;
        }
         if (DESIRED_PRICE_POOL_HELPER_ADDRESS === ZeroAddress) {
             showSnackbar("Helper contract address not configured.", "error"); return false;
         }

         let tokenId: bigint;
         let liquidityWei: bigint;
         try {
             tokenId = BigInt(tokenIdStr);
             if (tokenId <= 0n) throw new Error("Invalid Token ID");
             liquidityWei = parseUnits(liquidityStr, 0); // Liquidity is unitless
             if (liquidityWei <= 0n) {
                 showSnackbar('Liquidity amount to remove must be positive.', 'warning'); return false;
             }
         } catch (e: any) {
              showSnackbar(`Invalid Token ID or Liquidity amount: ${e.message}`, 'error'); return false;
         }

       try {
            setLoading(`removeLiquidity_${tokenIdStr}`, true);
            showSnackbar(`Preparing to remove liquidity from token ${tokenIdStr}...`, 'info');

            const helperContract = new Contract(DESIRED_PRICE_POOL_HELPER_ADDRESS, DesiredPricePoolHelperABI, signer);

            console.log(`[useLiquidityActions] Calling helper.removeLiquidity: tokenId=${tokenIdStr}, liq=${liquidityWei.toString()}`);

             // Note: ERC721 approval for PositionManager NFT needed for helper is assumed to be done elsewhere (e.g., once)
             const tx = await helperContract.removeLiquidity(tokenId, liquidityWei);

             let message = `Remove Liquidity tx submitted for token ${tokenIdStr}`;
             if (EXPLORER_URL_BASE) { message += `. Waiting...`; } else { message += `: ${tx.hash}. Waiting...`; }
             showSnackbar(message, 'info');

            const receipt = await tx.wait(1);

            if (receipt?.status === 1) {
                showSnackbar(`Liquidity removal initiated for token ${tokenIdStr}!`, 'success');
                addTokenIdToHistory(LS_TOKEN_ID, tokenIdStr); // Use utility
                await fetchBalances(); // Refresh token balances after withdrawal
                return true;
            } else {
                throw new Error('Remove liquidity transaction failed.');
            }

       } catch (error: any) {
            console.error(`Remove Liquidity Error for token ${tokenIdStr}:`, error);
            const reason = error?.reason || error?.data?.message?.replace('execution reverted: ', '') || error.message || "Remove liquidity failed.";
            showSnackbar(`Remove Liquidity failed: ${reason}`, 'error');
            return false;
       } finally {
            setLoading(`removeLiquidity_${tokenIdStr}`, false);
       }
    }, [signer, account, network, fetchBalances, setLoading, showSnackbar]); // Removed selectedPool dependency

    return { handleMintPosition, handleAddLiquidity, handleRemoveLiquidity };
};