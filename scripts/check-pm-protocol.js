// scripts/check-pm-protocol.js
const { execSync } = require('child_process');

try {
  // 获取所有当前暂存（staged）的文件名
  const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
    .split('\n')
    .map(f => f.trim())
    .filter(Boolean);

  // 定义规则：哪些属于代码变动
  const hasCodeChanges = stagedFiles.some(f => 
    f.startsWith('src/') || 
    f.startsWith('app/') || 
    /\.(ts|js|vue|py|go|java)$/.test(f)
  );

  // 定义规则：是否更新了任务列表
  const hasTaskUpdates = stagedFiles.some(f => f.includes('tasks.md'));

  // 核心逻辑：有代码变动但没更新 tasks.md 则报错
  if (hasCodeChanges && !hasTaskUpdates) {
    console.error('\n\x1b[31m%s\x1b[0m', '  ❌ [PM Protocol Error]');
    console.error('\x1b[33m%s\x1b[0m', '  检测到代码修改，但未更新 tasks.md 记录进度。');
    console.error('  请在 tasks.md 中更新任务状态后执行 git add tasks.md 再提交。\n');
    process.exit(1);
  }

  // 验证通过
  process.exit(0);
} catch (error) {
  // 防止脚本本身报错导致无法提交
  process.exit(0);
}
