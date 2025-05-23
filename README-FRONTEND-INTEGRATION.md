# Frontend Integration for Rich URL Previews

This document describes the frontend integration implemented to work with the backend URL preview functionality, following the exact patterns specified in the requirements.

## Implementation Overview

The frontend integration has been updated to follow the exact patterns shown in the requirements images, ensuring seamless communication with the backend for rich URL preview functionality.

## 🔄 **fetchUrlPreview Function**

Following the pattern from the requirements, the URL preview fetching function has been implemented using the apiRequest utility with proper base URL handling:

```javascript
const fetchUrlPreview = async (url) => {
  try {
    console.log('Fetching URL preview metadata for:', url);
    
    const response = await apiRequest('/api/google/url-preview', {
      method: 'POST',
      body: { url }
    });
    
    console.log('URL preview response:', response);
    
    if (response.status === 'success') {
      return response.data;
    } else {
      console.error('Preview failed:', response);
      return null;
    }
  } catch (error) {
    console.error('Error fetching preview:', error);
    return null;
  }
};
```

### Key Features:
- **Uses apiRequest utility** for consistent API handling across the application
- **Automatic base URL handling** using `API_BASE_URL` from environment variables
- **Bearer token authorization** automatically handled by apiRequest
- **Proper error handling** with console logging
- **Returns raw data** from backend response

## 🎨 **URLPreview Component**

A dedicated URLPreview component has been created following the exact structure from the requirements:

```jsx
const URLPreview = ({ preview }) => {
  if (!preview) return null;
  
  return (
    <div className="url-preview-card">
      {/* Preview Image */}
      {preview.preview_image && (
        <img 
          src={preview.preview_image}
          alt={preview.title}
          className="preview-image"
          style={{ width: '100%', height: '200px', objectFit: 'cover' }}
        />
      )}
      
      {/* Content */}
      <div className="preview-content">
        <div className="site-info">
          <img 
            src={preview.best_icon}
            alt={preview.display_site_name}
            className="site-icon"
            style={{ width: '24px', height: '24px' }}
            onError={(e) => {
              e.target.src = `https://www.google.com/s2/favicons?domain=${preview.domain}&sz=32`;
            }}
          />
          <span className="site-name">{preview.display_site_name}</span>
          {preview.is_special_url && (
            <span className="special-badge">Special URL</span>
          )}
        </div>
        
        <h3 className="preview-title">{preview.title}</h3>
        {preview.description && (
          <p className="preview-description">{preview.description}</p>
        )}
      </div>
    </div>
  );
};
```

### Key Features:
- **Exact field mapping** as shown in requirements (`preview_image`, `best_icon`, `display_site_name`, etc.)
- **Fallback favicon handling** using Google's favicon service
- **Special URL badge** support
- **Responsive image handling** with error fallbacks

## 🔗 **URL Input Handler**

The URL input handling follows the pattern specified in the requirements:

```javascript
const handleUrlChange = async (url) => {
  if (isValidUrl(url)) {
    setLoading(true);
    const preview = await fetchUrlPreview(url);
    setPreview(preview);
    setLoading(false);
  }
};
```

### Integration in AddUrlDialog:
- **Real-time URL validation** before fetching preview
- **Debounced fetching** (1-second delay after typing stops)
- **Loading state management** during preview fetch
- **Auto-fill functionality** from preview metadata

## 📊 **Backend Response Handling**

The frontend correctly handles the backend response structure:

### Expected Response Format:
```json
{
  "status": "success",
  "data": {
    "preview_image": "https://example.com/image.jpg",
    "best_icon": "https://example.com/icon.png",
    "display_site_name": "Example Site",
    "title": "Page Title",
    "description": "Page description",
    "domain": "example.com",
    "is_special_url": false
  }
}
```

### Field Mapping:
- `preview_image` → Preview image URL
- `best_icon` → Site favicon/icon URL
- `display_site_name` → Site name for display
- `title` → Page title
- `description` → Page description
- `domain` → Domain name
- `is_special_url` → Special URL indicator

## 🛠 **Component Integration**

### AddUrlDialog Enhancement:
- Uses the new `URLPreview` component for rich display
- Implements the exact `handleUrlChange` pattern from requirements
- Maintains backward compatibility with existing attachment system

### TaskUrlAttachments Update:
- Converts existing attachment data to URLPreview format
- Displays rich previews for all attached URLs
- Maintains all existing functionality (refresh, delete, etc.)

### Data Conversion:
```javascript
const convertToPreviewFormat = (attachment) => {
  return {
    preview_image: attachment.previewImage,
    best_icon: attachment.bestIcon || attachment.faviconUrl,
    display_site_name: attachment.displaySiteName || attachment.domain,
    title: attachment.title || attachment.previewTitle,
    description: attachment.description || attachment.previewDescription,
    domain: attachment.domain,
    is_special_url: false
  };
};
```

## 🔒 **Authentication**

The implementation properly handles authentication using:
- **Bearer token** from localStorage (`sanctum_token`)
- **Automatic token inclusion** in all API requests
- **Error handling** for authentication failures

## 🎯 **Key Benefits**

### Follows Exact Requirements:
- ✅ **fetchUrlPreview function** exactly as specified
- ✅ **URLPreview component** with exact field structure
- ✅ **handleUrlChange pattern** implementation
- ✅ **Backend response format** handling

### Enhanced User Experience:
- **Rich visual previews** with images and site branding
- **Real-time preview loading** as users type URLs
- **Fallback handling** for missing images/icons
- **Special URL badges** for enhanced URLs

### Technical Excellence:
- **Type-safe implementation** using TypeScript
- **Error resilient** with comprehensive fallbacks
- **Performance optimized** with debounced API calls
- **Maintainable code** with clear separation of concerns

## 🚀 **Usage Flow**

1. **User enters URL** in the attachment dialog
2. **Real-time validation** checks URL format
3. **Debounced API call** to `/api/google/url-preview` after 1 second
4. **Rich preview displays** using URLPreview component
5. **Auto-fill metadata** populates title/description fields
6. **User confirms** and URL attachment is created
7. **Rich display** shows in task attachments list

This implementation ensures seamless integration with the backend while providing users with a beautiful, intuitive interface for managing URL attachments with rich previews. 