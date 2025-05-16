import { Theme } from '@mui/material';

/**
 * Global CSS styles for the dashboard layout system
 */
export const dashboardStyles = (isEditMode: boolean) => ({
  '@keyframes pulse': {
    '0%': {
      r: 8,
      opacity: 1,
    },
    '50%': {
      r: 10,
      opacity: 0.8,
    },
    '100%': {
      r: 8,
      opacity: 1,
    }
  },
  '.pulsing-dot': {
    animation: 'pulse 1.5s infinite ease-in-out',
  },
  '.react-grid-item.react-grid-placeholder': {
    background: '#1056F5 !important',
    opacity: '0.2 !important',
    borderRadius: '8px',
    transition: 'all 150ms ease',
  },
  '.react-resizable-handle': {
    visibility: isEditMode ? 'visible' : 'hidden',
    opacity: isEditMode ? 0.7 : 0,
    transition: 'all 0.3s ease',
  },
  '.react-grid-item > .react-resizable-handle': {
    position: 'absolute',
    width: '24px',
    height: '24px',
    zIndex: 20
  },
  '.react-grid-item > .react-resizable-handle.react-resizable-handle-se': {
    bottom: '2px',
    right: '2px',
    cursor: 'se-resize',
    '&::after': {
      content: '""',
      position: 'absolute',
      width: '12px',
      height: '12px',
      bottom: '2px',
      right: '2px',
      borderRight: '2px solid rgba(16, 86, 245, 0.8)',
      borderBottom: '2px solid rgba(16, 86, 245, 0.8)',
      borderRadius: '0 0 2px 0'
    }
  },
  '.react-grid-item > .react-resizable-handle.react-resizable-handle-e': {
    right: '2px',
    top: '50%',
    transform: 'translateY(-50%)',
    cursor: 'e-resize',
    '&::after': {
      content: '""',
      position: 'absolute',
      width: '4px',
      height: '30px',
      right: '5px',
      top: '50%',
      transform: 'translateY(-50%)',
      backgroundColor: 'rgba(16, 86, 245, 0.5)',
      borderRadius: '4px'
    }
  },
  '.react-grid-item > .react-resizable-handle.react-resizable-handle-s': {
    bottom: '2px',
    left: '50%',
    transform: 'translateX(-50%)',
    cursor: 's-resize',
    '&::after': {
      content: '""',
      position: 'absolute',
      width: '30px',
      height: '4px',
      bottom: '5px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'rgba(16, 86, 245, 0.5)',
      borderRadius: '4px'
    }
  },
  '.react-grid-item > .react-resizable-handle.react-resizable-handle-w': {
    left: '2px',
    top: '50%',
    transform: 'translateY(-50%)',
    cursor: 'w-resize',
    '&::after': {
      content: '""',
      position: 'absolute',
      width: '4px',
      height: '30px',
      left: '5px',
      top: '50%',
      transform: 'translateY(-50%)',
      backgroundColor: 'rgba(16, 86, 245, 0.5)',
      borderRadius: '4px'
    }
  },
  '.react-grid-item > .react-resizable-handle.react-resizable-handle-sw': {
    bottom: '2px',
    left: '2px',
    cursor: 'sw-resize',
    '&::after': {
      content: '""',
      position: 'absolute',
      width: '12px',
      height: '12px',
      bottom: '2px',
      left: '2px',
      borderLeft: '2px solid rgba(16, 86, 245, 0.8)',
      borderBottom: '2px solid rgba(16, 86, 245, 0.8)',
      borderRadius: '0 0 0 2px'
    }
  },
  '.react-grid-item > .react-resizable-handle.react-resizable-handle-nw': {
    top: '2px',
    left: '2px',
    cursor: 'nw-resize',
    '&::after': {
      content: '""',
      position: 'absolute',
      width: '12px',
      height: '12px',
      top: '2px',
      left: '2px',
      borderLeft: '2px solid rgba(16, 86, 245, 0.8)',
      borderTop: '2px solid rgba(16, 86, 245, 0.8)',
      borderRadius: '2px 0 0 0'
    }
  },
  '.dashboard-widget': {
    transition: 'all 0.3s ease',
    border: isEditMode ? '1px dashed #1056F5' : 'none',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    width: '100%',
    height: '100%',
    overflow: 'hidden'
  },
  '.dashboard-widget:hover': {
    boxShadow: isEditMode ? '0 0 0 2px #1056F5' : 'none',
  },
  '.react-grid-item': {
    transition: 'all 200ms ease',
    transitionProperty: 'transform, width, height',
    overflow: 'visible',
  },
  '.react-grid-item.react-draggable-dragging': {
    transition: 'none',
    zIndex: 100,
    opacity: 0.9,
  },
  '.react-grid-item.react-resizable-resizing': {
    transition: 'none',
    zIndex: 100,
  },
  '.drag-handle': {
    cursor: 'move',
  },
  '.dashboard-widget > .MuiPaper-root': {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
    width: '100%',
    boxSizing: 'border-box'
  },
  '.dashboard-widget .MuiBox-root': {
    width: '100%',
    minWidth: 0,
  },
  '.dashboard-widget .MuiGrid-container .MuiGrid-item, .dashboard-widget .MuiBox-root .MuiBox-root': {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflow: 'hidden'
  },
  '.dashboard-widget .MuiPaper-root .MuiPaper-root': {
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    minWidth: 0,
    minHeight: 0,
    '& .MuiTypography-root': {
      minWidth: 0
    }
  },
  '.dashboard-widget h6, .dashboard-widget .MuiTypography-h6': {
    fontSize: 'clamp(0.9rem, 1.5vw, 1.25rem)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  '.recharts-responsive-container': {
    width: '100% !important',
    height: '100% !important',
    minHeight: '70px !important'
  },
  '.MuiTableCell-root': {
    padding: '8px 4px',
    fontSize: 'clamp(0.7rem, 1vw, 0.875rem)',
    '@media (max-width: 768px)': {
      padding: '4px 2px',
    }
  },
  // Component-specific adjustments for compact layouts
  '.dashboard-widget[key="topDistractions"] .recharts-wrapper': {
    minHeight: '70px',
  },
  '.dashboard-widget[key="topDistractions"] .recharts-surface': {
    minHeight: '70px',
  },
  // Handling for very small container heights
  '@media (max-height: 500px)': {
    '.react-grid-item': {
      minHeight: '180px !important',
    }
  },
  '@media (max-width: 600px)': {
    '.MuiGrid-container': {
      flexWrap: 'nowrap',
      flexDirection: 'column',
    },
    '.recharts-legend-wrapper': {
      position: 'relative !important',
      width: '100% !important',
      height: 'auto !important',
      marginTop: '8px !important'
    }
  }
}); 