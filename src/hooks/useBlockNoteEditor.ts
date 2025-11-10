import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteSchema, defaultBlockSpecs, getDefaultSlashMenuItems } from '@blocknote/core';
import type { PartialBlock } from '@blocknote/core';
import { mediaStorage } from '@/lib/mediaStorage';

/**
 * Custom hook to create a BlockNote editor with only the block types we need
 * Configured for: Heading 1-3, Numbered List, Bullet List, Paragraph, Divider
 */
export function useBlockNoteEditor(initialContent?: PartialBlock[]) {
  // Create a custom schema with block types including table and media
  const schema = BlockNoteSchema.create({
    blockSpecs: {
      // Include the block types we need
      paragraph: defaultBlockSpecs.paragraph,
      heading: defaultBlockSpecs.heading,
      bulletListItem: defaultBlockSpecs.bulletListItem,
      numberedListItem: defaultBlockSpecs.numberedListItem,
      divider: defaultBlockSpecs.divider,
      // Add table support
      table: defaultBlockSpecs.table,
      // Add media support
      image: defaultBlockSpecs.image,
      video: defaultBlockSpecs.video,
      audio: defaultBlockSpecs.audio,
      file: defaultBlockSpecs.file,
    },
  });

  // Create the editor with our custom schema
  const editor = useCreateBlockNote({
    schema,
    initialContent: initialContent || [
      {
        type: 'paragraph',
        content: [],
      },
    ],
    // Add placeholder text
    placeholders: {
      default: 'you can just typein...',
    },
    // Upload handler for media files - stores in IndexedDB
    uploadFile: async (file: File) => {
      try {
        console.log('Uploading file to IndexedDB:', file.name);
        const url = await mediaStorage.uploadFile(file);
        console.log('File uploaded successfully:', url);
        return url;
      } catch (error) {
        console.error('Failed to upload file:', error);
        throw error;
      }
    },
    // Filter default slash menu items to show our commands including table and media
    slashCommands: (editor: any) => {
      const defaultItems = getDefaultSlashMenuItems(editor);
      
      // Filter to only include our desired commands
      // We want: Heading 1-3, Lists, Paragraph, Divider, Table, Image, Video, Audio, File
      return defaultItems.filter((item: any) => {
        const name = item.name?.toLowerCase() || '';
        
        // Only include specific items
        return (
          name === 'heading 1' ||
          name === 'heading 2' ||
          name === 'heading 3' ||
          name === 'numbered list' ||
          name === 'bullet list' ||
          name === 'paragraph' ||
          name === 'divider' ||
          name === 'table' ||
          name === 'image' ||
          name === 'video' ||
          name === 'audio' ||
          name === 'file'
        );
      });
    },
  });

  return editor;
}
