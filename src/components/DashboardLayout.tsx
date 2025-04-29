import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

interface DashboardLayoutProps {
  isEditMode: boolean;
  children: React.ReactNode[];
  onLayoutChange?: (layout: LayoutItem[]) => void;
  layout: LayoutItem[];
  isMobile?: boolean;
}

// Define default layouts
export const defaultLayout: LayoutItem[] = [
  { i: 'quickStats', x: 0, y: 0, w: 12, h: 6, minW: 6, minH: 4 },
  { i: 'calendar', x: 0, y: 6, w: 12, h: 18, minW: 6, minH: 10 },
  { i: 'progress', x: 0, y: 24, w: 12, h: 15, minW: 6, minH: 10 },
  { i: 'recentEntries', x: 0, y: 39, w: 7, h: 18, minW: 4, minH: 10 },
  { i: 'topDistractions', x: 7, y: 39, w: 5, h: 18, minW: 4, minH: 10 }
];

export const defaultMobileLayout: LayoutItem[] = [
  { i: 'quickStats', x: 0, y: 0, w: 12, h: 8, minW: 6, minH: 4 },
  { i: 'calendar', x: 0, y: 8, w: 12, h: 14, minW: 6, minH: 10 },
  { i: 'progress', x: 0, y: 22, w: 12, h: 12, minW: 6, minH: 10 },
  { i: 'recentEntries', x: 0, y: 34, w: 12, h: 16, minW: 6, minH: 10 },
  { i: 'topDistractions', x: 0, y: 50, w: 12, h: 16, minW: 6, minH: 10 }
];

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  isEditMode,
  children,
  onLayoutChange,
  layout,
  isMobile = false
}) => {
  const [width, setWidth] = useState(1200);

  // Update width on window resize
  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth > 1400 ? 1200 : window.innerWidth - 48);
    };

    handleResize(); // Initial call
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Create widget elements with drag handles
  const renderWidgets = () => {
    return React.Children.map(children, (child, index) => {
      if (!child || !React.isValidElement(child)) return null;
      
      const layoutItem = layout.find(item => item.i === child.key);
      if (!layoutItem) return null;

      return (
        <div key={layoutItem.i} className="dashboard-widget">
          <Box sx={{ position: 'relative', height: '100%' }}>
            {isEditMode && (
              <Box 
                className="drag-handle"
                sx={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '30px',
                  cursor: 'move',
                  backgroundColor: 'rgba(16, 86, 245, 0.05)',
                  borderBottom: '1px dashed #1056F5',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  color: '#1056F5'
                }}
              >
                Drag to move
              </Box>
            )}
            {child}
          </Box>
        </div>
      );
    });
  };

  return (
    <GridLayout
      className="layout"
      layout={layout}
      cols={12}
      rowHeight={30}
      width={width}
      margin={[16, 16]}
      containerPadding={[0, 0]}
      isDraggable={isEditMode}
      isResizable={isEditMode}
      onLayoutChange={onLayoutChange}
      draggableHandle=".drag-handle"
      compactType="vertical"
      useCSSTransforms={true}
      autoSize={true}
    >
      {renderWidgets()}
    </GridLayout>
  );
};

export default DashboardLayout; 