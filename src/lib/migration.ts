import type { Block, PartialBlock } from '@blocknote/core';

/**
 * Migration utilities for converting plain text entries to BlockNote format
 * These functions ensure zero data loss during the migration process
 */

export interface MigrationResult {
  success: boolean;
  originalContent: string;
  migratedContent: PartialBlock[];
  error?: string;
}

/**
 * Converts plain text content to BlockNote's block structure
 * Preserves all line breaks and content exactly as it was
 * 
 * @param plainText - The original plain text content
 * @returns Array of BlockNote blocks representing the content
 */
export function convertPlainTextToBlocks(plainText: string): PartialBlock[] {
  // Handle empty content
  if (!plainText || plainText.trim() === '') {
    return [{
      type: 'paragraph',
      content: [],
    }];
  }

  // Split by newlines to preserve line structure
  const lines = plainText.split('\n');
  const blocks: PartialBlock[] = [];

  for (const line of lines) {
    if (line.trim() === '') {
      // Empty line becomes an empty paragraph block
      blocks.push({
        type: 'paragraph',
        content: [],
      });
    } else {
      // Non-empty line becomes a paragraph with text content
      blocks.push({
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: line,
            styles: {},
          },
        ],
      });
    }
  }

  return blocks;
}

/**
 * Safely migrates an entry's content from plain text to BlockNote format
 * Includes error handling to preserve original content on failure
 * 
 * @param plainText - The original plain text content
 * @returns MigrationResult with success status and migrated content
 */
export function migrateEntryContent(plainText: string): MigrationResult {
  try {
    const migratedContent = convertPlainTextToBlocks(plainText);
    
    return {
      success: true,
      originalContent: plainText,
      migratedContent,
    };
  } catch (error) {
    console.error('Migration failed:', error);
    
    return {
      success: false,
      originalContent: plainText,
      migratedContent: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Detects whether content is in plain text or BlockNote JSON format
 * 
 * @param content - The content to check (string or object)
 * @returns 'plaintext' | 'blocknote' | 'unknown'
 */
export function detectContentFormat(content: any): 'plaintext' | 'blocknote' | 'unknown' {
  // If it's a string, it's plain text
  if (typeof content === 'string') {
    return 'plaintext';
  }

  // If it's an array, check if it looks like BlockNote blocks
  if (Array.isArray(content)) {
    // Check if first item has BlockNote block structure
    if (content.length > 0 && content[0]?.type && typeof content[0].type === 'string') {
      return 'blocknote';
    }
  }

  return 'unknown';
}

/**
 * Validates that BlockNote content is properly structured
 * 
 * @param blocks - The blocks to validate
 * @returns true if valid, false otherwise
 */
export function validateBlockNoteContent(blocks: any): blocks is PartialBlock[] {
  if (!Array.isArray(blocks)) {
    return false;
  }

  // Check each block has required structure
  for (const block of blocks) {
    if (!block || typeof block !== 'object') {
      return false;
    }
    
    if (!block.type || typeof block.type !== 'string') {
      return false;
    }
  }

  return true;
}

/**
 * Extracts plain text from BlockNote blocks
 * Useful for export and copy operations
 * 
 * @param blocks - BlockNote blocks
 * @returns Plain text representation
 */
export function extractPlainTextFromBlocks(blocks: Block[] | PartialBlock[]): string {
  const lines: string[] = [];

  for (const block of blocks) {
    if (block.content && Array.isArray(block.content)) {
      // Extract text from inline content
      const lineText = block.content
        .filter((item: any) => item.type === 'text')
        .map((item: any) => item.text || '')
        .join('');
      
      lines.push(lineText);
    } else {
      // Empty block becomes empty line
      lines.push('');
    }
  }

  return lines.join('\n');
}
