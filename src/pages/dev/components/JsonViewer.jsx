import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Button } from '@astryxdesign/core/Button';
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline';

export function JsonViewer({ data, label = 'Salin', copyValue }) {
  const valueToCopy = copyValue ?? JSON.stringify(data, null, 2);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(valueToCopy)}>
        <ClipboardDocumentIcon /> {label}
      </Button>
      <CodeBlock language="json" mt="sm">{valueToCopy}</CodeBlock>
    </>
  );
}