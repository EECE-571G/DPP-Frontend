// src/contexts/GovernanceContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
  useCallback,
} from 'react';
import { ethers, ZeroAddress, formatUnits, Contract } from 'ethers'; // Ethers v6 imports
import { Proposal, ProposalStatus } from '../types'; // Added ProposalStatus
import { useAuthContext } from './AuthContext';
import { GOVERNANCE_CONTRACT_ADDRESS, TARGET_NETWORK_CHAIN_ID } from '../constants';
// !!! IMPORT YOUR ACTUAL GOVERNANCE ABI !!!
// import GovernanceABI from '../abis/YourGovernanceContract.json';

interface GovernanceMetaData {
  id: string;
  time: string;
  stage: string;
  // Add other relevant fields from your contract if needed
}

interface GovernanceContextType {
  proposals: Proposal[];
  governanceStatus: any;
  metaData: GovernanceMetaData | null;
  isLoadingProposals: boolean;
  isLoadingGovernanceData: boolean;
  errorProposals: string | null;
  errorGovernanceData: string | null;
  fetchGovernanceData: () => Promise<void>;
}

const GovernanceContext = createContext<GovernanceContextType | undefined>(undefined);

export const useGovernanceContext = () => {
  const context = useContext(GovernanceContext);
  if (!context) {
      throw new Error('useGovernanceContext must be used within a GovernanceProvider');
  }
  return context;
};

interface GovernanceProviderProps {
  children: ReactNode;
}

// !!! PASTE YOUR ACTUAL GOVERNANCE ABI HERE !!!
const GovernanceABI: any[] | ethers.Interface | ethers.InterfaceAbi = [
/* e.g.,
  "function proposalCount() view returns (uint256)",
  "function proposals(uint256 proposalId) view returns (tuple(address proposer, uint256 targetValue, string description, uint256 endBlock, uint8 state, uint256 totalVotes))",
  "function state(uint256 proposalId) view returns (uint8)"
*/
]; // <<< PASTE YOUR GOVERNANCE ABI ARRAY HERE

export const GovernanceProvider: React.FC<GovernanceProviderProps> = ({ children }) => {
  const { provider, network } = useAuthContext(); // Use read-only provider

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [governanceStatus, setGovernanceStatus] = useState<any>([]);
  const [metaData, setMetaData] = useState<GovernanceMetaData | null>(null);
  const [isLoadingProposals, setIsLoadingProposals] = useState<boolean>(false); // Default false
  const [isLoadingGovernanceData, setIsLoadingGovernanceData] = useState<boolean>(false); // Default false
  const [errorProposals, setErrorProposals] = useState<string | null>(null);
  const [errorGovernanceData, setErrorGovernanceData] = useState<string | null>(null);

  // Helper to map contract status enum/number to frontend string status
  const mapContractStatus = (contractStatus: number | bigint | undefined): ProposalStatus => {
      if (contractStatus === undefined) return 'pending'; // Handle undefined case
      const statusNum = Number(contractStatus);
      // *** Adjust mapping based on your contract's state enum ***
      switch (statusNum) {
          case 0: return 'pending'; // Example: Pending
          case 1: return 'active';  // Example: Active
          case 2: return 'succeeded'; // Example: Succeeded (not executed)
          case 3: return 'defeated'; // Example: Defeated
          case 4: return 'executed'; // Example: Executed
          // Add cases for Canceled, Expired, Queued if applicable
          default: return 'pending';
      }
  };

  const fetchGovernanceData = useCallback(async () => {
      if (!provider || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
          // console.log("Skipping governance fetch: Prerequisites not met.");
          setProposals([]); setGovernanceStatus([]); setMetaData(null);
          setErrorProposals(null); setErrorGovernanceData(null);
          setIsLoadingProposals(false); setIsLoadingGovernanceData(false);
          return;
      }

      // Use Ethers v6 ZeroAddress
      if (GOVERNANCE_CONTRACT_ADDRESS === ZeroAddress) {
           setErrorProposals("Governance contract address not configured.");
           setErrorGovernanceData("Governance contract address not configured.");
           setIsLoadingProposals(false); setIsLoadingGovernanceData(false);
           setProposals([]); setGovernanceStatus([]); setMetaData(null);
           return;
       }

      if (!GovernanceABI || GovernanceABI.length === 0) {
          setErrorProposals("Governance ABI is missing or empty.");
          setErrorGovernanceData("Governance ABI is missing or empty.");
          setIsLoadingProposals(false); setIsLoadingGovernanceData(false);
          setProposals([]); setGovernanceStatus([]); setMetaData(null);
          return;
      }


      setIsLoadingProposals(true); setIsLoadingGovernanceData(true);
      setErrorProposals(null); setErrorGovernanceData(null);

      try {
          // Use Ethers v6 Contract
          const governanceContract = new Contract(GOVERNANCE_CONTRACT_ADDRESS, GovernanceABI, provider);

          // --- Fetch Metadata & Status ---
          setIsLoadingGovernanceData(true); // Explicitly set loading for this part
          try {
               // Example: Fetch proposal count (adjust function name)
               const proposalCountBigInt = await governanceContract.proposalCount();
               const proposalCount = Number(proposalCountBigInt);

               // Fetch other relevant metadata
               setMetaData({ // Populate with real data
                   id: `Count: ${proposalCount}`, // Example using count
                   time: 'N/A', // Replace if contract provides timing info
                   stage: 'N/A', // Replace if contract provides stage info
               });
               setGovernanceStatus([]); // Populate if applicable

          } catch (metaErr: any) {
               console.error("Failed to fetch governance metadata/status:", metaErr);
               setErrorGovernanceData(`Failed to load governance metadata: ${metaErr.message || String(metaErr)}`);
          } finally {
              setIsLoadingGovernanceData(false);
          }


          // --- Fetch Proposals ---
          setIsLoadingProposals(true); // Explicitly set loading for this part
           try {
               // Determine proposal IDs to fetch (e.g., iterate from 1 up to proposalCount)
               const proposalCountBigInt = await governanceContract.proposalCount(); // Fetch again or reuse from above
               const count = Number(proposalCountBigInt);
               const proposalIdsToFetch = Array.from({ length: count }, (_, i) => i + 1); // Fetch IDs 1 to count

               if (proposalIdsToFetch.length > 0) {
                  const proposalPromises = proposalIdsToFetch.map(async (id) => {
                      try {
                          // Adjust function name and parsing based on your contract
                          const proposalData = await governanceContract.proposals(id); // Fetch raw data

                          // --- Parse proposalData (EXAMPLE - ADJUST TO YOUR STRUCT) ---
                           const parsedProposal: Proposal = {
                               id: id,
                               poolId: 1, // Assuming global proposals or fetch pool ID if available
                               proposer: proposalData.proposer ?? ZeroAddress,
                               // Adjust parsing based on how price/value is stored (e.g., decimals)
                               proposedDesiredPrice: proposalData.targetValue ? parseFloat(formatUnits(proposalData.targetValue, 8)) : 0, // Example: 8 decimals
                               description: proposalData.description ?? `Proposal ${id}`,
                               endBlock: proposalData.endBlock ? Number(proposalData.endBlock) : undefined,
                               // Use helper to map contract state enum to string status
                               status: mapContractStatus(proposalData.state),
                               // Adjust parsing for votes (e.g., decimals of vDPP token)
                               votingPowerCommitted: proposalData.totalVotes ? parseFloat(formatUnits(proposalData.totalVotes, 18)) : 0, // Example: 18 decimals
                           };
                          return parsedProposal;
                      } catch (propErr) {
                          console.error(`Failed to fetch proposal ${id}:`, propErr);
                          return null;
                      }
                  });
                  const results = await Promise.all(proposalPromises);
                  setProposals(results.filter((p): p is Proposal => p !== null).reverse()); // Reverse to show latest first
               } else {
                   setProposals([]); // No proposals found
               }


           } catch (propErr: any) {
               console.error("Failed to fetch proposals:", propErr);
               setErrorProposals(`Failed to load proposals: ${propErr.message || String(propErr)}`);
               setProposals([]);
           } finally {
               setIsLoadingProposals(false);
           }

      } catch (err: any) {
          console.error('Failed to initialize governance contract:', err);
          const initErrorMsg = `Initialization error: ${err.message || String(err)}`;
          setErrorProposals(initErrorMsg);
          setErrorGovernanceData(initErrorMsg);
          setProposals([]); setGovernanceStatus([]); setMetaData(null);
          setIsLoadingProposals(false); setIsLoadingGovernanceData(false);
      }
  }, [provider, network]); // Dependencies

  useEffect(() => {
      // Trigger fetch only when provider and correct network are available
      if (provider && network?.chainId === TARGET_NETWORK_CHAIN_ID) {
          fetchGovernanceData();
      } else {
           // Clear data if prerequisites are lost
          setProposals([]); setGovernanceStatus([]); setMetaData(null);
          setErrorProposals(null); setErrorGovernanceData(null);
          setIsLoadingProposals(false); setIsLoadingGovernanceData(false);
      }
  }, [provider, network, fetchGovernanceData]);

  const contextValue = useMemo(
      () => ({
          proposals,
          governanceStatus,
          metaData,
          isLoadingProposals,
          isLoadingGovernanceData,
          errorProposals,
          errorGovernanceData,
          fetchGovernanceData,
      }),
      [
          proposals,
          governanceStatus,
          metaData,
          isLoadingProposals,
          isLoadingGovernanceData,
          errorProposals,
          errorGovernanceData,
          fetchGovernanceData,
      ]
  );

  return (
      <GovernanceContext.Provider value={contextValue}>
          {children}
      </GovernanceContext.Provider>
  );
};