import { promises as fs } from 'fs';
import path from 'path';

const files = [
  'frontend/src/App.tsx',
  'frontend/src/components/landing/LandingHero.tsx',
  'frontend/src/components/landing/ProductForm.tsx',
  'frontend/src/components/dashboard/DashboardView.tsx',
  'frontend/src/components/dashboard/MetricTrendCard.tsx',
  'frontend/src/components/dashboard/WorldMapCard.tsx',
  'frontend/src/components/dashboard/RecommendationsPanel.tsx',
  'frontend/src/components/dashboard/NextStepsCard.tsx',
  'frontend/src/components/dashboard/TariffCard.tsx',
  'frontend/src/components/dashboard/PdfReport.tsx',
  'frontend/src/data/ttp-measures.ts'
];

const projectRoot = process.cwd();

const decodeUnicode = (input) =>
  input.replace(/\\u([\dA-Fa-f]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)));

async function processFile(relativePath) {
  const absolutePath = path.resolve(projectRoot, relativePath);
  const original = await fs.readFile(absolutePath, 'utf8');
  const withoutBom = original.startsWith('\uFEFF') ? original.slice(1) : original;
  const decoded = decodeUnicode(withoutBom);
  await fs.writeFile(absolutePath, decoded, 'utf8');
}

async function main() {
  await Promise.all(files.map(processFile));
  console.log('Encoding fix applied to target files.');
}

main().catch((error) => {
  console.error('Failed to fix encoding:', error);
  process.exitCode = 1;
});
