import type { Entry } from '@/contexts/EntryContext';

/**
 * Convert BlockNote content to Markdown
 */
export function blockNoteToMarkdown(content: any): string {
  if (!content) return '';

  // If content is a string, return as is
  if (typeof content === 'string') {
    return content;
  }

  // If content is an array of blocks, convert each block
  if (Array.isArray(content)) {
    return content.map(block => convertBlockToMarkdown(block)).join('\n\n');
  }

  return '';
}

/**
 * Convert a single BlockNote block to Markdown
 */
function convertBlockToMarkdown(block: any): string {
  if (!block || !block.type) return '';

  switch (block.type) {
    case 'paragraph':
      return convertInlineContent(block.content || []);

    case 'heading':
      const level = block.props?.level || 1;
      const headingPrefix = '#'.repeat(level);
      return `${headingPrefix} ${convertInlineContent(block.content || [])}`;

    case 'bulletListItem':
      return `- ${convertInlineContent(block.content || [])}`;

    case 'numberedListItem':
      return `1. ${convertInlineContent(block.content || [])}`;

    case 'divider':
      return '---';

    case 'table':
      return convertTableToMarkdown(block);

    case 'image':
      const imageUrl = block.props?.url || '';
      const imageCaption = block.props?.caption || 'image';
      return `![${imageCaption}](${imageUrl})`;

    case 'video':
      const videoUrl = block.props?.url || '';
      return `[Video: ${videoUrl}](${videoUrl})`;

    case 'audio':
      const audioUrl = block.props?.url || '';
      return `[Audio: ${audioUrl}](${audioUrl})`;

    case 'file':
      const fileUrl = block.props?.url || '';
      const fileName = block.props?.name || 'file';
      return `[${fileName}](${fileUrl})`;

    default:
      return convertInlineContent(block.content || []);
  }
}

/**
 * Convert inline content (text with styles) to Markdown
 */
function convertInlineContent(content: any[]): string {
  if (!Array.isArray(content)) return '';

  return content
    .map(item => {
      if (item.type === 'text') {
        let text = item.text || '';
        const styles = item.styles || {};

        // Apply styles
        if (styles.bold) text = `**${text}**`;
        if (styles.italic) text = `*${text}*`;
        if (styles.underline) text = `<u>${text}</u>`;
        if (styles.strike) text = `~~${text}~~`;
        if (styles.code) text = `\`${text}\``;

        return text;
      }
      return '';
    })
    .join('');
}

/**
 * Convert table block to Markdown table
 */
function convertTableToMarkdown(block: any): string {
  const rows = block.content?.rows || [];
  if (rows.length === 0) return '';

  const lines: string[] = [];

  // Header row
  if (rows[0]) {
    const headerCells = rows[0].cells || [];
    lines.push('| ' + headerCells.map((cell: any) => convertInlineContent(cell.content || [])).join(' | ') + ' |');
    lines.push('| ' + headerCells.map(() => '---').join(' | ') + ' |');
  }

  // Data rows
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].cells || [];
    lines.push('| ' + cells.map((cell: any) => convertInlineContent(cell.content || [])).join(' | ') + ' |');
  }

  return lines.join('\n');
}

/**
 * Export a single entry as Markdown file
 */
export function exportEntryAsMarkdown(entry: Entry): void {
  const markdown = blockNoteToMarkdown(entry.content);
  
  // Add frontmatter with metadata
  const date = new Date(entry.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const frontmatter = `---
date: ${date}
id: ${entry.id}
---

`;

  const fullContent = frontmatter + markdown;

  // Create and download the file
  const blob = new Blob([fullContent], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  
  // Use date as filename
  const filename = `${new Date(entry.date).toISOString().split('T')[0]}.md`;
  a.download = filename;
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export all entries as Markdown files in a zip
 */
export async function exportAllEntriesAsMarkdown(entries: Entry[]): Promise<void> {
  // For now, just export each entry individually
  // We could enhance this to create a zip file with all entries
  for (const entry of entries) {
    exportEntryAsMarkdown(entry);
    // Add a small delay between downloads to avoid browser blocking
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
