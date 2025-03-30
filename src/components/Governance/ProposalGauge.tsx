import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  GaugeContainer,
  GaugeReferenceArc,
  GaugeValueArc,
  useGaugeState,
} from '@mui/x-charts/Gauge';
import { ProposalVote } from '../../types';

// Gauge Pointer Component
function GaugePointer() {
  const { valueAngle, outerRadius, cx, cy } = useGaugeState();

  // valueAngle can be null if value is out of range
  if (valueAngle === null || !Number.isFinite(valueAngle)) {
    return null;
  }

  const target = {
    x: cx + outerRadius * Math.sin(valueAngle),
    y: cy - outerRadius * Math.cos(valueAngle),
  };
  const pointerColor = 'red';

  return (
    <g>
      <circle cx={cx} cy={cy} r={3} fill={pointerColor} />
      <path
        d={`M ${cx} ${cy} L ${target.x} ${target.y}`}
        stroke={pointerColor}
        strokeWidth={2}
      />
    </g>
  );
}

interface ProposalGaugeProps {
  votes: ProposalVote;
  size?: number;
}

export const ProposalGauge: React.FC<ProposalGaugeProps> = ({ votes, size = 80 }) => {
  const { yes, no } = votes;
  const totalVotes = yes + no;

  // Calculate the percentage of yes votes.
  // Default to 50% (neutral) if there are no votes to avoid division by zero
  // and show a starting point.
  const value = totalVotes === 0 ? 50 : (yes / totalVotes) * 100;

  return (
    <Box sx={{ position: 'relative', width: size, height: size }}>
      <GaugeContainer
        width={size}
        height={size}
        startAngle={-110}
        endAngle={110}
        value={value}
        // Set min/max if needed, default is 0-100
        // valueMin={0}
        // valueMax={100}
      >
        <GaugeReferenceArc />
        <GaugeValueArc />
        <GaugePointer />
      </GaugeContainer>
      {/* Display percentage text in the center */}
      <Typography
        variant="caption"
        component="div"
        sx={{
          position: 'absolute',
          top: '85%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontWeight: 'medium',
          color: 'text.secondary',
          fontSize: '0.65rem'
        }}
      >
        {`${value.toFixed(0)}%`}
      </Typography>
    </Box>
  );
};