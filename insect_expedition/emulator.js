(function () {
  'use strict';
  const host = location.hostname;
  const octets = host.split('.').map(Number);
  const privateHost = octets.length === 4 && octets.every(n => Number.isInteger(n) && n >= 0 && n <= 255)
    && (octets[0] === 10 || (octets[0] === 192 && octets[1] === 168)
      || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31));
  if (host !== 'localhost' && host !== '127.0.0.1' && !privateHost) return;
  const request = new URLSearchParams(location.search).get('emulator');
  let enabled = request === '1';
  try {
    if (request === '1') sessionStorage.setItem('insect.emulator', '1');
    if (request === '0') sessionStorage.removeItem('insect.emulator');
    enabled = request === '1' || sessionStorage.getItem('insect.emulator') === '1';
  } catch (_) {}
  if (!enabled) return;
  function showConnectionProblem(message) {
    let panel = document.getElementById('insect-local-connection-error');
    if (panel) return;
    panel = document.createElement('section'); panel.id = 'insect-local-connection-error'; panel.setAttribute('role', 'alert');
    panel.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:28px;background:#f3f8ee;color:#244632;text-align:center;font:16px/1.6 system-ui;box-sizing:border-box';
    const title = document.createElement('strong'); title.textContent = '게임 연결을 확인해 주세요.';
    const text = document.createElement('p'); text.textContent = message; text.style.maxWidth = '360px';
    const retry = document.createElement('button'); retry.textContent = '다시 연결'; retry.style.cssText = 'padding:14px 28px;border:0;border-radius:14px;background:#286444;color:white;font:700 16px system-ui';
    retry.onclick = () => location.reload();
    const lobby = document.createElement('a'); lobby.textContent = '대기실 다시 열기'; lobby.href = '/대기실.html?emulator=1'; lobby.style.color = '#286444';
    panel.append(title, text, retry, lobby); document.body.appendChild(panel);
  }
  if (!window.firebase) { showConnectionProblem('로그인에 필요한 파일을 불러오지 못했습니다. 와이파이의 인터넷 연결을 확인한 뒤 다시 연결해 주세요.'); return; }
  window.InsectEmulator = true;
  const initialize = firebase.initializeApp.bind(firebase);
  firebase.initializeApp = function () {
    const app = initialize({ apiKey: 'demo-key', projectId: 'demo-sky-tower', authDomain: 'demo-sky-tower.firebaseapp.com', databaseURL: 'https://demo-sky-tower-default-rtdb.firebaseio.com' });
    const auth = app.auth(), db = app.database();
    auth.useEmulator('http://' + host + ':9099', { disableWarnings: true });
    db.useEmulator(host, 9000);
    const observe = auth.onAuthStateChanged.bind(auth);
    const ready = new Promise((resolve, reject) => {
      const off = observe(user => { off(); resolve(user); }, reject);
    }).then(async user => {
      const account = user || (await auth.signInAnonymously()).user;
      const ref = db.ref('users/' + account.uid + '/profile');
      if (!(await ref.once('value')).exists()) {
        let nickname = '탐험가' + account.uid.slice(0, 4);
        try { nickname = localStorage.getItem('userNickname') || nickname; } catch (_) {}
        await ref.set({ nickname, avatar: '🙂', createdAt: firebase.database.ServerValue.TIMESTAMP });
      }
      return account;
    });
    const timeout = setTimeout(() => showConnectionProblem('PC의 테스트 서버에 연결이 지연되고 있습니다. PC가 켜져 있고 휴대폰이 같은 공유기의 와이파이에 연결되어 있는지 확인해 주세요.'), 15000);
    ready.then(() => { clearTimeout(timeout); const panel = document.getElementById('insect-local-connection-error'); if (panel) panel.remove(); }, () => {
      clearTimeout(timeout); showConnectionProblem('테스트 로그인 연결에 실패했습니다. 잠시 후 다시 연결하거나 대기실을 새로 열어 주세요.');
    });
    auth.onAuthStateChanged = function (next, error, complete) {
      let off, disposed = false;
      ready.then(() => { if (!disposed) off = observe(next, error, complete); }).catch(problem => {
        if (error) error(problem); else console.error('테스트 인증 연결 실패', problem.message);
      });
      return () => { disposed = true; if (off) off(); };
    };
    window.InsectAuthReady = ready;
    return app;
  };
})();
