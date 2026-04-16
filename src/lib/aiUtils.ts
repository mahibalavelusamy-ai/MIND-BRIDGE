/**
 * AI Utility Functions
 */

/**
 * Safely parses a JSON string from an AI response, 
 * stripping Markdown code blocks if present.
 */
export function safeJsonParse<T>(text: string, defaultValue: T): T {
  try {
    // 1. Clean the text: remove markdown code blocks
    let cleanText = text.trim();
    
    // Remove ```json ... ``` or ``` ... ```
    if (cleanText.startsWith('```')) {
      const lines = cleanText.split('\n');
      // Remove first line if it starts with ```
      if (lines[0].startsWith('```')) {
        lines.shift();
      }
      // Remove last line if it starts with ```
      if (lines.length > 0 && lines[lines.length - 1].startsWith('```')) {
        lines.pop();
      }
      cleanText = lines.join('\n').trim();
    }

    // 2. Parse the cleaned text
    return JSON.parse(cleanText) as T;
  } catch (error) {
    console.error("Failed to parse AI JSON response:", error, "\nOriginal text:", text);
    return defaultValue;
  }
}
