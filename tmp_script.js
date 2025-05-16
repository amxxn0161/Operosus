const fs = require('fs'); const path = require('path'); const filePath = path.resolve('src/utils/documentParser.ts'); fs.copyFileSync(filePath, filePath + '.bak'); const data = fs.readFileSync(filePath, 'utf8'); const newData = data.replace(/\/\/ Define pattern categories[^}]*inspiration: \[[^\]]*\][^\}]*\}/s, '// Check if fields appear to be swapped based on structural analysis rather than content patterns
    const fieldCounts = {
      proudOf: result.proudOf.filter(Boolean).length,
      achievement: result.achievement.filter(Boolean).length,
      happiness: result.happiness.filter(Boolean).length,
      inspiration: result.inspiration.filter(Boolean).length
    };
    
    // Check for common grid pattern issues
    const has2x2GridPattern = (
      (fieldCounts.proudOf > 0 && fieldCounts.achievement === 0 && 
       fieldCounts.happiness > 0 && fieldCounts.inspiration === 0) ||
      (fieldCounts.proudOf === 0 && fieldCounts.achievement > 0 && 
       fieldCounts.happiness === 0 && fieldCounts.inspiration > 0)
    );
    
    if (has2x2GridPattern) {
      console.log(\'Detected 2x2 grid pattern with imbalanced field mapping\');
      
      if (fieldCounts.proudOf > 0 && fieldCounts.achievement === 0) {
        console.log(\'Rebalancing fields based on structural analysis\');
        result.achievement = [...result.happiness];
        result.happiness = [\'\', \'\', \'\'];
      }
      else if (fieldCounts.proudOf === 0 && fieldCounts.achievement > 0) {
        console.log(\'Rebalancing fields based on structural analysis\');
        result.proudOf = [...result.achievement];
        result.achievement = [...result.inspiration];
        result.inspiration = [\'\', \'\', \'\'];
      }
    }
    
    // Track field consistency'); fs.writeFileSync(filePath, newData); console.log('Successfully updated documentParser.ts');
