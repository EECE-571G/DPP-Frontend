import React, { useState } from 'react';
import { Paper, Typography, TextField, Button } from '@mui/material';

interface WalletConnectProps {
  onConnect: (address: string) => void;
}

const WalletConnect: React.FC<WalletConnectProps> = ({ onConnect }) => {
  const [mnemonic, setMnemonic] = useState("");

  const handleConnect = () => {
    // Check that the mnemonic contains exactly 16 words
    if (mnemonic.trim().split(/\s+/).length !== 16) {
      alert("Please enter a valid 16-word mnemonic phrase. For example: 'apple banana cherry date egg fruit grape honey ice juice kiwi lemon mango nut orange peach'");
      return;
    }
    // Simulate a wallet address (in production, you would derive this from the mnemonic)
    const simulatedAddress = "0x" + mnemonic.slice(0, 6).replace(/\s/g, "").toUpperCase();
    onConnect(simulatedAddress);
  };

  return (
    <Paper elevation={3} style={{ padding: 20, maxWidth: 400, margin: "50px auto" }}>
        <Typography variant="h5" gutterBottom>
            Connect Wallet
        </Typography>
        <TextField
            label="Mnemonic Phrase (16 words)"
            placeholder="Enter your 16-word mnemonic phrase"
            multiline
            fullWidth
            value={mnemonic}
            onChange={(e) => setMnemonic(e.target.value)}
            margin="normal"
        />
        <Button variant="contained" color="primary" fullWidth onClick={handleConnect} sx={{ mb: 2 }}>
            Connect Wallet
        </Button>
        
        <Typography variant="subtitle2" gutterBottom>
            Example Mnemonic:
        </Typography>
        <Paper 
            variant="outlined" 
            sx={{ p: 1, mb: 1, backgroundColor: "#f5f5f5", cursor: "pointer" }}
            onClick={() => {
                const example = "apple banana cherry date egg fruit grape honey ice juice kiwi lemon mango nut orange peach";
                navigator.clipboard.writeText(example);
                alert("Example copied to clipboard!");
            }}
        >
            <Typography variant="body2">
                apple banana cherry date egg fruit grape honey ice juice kiwi lemon mango nut orange peach
            </Typography>
        </Paper>
        <Button 
            size="small" 
            variant="outlined" 
            fullWidth
            onClick={() => setMnemonic("apple banana cherry date egg fruit grape honey ice juice kiwi lemon mango nut orange peach")}
        >
            Use Example Mnemonic
        </Button>
    </Paper>
  );
};

export default WalletConnect;
