import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Badge,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import LinkIcon from '@mui/icons-material/Link';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import RefreshIcon from '@mui/icons-material/Refresh';
import { TaskFileAttachment, TaskUrlAttachment, TaskAllAttachments } from '../types/commonTypes';
import { getAllTaskAttachments, getTaskAttachments, getTaskUrlAttachments } from '../services/googleDriveService';
import TaskFileAttachments from './TaskFileAttachments';
import TaskUrlAttachments from './TaskUrlAttachments';

interface TaskAttachmentsProps {
  taskId: string;
  taskListId: string;
  initialFileAttachments?: TaskFileAttachment[];
  initialUrlAttachments?: TaskUrlAttachment[];
  onAttachmentsChange?: (allAttachments: TaskAllAttachments) => void;
  disabled?: boolean;
}

const TaskAttachments: React.FC<TaskAttachmentsProps> = ({
  taskId,
  taskListId,
  initialFileAttachments = [],
  initialUrlAttachments = [],
  onAttachmentsChange,
  disabled = false
}) => {
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [fileAttachments, setFileAttachments] = useState<TaskFileAttachment[]>(initialFileAttachments);
  const [urlAttachments, setUrlAttachments] = useState<TaskUrlAttachment[]>(initialUrlAttachments);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Calculate total attachments
  const totalAttachments = fileAttachments.length + urlAttachments.length;

  // Fetch all attachments on component mount
  useEffect(() => {
    if (taskId && taskListId) {
      fetchAllAttachments();
    }
  }, [taskId, taskListId]);

  // Notify parent when attachments change
  useEffect(() => {
    if (onAttachmentsChange) {
      const allAttachments: TaskAllAttachments = {
        fileAttachments,
        urlAttachments,
        totalAttachments
      };
      onAttachmentsChange(allAttachments);
    }
  }, [fileAttachments, urlAttachments, totalAttachments, onAttachmentsChange]);

  const fetchAllAttachments = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Use the unified endpoint with cache-busting
      const allAttachments = await getAllTaskAttachments(taskListId, taskId);
      setFileAttachments(allAttachments.fileAttachments);
      setUrlAttachments(allAttachments.urlAttachments);
    } catch (error) {
      console.error('Error fetching attachments:', error);
      setError('Failed to load attachments');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleFileAttachmentsChange = (updatedFileAttachments: TaskFileAttachment[]) => {
    setFileAttachments(updatedFileAttachments);
  };

  const handleUrlAttachmentsChange = (updatedUrlAttachments: TaskUrlAttachment[]) => {
    setUrlAttachments(updatedUrlAttachments);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header with Total Count */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <AllInclusiveIcon sx={{ mr: 1, color: 'text.secondary' }} />
        <Typography variant="h6" fontWeight="medium">
          Attachments
        </Typography>
        {totalAttachments > 0 && (
          <Badge 
            badgeContent={totalAttachments} 
            color="primary" 
            sx={{ ml: 2 }}
          />
        )}
        <Tooltip title="Refresh attachments">
          <IconButton onClick={fetchAllAttachments} size="small" sx={{ ml: 1 }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Tabs for switching between attachment types */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange}
          variant="fullWidth"
        >
          <Tab 
            icon={<AttachFileIcon />} 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                Files
                {fileAttachments.length > 0 && (
                  <Badge badgeContent={fileAttachments.length} color="primary" sx={{ ml: 2 }} />
                )}
              </Box>
            }
            iconPosition="start"
          />
          <Tab 
            icon={<LinkIcon />} 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                URLs
                {urlAttachments.length > 0 && (
                  <Badge badgeContent={urlAttachments.length} color="primary" sx={{ ml: 2 }} />
                )}
              </Box>
            }
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {currentTab === 0 && (
        <TaskFileAttachments
          taskId={taskId}
          taskListId={taskListId}
          attachments={fileAttachments}
          onAttachmentsChange={handleFileAttachmentsChange}
          disabled={disabled}
        />
      )}

      {currentTab === 1 && (
        <TaskUrlAttachments
          taskId={taskId}
          taskListId={taskListId}
          attachments={urlAttachments}
          onAttachmentsChange={handleUrlAttachmentsChange}
          disabled={disabled}
        />
      )}

      {/* Summary when there are no attachments */}
      {totalAttachments === 0 && (
        <Box
          sx={{
            textAlign: 'center',
            py: 4,
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            color: 'text.secondary'
          }}
        >
          <AllInclusiveIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
          <Typography variant="body2" sx={{ mb: 1 }}>
            No attachments yet
          </Typography>
          <Typography variant="caption">
            Use the tabs above to add files or URLs to this task
          </Typography>
        </Box>
      )}

      {/* Quick stats when there are attachments */}
      {totalAttachments > 0 && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Total attachments:</strong> {totalAttachments} 
            {fileAttachments.length > 0 && ` • ${fileAttachments.length} file${fileAttachments.length > 1 ? 's' : ''}`}
            {urlAttachments.length > 0 && ` • ${urlAttachments.length} URL${urlAttachments.length > 1 ? 's' : ''}`}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default TaskAttachments; 