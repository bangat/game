'use strict';

const PUBLIC_ROOM_ID = 'isulsup-public';

function createFirebaseAuthority(options = {}) {
  if (options.verifyToken && options.getRoom) return options;
  const { applicationDefault, deleteApp, getApps, initializeApp } = require('firebase-admin/app');
  const { getAuth } = require('firebase-admin/auth');
  const { getDatabase } = require('firebase-admin/database');
  const emulator = process.env.INSECT_EMULATOR === '1';
  const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || (emulator ? 'demo-sky-tower' : '');
  if (emulator) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';
    process.env.FIREBASE_DATABASE_EMULATOR_HOST ||= '127.0.0.1:9000';
  }
  if (!projectId) throw new Error('운영 서버에는 GCLOUD_PROJECT 또는 FIREBASE_PROJECT_ID가 필요합니다.');
  const databaseURL = process.env.FIREBASE_DATABASE_URL || `https://${projectId}-default-rtdb.firebaseio.com`;
  const existing = getApps()[0];
  const app = existing || initializeApp({
    credential: options.credential || applicationDefault(),
    projectId,
    databaseURL
  });
  const auth = getAuth(app);
  const database = getDatabase(app);
  return {
    async verifyToken(token) {
      return auth.verifyIdToken(String(token || ''), true);
    },
    async getRoom(roomId) {
      const snapshot = await database.ref(`rooms/${roomId}`).get();
      return snapshot.val();
    },
    async close() {
      if (!existing) await deleteApp(app);
    }
  };
}

async function authorizeJoin(authority, token, roomId) {
  if (!token || !roomId || !/^[A-Za-z0-9_-]{1,80}$/.test(roomId)) throw new Error('인증 정보가 올바르지 않습니다.');
  const decoded = await authority.verifyToken(token);
  if (!decoded?.uid) throw new Error('로그인 상태를 확인해 주세요.');
  if (roomId === PUBLIC_ROOM_ID) return {uid:decoded.uid,nickname:String(decoded.name || '숲길 탐험가').slice(0,20),room:null};
  const room = await authority.getRoom(roomId);
  if (!room || room.gameType !== 'insectExpedition' || room.status !== 'playing') throw new Error('플레이 중인 곤충 탐사 방이 아닙니다.');
  if (!room.players || !room.players[decoded.uid]) throw new Error('이 방의 참가자가 아닙니다.');
  return {
    uid: decoded.uid,
    nickname: String(room.players[decoded.uid].nickname || decoded.name || '숲길 탐험가').slice(0, 20),
    room
  };
}

module.exports = { createFirebaseAuthority, authorizeJoin, PUBLIC_ROOM_ID };
