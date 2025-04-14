// src/contexts/BalancesContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import { isAddress, ZeroAddress, formatUnits, Contract } from 'ethers'; // Ethers v6 imports
import { useAuthContext } from './AuthContext';
import { RELEVANT_TOKEN_ADDRESSES, TARGET_NETWORK_CHAIN_ID } from '../constants';
import Erc20ABI from '../abis/ERC20.json';

interface BalancesContextType {
  userBalances: Record<string, string>; // Token Address -> Formatted Balance String
  userBalancesRaw: Record<string, bigint>; // Token Address -> Raw BigInt Balance
  tokenDecimals: Record<string, number>; // Token Address -> Decimals
  tokenSymbols: Record<string, string>; // Token Address -> Symbol
  isLoadingBalances: boolean;
  errorBalances: string | null;
  fetchBalances: () => Promise<void>;
}

const BalancesContext = createContext<BalancesContextType | undefined>(undefined);

export const useBalancesContext = () => {
  const context = useContext(BalancesContext);
  if (!context) {
      throw new Error('useBalancesContext must be used within a BalancesProvider');
  }
  return context;
};

interface BalancesProviderProps {
  children: ReactNode;
}

export const BalancesProvider: React.FC<BalancesProviderProps> = ({ children }) => {
  const { signer, account, network } = useAuthContext();
  const [userBalances, setUserBalances] = useState<Record<string, string>>({});
  const [userBalancesRaw, setUserBalancesRaw] = useState<Record<string, bigint>>({});
  const [tokenDecimals, setTokenDecimals] = useState<Record<string, number>>({});
  const [tokenSymbols, setTokenSymbols] = useState<Record<string, string>>({});
  const [isLoadingBalances, setIsLoadingBalances] = useState<boolean>(false); // Default to false, set true on fetch attempt
  const [errorBalances, setErrorBalances] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
      // Use signer for balance checks as it implies connection and account
      if (!signer || !account || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
          // console.log("Skipping balance fetch: Prerequisites not met.");
          setUserBalances({});
          setUserBalancesRaw({});
          setTokenDecimals({});
          setTokenSymbols({});
          setErrorBalances(null);
          setIsLoadingBalances(false);
          return;
      }

      console.log(`Fetching balances for ${account} on network ${network.chainId}...`);
      setIsLoadingBalances(true); // Set loading true ONLY when attempting fetch
      setErrorBalances(null);

      const balances: Record<string, string> = {};
      const rawBalances: Record<string, bigint> = {};
      const decimalsMap: Record<string, number> = {};
      const symbolsMap: Record<string, string> = {};
      let fetchFailed = false;

      try {
          const promises = RELEVANT_TOKEN_ADDRESSES.map(async (tokenAddress) => {
              // Use Ethers v6 isAddress and ZeroAddress
              if (!isAddress(tokenAddress) || tokenAddress === ZeroAddress) {
                  console.warn(`Skipping invalid or zero address: ${tokenAddress}`);
                  return;
              }
              try {
                  // Use Ethers v6 Contract
                  const tokenContract = new Contract(tokenAddress, Erc20ABI, signer);

                  console.log(`Fetching balance for token: ${tokenAddress} for account: ${account}`); 

                  const [balanceResult, decimalsResult, symbolResult] = await Promise.allSettled([
                      tokenContract.balanceOf(account),
                      tokenContract.decimals().catch(() => 18n), // Default decimal bigint
                      tokenContract.symbol().catch(() => `UNK_${tokenAddress.slice(0, 6)}`),
                  ]);

                  const balance = balanceResult.status === 'fulfilled' ? (balanceResult.value as bigint) : 0n;
                  console.log(`Raw balance fetched for ${tokenAddress}:`, balance.toString()); // <<< ADD LOG
                  // Decimals need explicit check for bigint before Number()
                  const decimalsBigInt = decimalsResult.status === 'fulfilled' ? (decimalsResult.value as bigint) : 18n;
                  const decimals = Number(decimalsBigInt); // Convert bigint decimals to number
                  const symbol = symbolResult.status === 'fulfilled' ? (symbolResult.value as string) : `UNK_${tokenAddress.slice(0, 6)}`;

                  rawBalances[tokenAddress] = balance;
                  // Use Ethers v6 formatUnits
                  balances[tokenAddress] = formatUnits(balance, decimals);
                  console.log(`Formatted balance for ${tokenAddress}:`, balances[tokenAddress]);
                  decimalsMap[tokenAddress] = decimals;
                  symbolsMap[tokenAddress] = symbol;

              } catch (tokenError: any) {
                  console.error(`ERROR fetching data for token ${tokenAddress}:`, tokenError);
                  fetchFailed = true;
                  rawBalances[tokenAddress] = 0n;
                  balances[tokenAddress] = '0.0';
                  decimalsMap[tokenAddress] = 18; // Default decimals on error
                  symbolsMap[tokenAddress] = `ERR_${tokenAddress.slice(0,6)}`;
              }
          });

          await Promise.all(promises);

          setUserBalances(balances);
          setUserBalancesRaw(rawBalances);
          setTokenDecimals(decimalsMap);
          setTokenSymbols(symbolsMap);

          if (fetchFailed) {
              setErrorBalances('Failed to load some token balances. Check console.');
          }

      } catch (err: any) {
          console.error('Unexpected error fetching balances:', err);
          setErrorBalances('Failed to load balances.');
          setUserBalances({});
          setUserBalancesRaw({});
          setTokenDecimals({});
          setTokenSymbols({});
      } finally {
          setIsLoadingBalances(false);
      }
  }, [signer, account, network]); // Dependencies

  useEffect(() => {
      // Trigger fetch only when signer, account, and correct network are available
      if (signer && account && network?.chainId === TARGET_NETWORK_CHAIN_ID) {
          fetchBalances();
      } else {
          // Clear balances if prerequisites are lost
           setUserBalances({});
           setUserBalancesRaw({});
           setTokenDecimals({});
           setTokenSymbols({});
           setErrorBalances(null);
           setIsLoadingBalances(false);
      }
  }, [signer, account, network, fetchBalances]); // Add fetchBalances dependency


  const contextValue = useMemo(
      () => ({
          userBalances,
          userBalancesRaw,
          tokenDecimals,
          tokenSymbols,
          isLoadingBalances,
          errorBalances,
          fetchBalances,
      }),
      [userBalances, userBalancesRaw, tokenDecimals, tokenSymbols, isLoadingBalances, errorBalances, fetchBalances]
  );

  return (
      <BalancesContext.Provider value={contextValue}>
          {children}
      </BalancesContext.Provider>
  );
};