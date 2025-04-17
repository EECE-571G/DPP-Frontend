// src/components/Governance/GovernanceStatusChart.tsx
import React, { useMemo } from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { BarChart, axisClasses } from '@mui/x-charts';
import { BarChartProps } from '@mui/x-charts/BarChart';

interface GovernanceStatusChartProps {
    mockGovernanceStatus: number[];
}

const VOTE_RANGE = 10;

const GovernanceStatusChart: React.FC<GovernanceStatusChartProps> = ({ mockGovernanceStatus }) => {

    const chartData = useMemo(() => {
        // Use the status prop
        if (!Array.isArray(mockGovernanceStatus) || mockGovernanceStatus.length !== (VOTE_RANGE * 2 + 1)) {
             console.warn(`GovernanceStatusChart: Received invalid data length ${mockGovernanceStatus?.length}. Expected ${VOTE_RANGE * 2 + 1}.`);
             return [];
        }
         return mockGovernanceStatus.map((value, index) => ({
            id: index,
            slotLabel: (index - VOTE_RANGE).toString(),
            value: value,
        }));
        // Depend on the prop
    }, [mockGovernanceStatus]);

    // --- Chart Config ---
    const chartXAxisConfig: BarChartProps['xAxis'] = useMemo(() => {
        return [{
            id: 'voteSlots',
            dataKey: 'slotLabel',
            scaleType: 'band',
            label: "Vote Slot Delta from Desired Price",
            tickLabelStyle: { fontSize: 10, },
        }];
    }, []);
    const chartYAxisConfig: BarChartProps['yAxis'] = useMemo(() => [{ id: 'votePower', label: "Voting Power (DPP)" }], []);
     const chartSeries = useMemo(() => [{
        dataKey: 'value',
        label: 'Net Voting Power Diff',
    }], []);
    // --- End Chart Config ---

    const hasData = chartData.length > 0;

    return (
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: hasData ? 0 : 2 }}>
                Vote Distribution
            </Typography>
            <Box sx={{ height: hasData ? 300 : 'auto', width: '100%' }}>
                {hasData ? (
                    <BarChart
                        dataset={chartData}
                        series={chartSeries}
                        xAxis={chartXAxisConfig}
                        yAxis={chartYAxisConfig}
                        slotProps={{ legend: { hidden: true } }}
                        sx={{
                           [`& .${axisClasses.directionX} .${axisClasses.label}`]: { transform: 'translateY(5px)' },
                           [`& .${axisClasses.directionY} .${axisClasses.label}`]: { transform: 'translateX(-15px)' },
                       }}
                        margin={{ top: 20, right: 20, bottom: 50, left: 65 }}
                    />
                ) : (
                    <Typography>No vote distribution data available.</Typography>
                )}
            </Box>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                 Note: Visual representation of the net voting power distribution across price delta slots relative to the desired price.
            </Typography>
        </Paper>
    );
};

export default GovernanceStatusChart;