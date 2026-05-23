const GAME_STATE = {
    score: 0.0,
    cps: 0.0,
    click_power: 1.0,
    auto_click_accum: 0.0,
    game_cleared: false,
    phase2_active: false,
    true_cleared: false,
    cost_multiplier: 1.15
};

const UPGRADES = {
    'cookie1': { name: '🍪 巧克力豆餅乾', desc: '基礎餅乾，持續產出', base_cost: 15, cps: 0.5, count: 0, req: null },
    'cookie2': { name: '🍪 燕麥葡萄乾餅', desc: '健康好吃，產量較高', base_cost: 100, cps: 2.0, count: 0, req: null },
    'cookie3': { name: '🍪 抹茶曲奇', desc: '茶香四溢，效率優良', base_cost: 1100, cps: 10.0, count: 0, req: null },
    'cookie4': { name: '🍪 雙重巧克力餅', desc: '熱量炸彈，產能爆表', base_cost: 2500, cps: 50.0, count: 0, req: null },
    'cookie5': { name: '🌈 彩虹星空曲奇', desc: '最高級餅乾，填補產能', base_cost: 5500, cps: 200.0, count: 0, req: null },
    'autoclick': { name: '⚙️ 自動點擊器', desc: '每秒真正幫你點擊', base_cost: 500, cps: 0, count: 0, req: null },
    'critical': { name: '💥 觸發爆擊', desc: '+5% 機率點擊獲得 5 倍', base_cost: 1000, cps: 0, count: 0, req: 'autoclick' },
    'multiplier': { name: '📈 產量倍增', desc: '所有每秒生產增加 10%', base_cost: 1500, cps: 0, count: 0, req: 'critical' },
    'powerclick': { name: '💪 點擊威力', desc: '每次點擊基礎分數 +10', base_cost: 2000, cps: 0, count: 0, req: 'multiplier' },
    'frenzy': { name: '🔥 狂熱時刻', desc: '5%機率獲20秒產量', base_cost: 2500, cps: 0, count: 0, req: 'powerclick' },
    'blackhole': { name: '🌀 餅乾黑洞', desc: '2%機率吸入2000餅乾', base_cost: 3000, cps: 0, count: 0, req: 'frenzy' },
    'ascension': { name: '✨ 終極飛升', desc: '全局產量+50%與威能', base_cost: 3500, cps: 0, count: 0, req: 'blackhole' },
    'timewarp': { name: '⏳ 時光跳躍', desc: '1%機率獲得60秒產量', base_cost: 4000, cps: 0, count: 0, req: 'ascension' },
    'cloning': { name: '👥 幻影分身', desc: '點擊威力翻倍並分身', base_cost: 4500, cps: 0, count: 0, req: 'timewarp' },
    'singularity': { name: '🌌 無盡奇異點', desc: '最終產能威力再翻倍', base_cost: 5000, cps: 0, count: 0, req: 'cloning' },
    'supernova': { name: '🌠 超新星爆發', desc: '爆擊倍率x10與機率大增', base_cost: 6000, cps: 0, count: 0, req: 'singularity' },
    'alchemy': { name: '🏆 黃金煉金術', desc: '隨機掉落巨大金幣', base_cost: 6500, cps: 0, count: 0, req: 'supernova' },
    'parallel': { name: '🌌 平行宇宙', desc: '全局產能威力再乘三倍', base_cost: 7000, cps: 0, count: 0, req: 'alchemy' },
};

// DOM Elements
const elScore = document.getElementById('score-display');
const elCps = document.getElementById('cps-display');
const elClickInfo = document.getElementById('click-info');
const elProgressBar = document.getElementById('progress-bar');
const elGoalLabel = document.getElementById('goal-label');
const elMainBtn = document.getElementById('main-click-btn');
const elUpgradesContainer = document.getElementById('upgrades-container');
const elParticleLayer = document.getElementById('particle-layer');
const elBackgroundFx = document.getElementById('background-fx');

const elModalOverlay = document.getElementById('modal-overlay');
const elModalTitle = document.getElementById('modal-title');
const elModalDesc = document.getElementById('modal-desc');
const elModalButtons = document.getElementById('modal-buttons');

let cursors = [];
let lastCursorAnim = 0;

// Initialize Store UI
function initStore() {
    elUpgradesContainer.innerHTML = '';
    for (const [key, item] of Object.entries(UPGRADES)) {
        const cost = Math.floor(item.base_cost * Math.pow(GAME_STATE.cost_multiplier, item.count));
        
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.id = `card-${key}`;
        
        card.innerHTML = `
            <div class="upgrade-info">
                <h3>${item.name}</h3>
                <p class="desc">${item.desc}</p>
                <p class="effect">效益: ${item.cps > 0 ? '+'+item.cps+' CPS' : '特殊能力'}</p>
            </div>
            <div class="upgrade-action">
                <div class="count" id="count-${key}">0/10</div>
                <button class="buy-btn" id="buy-${key}" onclick="buyUpgrade('${key}')">購買 (${cost})</button>
            </div>
        `;
        elUpgradesContainer.appendChild(card);
    }
}

function getCost(key) {
    const item = UPGRADES[key];
    return Math.floor(item.base_cost * Math.pow(GAME_STATE.cost_multiplier, item.count));
}

function formatNumber(num) {
    return Math.floor(num).toLocaleString();
}

function updateDisplay() {
    elScore.innerText = `${formatNumber(GAME_STATE.score)} 餅乾`;
    elCps.innerText = `每秒生產: ${GAME_STATE.cps.toFixed(1)}`;
    
    // Check affordability
    for (const [key, item] of Object.entries(UPGRADES)) {
        const btn = document.getElementById(`buy-${key}`);
        const card = document.getElementById(`card-${key}`);
        const cost = getCost(key);
        
        if (item.count >= 10) {
            btn.disabled = true;
            btn.innerText = "MAX";
            card.classList.add('disabled');
        } else if (item.req && UPGRADES[item.req].count === 0) {
            btn.disabled = true;
            btn.innerText = "🔒 未解鎖";
            card.classList.add('disabled');
        } else if (GAME_STATE.score >= cost) {
            btn.disabled = false;
            btn.innerText = `購買 (${formatNumber(cost)})`;
            card.classList.remove('disabled');
        } else {
            btn.disabled = true;
            btn.innerText = `購買 (${formatNumber(cost)})`;
            card.classList.remove('disabled');
        }
    }

    const goal = GAME_STATE.phase2_active ? 1000000000000 : 100000000;
    const progress = Math.min(1.0, GAME_STATE.score / goal);
    elProgressBar.style.width = `${progress * 100}%`;
    const goalStr = GAME_STATE.phase2_active ? "1,000,000,000,000" : "100,000,000";
    elGoalLabel.innerText = `通關目標: ${formatNumber(GAME_STATE.score)} / ${goalStr} 餅乾 (${(progress*100).toFixed(2)}%)`;

    // Checks Phase 1
    if (!GAME_STATE.game_cleared && !GAME_STATE.phase2_active && GAME_STATE.score >= 100000000) {
        GAME_STATE.game_cleared = true;
        showGameClearModal();
    }

    // Check Phase 2 (True Clear)
    if (GAME_STATE.phase2_active && !GAME_STATE.true_cleared && GAME_STATE.score >= 1000000000000) {
        GAME_STATE.true_cleared = true;
        showTrueClearModal();
    }
}

function recalculateCPS() {
    let base_cps = 0;
    for (const key in UPGRADES) {
        if (UPGRADES[key].cps > 0) {
            base_cps += UPGRADES[key].cps * UPGRADES[key].count;
        }
    }
    
    let multiplier_bonus = 1.0 + (UPGRADES['multiplier'].count * 0.1);
    if (UPGRADES['ascension'].count > 0) multiplier_bonus += UPGRADES['ascension'].count * 0.5;
    if (UPGRADES['singularity'].count > 0) multiplier_bonus *= (1.0 + UPGRADES['singularity'].count);
    if (UPGRADES['parallel'].count > 0) multiplier_bonus *= Math.pow(3.0, UPGRADES['parallel'].count);
    
    GAME_STATE.cps = base_cps * multiplier_bonus;
    
    GAME_STATE.click_power = 1.0 + (UPGRADES['powerclick'].count * 10.0);
    if (UPGRADES['ascension'].count > 0) GAME_STATE.click_power += UPGRADES['ascension'].count * 500.0;
    if (UPGRADES['cloning'].count > 0) GAME_STATE.click_power *= (1.0 + UPGRADES['cloning'].count);
    if (UPGRADES['singularity'].count > 0) GAME_STATE.click_power *= (1.0 + UPGRADES['singularity'].count);
    if (UPGRADES['parallel'].count > 0) GAME_STATE.click_power *= Math.pow(3.0, UPGRADES['parallel'].count);
    
    let crit_chance = UPGRADES['critical'].count * 0.05;
    if (UPGRADES['supernova'].count > 0) crit_chance += 0.20;
    
    elClickInfo.innerText = `點擊一次: +${GAME_STATE.click_power.toFixed(1)} | 爆擊機率: ${Math.floor(crit_chance*100)}%`;
}

// 購買升級
window.buyUpgrade = function(key) {
    if (UPGRADES[key].count >= 10) return;
    
    const cost = getCost(key);
    if (GAME_STATE.score >= cost) {
        GAME_STATE.score -= cost;
        UPGRADES[key].count += 1;
        document.getElementById(`count-${key}`).innerText = `${UPGRADES[key].count}/10`;
        
        recalculateCPS();
        updateDisplay();
        
        if (key === 'autoclick' || key === 'parallel') refreshCursors();
        
        if (key === 'ascension' && UPGRADES['ascension'].count === 1 && UPGRADES['singularity'].count === 0) {
            elMainBtn.style.background = 'linear-gradient(145deg, #f1c40f, #f39c12)';
        }
        if (key === 'singularity' && UPGRADES['singularity'].count === 1 && !GAME_STATE.phase2_active) {
            elMainBtn.style.background = 'linear-gradient(145deg, #8e44ad, #9b59b6)';
        }
        
        const special = ['autoclick', 'critical', 'multiplier', 'powerclick', 'frenzy', 'blackhole', 'ascension', 'timewarp', 'cloning', 'singularity', 'supernova', 'alchemy', 'parallel'];
        if (special.includes(key)) {
            showToast(`${UPGRADES[key].name} 升級 Lv.${UPGRADES[key].count}!`, '#2ecc71');
        }
    }
}

// --- 視覺與特效系統 ---

function showToast(text, color) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = text;
    toast.style.color = color;
    
    const rect = elMainBtn.getBoundingClientRect();
    let cx = rect.left + rect.width / 2;
    let cy = rect.top + rect.height / 2;
    
    const dir = Math.floor(Math.random() * 4);
    let startX = cx, startY = cy, targetX = cx, targetY = cy;
    if (dir===0) { startY -= 200; targetY -= 50; } // top
    if (dir===1) { startY += 200; targetY += 50; } // bottom
    if (dir===2) { startX -= 200; targetX -= 50; } // left
    if (dir===3) { startX += 200; targetX += 50; } // right
    
    toast.style.left = startX + 'px';
    toast.style.top = startY + 'px';
    elParticleLayer.appendChild(toast);
    
    toast.animate([
        { left: startX+'px', top: startY+'px', opacity: 0 },
        { left: targetX+'px', top: targetY+'px', opacity: 1 },
        { left: targetX+'px', top: targetY-30+'px', opacity: 0 }
    ], { duration: 1500, easing: 'ease-out' }).onfinish = () => toast.remove();
}

function refreshCursors() {
    cursors.forEach(c => c.el.remove());
    cursors = [];
    
    const num = UPGRADES['autoclick'].count;
    if (num === 0) return;
    
    const vis = Math.min(num, 36);
    const isParallel = UPGRADES['parallel'].count > 0;
    const rect = elMainBtn.getBoundingClientRect();
    const cx = rect.left + rect.width/2;
    const cy = rect.top + rect.height/2;

    const createRing = (total, baseRadius, angleOffset=0) => {
        for(let i=0; i<total; i++) {
            const angle = (i * (Math.PI * 2) / total) + angleOffset;
            const el = document.createElement('div');
            el.className = 'cursor-ring';
            el.innerText = '👆';
            el.style.left = (cx + Math.cos(angle) * baseRadius) + 'px';
            el.style.top = (cy + Math.sin(angle) * baseRadius) + 'px';
            elParticleLayer.appendChild(el);
            cursors.push({el, angle, baseRadius, cx, cy});
        }
    };

    if (isParallel) {
        createRing(vis, 180);
        createRing(vis, 120, Math.PI / vis);
    } else {
        createRing(vis, 160);
    }
}

function animateCursorClick() {
    if (cursors.length === 0) return;
    lastCursorAnim = (lastCursorAnim + 1) % cursors.length;
    const c = cursors[lastCursorAnim];
    
    const isInner = c.baseRadius < 150;
    const shrink = isInner ? 100 : 140;
    
    c.el.style.left = (c.cx + Math.cos(c.angle) * shrink) + 'px';
    c.el.style.top = (c.cy + Math.sin(c.angle) * shrink) + 'px';
    
    setTimeout(() => {
        c.el.style.left = (c.cx + Math.cos(c.angle) * c.baseRadius) + 'px';
        c.el.style.top = (c.cy + Math.sin(c.angle) * c.baseRadius) + 'px';
    }, 100);
}

function getClickParticle() {
    const lvl = UPGRADES['autoclick'].count;
    if (lvl === 0) return "✨";
    if (lvl < 2) return "🌟";
    if (lvl < 4) return "🔥";
    if (lvl < 6) return "⚡";
    if (lvl < 8) return "💎";
    return "🚀";
}

function spawnClickParticle(isCrit, offsetX=0, rect) {
    const cx = rect.left + rect.width/2 + offsetX;
    const cy = rect.top + rect.height/2;
    
    const p = document.createElement('div');
    p.className = 'particle';
    p.innerText = isCrit ? '💥' : getClickParticle();
    p.style.fontSize = isCrit ? '60px' : Math.floor(30+Math.random()*15) + 'px';
    p.style.left = cx + 'px';
    p.style.top = cy + 'px';
    elParticleLayer.appendChild(p);
    
    const angle = Math.random() * Math.PI * 2;
    const dist = 50 + Math.random() * 100;
    const tx = cx + Math.cos(angle) * dist;
    const ty = cy + Math.sin(angle) * dist - 50;
    
    p.animate([
        { left: cx+'px', top: cy+'px', opacity: 1 },
        { left: tx+'px', top: ty+'px', opacity: 0 }
    ], { duration: 600, easing: 'ease-out' }).onfinish = () => p.remove();
}

function spawnLaser(rect) {
    const cx = rect.left + rect.width/2;
    const cy = rect.top + rect.height/2;
    const chars = ["⚡", "🌟", "☄️"];
    
    for(let i=0; i<4; i++) {
        const l = document.createElement('div');
        l.className = 'laser';
        l.style.fontSize = '45px';
        l.innerText = chars[Math.floor(Math.random()*chars.length)];
        l.style.left = cx + 'px';
        l.style.top = cy + 'px';
        elParticleLayer.appendChild(l);
        
        const angle = Math.random() * Math.PI * 2;
        const tx = cx + Math.cos(angle) * 300;
        const ty = cy + Math.sin(angle) * 300;
        
        l.animate([
            { left: cx+'px', top: cy+'px', opacity: 1 },
            { left: tx+'px', top: ty+'px', opacity: 0 }
        ], { duration: 400, easing: 'linear' }).onfinish = () => l.remove();
    }
}

function spawnGoldenCoin() {
    const cx = Math.random() * (window.innerWidth - 100) + 50;
    const coin = document.createElement('div');
    coin.className = 'golden-coin';
    coin.innerText = '💰';
    coin.style.left = cx + 'px';
    coin.style.top = '-60px';
    
    // 點擊事件 (Touch / Click)
    const collect = (e) => {
        e.preventDefault();
        e.stopPropagation();
        coin.remove();
        const bonus = GAME_STATE.cps * 120.0;
        GAME_STATE.score += bonus;
        showToast(`🏆 煉金成功！+${formatNumber(bonus)}`, '#f1c40f');
        updateDisplay();
    };
    coin.addEventListener('mousedown', collect);
    coin.addEventListener('touchstart', collect);
    
    elParticleLayer.appendChild(coin);
    
    coin.animate([
        { top: '-60px' },
        { top: window.innerHeight + 60 + 'px' }
    ], { duration: 4000, easing: 'linear' }).onfinish = () => {
        if(coin.parentNode) coin.remove();
    };
}

// 點擊事件綁定
function doManualClick(fromAuto=false) {
    let power = GAME_STATE.click_power;
    
    if (UPGRADES['timewarp'].count > 0 && Math.random() < 0.01) {
        GAME_STATE.score += GAME_STATE.cps * 60;
        if(!fromAuto) showToast('⏳ 時光跳躍！', '#3498db');
    }
    if (UPGRADES['blackhole'].count > 0 && Math.random() < 0.02) {
        GAME_STATE.score += 2000;
        if(!fromAuto) showToast('🌀 黑洞吸入！', '#8e44ad');
    }
    if (UPGRADES['frenzy'].count > 0 && Math.random() < 0.05) {
        GAME_STATE.score += GAME_STATE.cps * 20;
        if(!fromAuto) showToast('🔥 狂熱！', '#e74c3c');
    }
    
    let critChance = UPGRADES['critical'].count * 0.05;
    if (UPGRADES['supernova'].count > 0) critChance += 0.20;
    
    const isCrit = Math.random() < critChance;
    if (isCrit) {
        const mult = UPGRADES['supernova'].count > 0 ? 10.0 : 5.0;
        power *= mult;
        if(!fromAuto) {
            elMainBtn.innerHTML = `<span class="emoji">💥</span><br><span>爆擊! x${mult}</span>`;
            setTimeout(() => elMainBtn.innerHTML = `<span class="emoji">🍪</span><br><span>烤餅乾！</span>`, 300);
            document.body.style.backgroundColor = UPGRADES['supernova'].count > 0 ? '#ffffff' : '#4a1515';
            setTimeout(() => document.body.style.backgroundColor = 'var(--bg-dark)', 100);
        } else {
            showToast('💥', '#e74c3c');
        }
    }
    
    GAME_STATE.score += power;
    
    if(!fromAuto || Math.random() < 0.3) {
        const rect = elMainBtn.getBoundingClientRect();
        if(!fromAuto && UPGRADES['cloning'].count > 0) {
            if(UPGRADES['parallel'].count > 0) {
                [-60, -30, 0, 30, 60].forEach(off => spawnClickParticle(isCrit, off, rect));
            } else {
                [-40, 0, 40].forEach(off => spawnClickParticle(isCrit, off, rect));
            }
        } else {
            spawnClickParticle(isCrit, 0, rect);
        }
    }
    
    if(!fromAuto && GAME_STATE.phase2_active) {
        const rect = elMainBtn.getBoundingClientRect();
        spawnLaser(rect);
    }
    
    if(!fromAuto) {
        if(UPGRADES['powerclick'].count > 0) {
            elScore.style.color = '#f1c40f';
            elScore.style.transform = 'scale(1.1)';
            setTimeout(() => {
                elScore.style.color = 'var(--text-main)';
                elScore.style.transform = 'scale(1)';
            }, 100);
        }
        updateDisplay();
    }
}

elMainBtn.addEventListener('mousedown', (e) => { e.preventDefault(); doManualClick(); });
elMainBtn.addEventListener('touchstart', (e) => { e.preventDefault(); doManualClick(); });

// 視窗與階段控制
function showGameClearModal() {
    elModalTitle.innerText = "🏆 一億餅乾達成 🏆";
    elModalTitle.style.color = "#f1c40f";
    elModalDesc.innerHTML = "恭喜您達到了第一階段的終點！<br>接下來，您是否要接受真正的挑戰？";
    
    elModalButtons.innerHTML = `
        <button class="modal-btn btn-red" onclick="acceptPhase2()">接受挑戰：進軍一兆！</button>
        <button class="modal-btn btn-gray" onclick="closeModal()">繼續養老模式</button>
    `;
    elModalOverlay.classList.remove('hidden');
}

function showTrueClearModal() {
    elModalTitle.innerText = "👑 真・餅乾之神 👑";
    elModalTitle.style.color = "#8e44ad";
    elModalDesc.innerHTML = "一兆餅乾！您已經抵達了這個宇宙的盡頭。<br>感謝您的遊玩！";
    
    elModalButtons.innerHTML = `
        <button class="modal-btn btn-purple" onclick="closeModal()">驕傲地關閉</button>
    `;
    elModalOverlay.classList.remove('hidden');
}

window.acceptPhase2 = function() {
    GAME_STATE.phase2_active = true;
    elMainBtn.classList.add('phase2');
    closeModal();
    updateDisplay();
}

window.closeModal = function() {
    elModalOverlay.classList.add('hidden');
}

// 主遊戲迴圈 (每 100ms 執行)
setInterval(() => {
    // Auto Clicker
    const autoNum = UPGRADES['autoclick'].count;
    if (autoNum > 0) {
        GAME_STATE.auto_click_accum += autoNum * 0.1;
        let triggered = false;
        while(GAME_STATE.auto_click_accum >= 1.0) {
            doManualClick(true);
            GAME_STATE.auto_click_accum -= 1.0;
            triggered = true;
        }
        if(triggered) animateCursorClick();
    }
    
    // CPS
    if(GAME_STATE.cps > 0) {
        GAME_STATE.score += GAME_STATE.cps / 10.0;
    }
    
    // Alchemy
    if (UPGRADES['alchemy'].count > 0 && Math.random() < 0.005) {
        spawnGoldenCoin();
    }
    
    // Phase 2 Storm
    if (GAME_STATE.phase2_active && Math.random() < 0.2) {
        const char = ["☄️", "⚡", "✨"][Math.floor(Math.random()*3)];
        const p = document.createElement('div');
        p.className = 'particle';
        p.innerText = char;
        p.style.fontSize = (30 + Math.random()*30) + 'px';
        const sx = Math.random() * window.innerWidth;
        p.style.left = sx + 'px';
        p.style.top = '-50px';
        elBackgroundFx.appendChild(p);
        
        p.animate([
            { transform: 'translate(0, 0)' },
            { transform: `translate(${(Math.random()-0.5)*200}px, ${window.innerHeight+100}px)` }
        ], { duration: 1500 + Math.random()*1000, easing: 'linear' }).onfinish = () => p.remove();
    }
    
    updateDisplay();
}, 100);

// 當視窗大小改變時重整游標位置
window.addEventListener('resize', () => {
    if(UPGRADES['autoclick'].count > 0) refreshCursors();
});

// 初始化
initStore();
recalculateCPS();
updateDisplay();
