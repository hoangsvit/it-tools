import { Code } from '@vicons/tabler';
import { defineTool } from '../tool';

export const tool = defineTool({
  name: 'CSS unit converter',
  path: '/css-unit-converter',
  description: 'Convert CSS values between PX and REM, EM, or percentage with configurable root, parent, and reference sizes.',
  keywords: [
    'css',
    'unit',
    'converter',
    'px to rem',
    'rem to px',
    'px to em',
    'em to px',
    'px to percentage',
    'percentage to px',
    'pixel',
    'rem',
    'em',
    'percent',
    'font size',
    'responsive design',
  ],
  component: () => import('./css-unit-converter.vue'),
  icon: Code,
  createdAt: new Date('2026-08-13'),
});
