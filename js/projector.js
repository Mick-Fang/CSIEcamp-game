// 椰子怪討伐戰 - 投影幕端腳本 (Projector Display Script)

const engine = new GameEngine();

// DOM 元素引用
const viewSetup = document.getElementById("view-setup");
const viewBidVanguard = document.getElementById("view-bid-vanguard");
const viewBattle = document.getElementById("view-battle");
const viewBidSupport = document.getElementById("view-bid-support");
const viewRoundEnd = document.getElementById("view-round-end");
const viewGameOver = document.getElementById("view-game-over");

const projRoundNum = document.getElementById("projector-round-num");
const projPhaseBadge = document.getElementById("projector-phase-badge");
const projLeaderboard = document.getElementById("projector-leaderboard");
const projPodium = document.getElementById("projector-podium");

// 戰鬥區域元素
const monsterCard = document.getElementById("projector-monster-card");
const monsterImg = document.getElementById("projector-monster-img");
const monsterName = document.getElementById("projector-monster-name");
const monsterHpText = document.getElementById("projector-monster-hp-text");
const monsterDesc = document.getElementById("projector-monster-desc");
const hpFill = document.getElementById("projector-hp-fill");
const hpPercent = document.getElementById("projector-hp-percent");
const monsterLevel = document.getElementById("projector-monster-level");

const battleTroopTitle = document.getElementById("battle-troop-title");
const battleTroopList = document.getElementById("battle-troop-list");
const battleTotalDamage = document.getElementById("battle-total-damage");
const damageFloatingArea = document.getElementById("damage-floating-area");

// 音效
const audioHit = document.getElementById("audio-hit");
const audioCheer = document.getElementById("audio-cheer");

// 內部狀態追蹤
let lastMonsterHp = null;
let lastPhase = null;
let audioUnlocked = false;

// 頁面加載
document.addEventListener("DOMContentLoaded", () => {
    // 建立一個防阻擋音效的點擊遮罩
    createAudioUnlockOverlay();
    
    renderProjector();

    // 監聽來自 Host 的 localStorage 狀態變更
    window.addEventListener("storage", (e) => {
        if (e.key === "coconut_game_state") {
            engine.loadState();
            renderProjector();
        } else if (e.key === "coconut_spin_event") {
            // 監聽到轉盤事件，與 Host 同步轉盤動效！
            handleSyncedWheelSpin(JSON.parse(e.newValue));
        }
    });

    // 啟動 Confetti 迴圈
    initConfetti();
});

// 建立音效解鎖遮罩
function createAudioUnlockOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "audio-unlock-overlay";
    overlay.style = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(15, 23, 42, 0.95); z-index: 9999;
        display: flex; flex-direction: column; justify-content: center; align-items: center;
        cursor: pointer; transition: opacity 0.5s ease;
    `;
    overlay.innerHTML = `
        <h2 style="font-size: 3rem; color: #fde047; margin-bottom: 1.5rem; text-shadow: 0 4px 6px rgba(0,0,0,0.5);">🏝️ 椰子怪討伐戰 🏝️</h2>
        <div class="pulse-element" style="font-size: 1.8rem; color: white;">👉 點擊螢幕任何地方開啟音效與畫面同步 👈</div>
    `;
    
    overlay.addEventListener("click", () => {
        overlay.style.opacity = "0";
        setTimeout(() => overlay.remove(), 500);
        audioUnlocked = true;
        
        // 撥放一個無聲音效以解鎖瀏覽器限制
        if (audioHit) {
            audioHit.muted = true;
            audioHit.play().then(() => {
                audioHit.muted = false;
            }).catch(e => console.log("音效解鎖受限:", e));
        }
    });
    
    document.body.appendChild(overlay);
}

// 投影幕渲染主程序
function renderProjector() {
    const state = engine.state;

    // 1. 更新基本狀態字樣
    projRoundNum.textContent = state.round;

    const phaseBadges = {
        "SETUP": "準備出征",
        "BID_VANGUARD": "前鋒挑選",
        "BATTLE_VANGUARD": "前鋒討伐",
        "BID_SUPPORT": "後援競標",
        "BATTLE_SUPPORT": "後援討伐",
        "ROUND_END": "回合結算",
        "GAME_OVER": "最終結算"
    };
    projPhaseBadge.textContent = phaseBadges[state.phase] || state.phase;

    // 2. 切換各階段畫面視圖
    viewSetup.style.display = "none";
    viewBidVanguard.style.display = "none";
    viewBattle.style.display = "none";
    viewBidSupport.style.display = "none";
    viewRoundEnd.style.display = "none";
    viewGameOver.style.display = "none";

    // 關閉轉盤如果它還開著 (除非處在 BATTLE_VANGUARD 且 isTied 狀態)
    if (!(state.phase === "BATTLE_VANGUARD" && state.vanguardTieStatus && state.vanguardTieStatus.isTied)) {
        closeProjectorWheel();
    }

    if (state.phase === "SETUP") {
        viewSetup.style.display = "block";
        stopConfetti();
    } else if (state.phase === "BID_VANGUARD") {
        viewBidVanguard.style.display = "block";
        stopConfetti();
    } else if (state.phase === "BATTLE_VANGUARD") {
        renderBattlePanel("vanguard");
        viewBattle.style.display = "block";
    } else if (state.phase === "BID_SUPPORT") {
        viewBidSupport.style.display = "block";
    } else if (state.phase === "BATTLE_SUPPORT") {
        renderBattlePanel("support");
        viewBattle.style.display = "block";
    } else if (state.phase === "ROUND_END") {
        renderRoundEndPanel();
        viewRoundEnd.style.display = "block";
        
        // 如果剛進入結算且有人加分，撒一下花
        const anyScoreGained = state.teams.some(t => t.scoreGainedThisRound > 0);
        if (lastPhase !== "ROUND_END" && anyScoreGained) {
            playCheer();
            startConfetti();
        }
    } else if (state.phase === "GAME_OVER") {
        renderGameOverPanel();
        viewGameOver.style.display = "block";
        playCheer();
        startConfetti();
    }

    // 3. 渲染小隊排行榜 (附帶重排動畫)
    renderLeaderboard();

    // 存入本次 HP 供下次對比以作扣血特效
    if (state.monster) {
        if (lastMonsterHp !== null && state.monster.hp < lastMonsterHp) {
            triggerDamageEffect(lastMonsterHp - state.monster.hp);
        }
        lastMonsterHp = state.monster.hp;
    } else {
        lastMonsterHp = null;
    }

    lastPhase = state.phase;
}

// 渲染戰鬥面板 (前鋒/後援)
function renderBattlePanel(mode) {
    const state = engine.state;
    if (!state.monster) return;

    // 1. 怪獸資料
    monsterName.textContent = state.monster.name;
    monsterDesc.textContent = state.monster.desc;
    monsterImg.src = state.monster.img;
    monsterHpText.textContent = `HP: ${state.monster.hp} / ${state.monster.maxHp}`;
    
    // HP 條計算
    const pct = Math.round((state.monster.hp / state.monster.maxHp) * 100);
    hpFill.style.width = `${pct}%`;
    hpPercent.textContent = `${pct}%`;

    // 顯示血量比例倍率
    if (state.monsterHpScale !== 1) {
        monsterLevel.style.display = "block";
        monsterLevel.textContent = `HP 比例: ${(state.monsterHpScale).toFixed(2)}x`;
    } else {
        monsterLevel.style.display = "none";
    }

    // 2. 參戰隊伍顯示
    if (mode === "vanguard") {
        battleTroopTitle.textContent = "🏹 前鋒討伐部隊出戰中！";
        const vanguardTeams = state.teams.filter(t => t.role === "vanguard");
        battleTroopList.innerHTML = vanguardTeams
            .map(t => `
                <div class="glass-card" style="padding: 0.5rem 1rem; border-color: var(--danger-red);">
                    <strong>${t.name}</strong> <span style="font-size:0.9rem; color:var(--sand-dark);">(攻擊力: ${t.stamina})</span>
                </div>
            `)
            .join("");
        battleTotalDamage.textContent = state.vanguardDamage;
    } else {
        battleTroopTitle.textContent = "🛡️ 後援部隊補刀中！";
        const supportTeams = state.teams.filter(t => t.role === "support");
        battleTroopList.innerHTML = supportTeams
            .map(t => `
                <div class="glass-card" style="padding: 0.5rem 1rem; border-color: var(--success-green);">
                    <strong>${t.name}</strong> <span style="font-size:0.9rem; color:var(--sand-dark);">(攻擊力: ${t.stamina})</span>
                </div>
            `)
            .join("");
        battleTotalDamage.textContent = state.supportDamage;
    }
}

// 觸發扣血打擊特效
function triggerDamageEffect(dmg) {
    if (dmg <= 0) return;
    
    // 播放打擊音效
    playHit();

    // 怪物卡片震動
    monsterCard.classList.add("hurt-shake");
    setTimeout(() => {
        monsterCard.classList.remove("hurt-shake");
    }, 500);

    // 飄出紅色扣血數字
    const dmgEl = document.createElement("div");
    dmgEl.className = "damage-number";
    dmgEl.textContent = `-${dmg}`;
    
    // 隨機在怪獸卡片中央偏上下處出生
    const randomX = 50 + (Math.random() * 20 - 10); // %
    const randomY = 40 + (Math.random() * 20 - 10); // %
    dmgEl.style.left = `${randomX}%`;
    dmgEl.style.top = `${randomY}%`;

    damageFloatingArea.appendChild(dmgEl);
    
    // 動效播放完後移除
    setTimeout(() => {
        dmgEl.remove();
    }, 1200);
}

// 播放 Hit 音效
function playHit() {
    if (audioUnlocked && audioHit) {
        audioHit.currentTime = 0;
        audioHit.play().catch(e => console.log("音效播錯:", e));
    }
}

// 播放 Cheer 音效
function playCheer() {
    if (audioUnlocked && audioCheer) {
        audioCheer.currentTime = 0;
        audioCheer.play().catch(e => console.log("音效播錯:", e));
    }
}

// 渲染回合結算
function renderRoundEndPanel() {
    const state = engine.state;
    const container = document.getElementById("projector-round-summary");
    
    container.innerHTML = state.teams
        .map(t => {
            let roleLabel = "";
            let color = "#cbd5e1";
            if (t.role === "vanguard") {
                roleLabel = "前鋒";
                color = "var(--danger-red)";
            } else if (t.role === "support") {
                roleLabel = "後援";
                color = "var(--success-green)";
            } else if (t.role === "traitor") {
                roleLabel = "背叛";
                color = "#8b5cf6";
            }

            return `
                <div style="background: rgba(255,255,255,0.05); padding: 0.75rem; border-radius: 12px; display:flex; justify-content:space-between; align-items:center;">
                    <span>
                        <strong style="color: ${color};">[${roleLabel}]</strong> ${t.name}
                    </span>
                    <strong style="color: ${t.scoreGainedThisRound > 0 ? 'var(--success-green)' : '#94a3b8'};">
                        +${t.scoreGainedThisRound} 分
                    </strong>
                </div>
            `;
        })
        .join("");
}

// 渲染遊戲結束（頒獎台）
function renderGameOverPanel() {
    const state = engine.state;
    const sorted = [...state.teams].sort((a, b) => b.score - a.score);

    const first = sorted[0];
    const second = sorted[1];
    const third = sorted[2];

    projPodium.innerHTML = `
        <!-- 第二名 -->
        ${second ? `
        <div class="podium-place podium-2nd">
            <div class="podium-team-name">${second.name}</div>
            <div class="podium-team-score">${second.score} 分</div>
            <div class="podium-block">
                <div class="podium-num">2</div>
            </div>
        </div>
        ` : ""}
        
        <!-- 第一名 -->
        ${first ? `
        <div class="podium-place podium-1st">
            <div style="font-size: 2rem; margin-bottom: 0.25rem; animation: sway 3s ease-in-out infinite;">👑</div>
            <div class="podium-team-name" style="font-size: 1.5rem; color: #fde047;">${first.name}</div>
            <div class="podium-team-score" style="font-size: 1.3rem;">${first.score} 分</div>
            <div class="podium-block">
                <div class="podium-num">1</div>
            </div>
        </div>
        ` : ""}

        <!-- 第三名 -->
        ${third ? `
        <div class="podium-place podium-3rd">
            <div class="podium-team-name">${third.name}</div>
            <div class="podium-team-score">${third.score} 分</div>
            <div class="podium-block">
                <div class="podium-num">3</div>
            </div>
        </div>
        ` : ""}
    `;
}

// 渲染即時排行榜（自動排序）
function renderLeaderboard() {
    const state = engine.state;
    
    // 排行榜排序邏輯：
    // 分數從大到小排序。
    // 如果是 BID_VANGUARD 階段，我們想看目前分數；如果是平手，則分數低優先
    // 這裡我們只按分數降序排序。
    const sorted = [...state.teams].sort((a, b) => b.score - a.score);
    
    // 渲染
    projLeaderboard.innerHTML = sorted
        .map((t, index) => {
            const rank = index + 1;
            let rankClass = "";
            if (rank === 1) rankClass = "rank-1";
            else if (rank === 2) rankClass = "rank-2";
            else if (rank === 3) rankClass = "rank-3";

            // 計算分數差距
            const scoreDiff = t.score - t.prevScore;
            const diffSpan = scoreDiff > 0 ? `<span class="score-diff">(+${scoreDiff})</span>` : "";

            return `
                <div class="leaderboard-item ${rankClass}" data-team-id="${t.id}">
                    <div class="rank-badge">${rank}</div>
                    <div class="team-name">${t.name}</div>
                    <div class="team-stamina">
                        <span class="stamina-text" style="color: #cbd5e1;">⚡體力: ${t.stamina}</span>
                    </div>
                    <div class="team-score">
                        ${diffSpan}
                        <span>${t.score}</span>
                    </div>
                </div>
            `;
        })
        .join("");
}

/* ========================================================
   同步轉盤 (Synced Roulette Wheel) 控制邏輯
   ======================================================= */
const projRouletteModal = document.getElementById("projector-roulette-modal");
const projRouletteWheel = document.getElementById("projector-roulette-wheel");
const projWheelResultText = document.getElementById("projector-wheel-result-text");

function handleSyncedWheelSpin(eventData) {
    if (!eventData) return;
    const { candidates, winnerId, targetDeg, timestamp } = eventData;
    
    // 如果是太久以前的事件，不重播
    if (Date.now() - timestamp > 6000) return;

    projWheelResultText.textContent = "命運椰子樹正在搖晃...";
    projRouletteWheel.style.transition = "none";
    projRouletteWheel.style.transform = "rotate(0deg)";
    
    // 構建轉盤顏色背景
    const n = candidates.length;
    const colors = [
        "var(--sunset-orange)", "var(--ocean-dark)", "var(--success-green)", 
        "var(--sunset-yellow)", "var(--sunset-pink)", "#8b5cf6", "#06b6d4", "#f43f5e"
    ];
    
    let conicParts = [];
    const step = 100 / n;
    for (let i = 0; i < n; i++) {
        const c = colors[i % colors.length];
        conicParts.push(`${c} ${i * step}% ${(i + 1) * step}%`);
    }
    
    projRouletteWheel.style.background = `conic-gradient(${conicParts.join(", ")})`;
    
    // 繪製文字
    projRouletteWheel.innerHTML = candidates
        .map((c, i) => {
            const angle = (360 / n) * i + (360 / n) / 2;
            return `
                <div style="
                    position: absolute; 
                    top: 50%; left: 50%; 
                    transform: translate(-50%, -50%) rotate(${angle}deg) translateY(-80px);
                    color: white; 
                    font-weight: 800; 
                    font-size: 0.9rem;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.8);
                    pointer-events: none;
                    white-space: nowrap;
                ">
                    ${c.name}
                </div>
            `;
        })
        .join("");

    projRouletteModal.style.display = "flex";

    // 啟動旋轉動畫 (非同步延時以觸發 transition)
    setTimeout(() => {
        projRouletteWheel.style.transition = "transform 4s cubic-bezier(0.15, 0.85, 0.35, 1.02)";
        projRouletteWheel.style.transform = `rotate(${targetDeg}deg)`;
    }, 50);

    // 播放揭曉結果
    setTimeout(() => {
        const winner = candidates.find(c => c.id === winnerId);
        if (winner) {
            projWheelResultText.innerHTML = `🎉 恭喜！由 <strong>${winner.name}</strong> 獲得進入前鋒的資格！`;
            playCheer();
        }
    }, 4100);
}

function closeProjectorWheel() {
    projRouletteModal.style.display = "none";
}

/* ========================================================
   撒花物理粒子效果 (Confetti Engine)
   ======================================================= */
const canvas = document.getElementById("confetti-canvas");
let ctx = null;
let particles = [];
let animationFrameId = null;
let isConfettiActive = false;

function initConfetti() {
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
}

function resizeCanvas() {
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
}

class ConfettiParticle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * -canvas.height - 20;
        this.size = Math.random() * 8 + 6;
        this.color = ["#fde047", "#f97316", "#ef4444", "#38bdf8", "#10b981", "#ec4899", "#a855f7"][Math.floor(Math.random() * 7)];
        this.speedX = Math.random() * 4 - 2;
        this.speedY = Math.random() * 3 + 4;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 4 - 2;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.rotation += this.rotationSpeed;
        
        // 觸底重播 (若仍在撒花狀態)
        if (this.y > canvas.height) {
            if (isConfettiActive) {
                this.y = -20;
                this.x = Math.random() * canvas.width;
                this.speedY = Math.random() * 3 + 4;
            }
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();
    }
}

function startConfetti() {
    if (!canvas || isConfettiActive) return;
    isConfettiActive = true;
    particles = Array.from({ length: 120 }, () => new ConfettiParticle());
    
    function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(p => {
            p.update();
            p.draw();
        });

        // 過濾掉掉出螢幕且沒有重生的粒子
        particles = particles.filter(p => p.y <= canvas.height || isConfettiActive);

        if (particles.length > 0 || isConfettiActive) {
            animationFrameId = requestAnimationFrame(loop);
        }
    }
    
    loop();
}

function stopConfetti() {
    isConfettiActive = false;
    // 粒子會自然掉出螢幕後，loop 會自動結束停止繪製
}
