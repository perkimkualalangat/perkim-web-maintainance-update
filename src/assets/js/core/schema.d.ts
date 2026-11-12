export const ENTITY_TYPES: readonly [
  'systems', 'components', 'weaknesses', 'fallbacks', 'costs',
  'actors', 'evidence', 'principles', 'cases', 'topics',
  'narratives', 'captures', 'reflexivity', 'exitvoice', 'unknownunknown',
  'layers', 'metrics'
];

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ message: string; path?: string }>;
}

export function validate(type: string, record: any): ValidationResult;
export function validateUnique(type: string, records: any[]): Array<{ message: string }>;
export function collectRefIssues(data: Record<string, any[]>): Array<{
  entity: string;
  id: string;
  field: string;
  missing: string[];
  referenceType: string;
}>;