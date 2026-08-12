import type { Component } from 'vue';

export type ToolPrivacyMode = 'local' | 'external' | 'mixed';
export type ToolOrigin = 'core' | 'eplus' | 'vietnam' | 'community' | 'experimental';
export type ToolCapability =
  | 'text-input'
  | 'file-input'
  | 'clipboard'
  | 'shareable-state'
  | 'offline'
  | 'network'
  | 'sensitive-data';

export interface ToolPrivacy {
  mode: ToolPrivacyMode
  summary: string
  endpoints?: string[]
}

export interface Tool {
  name: string
  path: string
  description: string
  keywords: string[]
  component: () => Promise<Component>
  icon: Component
  redirectFrom?: string[]
  isNew: boolean
  createdAt?: Date
  origin?: ToolOrigin
  capabilities?: ToolCapability[]
  privacy?: ToolPrivacy
  wideContent?: boolean
}

export interface ToolCategory {
  name: string
  components: Tool[]
}

export type ToolWithCategory = Tool & { category: string };
