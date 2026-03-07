const path = require('path');
const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const {
    CLASSES,
    SKILLS,
    ITEM_TEMPLATES,
    ZONES,
    MONSTERS,
    QUESTS,
    DAILY_QUEST,
    RARITIES,
    deepClone
} = require('./game-data');
const { getProfile, patchProfile, markLogout } = require('./data-store');

const PORT = Number(process.env.PORT || 43187);
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const peers = new Map();

app.use(express.json({ limit: '1mb' }));
app.use('/vendor/three', express.static(path.join(__dirname, '..', 'node_modules', 'three')));
app.use('/client', express.static(path.join(__dirname, '..', 'client')));
app.use('/icons', express.static(path.join(__dirname, '..', '..', 'icons')));

app.get('/favicon.ico', (_req, res) => {
    res.status(204).end();
});

app.get('/manifest.webmanifest', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'manifest.webmanifest'));
});

app.get('/sw.js', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'sw.js'));
});

app.get('/api/bootstrap', (req, res) => {
    const userId = String(req.query.userId || '').trim() || `guest_${Date.now()}`;
    const nickname = String(req.query.nickname || '').trim() || '별빛 모험가';
    const { profile, offlineReward } = getProfile(userId, nickname);
    res.json({
        ok: true,
        serverTime: Date.now(),
        offlineReward,
        profile,
        world: {
            classes: deepClone(CLASSES),
            skills: deepClone(SKILLS),
            items: deepClone(ITEM_TEMPLATES),
            zones: deepClone(ZONES),
            monsters: deepClone(MONSTERS),
            quests: deepClone(QUESTS),
            dailyQuest: deepClone(DAILY_QUEST),
            rarities: deepClone(RARITIES)
        }
    });
});

app.get('/api/health', (_req, res) => {
    res.json({ ok: true, now: Date.now(), online: peers.size });
});

app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

function broadcastPresence() {
    const payload = JSON.stringify({
        type: 'presence:snapshot',
        players: Array.from(peers.values()).map((peer) => ({
            userId: peer.userId,
            nickname: peer.nickname,
            classId: peer.classId,
            zoneId: peer.zoneId,
            x: peer.x,
            z: peer.z,
            level: peer.level,
            powerScore: peer.powerScore
        }))
    });
    peers.forEach((peer) => {
        if (peer.ws.readyState === WebSocket.OPEN) {
            peer.ws.send(payload);
        }
    });
}

function safeParse(raw) {
    try {
        return JSON.parse(raw);
    } catch (error) {
        return null;
    }
}

wss.on('connection', (ws) => {
    let currentUserId = '';

    ws.on('message', (raw) => {
        const message = safeParse(raw.toString());
        if (!message || !message.type) return;

        if (message.type === 'hello') {
            currentUserId = String(message.userId || '').trim();
            if (!currentUserId) return;
            const nickname = String(message.nickname || '').trim() || '별빛 모험가';
            const { profile } = getProfile(currentUserId, nickname);
            peers.set(currentUserId, {
                ws,
                userId: currentUserId,
                nickname: profile.nickname,
                classId: profile.classId,
                zoneId: profile.location.zoneId,
                x: profile.location.x || 0,
                z: profile.location.z || 0,
                level: profile.level,
                powerScore: profile.powerScore
            });
            ws.send(JSON.stringify({ type: 'hello:ok', userId: currentUserId }));
            broadcastPresence();
            return;
        }

        if (!currentUserId) return;

        if (message.type === 'profile:sync' && message.profile) {
            const saved = patchProfile(currentUserId, message.profile);
            const existing = peers.get(currentUserId);
            if (existing) {
                existing.nickname = saved.nickname;
                existing.classId = saved.classId;
                existing.zoneId = saved.location.zoneId;
                existing.x = saved.location.x || 0;
                existing.z = saved.location.z || 0;
                existing.level = saved.level;
                existing.powerScore = saved.powerScore;
            }
            ws.send(JSON.stringify({ type: 'profile:ack', profile: saved }));
            broadcastPresence();
            return;
        }

        if (message.type === 'presence:update') {
            const existing = peers.get(currentUserId);
            if (!existing) return;
            existing.zoneId = message.zoneId || existing.zoneId;
            existing.x = Number(message.x || 0);
            existing.z = Number(message.z || 0);
            existing.classId = message.classId || existing.classId;
            existing.nickname = message.nickname || existing.nickname;
            existing.level = Number(message.level || existing.level || 1);
            existing.powerScore = Number(message.powerScore || existing.powerScore || 0);
            broadcastPresence();
        }
    });

    ws.on('close', () => {
        if (!currentUserId) return;
        peers.delete(currentUserId);
        markLogout(currentUserId);
        broadcastPresence();
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`kid_rpg server listening on http://0.0.0.0:${PORT}`);
});
