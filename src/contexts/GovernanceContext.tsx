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
  // --- Import Governance ABI ---
  import DesiredPricePoolABI from '../abis/DesiredPricePool.json'; // <<< FIX: Import the correct ABI
  
  interface GovernanceMetaData {
    id: string;
    time: string;
    stage: string;
    // Add other relevant fields from your contract if needed
  }
  
  interface GovernanceContextType {
    proposals: Proposal[];
    governanceStatus: any; // Keeping this generic for now
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
  
  // Use the imported ABI
  const GovernanceABI = DesiredPricePoolABI;
  
  export const GovernanceProvider: React.FC<GovernanceProviderProps> = ({ children }) => {
    const { provider, network } = useAuthContext(); // Use read-only provider
  
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [governanceStatus, setGovernanceStatus] = useState<any>([]); // Keeping this generic
    const [metaData, setMetaData] = useState<GovernanceMetaData | null>(null);
    const [isLoadingProposals, setIsLoadingProposals] = useState<boolean>(false); // Default false
    const [isLoadingGovernanceData, setIsLoadingGovernanceData] = useState<boolean>(false); // Default false
    const [errorProposals, setErrorProposals] = useState<string | null>(null);
    const [errorGovernanceData, setErrorGovernanceData] = useState<string | null>(null);
  
    // Helper to map contract status enum/number to frontend string status
    // NOTE: This mapping needs to match your DesiredPricePool/Poll.sol Stage enum EXACTLY
    const mapContractStatus = (contractStatus: number | bigint | undefined): ProposalStatus => {
        if (contractStatus === undefined) return 'pending'; // Handle undefined case
        const statusNum = Number(contractStatus);
        // *** Adjust mapping based on your Poll.Stage enum in Poll.sol ***
        switch (statusNum) {
            case 0: return 'pending';   // Example: Corresponds to Stage.PreVote
            case 1: return 'active';    // Example: Corresponds to Stage.Vote
            case 2: return 'succeeded'; // Example: Corresponds to Stage.FinalVote (or similar if your contract uses Succeeded state)
            case 3: return 'defeated';  // Example: Corresponds to Stage.PreExecution if result was NO/Hold, or needs custom logic
            case 4: return 'executed';  // Example: Corresponds to Stage.ExecutionReady (or after execution if tracked)
            // Add cases for other stages if applicable
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
                 // Example: Fetch active poll ID for the default pool (adjust if your logic differs)
                 // This part is tricky as you need a PoolId. Using a placeholder.
                 // TODO: Determine how to get the relevant PoolId for the displayed governance info (e.g., from selectedPool)
                 const placeholderPoolId = ethers.encodeBytes32String("placeholder-pool-id"); // Replace with actual logic
  
                 let currentPollId = 'N/A';
                 let currentStage = 'N/A';
                 let timeLeft = 'N/A'; // Placeholder
  
                 try {
                     // Attempt to fetch poll state - THIS MIGHT FAIL if polls mapping isn't accessible or placeholderPoolId is wrong
                     // NOTE: The 'polls' mapping in DesiredPrice.sol is internal and has no public getter.
                     // We cannot directly fetch the poll state for a given PoolId this way.
                     // This section needs adjustment based on how you intend to get the active poll ID and state.
                     // For now, it will likely fail or return default values.
                     // const pollState = await governanceContract.polls(placeholderPoolId); // This call will fail
                     // currentPollId = pollState.id?.toString() ?? 'N/A';
                     // currentStage = mapContractStage(pollState.getStage());
                     // timeLeft = calculateTimeLeft(pollState.startTime, pollState.isMajorPoll());
                     console.warn("Cannot fetch internal 'polls' mapping directly. Metadata will be N/A.");
                     setErrorGovernanceData("Cannot fetch current poll state directly from contract.");
  
                 } catch (pollErr) {
                     console.warn("Could not fetch poll state for placeholder PoolID:", pollErr);
                     setErrorGovernanceData("Could not fetch current poll state. Pool ID may be needed or contract lacks getter.");
                     // Keep defaults
                 }
  
                 // Fetch other relevant metadata if available (e.g., total voting power)
                 setMetaData({
                     id: currentPollId,
                     time: timeLeft,
                     stage: currentStage,
                 });
                 setGovernanceStatus([]); // Populate if your contract has a 'governanceStatus' concept
  
            } catch (metaErr: any) {
                 console.error("Failed to fetch governance metadata/status:", metaErr);
                 setErrorGovernanceData(`Failed to load governance metadata: ${metaErr.message || String(metaErr)}`);
            } finally {
                setIsLoadingGovernanceData(false);
            }
  
  
            // --- Fetch Proposals ---
            // DesiredPricePool doesn't store proposals like a standard governance contract.
            // It manages ongoing polls and price updates internally. We cannot fetch a list.
            // Setting proposals to empty array as this concept doesn't map directly.
            setIsLoadingProposals(true); // Still set loading true/false for consistency
             try {
                // Removed attempt to fetch priceUpdateIds and priceUpdates as they are internal mappings
                setProposals([]);
             } finally {
                 // No specific errors to set here unless initialization failed earlier
                 // setErrorProposals(null); // Clear any previous proposal error
             }
  
        } catch (err: any) {
            console.error('Failed to initialize governance contract:', err);
            const initErrorMsg = `Initialization error: ${err.message || String(err)}`;
            setErrorProposals(initErrorMsg);
            setErrorGovernanceData(initErrorMsg);
            setProposals([]); setGovernanceStatus([]); setMetaData(null);
            setIsLoadingProposals(false); setIsLoadingGovernanceData(false);
        }
        // Ensure loading states are reset even if parts fail
        setIsLoadingProposals(false);
  
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