export interface DeveloperWorkflow {
  name: string
  description: string
  keywords: string[]
  paths: string[]
}

export const developerWorkflows: DeveloperWorkflow[] = [
  {
    name: 'API Debugging',
    description: 'Inspect tokens, URLs, payloads and HTTP responses in one practical flow.',
    keywords: ['api', 'debug', 'jwt', 'url', 'json', 'http'],
    paths: ['/jwt-parser', '/url-parser', '/json-viewer', '/http-status-codes'],
  },
  {
    name: 'Security Toolkit',
    description: 'Check password strength and work with hashes, HMAC and bcrypt.',
    keywords: ['security', 'password', 'hash', 'hmac', 'bcrypt'],
    paths: ['/password-strength-analyser', '/hash-text', '/hmac-generator', '/bcrypt'],
  },
  {
    name: 'Network Troubleshooting',
    description: 'Move from subnet math to address conversion, ranges and MAC lookup.',
    keywords: ['network', 'ipv4', 'subnet', 'range', 'mac'],
    paths: ['/ipv4-subnet-calculator', '/ipv4-address-converter', '/ipv4-range-expander', '/mac-address-lookup'],
  },
  {
    name: 'JSON Conversion',
    description: 'Transform JSON into common configuration and interchange formats.',
    keywords: ['json', 'yaml', 'toml', 'xml', 'csv', 'convert'],
    paths: ['/json-to-yaml-converter', '/json-to-toml', '/json-to-xml', '/json-to-csv'],
  },
];
