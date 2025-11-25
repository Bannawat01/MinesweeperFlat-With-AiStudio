
/**
 * MINESWEEPER FULL STACK
 * Includes Game Logic, Audio, and API Integration
 */

// --- CONFIG & STATE ---
const CONFIGS = {
    easy: { rows: 9, cols: 9, mines: 10 },
    medium: { rows: 16, cols: 16, mines: 40 },
    hard: { rows: 16, cols: 30, mines: 99 }
};

const State = {
    user: null, // Logged in user data
    status: 'idle', // idle, playing, won, lost
    difficulty: 'easy',
    rows: 9, cols: 9, mines: 10,
    grid: [],
    flags: 0,
    timer: 0,
    timerId: null
};

// --- DOM ELEMENTS ---
const el = {
    board: document.getElementById('game-board'),
    mines: document.getElementById('mine-counter'),
    timer: document.getElementById('timer-display'),
    reset: document.getElementById('reset-btn'),
    diff: document.getElementById('difficulty-select'),
    theme: document.getElementById('theme-select'),
    modal: document.getElementById('modal-overlay'),
    lbModal: document.getElementById('lb-modal-overlay'),
    auth: document.getElementById('auth-section'),
    modalTitle: document.getElementById('modal-title'),
    modalMsg: document.getElementById('modal-msg'),
    streakMsg: document.getElementById('streak-update-msg')
};

// --- API LAYER ---
const API = {
    async getCurrentUser() {
        try {
            const res = await fetch('/api/current_user');
            if (res.ok) {
                const text = await res.text();
                // Check if empty (not logged in)
                return text ? JSON.parse(text) : null;
            }
        } catch (e) { console.error(e); }
        return null;
    },

    async postGameResult(result) {
        // Result: 'win' or 'lose'
        if (!State.user) return null; // Offline mode

        try {
            const res = await fetch('/api/game-result', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    difficulty: State.difficulty,
                    result: result
                })
            });
            if (res.ok) return await res.json();
        } catch (e) { console.error(e); }
        return null;
    },

    async getLeaderboard(diff) {
        try {
            const res = await fetch(`/api/leaderboard?difficulty=${diff}`);
            if (res.ok) return await res.json();
        } catch(e) { console.error(e); }
        return [];
    }
};

// --- AUDIO SYSTEM ---
const AudioSys = {
    ctx: null,
    init() {
        if (!this.ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AC();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    },
    playTone(freq, type, dur) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + dur);
    },
    click() { this.playTone(800, 'triangle', 0.1); },
    flag() { this.playTone(300, 'square', 0.1); },
    win() {
        if (!this.ctx) return;
        [523, 659, 783, 1046].forEach((f, i) => setTimeout(() => this.playTone(f, 'sine', 0.3), i*100));
    },
    explode() {
        if (!this.ctx) return;
        const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for(let i=0; i<data.length; i++) data[i] = Math.random()*2-1;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const gain = this.ctx.createGain();
        gain.gain.value = 0.5;
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime+0.5);
        src.connect(gain); gain.connect(this.ctx.destination);
        src.start();
    }
};

// --- GAME LOGIC ---
const Game = {
    init() {
        // Reset State
        clearInterval(State.timerId);
        State.timer = 0;
        State.flags = 0;
        State.status = 'idle';
        State.difficulty = el.diff.value;
        const cfg = CONFIGS[State.difficulty];
        State.rows = cfg.rows; State.cols = cfg.cols; State.mines = cfg.mines;

        // UI Reset
        el.modal.style.display = 'none';
        el.reset.textContent = '😎';
        el.timer.textContent = '000';
        el.mines.textContent = String(State.mines).padStart(3, '0');
        el.streakMsg.textContent = '';
        
        // Build Grid
        State.grid = [];
        el.board.innerHTML = '';
        el.board.style.gridTemplateColumns = `repeat(${State.cols}, var(--cell-size))`;

        for (let r=0; r<State.rows; r++) {
            const row = [];
            for (let c=0; c<State.cols; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell covered';
                cell.onmousedown = (e) => {
                    if (State.status === 'playing' || State.status === 'idle') {
                        if (e.button === 0) el.reset.textContent = '😮';
                    }
                };
                cell.onmouseup = () => {
                    if (State.status === 'playing') el.reset.textContent = '😎';
                };
                cell.onclick = () => Game.handleClick(r, c);
                cell.oncontextmenu = (e) => Game.handleRightClick(e, r, c);
                
                el.board.appendChild(cell);
                row.push({
                    el: cell, r, c,
                    isMine: false, isOpen: false, isFlagged: false, neighbors: 0
                });
            }
            State.grid.push(row);
        }
    },

    startTimer() {
        State.timerId = setInterval(() => {
            State.timer++;
            el.timer.textContent = String(Math.min(999, State.timer)).padStart(3,'0');
        }, 1000);
    },

    handleClick(r, c) {
        AudioSys.init();
        const cell = State.grid[r][c];
        if (State.status === 'won' || State.status === 'lost' || cell.isFlagged || cell.isOpen) return;

        // First Click Safety
        if (State.status === 'idle') {
            State.status = 'playing';
            Game.startTimer();
            Game.placeMines(r, c);
        }

        if (cell.isMine) {
            Game.gameOver(false, r, c);
        } else {
            AudioSys.click();
            Game.reveal(r, c);
            Game.checkWin();
        }
    },

    handleRightClick(e, r, c) {
        e.preventDefault();
        const cell = State.grid[r][c];
        if (State.status === 'won' || State.status === 'lost' || cell.isOpen) return;

        cell.isFlagged = !cell.isFlagged;
        cell.el.textContent = cell.isFlagged ? '🚩' : '';
        cell.el.classList.toggle('flagged', cell.isFlagged);
        State.flags += cell.isFlagged ? 1 : -1;
        el.mines.textContent = String(State.mines - State.flags).padStart(3, '0');
        AudioSys.flag();
    },

    placeMines(safeR, safeC) {
        let placed = 0;
        while(placed < State.mines) {
            const r = Math.floor(Math.random() * State.rows);
            const c = Math.floor(Math.random() * State.cols);
            if ((r === safeR && c === safeC) || State.grid[r][c].isMine) continue;
            State.grid[r][c].isMine = true;
            placed++;
        }
        // Calc Neighbors
        for(let r=0; r<State.rows; r++) {
            for(let c=0; c<State.cols; c++) {
                if (State.grid[r][c].isMine) continue;
                let count = 0;
                for(let dr=-1; dr<=1; dr++) {
                    for(let dc=-1; dc<=1; dc++) {
                        const nr = r+dr, nc = c+dc;
                        if(nr>=0 && nr<State.rows && nc>=0 && nc<State.cols && State.grid[nr][nc].isMine) count++;
                    }
                }
                State.grid[r][c].neighbors = count;
            }
        }
    },

    reveal(r, c) {
        const stack = [[r,c]];
        while(stack.length) {
            const [curR, curC] = stack.pop();
            const cell = State.grid[curR][curC];
            if(cell.isOpen || cell.isFlagged) continue;

            cell.isOpen = true;
            cell.el.classList.remove('covered');
            cell.el.classList.add('revealed');
            
            if(cell.neighbors > 0) {
                cell.el.textContent = cell.neighbors;
                cell.el.classList.add(`val-${cell.neighbors}`);
            } else {
                // Flood Fill
                for(let dr=-1; dr<=1; dr++) {
                    for(let dc=-1; dc<=1; dc++) {
                        const nr=curR+dr, nc=curC+dc;
                        if(nr>=0 && nr<State.rows && nc>=0 && nc<State.cols) {
                            if(!State.grid[nr][nc].isOpen && !State.grid[nr][nc].isMine) stack.push([nr, nc]);
                        }
                    }
                }
            }
        }
    },

    checkWin() {
        let coveredSafe = 0;
        State.grid.forEach(row => row.forEach(c => {
            if(!c.isMine && !c.isOpen) coveredSafe++;
        }));
        if(coveredSafe === 0) Game.gameOver(true);
    },

    async gameOver(win, r, c) {
        State.status = win ? 'won' : 'lost';
        clearInterval(State.timerId);

        if (win) {
            AudioSys.win();
            el.reset.textContent = '🥳';
            el.modalTitle.textContent = "Victory!";
            el.modalTitle.style.color = "green";
            el.modalMsg.textContent = `Time: ${State.timer}s`;
            // Flag remaining mines
            State.grid.forEach(row => row.forEach(cell => {
                if(cell.isMine && !cell.isFlagged) {
                    cell.el.textContent = '🚩'; cell.el.classList.add('flagged');
                }
            }));
            
            // API CALL: Update Score
            if(State.user) {
                el.streakMsg.textContent = "Updating Streak...";
                const updatedUser = await API.postGameResult('win');
                if(updatedUser) {
                    State.user = updatedUser;
                    el.streakMsg.textContent = `Streak: ${updatedUser.streaks[State.difficulty]} (High: ${updatedUser.streaks.maxStreaks[State.difficulty]})`;
                    UI.renderAuth(); // Update badge
                }
            } else {
                el.streakMsg.textContent = "Login to save streak!";
            }

        } else {
            AudioSys.explode();
            el.reset.textContent = '😵';
            el.modalTitle.textContent = "Game Over";
            el.modalTitle.style.color = "red";
            el.modalMsg.textContent = "You hit a mine!";
            
            // Reveal Mines
            State.grid.forEach(row => row.forEach(cell => {
                if(cell.isMine) {
                    cell.el.classList.add('revealed', 'mine');
                    cell.el.textContent = '💣';
                    if(cell.r===r && cell.c===c) cell.el.classList.add('mine-hit');
                } else if(cell.isFlagged) {
                    cell.el.textContent = '❌'; // Wrong flag
                }
            }));

             // API CALL: Reset Streak
             if(State.user) {
                const updatedUser = await API.postGameResult('lose');
                if(updatedUser) {
                    State.user = updatedUser;
                    el.streakMsg.textContent = "Streak reset to 0.";
                    UI.renderAuth();
                }
            }
        }
        el.modal.style.display = 'flex';
    }
};

// --- LEADERBOARD LOGIC ---
const Leaderboard = {
    async load(diff, btnEl) {
        // Toggle tabs
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        if(btnEl) btnEl.classList.add('active');
        else document.querySelector('.tab-btn').classList.add('active'); // Default

        const tbody = document.getElementById('lb-body');
        tbody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';

        const data = await API.getLeaderboard(diff);
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">No records yet.</td></tr>';
            return;
        }

        data.forEach((entry, i) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${i+1}</td><td>${entry.name}</td><td>${entry.score}</td>`;
            tbody.appendChild(tr);
        });
    }
};

// --- UI HANDLERS ---
const UI = {
    renderAuth() {
        if (State.user) {
            el.auth.innerHTML = `
                <div class="user-profile">
                    <span>${State.user.displayName}</span>
                    <span class="streak-badge" title="Current Easy Streak">🔥 ${State.user.streaks.easy}</span>
                    <a href="/api/logout" class="auth-btn" style="background:#ef4444; font-size:0.8rem;">Logout</a>
                </div>
            `;
        } else {
            el.auth.innerHTML = `
                <a href="/auth/google" class="auth-btn">
                    <span>G</span> Login
                </a>
            `;
        }
    },
    
    initListeners() {
        el.reset.onclick = Game.init;
        el.diff.onchange = () => { el.diff.blur(); Game.init(); };
        el.theme.onchange = (e) => {
            const t = e.target.value;
            t === 'light' ? document.documentElement.removeAttribute('data-theme') : document.documentElement.setAttribute('data-theme', t);
            el.theme.blur();
        };
        document.getElementById('leaderboard-btn').onclick = () => {
            el.lbModal.style.display = 'flex';
            Leaderboard.load('easy');
        };
    }
};

// --- BOOTSTRAP ---
(async function bootstrap() {
    UI.initListeners();
    State.user = await API.getCurrentUser();
    UI.renderAuth();
    Game.init();
})();
