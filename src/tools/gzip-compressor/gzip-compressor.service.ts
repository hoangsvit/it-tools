function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const compact = value.replace(/\s+/g, '');
  const binary = atob(compact);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function streamToUint8Array(stream: ReadableStream<Uint8Array>) {
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

export function supportsGzipStreams() {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
}

export async function gzipTextToBase64(value: string) {
  if (!supportsGzipStreams()) {
    throw new Error('Compression Streams API is not supported by this browser.');
  }

  const input = new Blob([new TextEncoder().encode(value)]).stream();
  const compressed = input.pipeThrough(new CompressionStream('gzip'));
  return bytesToBase64(await streamToUint8Array(compressed));
}

export async function gunzipBase64ToText(value: string) {
  if (!supportsGzipStreams()) {
    throw new Error('Compression Streams API is not supported by this browser.');
  }

  const bytes = base64ToBytes(value);
  const input = new Blob([bytes]).stream();
  const decompressed = input.pipeThrough(new DecompressionStream('gzip'));
  const output = await streamToUint8Array(decompressed);
  return new TextDecoder().decode(output);
}

export function isLikelyGzipBase64(value: string) {
  const compact = value.replace(/\s+/g, '');
  return compact.startsWith('H4sI') && /^[A-Za-z0-9+/]+=*$/.test(compact);
}
