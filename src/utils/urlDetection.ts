// URL detection and validation utilities

// Regex patterns for URL detection
const URL_PATTERNS = [
  // HTTP/HTTPS URLs
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi,
  // URLs without protocol
  /(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi,
  // Domain-like patterns (with at least one dot)
  /\b[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+\.?/gi
];

// Common file extensions to exclude from URL detection
const FILE_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', // Images
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', // Documents
  'mp3', 'mp4', 'avi', 'mov', 'wav', 'flac', // Media
  'zip', 'rar', '7z', 'tar', 'gz', // Archives
  'exe', 'msi', 'deb', 'rpm', 'dmg', // Executables
  'txt', 'csv', 'json', 'xml', 'yaml', 'yml' // Data files
];

// Common domains to prioritize for URL detection
const COMMON_DOMAINS = [
  'github.com', 'gitlab.com', 'bitbucket.org',
  'stackoverflow.com', 'medium.com', 'dev.to',
  'youtube.com', 'youtu.be', 'vimeo.com',
  'google.com', 'docs.google.com', 'drive.google.com',
  'notion.so', 'airtable.com', 'trello.com', 'asana.com',
  'figma.com', 'sketch.com', 'invision.com',
  'slack.com', 'discord.com', 'zoom.us',
  'wikipedia.org', 'w3.org', 'mdn.mozilla.org'
];

/**
 * Detects URLs in a given text
 */
export const detectUrls = (text: string): string[] => {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const urls = new Set<string>();
  
  // Use multiple patterns to catch different URL formats
  URL_PATTERNS.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleanUrl = cleanUrl_(match);
        if (cleanUrl && isValidUrl(cleanUrl)) {
          urls.add(cleanUrl);
        }
      });
    }
  });

  return Array.from(urls);
};

/**
 * Validates if a string is a valid URL
 */
export const isValidUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    
    // Must have a valid hostname
    if (!urlObj.hostname || urlObj.hostname.length < 3) {
      return false;
    }
    
    // Must have at least one dot in hostname
    if (!urlObj.hostname.includes('.')) {
      return false;
    }
    
    // Exclude localhost and local IPs for now
    if (urlObj.hostname === 'localhost' || urlObj.hostname.startsWith('192.168.') || urlObj.hostname.startsWith('10.') || urlObj.hostname.startsWith('172.')) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
};

/**
 * Normalizes and cleans a URL
 */
const cleanUrl_ = (url: string): string => {
  let cleaned = url.trim();
  
  // Remove trailing punctuation that might be part of sentence
  cleaned = cleaned.replace(/[.,;:!?]+$/, '');
  
  // Remove surrounding parentheses or brackets
  cleaned = cleaned.replace(/^[\(\[\{]+|[\)\]\}]+$/g, '');
  
  // Add protocol if missing
  if (!cleaned.match(/^https?:\/\//)) {
    cleaned = `https://${cleaned}`;
  }
  
  return cleaned;
};

/**
 * Suggests URLs from task description that could be attached
 */
export const suggestUrlsFromDescription = (description: string): Array<{
  url: string;
  confidence: 'high' | 'medium' | 'low';
  context: string;
}> => {
  const detectedUrls = detectUrls(description);
  
  return detectedUrls.map(url => {
    let confidence: 'high' | 'medium' | 'low' = 'medium';
    
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();
      
      // High confidence for well-known domains
      if (COMMON_DOMAINS.some(commonDomain => domain.includes(commonDomain))) {
        confidence = 'high';
      }
      
      // Lower confidence for file-like URLs
      const pathname = urlObj.pathname.toLowerCase();
      if (FILE_EXTENSIONS.some(ext => pathname.endsWith(`.${ext}`))) {
        confidence = 'low';
      }
      
    } catch {
      confidence = 'low';
    }
    
    // Extract context around the URL (up to 50 chars before and after)
    const urlIndex = description.indexOf(url);
    const contextStart = Math.max(0, urlIndex - 50);
    const contextEnd = Math.min(description.length, urlIndex + url.length + 50);
    const context = description.substring(contextStart, contextEnd).trim();
    
    return {
      url,
      confidence,
      context
    };
  });
};

/**
 * Extracts domain from URL for display purposes
 */
export const extractDomain = (url: string): string => {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname;
  } catch {
    // Fallback extraction for malformed URLs
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\s]+)/);
    return match ? match[1] : url;
  }
};

/**
 * Generates a favicon URL for a given domain or URL
 */
export const getFaviconUrl = (urlOrDomain: string, size: number = 32): string => {
  const domain = extractDomain(urlOrDomain);
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
};

/**
 * Checks if URL is likely to be a web page (not a file download)
 */
export const isWebPageUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const pathname = urlObj.pathname.toLowerCase();
    
    // Check if it ends with a file extension
    const hasFileExtension = FILE_EXTENSIONS.some(ext => pathname.endsWith(`.${ext}`));
    
    // Check if it's likely a web page
    const isWebPage = !hasFileExtension || 
                     pathname.endsWith('.html') || 
                     pathname.endsWith('.htm') || 
                     pathname === '/' || 
                     pathname === '';
    
    return isWebPage;
  } catch {
    return true; // Default to assuming it's a web page
  }
};

/**
 * Generates a suggested title for a URL based on its domain and path
 */
export const generateUrlTitle = (url: string): string => {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const domain = urlObj.hostname.replace(/^www\./, '');
    const pathSegments = urlObj.pathname.split('/').filter(segment => segment.length > 0);
    
    if (pathSegments.length === 0) {
      // Just the domain
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    }
    
    // Try to create a meaningful title from the path
    const lastSegment = pathSegments[pathSegments.length - 1];
    const title = lastSegment
      .replace(/[-_]/g, ' ')
      .replace(/\.[^.]*$/, '') // Remove file extension
      .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize words
    
    return title || domain;
  } catch {
    return url;
  }
}; 