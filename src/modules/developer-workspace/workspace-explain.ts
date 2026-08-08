import { detectWorkspaceInput } from './workspace-suggestions';

export interface WorkspaceExplanationFact {
  label: string
  value: string
}

export interface WorkspaceExplanation {
  kind: string
  title: string
  summary: string
  facts: WorkspaceExplanationFact[]
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function explainJwt(value: string): WorkspaceExplanation {
  const parts = value.split('.');
  const facts: WorkspaceExplanationFact[] = [
    { label: 'Segments', value: String(parts.length) },
  ];

  try {
    const header = JSON.parse(decodeBase64Url(parts[0] ?? '')) as Record<string, unknown>;
    const payload = JSON.parse(decodeBase64Url(parts[1] ?? '')) as Record<string, unknown>;

    if (typeof header.alg === 'string') {
      facts.push({ label: 'Algorithm', value: header.alg });
    }
    if (typeof payload.iss === 'string') {
      facts.push({ label: 'Issuer', value: payload.iss });
    }
    if (typeof payload.sub === 'string') {
      facts.push({ label: 'Subject', value: payload.sub });
    }
    if (typeof payload.exp === 'number') {
      const expiresAt = new Date(payload.exp * 1000);
      facts.push({ label: 'Expires', value: expiresAt.toLocaleString() });
      facts.push({ label: 'Status', value: expiresAt.getTime() > Date.now() ? 'Not expired' : 'Expired' });
    }
  }
  catch {
    facts.push({ label: 'Payload', value: 'Could not decode as JSON' });
  }

  return {
    kind: 'jwt',
    title: 'JWT token',
    summary: 'A three-part JSON Web Token. Decode claims before trusting them; parsing a token does not verify its signature.',
    facts,
  };
}

function explainJson(value: string): WorkspaceExplanation {
  const parsed = JSON.parse(value) as unknown;
  const isArray = Array.isArray(parsed);
  const facts: WorkspaceExplanationFact[] = [
    { label: 'Top level', value: isArray ? 'Array' : typeof parsed === 'object' && parsed !== null ? 'Object' : typeof parsed },
  ];

  if (isArray) {
    facts.push({ label: 'Items', value: String(parsed.length) });
  }
  else if (parsed && typeof parsed === 'object') {
    facts.push({ label: 'Top-level keys', value: String(Object.keys(parsed).length) });
  }

  facts.push({ label: 'Characters', value: value.length.toLocaleString() });

  return {
    kind: 'json',
    title: 'JSON data',
    summary: 'Structured JSON that can be inspected, formatted, converted or queried with other developer tools.',
    facts,
  };
}

function explainUrl(value: string): WorkspaceExplanation {
  const url = new URL(value);
  return {
    kind: 'url',
    title: 'URL',
    summary: 'A web URL split into its transport, host, path and query components.',
    facts: [
      { label: 'Protocol', value: url.protocol.replace(':', '').toUpperCase() },
      { label: 'Host', value: url.host },
      { label: 'Path', value: url.pathname || '/' },
      { label: 'Query parameters', value: String([...url.searchParams.keys()].length) },
      ...(url.hash ? [{ label: 'Fragment', value: url.hash.slice(1) }] : []),
    ],
  };
}

function explainIpv4(value: string): WorkspaceExplanation {
  const first = Number(value.split('.')[0]);
  const second = Number(value.split('.')[1]);
  const privateAddress = first === 10
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168);

  return {
    kind: 'ipv4',
    title: 'IPv4 address',
    summary: 'A dotted-decimal IPv4 address. Use the subnet and address tools for network calculations.',
    facts: [
      { label: 'Scope', value: privateAddress ? 'Private RFC1918 range' : 'Not an RFC1918 private range' },
      { label: 'Octets', value: value.split('.').join(' · ') },
    ],
  };
}

export function explainWorkspaceInput(rawValue: string): WorkspaceExplanation | null {
  const value = rawValue.trim();
  if (!value) {
    return null;
  }

  const detection = detectWorkspaceInput(value)[0];
  if (!detection) {
    return {
      kind: 'unknown',
      title: 'Unclassified text',
      summary: 'Workspace cannot confidently classify this input yet. You can still choose any tool manually.',
      facts: [
        { label: 'Characters', value: value.length.toLocaleString() },
        { label: 'Lines', value: String(value.split(/\r?\n/).length) },
      ],
    };
  }

  try {
    if (detection.kind === 'jwt') {
      return explainJwt(value);
    }
    if (detection.kind === 'json') {
      return explainJson(value);
    }
    if (detection.kind === 'url') {
      return explainUrl(value);
    }
    if (detection.kind === 'ipv4') {
      return explainIpv4(value);
    }
  }
  catch {
    // Fall through to the generic explanation when a specific parser rejects the input.
  }

  return {
    kind: detection.kind,
    title: detection.label,
    summary: `Workspace detected this input as ${detection.label} with ${Math.round(detection.confidence * 100)}% confidence.`,
    facts: [
      { label: 'Confidence', value: `${Math.round(detection.confidence * 100)}%` },
      { label: 'Characters', value: value.length.toLocaleString() },
      { label: 'Lines', value: String(value.split(/\r?\n/).length) },
    ],
  };
}
