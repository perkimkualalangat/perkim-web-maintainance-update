import { CodeBlock } from '@astryxdesign/core/CodeBlock';

export function LogPanel({ content, language = 'bash', maxHeight = '400px' }) {
  return (
    <CodeBlock 
      language={language} 
      maxHeight={maxHeight} 
      overflow="auto"
      padding="md"
    >
      {content || 'Belum dijalankan'}
    </CodeBlock>
  );
}