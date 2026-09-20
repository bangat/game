'use strict';
// Use the existing local Firebase CLI login without copying credentials into the site.
const path = require('node:path');
const { createFirebaseAuthority } = require('../server/auth.cjs');
const { createGameServer } = require('../server/index.cjs');

async function main() {
  process.env.INSECT_EMULATOR = '0';
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  delete process.env.FIREBASE_DATABASE_EMULATOR_HOST;
  process.env.GCLOUD_PROJECT ||= 'goodluck-7c14b';
  process.env.INSECT_PROFILE_PATH ||= path.resolve(__dirname, '../data/profiles.firebase.json');
  const cli = process.env.FIREBASE_CLI_LIB || path.join(process.env.APPDATA, 'npm/node_modules/firebase-tools/lib');
  const auth = require(path.join(cli, 'auth.js'));
  const account = auth.getGlobalDefaultAccount();
  if (!account) throw new Error('먼저 firebase login으로 관리자 계정을 연결해 주세요.');
  const credential = {
    async getAccessToken() {
      const tokens = await auth.getAccessToken(account.tokens.refresh_token, []);
      return { access_token: tokens.access_token, expires_in: Math.max(60, Math.floor(((tokens.expires_at || Date.now() + 3600000) - Date.now()) / 1000)) };
    }
  };
  const authority = createFirebaseAuthority({ credential });
  // Read only a deliberately absent room to verify access before accepting clients.
  await authority.getRoom('insect-connection-health-check');
  const game = createGameServer({ authority });
  const address = await game.listen(Number(process.env.PORT || 4194));
  console.log(`Firebase 연결 완료: ${process.env.GCLOUD_PROJECT}, 포트 ${address.port}`);
  let stopping = false;
  async function close() { if (stopping) return; stopping = true; await game.close(); }
  process.once('SIGINT', close); process.once('SIGTERM', close);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
