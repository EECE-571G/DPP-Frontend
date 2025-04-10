import React from 'react';
import { Paper, Typography } from '@mui/material';

interface InfoBoxProps {
    title: string;
    children: React.ReactNode;
}

const InfoBox: React.FC<InfoBoxProps> = ({ title, children }) => (
    <Paper elevation={1} sx={{ p: 2, textAlign: 'center', height: '100%' }}>
        <Typography variant="overline" color="text.secondary" display="block" gutterBottom sx={{ lineHeight: 1.2 }}>
            {title}
        </Typography>
        <Typography variant="h6" component="div" sx={{ wordBreak: 'break-word' }}>
            {children}
        </Typography>
    </Paper>
);

export default InfoBox;