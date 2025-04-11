import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
    useMemo,
  } from 'react';
  import { Proposal } from '../types';
  import {
    MOCK_PROPOSALS,
    MOCK_GOVERNANCE_STATUS,
    MOCK_GOVERNANCE_METADATA,
  } from '../utils/mockData';
  
  interface GovernanceMetaData {
    id: string;
    time: string;
    stage: string;
  }
  
  interface GovernanceContextType {
    proposals: Proposal[];
    governanceStatus: number[];
    metaData: GovernanceMetaData | null;
    isLoadingProposals: boolean;
    isLoadingGovernanceData: boolean;
    errorProposals: string | null;
    errorGovernanceData: string | null;
    // Optional: add functions to refetch if needed
  }
  
  const GovernanceContext = createContext<GovernanceContextType | undefined>(
    undefined
  );
  
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
  
  export const GovernanceProvider: React.FC<GovernanceProviderProps> = ({
    children,
  }) => {
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [governanceStatus, setGovernanceStatus] = useState<number[]>([]);
    const [metaData, setMetaData] = useState<GovernanceMetaData | null>(null);
    const [isLoadingProposals, setIsLoadingProposals] = useState<boolean>(true);
    const [isLoadingGovernanceData, setIsLoadingGovernanceData] = useState<boolean>(true);
    const [errorProposals, setErrorProposals] = useState<string | null>(null);
    const [errorGovernanceData, setErrorGovernanceData] = useState<string | null>(null);
  
    // Fetch Proposals
    useEffect(() => {
      setIsLoadingProposals(true);
      setErrorProposals(null);
      const timer = setTimeout(() => {
        try {
          setProposals(MOCK_PROPOSALS);
          setIsLoadingProposals(false);
        } catch (err: any) {
          console.error('Failed to load proposals:', err);
          setErrorProposals('Failed to load proposals.');
          setIsLoadingProposals(false);
        }
      }, 900);
      return () => clearTimeout(timer);
    }, []);
  
    // Fetch Governance Status & MetaData
    useEffect(() => {
      setIsLoadingGovernanceData(true);
      setErrorGovernanceData(null);
      const timer = setTimeout(() => {
        try {
          setGovernanceStatus(MOCK_GOVERNANCE_STATUS);
          setMetaData(MOCK_GOVERNANCE_METADATA);
          setIsLoadingGovernanceData(false);
        } catch (err: any) {
          console.error('Failed to load governance data:', err);
          setErrorGovernanceData('Failed to load governance data.');
          setIsLoadingGovernanceData(false);
        }
      }, 1100);
      return () => clearTimeout(timer);
    }, []);
  
    const contextValue = useMemo(
      () => ({
        proposals,
        governanceStatus,
        metaData,
        isLoadingProposals,
        isLoadingGovernanceData,
        errorProposals,
        errorGovernanceData,
      }),
      [
        proposals,
        governanceStatus,
        metaData,
        isLoadingProposals,
        isLoadingGovernanceData,
        errorProposals,
        errorGovernanceData,
      ]
    );
  
    return (
      <GovernanceContext.Provider value={contextValue}>
        {children}
      </GovernanceContext.Provider>
    );
  };