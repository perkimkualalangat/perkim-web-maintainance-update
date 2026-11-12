import { Section } from '@astryxdesign/core/Section';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';

/** Seragamkan padding dan irama semua halaman. */
export function Page({ children, fill = false }) {
  return (
    <Section
      padding={4}
      paddingInline={5}
      height={fill ? '100%' : undefined}>
      <VStack gap={5} height={fill ? '100%' : undefined} minHeight={fill ? 0 : undefined}>
        {children}
      </VStack>
    </Section>
  );
}

export function PageHeader({ title, description, badge, actions, endContent }) {
  return (
    <HStack hAlign="between" vAlign="start" gap={4} wrap="wrap">
      <VStack gap={1}>
        <HStack gap={2} vAlign="center" wrap="wrap">
          <Heading level={1}>{title}</Heading>
          {badge}
        </HStack>
        {description ? (
          <Text type="body" color="secondary" textWrap="pretty">
            {description}
          </Text>
        ) : null}
      </VStack>
      {actions || endContent ? (
        <HStack gap={2} vAlign="center" wrap="wrap">
          {endContent}
          {actions}
        </HStack>
      ) : null}
    </HStack>
  );
}

export function CountBadge({ count, label }) {
  return <Badge variant="neutral" label={label ? `${count} ${label}` : String(count)} />;
}

export function SectionHeading({ title, description, endContent }) {
  return (
    <HStack hAlign="between" vAlign="end" gap={3} wrap="wrap">
      <VStack gap={1}>
        <Heading level={2}>{title}</Heading>
        {description ? (
          <Text type="supporting" color="secondary">
            {description}
          </Text>
        ) : null}
      </VStack>
      {endContent}
    </HStack>
  );
}
