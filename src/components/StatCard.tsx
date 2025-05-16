import React, { useRef, useEffect, useState } from 'react';
import { Paper, Box, Typography, useTheme, useMediaQuery } from '@mui/material';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
  subtitle?: string;
  forceCompact?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color = '#1056F5',
  subtitle,
  forceCompact = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isExtraSmall = useMediaQuery('(max-width:375px)');
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState<number>(0);
  
  // Use ResizeObserver to track container size changes
  useEffect(() => {
    if (!cardRef.current) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries[0]) return;
      setCardWidth(entries[0].contentRect.width);
    });
    
    resizeObserver.observe(cardRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  // Determine text size classes based on container width
  const isSmallCard = forceCompact || cardWidth > 0 && cardWidth < 120;
  const isMediumCard = !isSmallCard && (cardWidth >= 120 && cardWidth < 180);
  
  return (
    <Paper
      ref={cardRef}
      elevation={1}
      sx={{
        p: isExtraSmall ? 0.5 : isSmallCard ? 0.75 : isMediumCard ? 1 : 1.5,
        borderRadius: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderLeft: `${isExtraSmall ? 3 : 4}px solid ${color}`,
        transition: 'all 0.2s ease-in-out',
        overflow: 'auto',
        boxSizing: 'border-box',
        minHeight: isExtraSmall ? '50px' : isSmallCard ? '60px' : '80px',
        minWidth: 0,
        '&:hover': {
          transform: isExtraSmall || isSmallCard ? 'none' : 'translateY(-4px)',
          boxShadow: isExtraSmall || isSmallCard ? 1 : 3
        }
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        mb: isExtraSmall ? 0.1 : isSmallCard ? 0.25 : isMediumCard ? 0.5 : 1,
        minWidth: 0,
        alignItems: 'center'
      }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontFamily: 'Poppins',
            color: 'text.secondary',
            fontWeight: 'medium',
            fontSize: isExtraSmall ? '0.6rem' : isSmallCard ? '0.65rem' : isMediumCard ? '0.75rem' : '0.875rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: icon ? '80%' : '100%'
          }}
        >
          {title}
        </Typography>
        {icon && (
          <Box sx={{ 
            color, 
            flexShrink: 0, 
            ml: 0.5,
            fontSize: isExtraSmall ? '0.75rem' : isSmallCard ? '0.875rem' : isMediumCard ? '1rem' : '1.25rem',
            display: 'flex',
            alignItems: 'center',
            '& svg': {
              fontSize: 'inherit'
            }
          }}>
            {icon}
          </Box>
        )}
      </Box>
      
      <Box sx={{ 
        minWidth: 0,
        width: '100%'
      }}>
        <Typography
          sx={{
            fontFamily: 'Poppins',
            fontWeight: 'bold',
            color,
            fontSize: isExtraSmall ? '0.9rem' : isSmallCard ? '1rem' : isMediumCard ? '1.5rem' : '2rem',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            width: '100%'
          }}
        >
          {value}
        </Typography>
        
        {subtitle && (
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'Poppins',
              color: 'text.secondary',
              mt: isExtraSmall ? 0.1 : isSmallCard ? 0.25 : 0.5,
              fontSize: isExtraSmall ? '0.55rem' : isSmallCard ? '0.6rem' : isMediumCard ? '0.7rem' : '0.75rem',
              whiteSpace: 'normal',
              overflow: 'hidden',
              lineHeight: 1.2,
              maxHeight: isExtraSmall ? '1.2em' : isSmallCard ? '1.2em' : isMediumCard ? '2.4em' : '2.4em',
              width: '100%',
              display: isExtraSmall ? (title === 'Average Score' ? 'block' : 'none') : isSmallCard ? 'none' : 'block'
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default StatCard; 