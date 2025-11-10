import { v4 as uuidv4 } from 'uuid';
import type { Entry } from '@/contexts/EntryContext';
import { db } from './db';

/**
 * Parse frontmatter from markdown content
 */
function parseFrontmatter(content: string): { metadata: Record<string, any>; content: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { metadata: {}, content };
  }

  const [, frontmatterStr, mainContent] = match;
  const metadata: Record<string, any> = {};

  // Parse frontmatter lines
  frontmatterStr.split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      metadata[key.trim()] = valueParts.join(':').trim();
    }
  });

  return { metadata, content: mainContent };
}

/**
 * Convert Markdown to BlockNote format
 */
function markdownToBlockNote(markdown: string): any[] {
  const lines = markdown.split('\n');
  const blocks: any[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headings
    if (line.startsWith('### ')) {
      blocks.push({
        type: 'heading',
        props: { level: 3 },
        content: [{ type: 'text', text: line.slice(4), styles: {} }],
      });
    } else if (line.startsWith('## ')) {
      blocks.push({
        type: 'heading',
        props: { level: 2 },
        content: [{ type: 'text', text: line.slice(3), styles: {} }],
      });
    } else if (line.startsWith('# ')) {
      blocks.push({
        type: 'heading',
        props: { level: 1 },
        content: [{ type: 'text', text: line.slice(2), styles: {} }],
      });
    }
    // Bullet list
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      blocks.push({
        type: 'bulletListItem',
        content: parseInlineMarkdown(line.slice(2)),
      });
    }
    // Numbered list
    else if (/^\d+\.\s/.test(line)) {
      blocks.push({
        type: 'numberedListItem',
        content: parseInlineMarkdown(line.replace(/^\d+\.\s/, '')),
      });
    }
    // Divider
    else if (line.trim() === '---' || line.trim() === '***') {
      blocks.push({
        type: 'divider',
      });
    }
    // Empty line
    else if (line.trim() === '') {
      // Skip empty lines between blocks
      continue;
    }
    // Paragraph
    else {
      blocks.push({
        type: 'paragraph',
        content: parseInlineMarkdown(line),
      });
    }
  }

  return blocks.length > 0 ? blocks : [{ type: 'paragraph', content: [] }];
}

/**
 * Parse inline markdown (bold, italic, code, etc.)
 */
function parseInlineMarkdown(text: string): any[] {
  if (!text) return [];

  const content: any[] = [];
  let currentText = '';
  let i = 0;

  while (i < text.length) {
    // Bold (**text**)
    if (text.slice(i, i + 2) === '**') {
      if (currentText) {
        content.push({ type: 'text', text: currentText, styles: {} });
        currentText = '';
      }
      i += 2;
      let boldText = '';
      while (i < text.length && text.slice(i, i + 2) !== '**') {
        boldText += text[i];
        i++;
      }
      if (boldText) {
        content.push({ type: 'text', text: boldText, styles: { bold: true } });
      }
      i += 2;
    }
    // Italic (*text*)
    else if (text[i] === '*' && text[i + 1] !== '*') {
      if (currentText) {
        content.push({ type: 'text', text: currentText, styles: {} });
        currentText = '';
      }
      i++;
      let italicText = '';
      while (i < text.length && text[i] !== '*') {
        italicText += text[i];
        i++;
      }
      if (italicText) {
        content.push({ type: 'text', text: italicText, styles: { italic: true } });
      }
      i++;
    }
    // Code (`text`)
    else if (text[i] === '`') {
      if (currentText) {
        content.push({ type: 'text', text: currentText, styles: {} });
        currentText = '';
      }
      i++;
      let codeText = '';
      while (i < text.length && text[i] !== '`') {
        codeText += text[i];
        i++;
      }
      if (codeText) {
        content.push({ type: 'text', text: codeText, styles: { code: true } });
      }
      i++;
    }
    // Regular text
    else {
      currentText += text[i];
      i++;
    }
  }

  if (currentText) {
    content.push({ type: 'text', text: currentText, styles: {} });
  }

  return content.length > 0 ? content : [{ type: 'text', text: '', styles: {} }];
}

/**
 * Import a Markdown file
 */
export async function importMarkdownFile(file: File, retainDate: boolean): Promise<Entry> {
  const content = await file.text();
  const { metadata, content: mainContent } = parseFrontmatter(content);

  // Determine the date
  let date: string;
  if (retainDate && metadata.date) {
    // Try to parse the date from frontmatter
    date = new Date(metadata.date).toISOString();
  } else {
    // Use today's date
    date = new Date().toISOString();
  }

  // Convert markdown to BlockNote format
  const blockNoteContent = markdownToBlockNote(mainContent);

  // Always generate a new ID to avoid overwriting existing entries
  // Only reuse the ID if we're retaining the date (restore scenario)
  const entry: Entry = {
    id: retainDate && metadata.id ? metadata.id : uuidv4(),
    date,
    content: blockNoteContent,
    contentFormat: 'blocknote',
  };

  // Save to database
  await db.saveEntry(entry);

  return entry;
}

/**
 * Import a plain text file
 */
export async function importTextFile(file: File): Promise<Entry> {
  const content = await file.text();

  // Convert plain text to BlockNote format
  const lines = content.split('\n');
  const blockNoteContent = lines.map((line) => ({
    type: 'paragraph' as const,
    content: line ? [{ type: 'text' as const, text: line, styles: {} }] : [],
  }));

  const entry: Entry = {
    id: uuidv4(),
    date: new Date().toISOString(), // Always use today's date for .txt
    content: blockNoteContent.length > 0 ? blockNoteContent : [{ type: 'paragraph', content: [] }],
    contentFormat: 'blocknote',
  };

  // Save to database
  await db.saveEntry(entry);

  return entry;
}
