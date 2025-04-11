import React from 'react';
import {
    Grid,
    Paper,
    Box,
    ListItemIcon,
    Typography,
} from '@mui/material';
import TagIcon from '@mui/icons-material/Tag';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FlagIcon from '@mui/icons-material/Flag';

import InfoBox from './InfoBox';
import { formatBalance } from '../../utils/formatters';

interface GovernanceInfoBarProps {
    vDPPBalance: number;
    metaData: { id: string; time: string; stage: string };
}

// Define MetaItem
const MetaItem: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
     <Box display="flex" alignItems="center" sx={{ width: '100%', py: 0.5 }}>
        <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5, color: 'action.active', display: 'flex', alignItems: 'center' }}>
            {icon}
        </ListItemIcon>
        <Box>
            <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.1}>
                {label}
            </Typography>
            <Typography variant="body2" fontWeight={500} lineHeight={1.2}>
                {value}
            </Typography>
        </Box>
    </Box>
);


const GovernanceInfoBar: React.FC<GovernanceInfoBarProps> = ({ vDPPBalance, metaData }) => {
    return (
        <Grid container spacing={2} sx={{ mb: 3 }}>
            {/* Meta Section */}
            <Grid item xs={12} sm={12} md={4}>
                <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
                    <Typography
                        variant="overline"
                        color="text.secondary"
                        display="block"
                        align="center"
                        gutterBottom
                        sx={{ lineHeight: 1.2, mb: 1 }}
                    >
                        Meta (Mock)
                    </Typography>
                    {/* Nested Grid to arrange MetaItems */}
                    <Grid container spacing={1} alignItems="center" justifyContent="flex-start">
                        {/* Grid item for ID */}
                        <Grid item xs={12} sm={4} > {/* Takes full width on xs, 1/3 on sm+ */}
                            <MetaItem icon={<TagIcon fontSize="small" />} label="ID" value={metaData.id} />
                        </Grid>
                        {/* Grid item for Time Left */}
                        <Grid item xs={12} sm={4} > {/* Takes full width on xs, 1/3 on sm+ */}
                            <MetaItem icon={<AccessTimeIcon fontSize="small" />} label="Time Left" value={metaData.time} />
                        </Grid>
                        {/* Grid item for Stage */}
                        <Grid item xs={12} sm={4} > {/* Takes full width on xs, 1/3 on sm+ */}
                            <MetaItem icon={<FlagIcon fontSize="small" />} label="Stage" value={metaData.stage} />
                        </Grid>
                    </Grid>
                </Paper>
            </Grid>

            {/* Voting Power and Balance using InfoBox */}
            <Grid item xs={6} sm={6} md={4}>
                <InfoBox title="Your Voting Power">
                    {formatBalance(vDPPBalance, 2)} vDPP
                </InfoBox>
            </Grid>
            <Grid item xs={6} sm={6} md={4}>
                <InfoBox title="vDPP Balance">
                    {formatBalance(vDPPBalance, 2)}
                </InfoBox>
            </Grid>
        </Grid>
    );
};

export default GovernanceInfoBar;