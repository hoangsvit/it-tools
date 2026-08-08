import type { DeveloperWorkspace, WorkspaceStep } from './workspace.model';

interface WorkspaceShareStep {
  toolPath: string
  input?: string
  output?: string
  notes?: string
}

interface WorkspaceSharePayload {
  version: 1
  name: string
  steps: WorkspaceShareStep[]
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

export function encodeWorkspaceShare(workspace: DeveloperWorkspace, includeData = false) {
  const payload: WorkspaceSharePayload = {
    version: 1,
    name: workspace.name,
    steps: workspace.steps.map(step => ({
      toolPath: step.toolPath,
      ...(includeData
        ? {
            input: step.input,
            output: step.output,
            notes: step.notes,
          }
        : {}),
    })),
  };

  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

function isShareStep(value: unknown): value is WorkspaceShareStep {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.toolPath === 'string'
    && (candidate.input === undefined || typeof candidate.input === 'string')
    && (candidate.output === undefined || typeof candidate.output === 'string')
    && (candidate.notes === undefined || typeof candidate.notes === 'string');
}

export function decodeWorkspaceShare(value: string): Pick<DeveloperWorkspace, 'name' | 'steps'> | null {
  try {
    const decoded = new TextDecoder().decode(base64UrlToBytes(value));
    const payload = JSON.parse(decoded) as Partial<WorkspaceSharePayload>;

    if (payload.version !== 1 || typeof payload.name !== 'string' || !Array.isArray(payload.steps)) {
      return null;
    }

    const validSteps = payload.steps.filter(isShareStep).slice(0, 30);
    if (validSteps.length === 0) {
      return null;
    }

    return {
      name: payload.name.slice(0, 80) || 'Shared workspace',
      steps: validSteps.map((step, index): WorkspaceStep => ({
        id: `shared-step-${index + 1}`,
        toolPath: step.toolPath,
        input: step.input ?? '',
        output: step.output ?? '',
        notes: step.notes ?? '',
      })),
    };
  }
  catch {
    return null;
  }
}

export function buildWorkspaceShareUrl({
  workspace,
  includeData = false,
  baseUrl,
}: {
  workspace: DeveloperWorkspace
  includeData?: boolean
  baseUrl: string
}) {
  const url = new URL('/workspace', baseUrl);
  url.searchParams.set('recipe', encodeWorkspaceShare(workspace, includeData));
  if (includeData) {
    url.searchParams.set('data', '1');
  }
  return url.toString();
}
