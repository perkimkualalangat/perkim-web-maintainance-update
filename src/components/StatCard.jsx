import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';

export function StatCard({ label, value, hint }) {
  return (
    <Card padding={4}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Text type="supporting" color="secondary">{label}</Text>
        <Text type="display-1" weight="semibold">{value}</Text>
        {hint && <Text type="supporting" color="secondary">{hint}</Text>}
      </div>
    </Card>
  );
}