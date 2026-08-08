import { detectWorkspaceInput } from './workspace-suggestions';

export type WorkspaceFileKind =
  | 'png'
  | 'jpeg'
  | 'webp'
  | 'pdf'
  | 'zip'
  | 'gzip'
  | 'pe'
  | 'json'
  | 'text'
  | 'binary';

export interface WorkspaceFileInspection {
  name: string
  size: number
  mimeType: string
  extension: string
  kind: WorkspaceFileKind
  sha256?: string
  width?: number
  height?: number
  pageCount?: number
  textPreview?: string
  detectedTextKinds: string[]
}

const MAX_PREVIEW_BYTES = 2 * 1024 * 1024;
const MAX_HASH_BYTES = 20 * 1024 * 1024;

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}

function asciiAt(bytes: Uint8Array, offset: number, value: string) {
  return [...value].every((character, index) => bytes[offset + index] === character.charCodeAt(0));
}

export function detectWorkspaceFileKind(bytes: Uint8Array, fileName = '', mimeType = ''): WorkspaceFileKind {
  if (startsWith(bytes, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) {
    return 'png';
  }
  if (startsWith(bytes, [0xFF, 0xD8, 0xFF])) {
    return 'jpeg';
  }
  if (bytes.length >= 12 && asciiAt(bytes, 0, 'RIFF') && asciiAt(bytes, 8, 'WEBP')) {
    return 'webp';
  }
  if (asciiAt(bytes, 0, '%PDF-')) {
    return 'pdf';
  }
  if (startsWith(bytes, [0x50, 0x4B, 0x03, 0x04])) {
    return 'zip';
  }
  if (startsWith(bytes, [0x1F, 0x8B])) {
    return 'gzip';
  }
  if (startsWith(bytes, [0x4D, 0x5A])) {
    return 'pe';
  }

  const extension = fileName.split('.').pop()?.toLowerCase();
  if (mimeType.includes('json') || extension === 'json') {
    return 'json';
  }
  if (mimeType.startsWith('text/') || ['txt', 'md', 'csv', 'xml', 'yaml', 'yml', 'toml', 'sql', 'log'].includes(extension ?? '')) {
    return 'text';
  }

  return 'binary';
}

export function parsePngDimensions(bytes: Uint8Array) {
  if (bytes.length < 24 || detectWorkspaceFileKind(bytes) !== 'png') {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function isProbablyText(bytes: Uint8Array) {
  const sample = bytes.slice(0, Math.min(bytes.length, 8192));
  if (sample.length === 0) {
    return true;
  }

  let controlCharacters = 0;
  for (const byte of sample) {
    if (byte === 0) {
      return false;
    }
    if (byte < 9 || (byte > 13 && byte < 32)) {
      controlCharacters += 1;
    }
  }

  return controlCharacters / sample.length < 0.02;
}

function estimatePdfPageCount(text: string) {
  return (text.match(/\/Type\s*\/Page\b/g) ?? []).length || undefined;
}

export async function inspectWorkspaceFile(file: File): Promise<WorkspaceFileInspection> {
  const previewBuffer = await file.slice(0, MAX_PREVIEW_BYTES).arrayBuffer();
  const previewBytes = new Uint8Array(previewBuffer);
  const kind = detectWorkspaceFileKind(previewBytes, file.name, file.type);
  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() ?? '' : '';

  const result: WorkspaceFileInspection = {
    name: file.name,
    size: file.size,
    mimeType: file.type || 'application/octet-stream',
    extension,
    kind,
    detectedTextKinds: [],
  };

  if (kind === 'png') {
    Object.assign(result, parsePngDimensions(previewBytes));
  }

  const textLike = kind === 'json' || kind === 'text' || (kind === 'pdf') || isProbablyText(previewBytes);
  if (textLike) {
    const preview = new TextDecoder('utf-8', { fatal: false }).decode(previewBytes);
    result.textPreview = preview.slice(0, 120_000);
    result.detectedTextKinds = detectWorkspaceInput(result.textPreview).map(item => item.label);
    if (kind === 'pdf') {
      result.pageCount = estimatePdfPageCount(preview);
    }
  }

  if (file.size <= MAX_HASH_BYTES && globalThis.crypto?.subtle) {
    const fullBuffer = await file.arrayBuffer();
    const digest = await globalThis.crypto.subtle.digest('SHA-256', fullBuffer);
    result.sha256 = bytesToHex(new Uint8Array(digest));
  }

  return result;
}

export function formatWorkspaceFileInspection(inspection: WorkspaceFileInspection) {
  return JSON.stringify({
    name: inspection.name,
    size: inspection.size,
    mimeType: inspection.mimeType,
    extension: inspection.extension,
    kind: inspection.kind,
    sha256: inspection.sha256 ?? 'Skipped for files larger than 20 MB',
    dimensions: inspection.width && inspection.height
      ? `${inspection.width}x${inspection.height}`
      : undefined,
    estimatedPages: inspection.pageCount,
    detectedTextKinds: inspection.detectedTextKinds,
  }, null, 2);
}
