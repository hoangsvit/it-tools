import type { ToolCategory, ToolOrigin } from './tools.types';

export interface ToolExtension {
  id: string
  name: string
  description: string
  version: string
  origin: ToolOrigin
  categories: ToolCategory[]
}

export function defineToolExtension(extension: ToolExtension) {
  return extension;
}

export function flattenToolExtensions(extensions: ToolExtension[]) {
  return extensions.flatMap(extension => extension.categories);
}
