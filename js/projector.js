// 椰子怪討伐戰 - 投影幕端腳本 (Projector Display Script)

const engine = new GameEngine();

// DOM 元素引用
const viewSetup = document.getElementById("view-setup");
const viewBid = document.getElementById("view-bid");
const viewBattle = document.getElementById("view-battle");
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

const battleSequenceTitle = document.getElementById("battle-sequence-title");
const battleSequenceList = document.getElementById("battle-sequence-list");
const damageFloatingArea = document.getElementById("damage-floating-area");

// 音效
const audioHit = document.getElementById("audio-hit");
const audioCheer = document.getElementById("audio-cheer");

// 內部狀態追蹤
let lastMonsterHp = null;
let lastPhase = null;
let lastRoundTracker = null;
let audioUnlocked = false;

// 頁面加載
document.addEventListener("DOMContentLoaded", () => {
    createAudioUnlockOverlay();
    
    renderProjector();

    // 監聽來自 Host 的 localStorage 狀態變更
    window.addEventListener("storage", (e) => {
        if (e.key === "coconut_game_state") {
            engine.loadState();
            renderProjector();
        }
    });

    // 監聽來自 Host 的 postMessage 訊息
    window.addEventListener("message", (e) => {
        if (!e.data) return;
        if (e.data.type === "COCONUT_STATE_UPDATE") {
            engine.state = e.data.state;
            renderProjector();
        }
    });

    // 初始化時主動跟 Host 請求狀態
    if (window.opener) {
        window.opener.postMessage({ type: "COCONUT_REQUEST_STATE" }, "*");
    }

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

    // 跨回合時重置血量追蹤，避免播放多餘的扣血動畫
    if (lastRoundTracker !== state.round) {
        lastMonsterHp = null;
        lastRoundTracker = state.round;
    }

    // 1. 更新基本狀態字樣
    projRoundNum.textContent = state.round;

    const phaseBadges = {
        "SETUP": "準備出征",
        "BID": "體力投入中",
        "BATTLE": "討伐決戰",
        "ROUND_END": "回合結算",
        "GAME_OVER": "最終結算"
    };
    projPhaseBadge.textContent = phaseBadges[state.phase] || state.phase;

    // 2. 切換各階段畫面視圖
    viewSetup.style.display = "none";
    viewBid.style.display = "none";
    viewBattle.style.display = "none";
    viewRoundEnd.style.display = "none";
    viewGameOver.style.display = "none";

    const sharedMonsterContainer = document.getElementById("shared-monster-container");
    if (state.phase === "BID" || state.phase === "BATTLE" || state.phase === "ROUND_END") {
        sharedMonsterContainer.style.display = "block";
    } else {
        sharedMonsterContainer.style.display = "none";
    }

    if (state.phase === "SETUP") {
        viewSetup.style.display = "block";
        stopConfetti();
    } else if (state.phase === "BID") {
        viewBid.style.display = "block";
        const ruleTextObj = document.getElementById("projector-bid-rule-text");
        if (ruleTextObj) {
            const r = state.round;
            if (r === 1 || r === 4) {
                ruleTextObj.textContent = "投入體力最高者將優先出手，若順利擊殺 Boss 即可得分！";
            } else if (r === 2 || r === 6 || r === 8) {
                ruleTextObj.textContent = "投入體力最少者將優先出手，若順利擊殺 Boss 即可得分！";
            } else if (r === 3 || r === 5 || r === 7) {
                ruleTextObj.textContent = "投入體力最接近 Boss 當前剩餘體力 (且不超過) 者將優先出手，若順利擊殺 Boss 即可得分！";
            }
        }
        stopConfetti();
    } else if (state.phase === "BATTLE") {
        renderBattlePanel();
        viewBattle.style.display = "block";
    } else if (state.phase === "ROUND_END") {
        renderRoundEndPanel();
        viewRoundEnd.style.display = "block";
        
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

    // 3. 渲染小隊排行榜
    renderLeaderboard();

    // 4. 動效與音效觸發 (扣血)
    if (state.monster) {
        renderMonsterInfo();
        if (lastMonsterHp !== null && state.monster.hp < lastMonsterHp) {
            triggerDamageEffect(lastMonsterHp - state.monster.hp);
        }
        lastMonsterHp = state.monster.hp;
    } else {
        lastMonsterHp = null;
    }

    lastPhase = state.phase;
}

// 獨立渲染怪獸資訊 (用於 BID, BATTLE, ROUND_END 階段)
function renderMonsterInfo() {
    const state = engine.state;
    if (!state.monster) return;

    monsterName.textContent = state.monster.name;
    monsterDesc.textContent = state.monster.desc;
    monsterImg.src = state.monster.img;
    monsterHpText.textContent = `HP: ${state.monster.hp} / ${state.monster.maxHp}`;
    
    const pct = Math.round((state.monster.hp / state.monster.maxHp) * 100);
    hpFill.style.width = `${pct}%`;
    hpPercent.textContent = `${pct}%`;
}

// 渲染戰鬥序列
function renderBattlePanel() {
    const state = engine.state;

    // 戰況轉播
    if (state.attackSequence.length === 0) {
        battleSequenceList.innerHTML = `<div class="glass-card" style="padding: 0.5rem 1rem; border-color: #64748b; font-size: 1.1rem; color: #cbd5e1;">無隊伍發動攻擊 (全數棄權或未投入體力)</div>`;
    } else {
        battleSequenceList.innerHTML = state.attackSequence
            .map((seq, idx) => {
                const t = state.teams.find(tm => tm.id === seq.teamId);
                let resultSpan = "";
                let borderColor = "var(--ocean-dark)";
                let extraStyles = "";
                
                if (seq.result === "win") {
                    resultSpan = `<span style="color:var(--success-green); font-weight:700;"> 💥 致命一擊! </span>`;
                    borderColor = "var(--success-green)";
                    extraStyles = "background: rgba(16, 185, 129, 0.1); transform: scale(1.05); font-weight: bold;";
                } else if (seq.result === "hit") {
                    resultSpan = `<span style="color:var(--danger-red);"> -${seq.bid} 傷害</span>`;
                    borderColor = "var(--danger-red)";
                } else if (seq.result === "skipped_boss_dead") {
                    resultSpan = `<span style="color:#64748b;"> (Boss已倒下，未出手)</span>`;
                    borderColor = "#334155";
                    extraStyles = "opacity: 0.6; text-decoration: line-through;";
                } else if (seq.result === "win_survived") {
                    resultSpan = `<span style="color:var(--success-green); font-weight:700;"> 🏆 首位出擊加分! </span>`;
                    borderColor = "var(--success-green)";
                }

                return `
                    <div class="glass-card" style="padding: 0.5rem 1rem; border-color: ${borderColor}; ${extraStyles}">
                        <span style="color:#94a3b8; font-size:0.9rem;">${idx + 1}.</span> 
                        <strong>${t.name}</strong> 
                        <span style="font-size:0.9rem; color:var(--sand-dark);">(${seq.bid} 體力)</span>
                        ${resultSpan}
                    </div>
                `;
            })
            .join("");
    }
}

// 觸發扣血打擊特效
function triggerDamageEffect(dmg) {
    if (dmg <= 0) return;
    
    playHit();

    monsterCard.classList.add("hurt-shake");
    setTimeout(() => {
        monsterCard.classList.remove("hurt-shake");
    }, 500);

    const dmgEl = document.createElement("div");
    dmgEl.className = "damage-number";
    dmgEl.textContent = `-${dmg}`;
    
    const randomX = 50 + (Math.random() * 20 - 10);
    const randomY = 40 + (Math.random() * 20 - 10);
    dmgEl.style.left = `${randomX}%`;
    dmgEl.style.top = `${randomY}%`;

    damageFloatingArea.appendChild(dmgEl);
    
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
            let color = "#cbd5e1";
            let scoreColor = "#94a3b8";
            let reason = "平靜度過";

            if (t.status === "winner_kill") {
                color = "var(--success-green)";
                scoreColor = "var(--success-green)";
                reason = "討伐成功！";
            } else if (t.status === "winner_survive") {
                color = "var(--sunset-orange)";
                scoreColor = "var(--sunset-orange)";
                reason = "勇氣的祝福!";
            } else if (t.status === "skipped") {
                color = "var(--danger-red)";
                scoreColor = "var(--danger-red)";
                reason = "撞號棄權扣分";
            } else if (t.status === "valid") {
                color = "var(--ocean-dark)";
                reason = "出擊未成";
            }

            return `
                <div style="background: rgba(255,255,255,0.05); padding: 0.75rem; border-radius: 12px; display:flex; justify-content:space-between; align-items:center;">
                    <span>
                        <strong style="color: ${color};">[${reason}]</strong> ${t.name}
                    </span>
                    <strong style="color: ${scoreColor};">
                        ${t.scoreGainedThisRound > 0 ? '+' : ''}${t.scoreGainedThisRound} 分
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
    
    // 排行榜排序邏輯：只按分數降序
    const sorted = [...state.teams].sort((a, b) => b.score - a.score);
    
    projLeaderboard.innerHTML = sorted
        .map((t, index) => {
            const rank = index + 1;
            let rankClass = "";
            if (rank === 1) rankClass = "rank-1";
            else if (rank === 2) rankClass = "rank-2";
            else if (rank === 3) rankClass = "rank-3";

            const scoreDiff = t.score - t.prevScore;
            const diffSpan = scoreDiff > 0 ? `<span class="score-diff">(+${scoreDiff})</span>` : (scoreDiff < 0 ? `<span class="score-diff" style="color:var(--danger-red);">(${scoreDiff})</span>` : "");

            return `
                <div class="leaderboard-item ${rankClass}" data-team-id="${t.id}">
                    <div class="rank-badge">${rank}</div>
                    <div class="team-name">${t.name}</div>
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

        particles = particles.filter(p => p.y <= canvas.height || isConfettiActive);

        if (particles.length > 0 || isConfettiActive) {
            animationFrameId = requestAnimationFrame(loop);
        }
    }
    
    loop();
}

function stopConfetti() {
    isConfettiActive = false;
}
