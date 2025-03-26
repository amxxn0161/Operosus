import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { Goal } from '../types/commonTypes';

interface GoalItemProps {
  goal: Goal;
  index: number;
  canRemove: boolean;
  onUpdateGoal: (id: number, field: keyof Goal, value: any) => void;
  onRemoveGoal: (id: number) => void;
  onAddKeyResult: (goalId: number) => void;
  onUpdateKeyResult: (goalId: number, index: number, value: string) => void;
  onRemoveKeyResult: (goalId: number, index: number) => void;
}

const GoalItem: React.FC<GoalItemProps> = ({
  goal,
  index,
  canRemove,
  onUpdateGoal,
  onRemoveGoal,
  onAddKeyResult,
  onUpdateKeyResult,
  onRemoveKeyResult
}) => {
  return (
    <Box sx={{ mb: 3, p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
      <Typography variant="subtitle1" sx={{ fontFamily: 'Poppins', mb: 2 }}>
        Goal {index + 1}
      </Typography>
      
      <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 1 }}>
        Objective
      </Typography>
      <TextField
        fullWidth
        placeholder="Describe your objective..."
        value={goal.description}
        onChange={(e) => onUpdateGoal(goal.id, 'description', e.target.value)}
        sx={{ mb: 2 }}
      />
      
      <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 1 }}>
        Target Date
      </Typography>
      <TextField
        type="date"
        value={goal.deadline}
        onChange={(e) => onUpdateGoal(goal.id, 'deadline', e.target.value)}
        sx={{ mb: 3 }}
      />
      
      <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 2 }}>
        Key Results
      </Typography>
      
      {goal.keyResults.map((keyResult, krIndex) => (
        <Box key={krIndex} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TextField
            fullWidth
            placeholder={`Key Result ${krIndex + 1}`}
            value={keyResult}
            onChange={(e) => onUpdateKeyResult(goal.id, krIndex, e.target.value)}
          />
          {goal.keyResults.length > 1 && (
            <IconButton 
              color="error" 
              onClick={() => onRemoveKeyResult(goal.id, krIndex)}
              sx={{ ml: 1 }}
            >
              <DeleteIcon />
            </IconButton>
          )}
        </Box>
      ))}
      
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mt: 2 
      }}>
        <Button 
          startIcon={<AddIcon />} 
          onClick={() => onAddKeyResult(goal.id)}
          sx={{ 
            fontFamily: 'Poppins', 
            textTransform: 'none', 
            color: '#1056F5',
          }}
        >
          Add Key Result
        </Button>
        
        {canRemove && (
          <Button 
            startIcon={<DeleteIcon />} 
            onClick={() => onRemoveGoal(goal.id)}
            sx={{ 
              fontFamily: 'Poppins', 
              textTransform: 'none', 
              color: '#d32f2f'
            }}
          >
            Remove Goal
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default GoalItem; 