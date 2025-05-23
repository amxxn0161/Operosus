import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Avatar
} from '@mui/material';

interface URLPreviewProps {
  preview: any;
}

const URLPreview: React.FC<URLPreviewProps> = ({ preview }) => {
  if (!preview) return null;

  return (
    <Box className="url-preview-card" sx={{ 
      border: 1, 
      borderColor: 'divider', 
      borderRadius: 2, 
      overflow: 'hidden',
      bgcolor: 'background.paper'
    }}>
      {/* Preview Image */}
      {preview.preview_image && (
        <Box
          component="img"
          src={preview.preview_image}
          alt={preview.title}
          className="preview-image"
          sx={{ 
            width: '100%', 
            height: '200px', 
            objectFit: 'cover',
            bgcolor: 'grey.100'
          }}
          onError={(e) => {
            // Hide image if it fails to load
            e.currentTarget.style.display = 'none';
          }}
        />
      )}

      {/* Content */}
      <Box className="preview-content" sx={{ p: 2 }}>
        {/* Site Info */}
        <Box className="site-info" sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 1,
          gap: 1
        }}>
          <Avatar
            src={preview.best_icon}
            alt={preview.display_site_name}
            className="site-icon"
            sx={{ width: 24, height: 24 }}
            imgProps={{
              onError: (e) => {
                // First fallback: Try Google's favicon service with the domain
                if (preview.domain && !e.currentTarget.src.includes('google.com/s2/favicons')) {
                  e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${preview.domain}&sz=32`;
                } else {
                  // Second fallback: Try with different size
                  if (e.currentTarget.src.includes('sz=32')) {
                    e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${preview.domain}&sz=16`;
                  } else {
                    // Final fallback: Hide the image and show the emoji fallback
                    e.currentTarget.style.display = 'none';
                  }
                }
              }
            }}
          >
            🌐
          </Avatar>
          <Typography 
            variant="body2" 
            className="site-name" 
            fontWeight="medium"
            sx={{ flex: 1 }}
          >
            {preview.display_site_name}
          </Typography>
          {preview.is_special_url && (
            <Chip 
              label="Special URL" 
              size="small" 
              className="special-badge"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>

        {/* Preview Title */}
        <Typography 
          variant="h6" 
          component="h3" 
          className="preview-title"
          sx={{ 
            mb: 1,
            fontSize: '1.1rem',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {preview.title}
        </Typography>

        {/* Preview Description */}
        {preview.description && (
          <Typography 
            variant="body2" 
            color="text.secondary"
            className="preview-description"
            sx={{ 
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {preview.description}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default URLPreview; 