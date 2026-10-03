import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';
const spec = z.object({
  name: z.literal('exitcheck'),
  version: z.string(),
  'create-scaffold-hbar': z.object({
    capabilities: z.object({
      frontend: z.tuple([z.literal('nextjs-app')]),
      solidityFramework: z.tuple([z.literal('hardhat')]),
      packageManager: z.tuple([z.literal('npm')]),
    }),
    defaults: z.object({
      frontend: z.literal('nextjs-app'),
      solidityFramework: z.literal('hardhat'),
      packageManager: z.literal('npm'),
    }),
  }),
});
if (existsSync('template.json'))
  spec.parse(JSON.parse(readFileSync('template.json', 'utf8')));
else
  console.log(
    'CLI removes template.json after generation; checking generated project structure.',
  );
for (const p of [
  'README.md',
  'AGENTS.md',
  'LICENSE',
  'packages/core/package.json',
  'packages/nextjs/package.json',
  'packages/hardhat/package.json',
  '.env.example',
])
  if (!existsSync(p)) throw new Error(`Missing ${p}`);
console.log('Template manifest and required project files validated.');
