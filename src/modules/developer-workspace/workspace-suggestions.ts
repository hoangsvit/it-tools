export type WorkspaceDetectedKind =
  | 'jwt'
  | 'json'
  | 'url'
  | 'url-encoded'
  | 'xml'
  | 'yaml'
  | 'base64'
  | 'ipv4'
  | 'mac'
  | 'sql'
  | 'docker-run'
  | 'cron'
  | 'user-agent'
  | 'email'
  | 'iban'
  | 'bic'
  | 'markdown';

export interface WorkspaceToolCandidate {
  path: string
  name: string
  description: string
  category: string
  keywords: string[]
}

export interface WorkspaceInputDetection {
  kind: WorkspaceDetectedKind
  label: string
  confidence: number
}

export interface WorkspaceToolSuggestion extends WorkspaceInputDetection {
  toolPath: string
  toolName: string
  category: string
  description: string
  reason: string
  score: number
}

interface DetectionRule extends WorkspaceInputDetection {
  preferredPaths: string[]
  keywords: string[]
}

const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const MAC_PATTERN = /^(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const IBAN_PATTERN = /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/i;
const BIC_PATTERN = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/i;

function isJson(value: string) {
  if (!value || (!value.startsWith('{') && !value.startsWith('['))) {
    return false;
  }

  try {
    JSON.parse(value);
    return true;
  }
  catch {
    return false;
  }
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  }
  catch {
    return false;
  }
}

function isIpv4(value: string) {
  const parts = value.split('.');
  return parts.length === 4
    && parts.every((part) => {
      if (!/^\d{1,3}$/.test(part)) {
        return false;
      }

      const numeric = Number(part);
      return numeric >= 0 && numeric <= 255;
    });
}

function looksLikeYaml(value: string) {
  if (!value || isJson(value)) {
    return false;
  }

  if (value.startsWith('---')) {
    return true;
  }

  const yamlLines = value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => /^[\w.-]+\s*:\s*.+/.test(line));

  return yamlLines.length >= 2;
}

function looksLikeXml(value: string) {
  return /^<\?xml\s|^<[A-Za-z][^>]*>[\s\S]*<\/[A-Za-z][^>]*>$/i.test(value);
}

function looksLikeBase64(value: string) {
  const compact = value.replace(/\s+/g, '');
  return compact.length >= 16
    && compact.length % 4 === 0
    && BASE64_PATTERN.test(compact)
    && !/^[0-9]+$/.test(compact);
}

function looksLikeSql(value: string) {
  return /^(?:with\b[\s\S]+?\bselect\b|select|insert\s+into|update|delete\s+from|create\s+(?:table|view|index)|alter\s+table|drop\s+(?:table|view))\b/i.test(value);
}

function looksLikeCron(value: string) {
  const parts = value.split(/\s+/);
  return (parts.length === 5 || parts.length === 6)
    && parts.every(part => /^[\d*/?,LW#-]+$/i.test(part));
}

function looksLikeUserAgent(value: string) {
  return /^(?:Mozilla\/\d|curl\/\d|PostmanRuntime\/\d|python-requests\/\d|Go-http-client\/\d)/i.test(value);
}

function looksLikeMarkdown(value: string) {
  return /(^|\n)(?:#{1,6}\s+|[-*+]\s+|```|>\s+)|\[[^\]]+\]\([^)]+\)/.test(value);
}

export function detectWorkspaceInput(rawValue: string): WorkspaceInputDetection[] {
  const value = rawValue.trim();
  if (!value) {
    return [];
  }

  return buildDetectionRules(value).map(({ kind, label, confidence }) => ({ kind, label, confidence }));
}

function buildDetectionRules(value: string): DetectionRule[] {
  const rules: DetectionRule[] = [];
  const compactBankValue = value.replace(/[\s-]+/g, '');

  if (JWT_PATTERN.test(value)) {
    rules.push({
      kind: 'jwt',
      label: 'JWT token',
      confidence: 0.99,
      preferredPaths: ['/jwt-parser'],
      keywords: ['jwt', 'token', 'decode', 'parser'],
    });
  }

  if (isJson(value)) {
    rules.push({
      kind: 'json',
      label: 'JSON',
      confidence: 0.98,
      preferredPaths: [
        '/json-viewer',
        '/json-minify',
        '/json-to-yaml-converter',
        '/json-to-csv',
        '/json-to-xml',
        '/json-to-toml',
        '/json-diff',
      ],
      keywords: ['json', 'viewer', 'minify', 'yaml', 'csv', 'xml', 'toml'],
    });
  }

  if (isHttpUrl(value)) {
    rules.push({
      kind: 'url',
      label: 'URL',
      confidence: 0.98,
      preferredPaths: ['/url-parser', '/url-encoder', '/qrcode-generator'],
      keywords: ['url', 'uri', 'query', 'encode', 'qr'],
    });
  }

  if (/%[0-9a-f]{2}/i.test(value)) {
    rules.push({
      kind: 'url-encoded',
      label: 'URL-encoded text',
      confidence: 0.88,
      preferredPaths: ['/url-encoder'],
      keywords: ['url', 'encode', 'decode'],
    });
  }

  if (looksLikeXml(value)) {
    rules.push({
      kind: 'xml',
      label: 'XML',
      confidence: 0.96,
      preferredPaths: ['/xml-formatter', '/xml-to-json'],
      keywords: ['xml', 'format', 'json'],
    });
  }

  if (looksLikeYaml(value)) {
    rules.push({
      kind: 'yaml',
      label: 'YAML',
      confidence: 0.88,
      preferredPaths: ['/yaml-prettify', '/yaml-to-json-converter', '/yaml-to-toml'],
      keywords: ['yaml', 'viewer', 'json', 'toml'],
    });
  }

  if (looksLikeBase64(value) && !JWT_PATTERN.test(value) && !IBAN_PATTERN.test(compactBankValue)) {
    rules.push({
      kind: 'base64',
      label: 'Base64',
      confidence: 0.78,
      preferredPaths: ['/base64-string-converter'],
      keywords: ['base64', 'decode', 'encode'],
    });
  }

  if (isIpv4(value)) {
    rules.push({
      kind: 'ipv4',
      label: 'IPv4 address',
      confidence: 0.99,
      preferredPaths: ['/ipv4-address-converter', '/ipv4-subnet-calculator'],
      keywords: ['ipv4', 'ip', 'address', 'subnet'],
    });
  }

  if (MAC_PATTERN.test(value)) {
    rules.push({
      kind: 'mac',
      label: 'MAC address',
      confidence: 0.99,
      preferredPaths: ['/mac-address-lookup'],
      keywords: ['mac', 'address', 'lookup'],
    });
  }

  if (looksLikeSql(value)) {
    rules.push({
      kind: 'sql',
      label: 'SQL',
      confidence: 0.94,
      preferredPaths: ['/sql-prettify'],
      keywords: ['sql', 'format', 'prettify'],
    });
  }

  if (/^docker\s+run\b/i.test(value)) {
    rules.push({
      kind: 'docker-run',
      label: 'docker run command',
      confidence: 0.99,
      preferredPaths: ['/docker-run-to-docker-compose-converter'],
      keywords: ['docker', 'compose', 'run', 'converter'],
    });
  }

  if (looksLikeCron(value)) {
    rules.push({
      kind: 'cron',
      label: 'cron expression',
      confidence: 0.84,
      preferredPaths: ['/crontab-generator'],
      keywords: ['cron', 'crontab', 'schedule'],
    });
  }

  if (looksLikeUserAgent(value)) {
    rules.push({
      kind: 'user-agent',
      label: 'User-Agent',
      confidence: 0.96,
      preferredPaths: ['/user-agent-parser'],
      keywords: ['user', 'agent', 'parser', 'browser'],
    });
  }

  if (EMAIL_PATTERN.test(value)) {
    rules.push({
      kind: 'email',
      label: 'email address',
      confidence: 0.96,
      preferredPaths: ['/email-normalizer'],
      keywords: ['email', 'normalize'],
    });
  }

  if (IBAN_PATTERN.test(compactBankValue)) {
    rules.push({
      kind: 'iban',
      label: 'IBAN',
      confidence: 0.97,
      preferredPaths: ['/iban-validator-and-parser'],
      keywords: ['iban', 'bank', 'bban', 'validator', 'parser'],
    });
  }

  if (BIC_PATTERN.test(compactBankValue)) {
    rules.push({
      kind: 'bic',
      label: 'SWIFT / BIC',
      confidence: 0.96,
      preferredPaths: ['/swift-bic-validator', '/vietqr-bank-generator'],
      keywords: ['swift', 'bic', 'bank', 'routing', 'validator'],
    });
  }

  if (looksLikeMarkdown(value)) {
    rules.push({
      kind: 'markdown',
      label: 'Markdown',
      confidence: 0.82,
      preferredPaths: ['/markdown-to-html'],
      keywords: ['markdown', 'html'],
    });
  }

  return rules;
}

function candidateScore(candidate: WorkspaceToolCandidate, rule: DetectionRule) {
  const preferredIndex = rule.preferredPaths.indexOf(candidate.path);
  const preferredScore = preferredIndex >= 0 ? 100 - preferredIndex * 6 : 0;
  const haystack = `${candidate.path} ${candidate.name} ${candidate.description} ${candidate.keywords.join(' ')}`.toLowerCase();
  const keywordScore = rule.keywords.reduce((score, keyword) => (
    haystack.includes(keyword.toLowerCase()) ? score + 5 : score
  ), 0);

  return preferredScore + keywordScore + Math.round(rule.confidence * 20);
}

export function suggestWorkspaceTools({
  value,
  tools,
  excludePaths = [],
  limit = 3,
}: {
  value: string
  tools: WorkspaceToolCandidate[]
  excludePaths?: string[]
  limit?: number
}): WorkspaceToolSuggestion[] {
  const trimmed = value.trim();
  if (!trimmed || limit <= 0) {
    return [];
  }

  const rules = buildDetectionRules(trimmed);
  if (rules.length === 0) {
    return [];
  }

  const excluded = new Set(excludePaths);
  const bestByPath = new Map<string, WorkspaceToolSuggestion>();

  for (const rule of rules) {
    for (const tool of tools) {
      if (excluded.has(tool.path)) {
        continue;
      }

      const score = candidateScore(tool, rule);
      const isPreferred = rule.preferredPaths.includes(tool.path);
      if (!isPreferred && score < 30) {
        continue;
      }

      const suggestion: WorkspaceToolSuggestion = {
        toolPath: tool.path,
        toolName: tool.name,
        category: tool.category,
        description: tool.description,
        kind: rule.kind,
        label: rule.label,
        confidence: rule.confidence,
        reason: isPreferred
          ? `Detected ${rule.label}; this tool is a strong match.`
          : `Detected ${rule.label}; this tool matches the data and related keywords.`,
        score,
      };

      const existing = bestByPath.get(tool.path);
      if (!existing || suggestion.score > existing.score) {
        bestByPath.set(tool.path, suggestion);
      }
    }
  }

  return [...bestByPath.values()]
    .sort((a, b) => b.score - a.score || a.toolName.localeCompare(b.toolName))
    .slice(0, limit);
}
