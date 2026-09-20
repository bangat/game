'use strict';
const { createCreature, migrateProfile } = require('./data-store.cjs');

// Private bucket: only the server identity can read/write these objects.
// Generation preconditions prevent another server revision overwriting a newer save.
function createCloudStore({ bucket, starterIds }) {
  const generations = new Map();
  const object = uid => bucket.file(`profiles/${encodeURIComponent(uid)}.json`);
  async function get(uid, nickname) {
    const file = object(uid);
    try {
      const [metadata] = await file.getMetadata();
      const [bytes] = await bucket.file(file.name, { generation: metadata.generation }).download();
      const profile = migrateProfile(JSON.parse(bytes.toString('utf8')), uid, nickname, starterIds);
      generations.set(uid, metadata.generation);
      return profile;
    } catch (error) {
      if (Number(error.code) !== 404) throw new Error('탐험 기록을 불러오지 못했습니다. 잠시 후 다시 접속해 주세요.', { cause: error });
      generations.set(uid, 0);
      return migrateProfile(null, uid, nickname, starterIds);
    }
  }
  async function save(profile) {
    const normalized = migrateProfile(profile, profile.uid, profile.nickname, starterIds);
    const file = object(profile.uid);
    if (!generations.has(profile.uid)) throw new Error('저장 전에 탐험 기록을 불러와야 합니다.');
    try {
      await file.save(JSON.stringify(normalized), {
        resumable: false, contentType: 'application/json; charset=utf-8',
        preconditionOpts: { ifGenerationMatch: generations.get(profile.uid) },
        metadata: { cacheControl: 'private, no-store' }
      });
      // save() populates the returned object metadata without a second race-prone GET.
      generations.set(profile.uid, file.metadata.generation);
      return normalized;
    } catch (error) {
      throw new Error('탐험 기록을 저장하지 못했습니다. 재접속 후 다시 시도해 주세요.', { cause: error });
    }
  }
  return { get, save, createCreature };
}
module.exports = { createCloudStore };
