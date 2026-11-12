import { TextInput } from '@astryxdesign/core/TextInput';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/Stack';
import { TerminalIcon } from '@heroicons/react/24/outline';

export function CommandInput({ value, onChange, onRun, disabled, placeholder = 'ls -la, node --version, npm outdated, dll.' }) {
  return (
    <HStack gap="sm" wrap>
      <TextInput
        label="Perintah"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        flex="1"
        minWidth="300px"
        startIcon={<TerminalIcon />}
      />
      <Button variant="primary" onClick={onRun} disabled={disabled || !value.trim()}>
        {disabled ? 'Menjalankan...' : 'Jalankan'}
      </Button>
    </HStack>
  );
}