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
import { TickMath } from '../../utils/tickMath'; // Import if needed for price calc
import { useBalancesContext } from '../../contexts/BalancesContext'; // If needed for decimals
import { usePoolsContext } from '../../contexts/PoolsContext'; // If needed for decimals
import { GovernanceMetaData } from '../../contexts/GovernanceContext';

interface GovernanceInfoBarProps {
    vDPPBalance: number;
    metaData: GovernanceMetaData | null; // Allow null
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
    const { tokenDecimals } = useBalancesContext();
    const { selectedPool } = usePoolsContext();

    const decimals0 = selectedPool?.tokenA_Address ? (tokenDecimals[selectedPool.tokenA_Address] ?? 18) : 18;
    const decimals1 = selectedPool?.tokenB_Address ? (tokenDecimals[selectedPool.tokenB_Address] ?? 18) : 18;

    const desiredPriceDisplay = metaData?.desiredPriceTick !== null && metaData?.desiredPriceTick !== undefined
       ? formatBalance(TickMath.getPriceAtTick(metaData.desiredPriceTick, decimals0, decimals1), 6) // Format calculated price
       : 'N/A';

   return (
       <Grid container spacing={2} sx={{ mb: 3 }}>
           {/* Desired Price InfoBox */}
           <Grid item xs={12} sm={4} md={3}>
                <InfoBox title="Current Desired Price">
                   {desiredPriceDisplay}
               </InfoBox>
            </Grid>

           {/* Poll Status InfoBox */}
            <Grid item xs={12} sm={8} md={3}>
               <InfoBox title="Poll Status">
                    <Typography variant="body2" sx={{ mb: 0.5 }}>ID: {metaData?.pollId ?? 'N/A'}</Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>Stage: {metaData?.pollStage ?? 'N/A'}</Typography>
                    {/* <Typography variant="body2">Time Left: {metaData?.pollTimeLeft ?? 'N/A'}</Typography> */}
                    <Typography variant="caption" color="text.secondary">
                        {metaData?.pollIsPaused ? (metaData?.pollStage === 'Pause Requested' ? '(Pause Requested)' : '(Paused)') : ''}
                    </Typography>
                </InfoBox>
            </Grid>

           {/* Voting Power and Balance */}
            <Grid item xs={6} sm={6} md={3}>
                <InfoBox title="Your Voting Power">
                    {formatBalance(vDPPBalance, 2)} vDPP
                </InfoBox>
            </Grid>
            <Grid item xs={6} sm={6} md={3}>
                <InfoBox title="vDPP Balance">
                    {formatBalance(vDPPBalance, 2)}
                </InfoBox>
            </Grid>
       </Grid>
   );
};

export default GovernanceInfoBar;