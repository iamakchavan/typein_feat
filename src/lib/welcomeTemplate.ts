import type { PartialBlock } from '@blocknote/core';

export const WELCOME_NOTE_BLOCKS: PartialBlock[] = [
  {
    type: 'heading',
    props: { level: 3 },
    content: [
      {
        type: 'text',
        text: 'Welcome to typein! ✦',
        styles: {}
      }
    ]
  },
  {
    type: 'paragraph',
    content: [
      {
        type: 'text',
        text: 'Here is a quick guide to help you get started with your new distraction-free writing space:',
        styles: {}
      }
    ]
  },
  {
    type: 'paragraph',
    content: []
  },
  {
    type: 'heading',
    props: { level: 3 },
    content: [
      {
        type: 'text',
        text: '✍ Writing & Formatting',
        styles: {}
      }
    ]
  },
  {
    type: 'bulletListItem',
    content: [
      {
        type: 'text',
        text: 'Autosave: ',
        styles: { bold: true }
      },
      {
        type: 'text',
        text: 'Just start typing! Everything you write is saved automatically.',
        styles: {}
      }
    ]
  },
  {
    type: 'bulletListItem',
    content: [
      {
        type: 'text',
        text: 'Slash Commands: ',
        styles: { bold: true }
      },
      {
        type: 'text',
        text: 'Type ',
        styles: {}
      },
      {
        type: 'text',
        text: '/',
        styles: { code: true }
      },
      {
        type: 'text',
        text: ' to open the Slash Menu to insert Headings, Lists, Code Blocks, Tables, or Dividers.',
        styles: {}
      }
    ]
  },
  {
    type: 'bulletListItem',
    content: [
      {
        type: 'text',
        text: 'Formatting: ',
        styles: { bold: true }
      },
      {
        type: 'text',
        text: 'Select any text to open the rich formatting bubble for Bold, Italic, Underline, Strikethrough, or Code styles.',
        styles: {}
      }
    ]
  },
  {
    type: 'paragraph',
    content: []
  },
  {
    type: 'heading',
    props: { level: 3 },
    content: [
      {
        type: 'text',
        text: '⌨ Keyboard Shortcuts',
        styles: {}
      }
    ]
  },
  {
    type: 'bulletListItem',
    content: [
      {
        type: 'text',
        text: 'Toggle Sidebar: ',
        styles: { bold: true }
      },
      {
        type: 'text',
        text: 'Ctrl + \\',
        styles: { code: true }
      },
      {
        type: 'text',
        text: ' / ',
        styles: {}
      },
      {
        type: 'text',
        text: 'Cmd + \\',
        styles: { code: true }
      },
      {
        type: 'text',
        text: ' or ',
        styles: {}
      },
      {
        type: 'text',
        text: 'Ctrl/Cmd + B',
        styles: { code: true }
      }
    ]
  },
  {
    type: 'bulletListItem',
    content: [
      {
        type: 'text',
        text: 'Open Settings: ',
        styles: { bold: true }
      },
      {
        type: 'text',
        text: 'Ctrl + ,',
        styles: { code: true }
      },
      {
        type: 'text',
        text: ' / ',
        styles: {}
      },
      {
        type: 'text',
        text: 'Cmd + ,',
        styles: { code: true }
      }
    ]
  },
  {
    type: 'bulletListItem',
    content: [
      {
        type: 'text',
        text: 'Command Palette: ',
        styles: { bold: true }
      },
      {
        type: 'text',
        text: 'Ctrl + K',
        styles: { code: true }
      },
      {
        type: 'text',
        text: ' / ',
        styles: {}
      },
      {
        type: 'text',
        text: 'Cmd + K',
        styles: { code: true }
      },
      {
        type: 'text',
        text: ' (Quick Search & Actions on Desktop)',
        styles: {}
      }
    ]
  },
  {
    type: 'bulletListItem',
    content: [
      {
        type: 'text',
        text: 'Undo & Redo: ',
        styles: { bold: true }
      },
      {
        type: 'text',
        text: 'Ctrl/Cmd + Z',
        styles: { code: true }
      },
      {
        type: 'text',
        text: ' / ',
        styles: {}
      },
      {
        type: 'text',
        text: 'Ctrl/Cmd + Y',
        styles: { code: true }
      }
    ]
  },
  {
    type: 'bulletListItem',
    content: [
      {
        type: 'text',
        text: 'Save manually: ',
        styles: { bold: true }
      },
      {
        type: 'text',
        text: 'Ctrl/Cmd + S',
        styles: { code: true }
      },
      {
        type: 'text',
        text: ' (forces database saving, though it autosaves!)',
        styles: {}
      }
    ]
  },
  {
    type: 'paragraph',
    content: []
  },
  {
    type: 'heading',
    props: { level: 3 },
    content: [
      {
        type: 'text',
        text: '📁 Managing & Exporting Notes',
        styles: {}
      }
    ]
  },
  {
    type: 'bulletListItem',
    content: [
      {
        type: 'text',
        text: 'View History: ',
        styles: { bold: true }
      },
      {
        type: 'text',
        text: 'Open the Sidebar (top-left button or shortcut) to view your history log.',
        styles: {}
      }
    ]
  },
  {
    type: 'bulletListItem',
    content: [
      {
        type: 'text',
        text: 'Pin Notes: ',
        styles: { bold: true }
      },
      {
        type: 'text',
        text: 'Pin up to 5 important notes to the top of the history pane.',
        styles: {}
      }
    ]
  },
  {
    type: 'bulletListItem',
    content: [
      {
        type: 'text',
        text: 'Branch Off: ',
        styles: { bold: true }
      },
      {
        type: 'text',
        text: "Click 'Branch Off' in any entry's options to duplicate its content into today's slot.",
        styles: {}
      }
    ]
  },
  {
    type: 'bulletListItem',
    content: [
      {
        type: 'text',
        text: 'Download individual notes: ',
        styles: { bold: true }
      },
      {
        type: 'text',
        text: 'Export as Markdown (',
        styles: {}
      },
      {
        type: 'text',
        text: '.md',
        styles: { code: true }
      },
      {
        type: 'text',
        text: '), Plain Text (',
        styles: {}
      },
      {
        type: 'text',
        text: '.txt',
        styles: { code: true }
      },
      {
        type: 'text',
        text: '), or JSON (',
        styles: {}
      },
      {
        type: 'text',
        text: '.json',
        styles: { code: true }
      },
      {
        type: 'text',
        text: ') via the entry options menu.',
        styles: {}
      }
    ]
  },
  {
    type: 'bulletListItem',
    content: [
      {
        type: 'text',
        text: 'Full Backup & Restore: ',
        styles: { bold: true }
      },
      {
        type: 'text',
        text: 'Go to Settings (top-right button or shortcut) to backup or import your entire database as a ZIP archive.',
        styles: {}
      }
    ]
  },
  {
    type: 'paragraph',
    content: []
  },
  {
    type: 'paragraph',
    content: [
      {
        type: 'text',
        text: 'Enjoy writing! ✍',
        styles: {}
      }
    ]
  }
];
