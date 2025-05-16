declare module 'react-beautiful-dnd' {
  import * as React from 'react';

  // Droppable
  export interface DroppableProvided {
    innerRef: (element: HTMLElement | null) => void;
    droppableProps: React.HTMLAttributes<HTMLElement>;
    placeholder?: React.ReactElement | null;
  }
  
  export interface DroppableStateSnapshot {
    isDraggingOver: boolean;
    draggingOverWith?: string;
    draggingFromThisWith?: string;
    isUsingPlaceholder: boolean;
  }
  
  export interface DroppableProps {
    droppableId: string;
    type?: string;
    direction?: 'horizontal' | 'vertical';
    ignoreContainerClipping?: boolean;
    isDropDisabled?: boolean;
    isCombineEnabled?: boolean;
    children: (provided: DroppableProvided, snapshot: DroppableStateSnapshot) => React.ReactElement;
  }
  
  export declare class Droppable extends React.Component<DroppableProps> {}
  
  // Draggable
  export interface DraggableProvided {
    draggableProps: React.HTMLAttributes<HTMLElement>;
    dragHandleProps: React.HTMLAttributes<HTMLElement> | null;
    innerRef: (element: HTMLElement | null) => void;
  }
  
  export interface DraggableStateSnapshot {
    isDragging: boolean;
    isDropAnimating: boolean;
    draggingOver?: string;
    dropAnimation?: {
      duration: number;
      curve: string;
      moveTo: {
        x: number;
        y: number;
      };
    };
    combineWith?: string;
    combineTargetFor?: string;
    mode?: 'FLUID' | 'SNAP';
  }
  
  export interface DraggableProps {
    draggableId: string;
    index: number;
    isDragDisabled?: boolean;
    disableInteractiveElementBlocking?: boolean;
    shouldRespectForcePress?: boolean;
    children: (provided: DraggableProvided, snapshot: DraggableStateSnapshot) => React.ReactElement;
  }
  
  export declare class Draggable extends React.Component<DraggableProps> {}
  
  // DragDropContext
  export interface DropResult {
    draggableId: string;
    type: string;
    source: {
      droppableId: string;
      index: number;
    };
    destination?: {
      droppableId: string;
      index: number;
    };
    reason: 'DROP' | 'CANCEL';
    combine?: {
      draggableId: string;
      droppableId: string;
    };
    mode: 'FLUID' | 'SNAP';
  }
  
  export interface DragStart {
    draggableId: string;
    type: string;
    source: {
      droppableId: string;
      index: number;
    };
    mode: 'FLUID' | 'SNAP';
  }
  
  export interface DragUpdate extends DragStart {
    destination?: {
      droppableId: string;
      index: number;
    };
    combine?: {
      draggableId: string;
      droppableId: string;
    };
  }

  export interface DragDropContextProps {
    onDragStart?: (initial: DragStart) => void;
    onDragUpdate?: (update: DragUpdate) => void;
    onDragEnd: (result: DropResult) => void;
    children: React.ReactNode;
    liftInstruction?: string;
    nonce?: string;
    autoScroll?: boolean;
    enableDefaultSensors?: boolean;
  }
  
  export declare class DragDropContext extends React.Component<DragDropContextProps> {}
} 