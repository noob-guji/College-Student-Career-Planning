const fs = require('fs');
const path = require('path');

const replacements = [
  ['@/components/AuthProvider', '@/src/features/auth/components/AuthProvider'],
  ['@/components/SlidingAuth', '@/src/features/auth/components/SlidingAuth'],
  ['@/app/components/AIAssistantWidget', '@/src/features/dashboard-core/components/AIAssistantWidget'],
  ['@/app/components/SmartEditorTool', '@/src/features/dashboard-core/components/SmartEditorTool'],
  ['@/app/components/BlueprintReport', '@/src/features/matching-center/components/BlueprintReport'],
  ['@/app/components/CapabilityInputForm', '@/src/features/matching-center/components/CapabilityInputForm'],
  ['@/app/components/CapabilityPortraitDashboard', '@/src/features/matching-center/components/CapabilityPortraitDashboard'],
  ['@/app/components/JobProfileCard', '@/src/features/matching-center/components/JobProfileCard'],
  ['@/app/components/JobKnowledgeGraph', '@/src/features/jobs/components/JobKnowledgeGraph'],
  ['@/app/components/MBTILanding', '@/src/features/self-cognition/components/MBTILanding'],
  ['@/app/components/MBTIModal', '@/src/features/self-cognition/components/MBTIModal'],
  ['@/app/components/PersonalityDetailsModal', '@/src/features/self-cognition/components/PersonalityDetailsModal'],
  ['@/app/components/Sidebar', '@/src/components/layout/Sidebar'],
  ['@/app/components/Header', '@/src/components/layout/Header'],
  ['@/app/data/jobsData', '@/src/data/jobsData'],
  ['@/app/hooks/useAIAssistant', '@/src/hooks/useAIAssistant'],
  ['@/lib/prisma', '@/src/lib/prisma']
];

function traverseDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverseDirectory(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      for (const [oldPath, newPath] of replacements) {
        if (content.includes(oldPath)) {
          content = content.replaceAll(oldPath, newPath);
          modified = true;
        }
      }
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

traverseDirectory(path.join(__dirname, 'app'));
traverseDirectory(path.join(__dirname, 'src'));

console.log('Import path update complete.');
