import { configureStore } from '@reduxjs/toolkit';
import tasksReducer from './slices/tasksSlice';
import calendarReducer from './slices/calendarSlice';

export const store = configureStore({
  reducer: {
    tasks: tasksReducer,
    calendar: calendarReducer,
    // Add other reducers here as needed
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 