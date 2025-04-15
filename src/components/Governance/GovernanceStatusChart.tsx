// src/components/Governance/GovernanceStatusChart.tsx
import React, { useMemo } from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
// Import the specific type for X-axis configuration
import { BarChartProps } from '@mui/x-charts/BarChart';

interface GovernanceStatusChartProps {
    governanceStatus: number[];
}

const VOTE_RANGE = 10;

const GovernanceStatusChart: React.FC<GovernanceStatusChartProps> = ({ governanceStatus }) => {
    const chartData = useMemo(() => {
        if (!Array.isArray(governanceStatus) || governanceStatus.length !== (VOTE_RANGE * 2 + 1)) {
            return [];
        }
        return governanceStatus.map((value, index) => ({
            id: index,
            slotLabel: (index - VOTE_RANGE).toString(),
            value: value,
        }));
    }, [governanceStatus]);

    // --- Correct X-axis configuration using the xAxis prop structure ---
    // The xAxis prop expects an array of axis configurations.
    const chartXAxisConfig: BarChartProps['xAxis'] = useMemo(() => { // Type based on the prop
        return [{ // Define the configuration object within the array
            id: 'voteSlots', // Add an explicit ID
            scaleType: 'band',
            dataKey: 'slotLabel',
            label: "Vote Slot Delta from Desired Price",
            tickLabelStyle: {
                fontSize: 10,
            },
            // You can add other AxisConfig properties here if needed
        }];
    }, []);
    // --- End Correction ---

    const chartSeries = useMemo(() => [{
        dataKey: 'value',
        label: 'Net Voting Power Diff',
    }], []);

    const hasData = chartData.length > 0;

    return (
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: hasData ? 0 : 2 }}>
                Governance Status Parameters (Vote Distribution)
            </Typography>
            <Box sx={{ height: hasData ? 300 : 'auto', width: '100%' }}>
                {hasData ? (
                    <BarChart
                        dataset={chartData}
                        xAxis={chartXAxisConfig} // Use the correctly typed config array
                        series={chartSeries}
                        slotProps={{
                            legend: { hidden: true },
                        }}
                        margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                    />
                ) : (
                    <Typography>No vote distribution data available.</Typography>
                )}
            </Box>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                 Note: Visual representation of the net voting power distribution across price delta slots.
            </Typography>
        </Paper>
    );
};

export default GovernanceStatusChart;