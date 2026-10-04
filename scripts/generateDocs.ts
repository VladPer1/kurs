import fs from 'fs';
import path from 'path';
import { swaggerDocument } from '../backend/src/docs/swaggerSpec.js';

const outputDir = path.resolve(process.cwd(), 'docs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 1. Write swagger.json
const jsonPath = path.join(outputDir, 'swagger.json');
fs.writeFileSync(jsonPath, JSON.stringify(swaggerDocument, null, 2), 'utf-8');

// 2. Simple YAML output generator
function toYaml(obj: any, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (obj === null || obj === undefined) return 'null\n';
  if (typeof obj === 'string') return `"${obj.replace(/"/g, '\\"')}"\n`;
  if (typeof obj === 'number' || typeof obj === 'boolean') return `${obj}\n`;
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]\n';
    return obj.map((item) => `${pad}- ${toYaml(item, indent + 1).trimStart()}`).join('');
  }
  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}\n';
    return keys
      .map((k) => {
        const val = obj[k];
        if (typeof val === 'object' && val !== null && !Array.isArray(val) && Object.keys(val).length > 0) {
          return `${pad}${k}:\n${toYaml(val, indent + 1)}`;
        }
        if (Array.isArray(val) && val.length > 0) {
          return `${pad}${k}:\n${toYaml(val, indent + 1)}`;
        }
        return `${pad}${k}: ${toYaml(val, indent + 1)}`;
      })
      .join('');
  }
  return String(obj) + '\n';
}

const yamlPath = path.join(outputDir, 'swagger.yaml');
fs.writeFileSync(yamlPath, toYaml(swaggerDocument), 'utf-8');

console.log('====================================================');
console.log('✅ Swaggo Documentation Generated Successfully!');
console.log(`📄 JSON Spec: ${jsonPath}`);
console.log(`📄 YAML Spec: ${yamlPath}`);
console.log(`📊 Endpoints: ${Object.keys(swaggerDocument.paths || {}).length} paths documented`);
console.log('====================================================');
