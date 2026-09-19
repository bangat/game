const { spawnSync } = require('node:child_process');
const path = require('node:path');
for (const file of ['network.cjs','gameplay.cjs','ui.cjs']) {
  const run = spawnSync(process.execPath,[path.join(__dirname,file)],{stdio:'inherit'});
  if (run.status !== 0) process.exit(run.status || 1);
}
