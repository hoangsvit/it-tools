import { describe, expect, it } from 'vitest';
import { detectWorkspaceFileKind, parsePngDimensions } from './workspace-file-inspector';

describe('workspace file inspector', () => {
  it('detects common binary signatures', () => {
    expect(detectWorkspaceFileKind(Uint8Array.from([0xFF, 0xD8, 0xFF]))).toBe('jpeg');
    expect(detectWorkspaceFileKind(Uint8Array.from([0x50, 0x4B, 0x03, 0x04]))).toBe('zip');
    expect(detectWorkspaceFileKind(new TextEncoder().encode('%PDF-1.7'))).toBe('pdf');
  });

  it('parses PNG dimensions from the IHDR header', () => {
    const bytes = new Uint8Array(24);
    bytes.set([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], 0);
    const view = new DataView(bytes.buffer);
    view.setUint32(16, 1200);
    view.setUint32(20, 630);

    expect(parsePngDimensions(bytes)).toEqual({ width: 1200, height: 630 });
  });

  it('uses text extensions as a fallback', () => {
    expect(detectWorkspaceFileKind(new Uint8Array(), 'query.sql', '')).toBe('text');
    expect(detectWorkspaceFileKind(new Uint8Array(), 'payload.json', '')).toBe('json');
  });
});
