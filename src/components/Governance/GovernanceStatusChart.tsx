import React, { useMemo } from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { ChartsXAxisProps } from '@mui/x-charts/models';

interface GovernanceStatusChartProps {
    governanceStatus: number[];
}

const GovernanceStatusChart: React.FC<GovernanceStatusChartProps> = ({ governanceStatus }) => {
    const chartData = useMemo(() => governanceStatus.map((value, index) => ({
        id: index,
        value: value,
        label: `Param ${index + 1}`
    })), [governanceStatus]);

    // Use useMemo and apply the type assertion here
    const chartXAxis = useMemo(() => {
        // Define the object here
        const config = {
            scaleType: 'band' as const,
            dataKey: 'label',
            tickLabelStyle: {
                angle: -30,
                textAnchor: 'end' as const,
                fontSize: 10,
            },
        };
        // Return the array containing the asserted object
        return [config as ChartsXAxisProps];
    }, []);

    const chartSeries = useMemo(() => [{
        dataKey: 'value',
        label: 'Status Value',
        color: '#6fa8dc',
    }], []);

    return (
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                Governance Status Parameters
            </Typography>
            <Box sx={{ height: 300, width: '100%' }}>
                {chartData.length > 0 ? (
                    <BarChart
                        dataset={chartData}
                        xAxis={chartXAxis}
                        series={chartSeries}
                        slotProps={{
                            legend: { hidden: true },
                        }}
                        margin={{ top: 10, right: 10, bottom: 70, left: 40 }}
                    />
                ) : (
                    <Typography>No status data available.</Typography>
                )}
            </Box>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                Note: Visual representation of the 21 status parameters. Locking logic based on these is handled by the protocol.
            </Typography>
        </Paper>
    );
};

export default GovernanceStatusChart;