import type { PartialBlock } from '@blocknote/core';
import { extractPlainTextFromBlocks } from './migration';

/**
 * Helper functions for working with entries that can have either
 * plain text or BlockNote format content
 */

/**
 * Get plain text from entry content (works with both formats)
 */
export function getEntryPlainText(content: string | PartialBlock[]): string {
  if (typeof content === 'string') {
    return content;
  }
  return extractPlainTextFromBlocks(content);
}

/**
 * Get content preview (first line, truncated)
 */
export function getContentPreview(content: string | PartialBlock[], maxLength: number = 100): string {
  const plainText = getEntryPlainText(content);
  const firstLine = plainText.split('\n')[0];
  
  if (firstLine.length > maxLength) {
    return firstLine.slice(0, maxLength) + '...';
  }
  
  return firstLine;
}

/**
 * Check if entry content is empty
 */
export function isContentEmpty(content: string | PartialBlock[]): boolean {
  const plainText = getEntryPlainText(content);
  return plainText.trim() === '';
}

/**
 * Get entry title (first line or default)
 */
export function getEntryTitle(content: string | PartialBlock[], defaultTitle: string = 'Untitled Entry'): string {
  const plainText = getEntryPlainText(content);
  const firstLine = plainText.split('\n')[0].trim();
  
  if (!firstLine) {
    return defaultTitle;
  }
  
  if (firstLine.length > 50) {
    return firstLine.slice(0, 50) + '...';
  }
  
  return firstLine;
}

/**
 * Search in entry content (case-insensitive)
 */
export function searchInContent(content: string | PartialBlock[], searchTerm: string): boolean {
  const plainText = getEntryPlainText(content);
  return plainText.toLowerCase().includes(searchTerm.toLowerCase());
}
