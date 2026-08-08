import { isAfter, subWeeks } from 'date-fns';
import type { Tool } from './tools.types';

type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type ToolDefinition = WithOptional<Tool, 'isNew' | 'origin' | 'capabilities' | 'privacy'>;

export function defineTool(tool: ToolDefinition): Tool {
  const isNew = tool.createdAt ? isAfter(tool.createdAt, subWeeks(new Date(), 2)) : false;

  return {
    isNew,
    origin: 'core',
    ...tool,
  };
}
