import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set the PDF.js worker path
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

// Type for extracted content
export interface ExtractedContent {
  personalValues: {
    proudOf: string[];
    achievement: string[];
    happiness: string[];
    inspiration: string[];
  };
  productivityConnection: {
    coreValues: string;
    valueImpact: string;
  };
  goals: {
    description: string;
    impact: string[];
  };
  workshopOutput: {
    actions: string[];
    reflections: string;
  };
}

// Parse PDF document
export const parsePdfDocument = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF document');
  }
};

// Parse Word document
export const parseWordDocument = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error('Error parsing Word document:', error);
    throw new Error('Failed to parse Word document');
  }
};

// Implement document content mapping
export const mapContentToWorksheet = (content: string): ExtractedContent => {
  // Extract data from the document content
  const result: ExtractedContent = {
    personalValues: {
      proudOf: ['', '', ''],
      achievement: ['', '', ''],
      happiness: ['', '', ''],
      inspiration: ['', '', ''],
    },
    productivityConnection: {
      coreValues: '',
      valueImpact: '',
    },
    goals: {
      description: '',
      impact: ['', '', ''],
    },
    workshopOutput: {
      actions: ['', '', '', '', ''],
      reflections: '',
    },
  };

  try {
    // Process the document content by looking for sections and table content
    const contentLines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    
    // Log the content for debugging
    console.log('Document content lines:', contentLines);

    // First, try to extract content from key sections by looking for specific headers
    
    // Check for "PRODUCTIVITY SUPERHERO WORKSHEET" which indicates the table format
    const hasTableFormat = contentLines.some(line => 
      line.includes('PRODUCTIVITY SUPERHERO WORKSHEET') || 
      (line.includes('PRODUCTIVITY') && line.includes('WORKSHEET')) ||
      // Additional patterns to detect table format
      line.includes('1. Creating genuine') ||
      line.includes('1.Creating genuine') ||
      (line.includes('What am I most proud of?') && 
       contentLines.some(l => l.includes('What did it take for me to achieve those things?')))
    );

    if (hasTableFormat) {
      console.log('Detected table format document');
      // Use table-specialized extraction for the document that has table format
      extractFromTableFormat(contentLines, result);
    } else {
      // Standard extraction for regular documents (non-table format)
      
      // Extract "What am I most proud of?" section
      const proudOfItems = extractItemsAfterHeading(contentLines, 'What am I most proud of?', 3);
      if (proudOfItems.length > 0) {
        result.personalValues.proudOf = proudOfItems;
      }
      
      // Extract "What did it take for me to achieve those things?" section
      const achievementItems = extractItemsAfterHeading(contentLines, 'What did it take for me to achieve those things?', 3);
      if (achievementItems.length > 0) {
        result.personalValues.achievement = achievementItems;
      }
      
      // Extract "What makes me happiest in life?" section
      const happinessItems = extractItemsAfterHeading(contentLines, 'What makes me happiest in life?', 3);
      if (happinessItems.length > 0) {
        result.personalValues.happiness = happinessItems;
      }
      
      // Extract "Who do I find inspiring...and then, what are the qualities I am admiring?" section
      const inspirationItems = extractItemsAfterHeading(contentLines, 'Who do I find inspiring', 3);
      if (inspirationItems.length > 0) {
        result.personalValues.inspiration = inspirationItems;
      }
    }
    
    // Extract "MY VALUES - what matters most to me?" section
    const valuesContent = extractContentBetweenHeadings(contentLines, 'MY VALUES - what matters most to me?', 'MY PRODUCTIVITY');
    if (valuesContent) {
      result.productivityConnection.coreValues = valuesContent.join('\n');
    }
    
    // Extract "MY PRODUCTIVITY - how does it link to my values?" section
    const productivityContent = extractContentBetweenHeadings(contentLines, 'MY PRODUCTIVITY - how does it link to my values?', 'When I become more effective');
    if (productivityContent) {
      // Skip the header line if it exists
      const valueImpactContent = extractContentAfterHeading(contentLines, 'When I become more effective');
      if (valueImpactContent) {
        result.productivityConnection.valueImpact = valueImpactContent.join('\n');
      }
    }
    
    // Extract goals description from "What will be different for you?" section
    const goalsDescription = extractContentAfterHeading(contentLines, 'What will be different for you?');
    if (goalsDescription) {
      result.goals.description = goalsDescription.join('\n');
    }
    
    // Extract goals impact from different sections
    const feelingContent = extractContentAfterHeading(contentLines, 'How will you feel?');
    if (feelingContent) {
      result.goals.impact[0] = feelingContent.join('\n');
    }
    
    const benefitsContent = extractContentAfterHeading(contentLines, 'Who benefits?');
    if (benefitsContent) {
      result.goals.impact[1] = benefitsContent.join('\n');
    }
    
    const productivityGoalContent = extractContentAfterHeading(contentLines, 'I want to improve');
    if (productivityGoalContent) {
      result.goals.impact[2] = productivityGoalContent.join('\n');
    }
    
    // Extract workshop actions
    const actionsContent = extractItemsAfterHeading(contentLines, 'WORKSHOP ONE ACTIONS / COMMITMENTS', 5);
    if (actionsContent.length > 0) {
      result.workshopOutput.actions = actionsContent;
    }
    
    // Extract reflections
    const reflectionsContent = extractContentAfterHeading(contentLines, 'What am I learning?');
    if (reflectionsContent) {
      result.workshopOutput.reflections = reflectionsContent.join('\n');
    }
  } catch (error) {
    console.error('Error mapping document content:', error);
  }
  
  return result;
};

// Function to extract content from table formatted documents
function extractFromTableFormat(lines: string[], result: ExtractedContent): void {
  try {
    // STEP 1: Find all the major section indexes in the document
    const sectionIndexes = {
      personalValues: -1,
      proudOf: -1,
      achievement: -1,
      happiness: -1,
      inspiration: -1,
      myValues: -1,
      myProductivity: -1,
      myGoals: -1
    };
    
    // Find indexes of all major sections
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Personal Values section 
      if (line.includes('MY PERSONAL VALUES') || 
          line.includes('PERSONAL VALUES') || 
          line.includes('Finding meaning and importance')) {
        sectionIndexes.personalValues = i;
      }
      
      // Proud of section
      if (line.includes('What am I most proud of?')) {
        sectionIndexes.proudOf = i;
      }
      
      // Achievement section
      if (line.includes('What did it take for me to achieve those things?')) {
        sectionIndexes.achievement = i;
      }
      
      // Happiness section
      if (line.includes('What makes me happiest in life?')) {
        sectionIndexes.happiness = i;
      }
      
      // Inspiration section
      if (line.includes('Who do I find inspiring') || line.includes('qualities I am admiring')) {
        sectionIndexes.inspiration = i;
      }
      
      // My Values section
      if (line.includes('MY VALUES') || line.includes('what matters most to me')) {
        sectionIndexes.myValues = i;
      }
      
      // My Productivity section
      if (line.includes('MY PRODUCTIVITY') || line.includes('link to my values')) {
        sectionIndexes.myProductivity = i;
      }
      
      // My Goals section
      if (line.includes('MY GOALS') || line.includes('what do I want to achieve')) {
        sectionIndexes.myGoals = i;
      }
    }
    
    // STEP 2: Extract content from each section
    
    // Get "What am I most proud of?" items
    if (sectionIndexes.proudOf >= 0) {
      const proudOfItems = extractNumberedItems(lines, sectionIndexes.proudOf, 3);
      if (proudOfItems.some(item => item.trim().length > 0)) {
        result.personalValues.proudOf = proudOfItems;
      }
      console.log('Extracted proud of items:', proudOfItems);
    }
    
    // Get "What did it take for me to achieve those things?" items
    if (sectionIndexes.achievement >= 0) {
      const achievementItems = extractNumberedItems(lines, sectionIndexes.achievement, 3);
      if (achievementItems.some(item => item.trim().length > 0)) {
        result.personalValues.achievement = achievementItems;
      }
      console.log('Extracted achievement items:', achievementItems);
    }
    
    // Get "What makes me happiest in life?" items
    if (sectionIndexes.happiness >= 0) {
      const happinessItems = extractNumberedItems(lines, sectionIndexes.happiness, 3);
      if (happinessItems.some(item => item.trim().length > 0)) {
        result.personalValues.happiness = happinessItems;
      }
      console.log('Extracted happiness items:', happinessItems);
    }
    
    // Get "Who do I find inspiring..." items
    if (sectionIndexes.inspiration >= 0) {
      const inspirationItems = extractNumberedItems(lines, sectionIndexes.inspiration, 3);
      if (inspirationItems.some(item => item.trim().length > 0)) {
        result.personalValues.inspiration = inspirationItems;
      }
      console.log('Extracted inspiration items:', inspirationItems);
    }
    
    // STEP 3: Extract MY VALUES content
    if (sectionIndexes.myValues >= 0) {
      const endIndex = findNextMajorSectionIndex(lines, sectionIndexes.myValues, [
        sectionIndexes.myProductivity, 
        sectionIndexes.myGoals
      ]);
      
      const coreValuesContent = [];
      const startIdx = sectionIndexes.myValues + 1;
      const endIdx = endIndex > 0 ? endIndex : Math.min(startIdx + 20, lines.length);
      
      for (let i = startIdx; i < endIdx; i++) {
        const line = lines[i].trim();
        if (line.length > 0) {
          coreValuesContent.push(line);
        }
      }
      
      if (coreValuesContent.length > 0) {
        result.productivityConnection.coreValues = coreValuesContent.join('\n');
      }
      console.log('Extracted core values:', coreValuesContent);
    }
    
    // STEP 4: Extract MY PRODUCTIVITY content
    if (sectionIndexes.myProductivity >= 0) {
      const endIndex = findNextMajorSectionIndex(lines, sectionIndexes.myProductivity, [
        sectionIndexes.myGoals
      ]);
      
      const productivityContent = [];
      const startIdx = sectionIndexes.myProductivity + 1;
      const endIdx = endIndex > 0 ? endIndex : Math.min(startIdx + 20, lines.length);
      
      for (let i = startIdx; i < endIdx; i++) {
        const line = lines[i].trim();
        if (line.length > 0) {
          productivityContent.push(line);
        }
      }
      
      if (productivityContent.length > 0) {
        result.productivityConnection.valueImpact = productivityContent.join('\n');
      }
      console.log('Extracted productivity content:', productivityContent);
    }
    
    // STEP 5: Process additional sections for goals and workshop outputs
    processAdditionalSections(lines, result);
    
    console.log('Extracted content from table format:', result);
  } catch (error) {
    console.error('Error extracting from table format:', error);
  }
}

// Helper to find the index of the next major section
function findNextMajorSectionIndex(lines: string[], currentIndex: number, possibleIndexes: number[]): number {
  // Filter out negative indexes and find the smallest one
  const validIndexes = possibleIndexes.filter(idx => idx > currentIndex);
  if (validIndexes.length > 0) {
    return Math.min(...validIndexes);
  }
  
  // If no valid indexes from the list, find the next heading
  return findNextSectionIndex(lines, currentIndex);
}

// Process additional sections that might be in the document
function processAdditionalSections(lines: string[], result: ExtractedContent): void {
  // Create a map of section keywords to their corresponding result property handlers
  const sectionHandlers = [
    { 
      keywords: ['What will be different for you'],
      handler: (content: string[]) => { result.goals.description = content.join('\n'); } 
    },
    { 
      keywords: ['How will you feel'],
      handler: (content: string[]) => { if (result.goals.impact.length > 0) result.goals.impact[0] = content.join('\n'); } 
    },
    { 
      keywords: ['Who benefits'],
      handler: (content: string[]) => { if (result.goals.impact.length > 1) result.goals.impact[1] = content.join('\n'); } 
    },
    { 
      keywords: ['I want to improve', 'improve my productivity'],
      handler: (content: string[]) => { if (result.goals.impact.length > 2) result.goals.impact[2] = content.join('\n'); } 
    },
    { 
      keywords: ['WORKSHOP ONE ACTIONS', 'WORKSHOP ACTIONS', 'ACTIONS / COMMITMENTS'],
      handler: (content: string[]) => { 
        // For action items, we want to extract up to 5 numbered or bullet items
        const actionItems = [];
        for (const line of content) {
          if (actionItems.length >= 5) break;
          
          // Skip header lines and short content
          if (isHeading(line) || line.length < 5) continue;
          
          // Add the line as an action item if it has substantial content
          if (line.length > 10) {
            // Clean the line of any bullet/number markers
            const cleanedLine = line.replace(/^\d+\.?\s*/, '').replace(/^[•\-*]\s*/, '').trim();
            if (cleanedLine.length > 0) {
              actionItems.push(cleanedLine);
            }
          }
        }
        
        // Ensure we have exactly 5 items
        while (actionItems.length < 5) {
          actionItems.push('');
        }
        
        result.workshopOutput.actions = actionItems.slice(0, 5);
      } 
    },
    { 
      keywords: ['What am I learning'],
      handler: (content: string[]) => { result.workshopOutput.reflections = content.join('\n'); } 
    }
  ];
  
  // Scan through the document to find these sections
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    
    // Check if this line matches any of our section keywords
    for (const section of sectionHandlers) {
      if (section.keywords.some(keyword => line.includes(keyword))) {
        // Extract content until the next section header
        const content = extractTextUntilNextHeader(lines, i + 1);
        if (content.length > 0) {
          // Call the appropriate handler function
          section.handler(content);
        }
        break; // Found a match, no need to check other keywords
      }
    }
  }
}

// Helper to extract text content until we hit the next section header
function extractTextUntilNextHeader(lines: string[], startIndex: number): string[] {
  const content = [];
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Stop if we hit what looks like a new section header
    if (i > startIndex && (isHeading(line) || line.includes('?'))) {
      break;
    }
    
    // Add non-empty content lines
    if (line.length > 0) {
      content.push(line);
    }
  }
  
  return content;
}

// Helper function to find the index of the next section heading
function findNextSectionIndex(lines: string[], currentIndex: number): number {
  for (let i = currentIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    // Check if this line looks like a section header
    if (isHeading(line) || 
        line.includes('?') || 
        /^[A-Z\s]{5,}/.test(line)) { // Lines with 5+ uppercase characters are likely headers
      return i;
    }
  }
  return -1; // No next section found
}

// Helper function to extract numbered items from a specific starting index
function extractNumberedItems(lines: string[], startIndex: number, maxItems: number): string[] {
  const items: string[] = [];
  
  // Look for content in a more flexible way
  // First, get the next section index to know where to stop looking
  const nextSectionIndex = findNextSectionIndex(lines, startIndex);
  const searchEndIndex = nextSectionIndex > 0 ? nextSectionIndex : Math.min(startIndex + 50, lines.length);
  
  // We'll look through all the lines between this section header and the next
  const relevantLines = lines.slice(startIndex + 1, searchEndIndex);
  
  // Store the text that might be associated with numbered items (1., 2., 3., etc.)
  const numberedContentMap = new Map<number, string>();
  
  // First pass: look for explicitly numbered items (1., 2., 3., etc.)
  for (const line of relevantLines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines and likely headers
    if (trimmedLine.length === 0 || isHeading(trimmedLine)) continue;
    
    // Check for a leading number pattern: '1.', '2.', etc.
    const numberMatch = trimmedLine.match(/^(\d+)\.?\s+/);
    if (numberMatch) {
      const itemNumber = parseInt(numberMatch[1], 10);
      if (itemNumber > 0 && itemNumber <= maxItems) {
        // Extract the content after the number
        const content = trimmedLine.replace(/^\d+\.?\s*/, '').trim();
        if (content.length > 0) {
          numberedContentMap.set(itemNumber, content);
        }
      }
    }
  }
  
  // Second pass: look for significant content blocks if we didn't find enough numbered items
  if (numberedContentMap.size < maxItems) {
    let currentItemNumber = 1;
    
    // Find substantive content blocks that aren't just numbers or very short phrases
    for (const line of relevantLines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines, headers, and already processed numbered items
      if (trimmedLine.length === 0 || 
          isHeading(trimmedLine) || 
          trimmedLine.match(/^\d+\.?\s+/)) {
        continue;
      }
      
      // Check if this is substantial content
      if (trimmedLine.length > 15) {
        // Make sure we don't already have this item number
        while (numberedContentMap.has(currentItemNumber) && currentItemNumber <= maxItems) {
          currentItemNumber++;
        }
        
        // If we still have room for more items, add this content
        if (currentItemNumber <= maxItems) {
          numberedContentMap.set(currentItemNumber, trimmedLine);
          currentItemNumber++;
        }
        
        // If we've filled all item slots, stop
        if (currentItemNumber > maxItems) {
          break;
        }
      }
    }
  }
  
  // Final pass: look for content associated with item numbers based on position
  // This handles cases where the UI might show numbers but the extracted text doesn't include them
  if (numberedContentMap.size < maxItems) {
    // Calculate roughly how many lines we'd expect between items based on document structure
    const totalRelevantLines = relevantLines.length;
    const expectedLinesPerItem = Math.max(1, Math.floor(totalRelevantLines / maxItems));
    
    // Use positional information to assign content to item numbers
    for (let i = 0; i < relevantLines.length; i++) {
      const line = relevantLines[i].trim();
      
      // Skip empty, very short lines, headers, and already processed numbered items
      if (line.length < 10 || 
          isHeading(line) || 
          line.match(/^\d+\.?\s+/)) {
        continue;
      }
      
      // Determine which item number this content might belong to based on position
      const estimatedItemNumber = Math.floor(i / expectedLinesPerItem) + 1;
      if (estimatedItemNumber <= maxItems && !numberedContentMap.has(estimatedItemNumber)) {
        numberedContentMap.set(estimatedItemNumber, line);
      }
    }
  }
  
  // Convert the map to an array preserving order
  for (let i = 1; i <= maxItems; i++) {
    items.push(numberedContentMap.get(i) || '');
  }
  
  // Ensure we have exactly the right number of items
  return items.slice(0, maxItems);
}

// Helper function to extract items following a heading pattern
function extractItemsAfterHeading(lines: string[], heading: string, maxItems: number): string[] {
  const items: string[] = [];
  let foundHeading = false;
  let itemCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (!foundHeading && line.includes(heading)) {
      foundHeading = true;
      continue;
    }
    
    if (foundHeading) {
      // Look for numbered items or bullet points
      if (line.match(/^\d+\./) || line.match(/^•/) || line.startsWith('-')) {
        // Clean the line by removing the number/bullet
        const cleanedLine = line.replace(/^\d+\./, '').replace(/^•/, '').replace(/^-/, '').trim();
        if (cleanedLine) {
          items.push(cleanedLine);
          itemCount++;
          
          if (itemCount >= maxItems) {
            break;
          }
        }
      } else if (itemCount > 0 && line.trim() && !isHeading(line)) {
        // This looks like a continuation of the previous item
        items[itemCount - 1] += ' ' + line.trim();
      } else if (isHeading(line)) {
        // We've hit the next heading, so stop
        break;
      }
    }
  }
  
  // Pad array to ensure we have the right number of items
  while (items.length < maxItems) {
    items.push('');
  }
  
  return items;
}

// Helper function to extract content between two headings
function extractContentBetweenHeadings(lines: string[], startHeading: string, endHeading: string): string[] | null {
  const content: string[] = [];
  let foundStart = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (!foundStart && line.includes(startHeading)) {
      foundStart = true;
      continue; // Skip the heading line
    }
    
    if (foundStart) {
      if (line.includes(endHeading)) {
        break;
      }
      
      // Skip if this is another heading
      if (!isHeading(line)) {
        content.push(line.trim());
      }
    }
  }
  
  return content.length > 0 ? content : null;
}

// Helper function to extract content after a heading
function extractContentAfterHeading(lines: string[], heading: string): string[] | null {
  const content: string[] = [];
  let foundHeading = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (!foundHeading && line.includes(heading)) {
      foundHeading = true;
      continue; // Skip the heading line
    }
    
    if (foundHeading) {
      // Stop if we hit another heading
      if (isHeading(line) && !line.includes(heading)) {
        break;
      }
      
      content.push(line.trim());
    }
  }
  
  return content.length > 0 ? content : null;
}

// Helper to check if a line is a heading
function isHeading(line: string): boolean {
  // Look for patterns that might indicate a heading
  return (
    /^MY [A-Z]+/.test(line) || // Matches "MY VALUES", "MY GOALS", etc.
    /^WORKSHOP [A-Z]+/.test(line) || // Matches "WORKSHOP ONE", etc.
    /^\d+\.\s+[A-Z]+/.test(line) || // Matches "1. PLAN", etc.
    line.includes('?') // Questions often serve as section headings
  );
}

// Main function to handle document upload and parsing
export const handleDocumentUpload = async (file: File): Promise<ExtractedContent> => {
  try {
    let documentText = '';
    
    if (file.type === 'application/pdf') {
      documentText = await parsePdfDocument(file);
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      file.type === 'application/msword'
    ) {
      documentText = await parseWordDocument(file);
    } else {
      throw new Error('Unsupported file type. Please upload a PDF or Word document.');
    }
    
    const extractedContent = mapContentToWorksheet(documentText);
    return extractedContent;
  } catch (error) {
    console.error('Error processing document:', error);
    throw error;
  }
}; 