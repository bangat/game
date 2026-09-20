'use strict';
// Keep running emulator data intact while allowing devices on the local network to connect.
const net = require('node:net');
const os = require('node:os');
const host = process.argv[2];
const localAddresses = Object.values(os.networkInterfaces()).flat().filter(Boolean);
const parts = String(host || '').split('.').map(Number);
const privateAddress = net.isIP(host || '') === 4 && (parts[0] === 10
  || (parts[0] === 192 && parts[1] === 168)
  || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31));
if (!privateAddress || !localAddresses.some(entry => entry.address === host && !entry.internal)) {
  console.error('Usage: node tools/lan-emulators.cjs <PC private IPv4 address>');
  process.exit(1);
}
const servers = [], sockets = new Set();
function close() {
  for (const socket of sockets) socket.destroy();
  for (const server of servers) server.close();
}
for (const port of [9099, 9000]) {
  const server = net.createServer(client => {
    const upstream = net.connect({ host: '127.0.0.1', port });
    for (const socket of [client, upstream]) {
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
    }
    client.on('error', () => upstream.destroy());
    upstream.on('error', () => client.destroy());
    client.on('close', () => upstream.destroy());
    upstream.on('close', () => client.destroy());
    client.pipe(upstream).pipe(client);
  });
  servers.push(server);
  server.on('error', error => { console.error(error.message); process.exitCode = 1; close(); });
  server.listen(port, host, () => console.log(`Local emulator relay: ${host}:${port}`));
}
process.once('SIGINT', close);
process.once('SIGTERM', close);
