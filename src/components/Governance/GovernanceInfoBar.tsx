import React from 'react';
import { Grid } from '@mui/material';
import InfoBox from './InfoBox';
import { formatBalance } from '../../utils/formatters';

interface GovernanceInfoBarProps {
    vDPPBalance: number;
    // You might want to pass actual meta data instead of the mock object later
    mockMeta: { id: string; time: string; stage: string };
}

const GovernanceInfoBar: React.FC<GovernanceInfoBarProps> = ({ vDPPBalance, mockMeta }) => {
    return (
        <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
                <InfoBox title="Meta (Mock)">
                    ID: {mockMeta.id}<br />
                    Time: {mockMeta.time}<br />
                    Stage: {mockMeta.stage}
                </InfoBox>
            </Grid>
            <Grid item xs={6} sm={4}>
                <InfoBox title="Your Voting Power">
                    {formatBalance(vDPPBalance, 2)} vDPP
                </InfoBox>
            </Grid>
            <Grid item xs={6} sm={4}>
                <InfoBox title="vDPP Balance">
                    {formatBalance(vDPPBalance, 2)}
                </InfoBox>
            </Grid>
        </Grid>
    );
};

export default GovernanceInfoBar;