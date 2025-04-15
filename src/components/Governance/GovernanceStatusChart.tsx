// src/components/Governance/GovernanceStatusChart.tsx
import React, { useMemo } from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { BarChart, axisClasses } from '@mui/x-charts';
import { BarChartProps } from '@mui/x-charts/BarChart';

interface GovernanceStatusChartProps {
    governanceStatus: number[];
}

const VOTE_RANGE = 10;

const GovernanceStatusChart: React.FC<GovernanceStatusChartProps> = ({ governanceStatus }) => {

    const chartData = useMemo(() => {
        // Ensure the input has the correct length (2 * VOTE_RANGE + 1)
        if (!Array.isArray(governanceStatus) || governanceStatus.length !== (VOTE_RANGE * 2 + 1)) {
             console.warn(`GovernanceStatusChart: Received invalid data length ${governanceStatus?.length}. Expected ${VOTE_RANGE * 2 + 1}.`);
             return []; // Return empty if data is invalid
        }
        // Map the raw number array to the format expected by the chart
         return governanceStatus.map((value, index) => ({
            id: index,
            slotLabel: (index - VOTE_RANGE).toString(), // Generate labels "-10" to "10"
            value: value,
        }));
    }, [governanceStatus]);

    // Configure the X-axis to show labels -10 to 10 based on slotLabel
    const chartXAxisConfig: BarChartProps['xAxis'] = useMemo(() => {
        return [{ // Define the configuration object within the array
            id: 'voteSlots', // Add an explicit ID
            dataKey: 'slotLabel', // Use the generated labels for the axis data
            scaleType: 'band', // Use band scale for discrete labels
            label: "Vote Slot Delta from Desired Price",
            tickLabelStyle: {
                fontSize: 10,
            },
            // You can add other AxisConfig properties here if needed
        }];
    }, []);
    // --- End Correction ---

    // Configure the Y-axis
    const chartYAxisConfig: BarChartProps['yAxis'] = useMemo(() => [{ id: 'votePower', label: "Voting Power (DPP)" }], []);

     // Configure the series (the bars themselves)
     const chartSeries = useMemo(() => [{
        dataKey: 'value', // Use the 'value' from chartData for bar height
        label: 'Net Voting Power Diff', // Legend label (can be hidden)
        // Dynamic coloring per bar (removed the function causing the type error for now)
        // If dynamic coloring is essential, you might need to map colors onto the dataset
        // or use slotProps if the API supports it for individual bar customization.
        // For now, using a single color or relying on the default theme color.
        // color: '#1976d2', // Example: Set a fixed color
    }], []);

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
                        slotProps={{
                             legend: { hidden: true },
                        }}
                        sx={{ // Target axis labels specifically
                           [`& .${axisClasses.directionX} .${axisClasses.label}`]: { transform: 'translateY(5px)' }, // Move X label down
                           [`& .${axisClasses.directionY} .${axisClasses.label}`]: { transform: 'translateX(-15px)' }, // Move Y label left
                       }}
                        margin={{ top: 20, right: 20, bottom: 50, left: 65 }} // Increase left margin for Y label
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