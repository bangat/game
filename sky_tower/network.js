(function (global) {
  'use strict';

  const DEFAULT_FIREBASE_CONFIG = {
    apiKey: 'AIzaSyCmNAKmgF_L3o0QyOGh_oFAq_rMRtUyklw',
    authDomain: 'goodluck-7c14b.firebaseapp.com',
    databaseURL: 'https://goodluck-7c14b-default-rtdb.firebaseio.com',
    projectId: 'goodluck-7c14b',
    storageBucket: 'goodluck-7c14b.appspot.com',
    messagingSenderId: '858281658455',
    appId: '1:858281658455:web:9131280a459be983933b12'
  };

  function required(name, value) {
    if (!value) throw new Error(`${name} 값이 필요합니다.`);
    return value;
  }

  function authUser(auth, timeoutMs) {
    if (auth.currentUser) return Promise.resolve(auth.currentUser);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        unsubscribe();
        reject(new Error('로그인 확인 시간이 초과되었습니다.'));
      }, timeoutMs);
      const unsubscribe = auth.onAuthStateChanged(user => {
        if (!user) return;
        clearTimeout(timer);
        unsubscribe();
        resolve(user);
      }, error => {
        clearTimeout(timer);
        unsubscribe();
        reject(error);
      });
    });
  }

  function serverTimestamp(firebase) {
    return firebase.database.ServerValue.TIMESTAMP;
  }

  function waitForValue(ref, timeoutMs) {
    return new Promise((resolve, reject) => {
      function fail(error) {
        clearTimeout(timer);
        ref.off('value', handler);
        reject(error);
      }
      const timer = setTimeout(() => {
        fail(new Error('방장이 게임을 준비하는 중입니다. 잠시 후 다시 시도해주세요.'));
      }, timeoutMs);
      function handler(snapshot) {
        if (!snapshot.exists()) return;
        clearTimeout(timer);
        ref.off('value', handler);
        resolve(snapshot);
      }
      ref.on('value', handler, fail);
    });
  }

  async function connect(options) {
    const settings = options || {};
    const firebase = required('firebase', settings.firebase || global.firebase);
    const protocol = required('SkyTowerProtocol', global.SkyTowerProtocol);
    if (!firebase.apps.length) firebase.initializeApp(settings.firebaseConfig || DEFAULT_FIREBASE_CONFIG);

    const db = settings.database || firebase.database();
    const auth = settings.auth || firebase.auth();
    let serverTimeOffset = 0;
    const serverTimeOffsetRef = db.ref('.info/serverTimeOffset');
    const serverTimeOffsetHandler = snapshot => {
      const nextOffset = Number(snapshot.val());
      if (Number.isFinite(nextOffset)) serverTimeOffset = nextOffset;
    };
    serverTimeOffsetRef.on('value', serverTimeOffsetHandler);
    const roomId = settings.roomId || new URLSearchParams(global.location.search).get('roomId');
    required('roomId', roomId);
    const user = await authUser(auth, settings.authTimeoutMs || 10000);
    const roomRef = db.ref(`rooms/${roomId}`);
    const roomSnapshot = await roomRef.once('value');
    if (!roomSnapshot.exists()) throw new Error('방을 찾을 수 없습니다.');
    const room = roomSnapshot.val() || {};
    if (room.gameType && room.gameType !== 'skyTower') throw new Error('하늘 타워 방이 아닙니다.');
    if (room.status !== 'playing') throw new Error('아직 시작되지 않았거나 종료된 방입니다.');

    const existingPlayers = room.players || {};
    let lobbyProfile = existingPlayers[user.uid] || {};
    if (!existingPlayers[user.uid]) {
      const profileSnapshot = await db.ref(`users/${user.uid}/profile`).once('value');
      lobbyProfile = profileSnapshot.val() || {};
      const cleanProfile = protocol.sanitizeProfile(lobbyProfile);
      const primeRoomCache = function () {};
      roomRef.on('value', primeRoomCache);
      await roomRef.once('value');
      let joinResult;
      try {
        joinResult = await roomRef.transaction(current => {
          if (!current || current.gameType !== 'skyTower' || current.status !== 'playing') return;
          const players = current.players || {};
          if (players[user.uid]) return current;
          if (Object.keys(players).length >= protocol.MAX_PLAYERS) return;
          return {
            ...current,
            players: {
              ...players,
              [user.uid]: {
                nickname: cleanProfile.nickname,
                avatar: cleanProfile.avatar,
                isHost: current.hostId === user.uid,
                joinedAt: serverTimestamp(firebase)
              }
            }
          };
        });
      } finally {
        roomRef.off('value', primeRoomCache);
      }
      const joinedRoom = joinResult.snapshot && joinResult.snapshot.val();
      if (!joinResult.committed || !joinedRoom || !joinedRoom.players || !joinedRoom.players[user.uid]) {
        throw new Error('방이 가득 찼거나 더 이상 참가할 수 없습니다.');
      }
    }

    // rooms 아래에는 기존 운영 규칙상 넓은 쓰기 권한이 있어 진행 상태를 두지 않는다.
    // 방과 멤버십은 기존 rooms를 재사용하고, 실제 게임 상태만 소유자 쓰기가
    // 강제되는 별도 네임스페이스에 저장한다.
    const gameRef = db.ref(`skyTowerSessions/${roomId}`);
    const initialGameSnapshot = await gameRef.once('value');
    if (!initialGameSnapshot.exists()) {
      if (room.hostId === user.uid) {
        await gameRef.transaction(current => current || {
          version: protocol.VERSION,
          phase: 'playing',
          startedAt: serverTimestamp(firebase),
          createdBy: room.hostId
        });
      } else {
        await waitForValue(gameRef, settings.hostWaitTimeoutMs || 10000);
      }
    }

    const playerRef = gameRef.child(`players/${user.uid}`);
    const profile = protocol.sanitizeProfile(lobbyProfile);
    const oldPlayerSnapshot = await playerRef.once('value');
    const oldPlayer = oldPlayerSnapshot.val() || {};
    const oldRuntime = oldPlayer.runtime || {};
    const initialRuntime = {
      ...protocol.sanitizeMotion(oldRuntime, oldRuntime),
      connected: true,
      joinedAt: oldRuntime.joinedAt || serverTimestamp(firebase),
      lastSeen: serverTimestamp(firebase),
      sessionId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    };
    if (oldRuntime.finishAt) initialRuntime.finishAt = oldRuntime.finishAt;
    await playerRef.update({ profile, runtime: initialRuntime });

    let disposed = false;
    let everConnected = false;
    let gameValue = null;
    let pendingMotion = null;
    let motionTimer = null;
    let motionWriteQueue = Promise.resolve();
    const callbacks = {
      onSnapshot: typeof settings.onSnapshot === 'function' ? settings.onSnapshot : function () {},
      onPlayers: typeof settings.onPlayers === 'function' ? settings.onPlayers : function () {},
      onConnection: typeof settings.onConnection === 'function' ? settings.onConnection : function () {},
      onError: typeof settings.onError === 'function' ? settings.onError : function () {}
    };

    function emit() {
      const value = gameValue || {};
      const players = value.players || {};
      const rows = protocol.ranking(players, user.uid, Number(value.startedAt || 0));
      callbacks.onPlayers(players);
      callbacks.onSnapshot({
        version: value.version || protocol.VERSION,
        phase: value.phase || 'playing',
        startedAt: value.startedAt || null,
        players,
        ranking: rows
      });
    }

    function reportError(error) {
      console.error('[SkyTowerNetwork]', error);
      callbacks.onError(error);
    }

    const valueHandler = snapshot => {
      gameValue = snapshot.val() || {};
      emit();
    };
    gameRef.on('value', valueHandler, reportError);

    const connectedRef = db.ref('.info/connected');
    const connectedHandler = snapshot => {
      if (disposed) return;
      const online = snapshot.val() === true;
      callbacks.onConnection({ online, reconnecting: everConnected && !online });
      if (!online) return;
      everConnected = true;
      playerRef.child('runtime').onDisconnect().update({
        connected: false,
        disconnectedAt: serverTimestamp(firebase),
        lastSeen: serverTimestamp(firebase)
      }).then(() => playerRef.child('runtime').update({
        connected: true,
        disconnectedAt: null,
        lastSeen: serverTimestamp(firebase)
      })).catch(reportError);
    };
    connectedRef.on('value', connectedHandler, reportError);

    async function writeMotion(motion) {
      if (disposed) return;
      const previous = gameValue && gameValue.players && gameValue.players[user.uid]
        ? gameValue.players[user.uid].runtime
        : oldRuntime;
      const clean = protocol.sanitizeMotion(motion, previous);
      await playerRef.child('runtime').update({ ...clean, connected: true, lastSeen: serverTimestamp(firebase) });
    }

    function enqueueMotion(motion) {
      motionWriteQueue = motionWriteQueue.catch(() => {}).then(() => writeMotion(motion));
      motionWriteQueue.catch(reportError);
      return motionWriteQueue;
    }

    async function flushMotion() {
      if (motionTimer) {
        clearTimeout(motionTimer);
        motionTimer = null;
      }
      const next = pendingMotion;
      pendingMotion = null;
      if (next) enqueueMotion(next);
      await motionWriteQueue;
    }

    function publishMotion(motion) {
      pendingMotion = motion;
      if (motionTimer || disposed) return;
      motionTimer = setTimeout(() => {
        const next = pendingMotion;
        pendingMotion = null;
        motionTimer = null;
        enqueueMotion(next);
      }, settings.motionIntervalMs || 90);
    }

    async function markCheckpoint(index, position) {
      await flushMotion();
      const checkpoint = Math.floor(Math.max(0, Math.min(protocol.MAX_CHECKPOINT, Number(index) || 0)));
      await playerRef.child('runtime').transaction(current => {
        const runtime = current || {};
        if (checkpoint <= Number(runtime.checkpoint || 0)) return;
        return {
          ...runtime,
          checkpoint,
          position: protocol.vector(position, runtime.position, 10000),
          connected: true,
          lastSeen: Date.now()
        };
      });
    }

    async function reportFall(respawnPosition) {
      await flushMotion();
      await playerRef.child('runtime').transaction(current => {
        const runtime = current || {};
        return {
          ...runtime,
          falls: Math.min(protocol.MAX_FALLS, Number(runtime.falls || 0) + 1),
          position: protocol.vector(respawnPosition, runtime.position, 10000),
          animation: 'idle',
          connected: true,
          lastSeen: Date.now()
        };
      });
    }

    async function finish() {
      await flushMotion();
      await playerRef.child('runtime').transaction(current => {
        const runtime = current || {};
        if (runtime.finishAt) return;
        if (Number(runtime.checkpoint || 0) < protocol.MAX_CHECKPOINT) return;
        return { ...runtime, animation: 'finish', finishAt: serverTimestamp(firebase), connected: true };
      });
    }

    async function leave(options) {
      if (disposed) return;
      await flushMotion().catch(reportError);
      disposed = true;
      gameRef.off('value', valueHandler);
      connectedRef.off('value', connectedHandler);
      serverTimeOffsetRef.off('value', serverTimeOffsetHandler);
      try {
        await playerRef.child('runtime').update({ connected: false, disconnectedAt: serverTimestamp(firebase) });
        await playerRef.child('runtime').onDisconnect().cancel();
        // 새로고침/일시 단절에서는 좌석을 유지한다. 사용자가 명시적으로
        // 게임을 나갈 때만 releaseSeat를 주어 기존 rooms 정원을 비운다.
        if (options && options.releaseSeat === true) {
          await roomRef.transaction(current => {
            if (!current || !current.players || !current.players[user.uid]) return current;
            const players = { ...current.players };
            delete players[user.uid];
            const remainingIds = Object.keys(players);
            if (!remainingIds.length) return null;
            const nextHostId = current.hostId === user.uid ? remainingIds.sort()[0] : current.hostId;
            Object.keys(players).forEach(uid => {
              players[uid] = { ...players[uid], isHost: uid === nextHostId };
            });
            return { ...current, hostId: nextHostId, players };
          });
        }
      } catch (error) {
        reportError(error);
      }
    }

    return Object.freeze({
      localId: user.uid,
      roomId,
      isHost: room.hostId === user.uid,
      publishMotion,
      markCheckpoint,
      reportFall,
      finish,
      leave,
      getServerTime: () => Date.now() + serverTimeOffset,
      getSnapshot: () => gameValue
    });
  }

  global.SkyTowerNetwork = Object.freeze({
    connect,
    create: connect,
    firebaseConfig: DEFAULT_FIREBASE_CONFIG
  });
})(window);
