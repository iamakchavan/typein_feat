import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/shadcn/style.css';

/**
 * Test component to verify BlockNote integration with shadcn
 * This uses your existing shadcn/ui components for perfect design consistency
 */
export function BlockNoteTest() {
  const editor = useCreateBlockNote();

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc' }}>
      <h2>BlockNote Test Component (shadcn/ui)</h2>
      <p>If you can see the editor below, BlockNote with shadcn is working!</p>
      <BlockNoteView editor={editor} theme="light" />
    </div>
  );
}
