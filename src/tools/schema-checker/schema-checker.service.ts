export type AuditLevel = 'error' | 'warning' | 'passed' | 'info';

export interface SchemaAuditItem {
  level: AuditLevel
  message: string
  path?: string
}

export interface SchemaEntity {
  type: string[]
  raw: Record<string, unknown>
}

function asTypes(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

function collectEntities(value: unknown, entities: SchemaEntity[]) {
  if (Array.isArray(value)) {
    value.forEach(item => collectEntities(item, entities));
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  const object = value as Record<string, unknown>;
  const types = asTypes(object['@type']);
  if (types.length) {
    entities.push({ type: types, raw: object });
  }
  if (Array.isArray(object['@graph'])) {
    collectEntities(object['@graph'], entities);
  }
}

export function extractJsonLd(input: string): { blocks: unknown[]; parseErrors: string[] } {
  const trimmed = input.trim();
  const blocks: unknown[] = [];
  const parseErrors: string[] = [];

  if (!trimmed) {
    return { blocks, parseErrors };
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      blocks.push(JSON.parse(trimmed));
    }
    catch (error) {
      parseErrors.push(error instanceof Error ? error.message : 'Invalid JSON-LD');
    }
    return { blocks, parseErrors };
  }

  const document = new DOMParser().parseFromString(input, 'text/html');
  document.querySelectorAll('script[type="application/ld+json"]').forEach((node, index) => {
    try {
      blocks.push(JSON.parse(node.textContent ?? ''));
    }
    catch (error) {
      parseErrors.push(`Block ${index + 1}: ${error instanceof Error ? error.message : 'Invalid JSON-LD'}`);
    }
  });

  return { blocks, parseErrors };
}

export function auditSchema(input: string) {
  const { blocks, parseErrors } = extractJsonLd(input);
  const entities: SchemaEntity[] = [];
  blocks.forEach(block => collectEntities(block, entities));
  const items: SchemaAuditItem[] = [];

  parseErrors.forEach(message => items.push({ level: 'error', message }));
  if (!blocks.length && !parseErrors.length) {
    items.push({ level: 'warning', message: 'No JSON-LD blocks found.' });
  }
  if (blocks.length) {
    items.push({ level: 'passed', message: `Found ${blocks.length} JSON-LD block${blocks.length === 1 ? '' : 's'}.` });
  }

  for (const [index, block] of blocks.entries()) {
    if (!block || typeof block !== 'object') {
      continue;
    }
    const object = block as Record<string, unknown>;
    if (!('@context' in object)) {
      items.push({ level: 'warning', message: 'Missing @context on top-level JSON-LD block.', path: `block[${index}]` });
    }
  }

  for (const [index, entity] of entities.entries()) {
    const path = `entity[${index}] (${entity.type.join(', ')})`;
    if (!entity.raw.name && !entity.raw.headline) {
      items.push({ level: 'warning', message: 'Entity has no name or headline.', path });
    }
    if (['Article', 'NewsArticle', 'BlogPosting', 'Product', 'Organization', 'LocalBusiness'].some(type => entity.type.includes(type)) && !entity.raw.image) {
      items.push({ level: 'info', message: 'Consider adding image for richer search presentation.', path });
    }
    if (entity.raw.url && typeof entity.raw.url !== 'string') {
      items.push({ level: 'warning', message: 'url should normally be a string URL.', path });
    }
  }

  if (entities.length) {
    items.push({ level: 'passed', message: `Parsed ${entities.length} typed schema entit${entities.length === 1 ? 'y' : 'ies'}.` });
  }
  items.push({ level: 'info', message: 'Schema.org validity does not guarantee eligibility for Google rich results.' });

  return { blocks, entities, items };
}
