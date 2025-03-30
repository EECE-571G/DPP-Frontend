/// <reference types="react-scripts" />

// Recognize window.ethereum
interface Window {
    ethereum?: {
      isMetaMask?: true;
      request: (args: { method: string; params?: Array<any> | Record<string, any> }) => Promise<any>;
      on: (eventName: string, listener: (...args: any[]) => void) => void;
      removeListener: (eventName: string, listener: (...args: any[]) => void) => void;
    };
}