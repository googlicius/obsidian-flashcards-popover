export function splitTextByTags(text: string, tags: string[]): string[][] {
    // Convert tags array to regex pattern
    const tagPattern = tags.map(tag => tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    
    // Create regex that matches tags only when they're on their own line
    const regex = new RegExp(`^[\\t ]*(${tagPattern})[\\t ]*$`, 'gm');
    
    // Find all matches with their positions
    const matches = [...text.matchAll(regex)];
    
    // If no matches found, return original text in array
    if (matches.length === 0) {
        return [['', text]];
    }

    const results: string[][] = [];
    let lastIndex = 0;

    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];

        // If this is not the first match and there's content between matches
        if (i > 0) {
            const prevMatch = matches[i-1];
            const currentSection = text.slice(lastIndex, match.index ?? 0).trimEnd();
            results.push([prevMatch[1], currentSection]);
        }
        
        // Use nullish coalescing operator to handle potential undefined
        lastIndex = match.index ?? 0;
        
        // If this is the last match, add the remaining text
        if (i === matches.length - 1) {
            const finalSection = text.slice(lastIndex).trimEnd();
            results.push([match[1], finalSection]);
        }
    }

    return results;
}
