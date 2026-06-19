// 椰子怪討伐戰 - 主持人端腳本 (Host Control Script)

const engine = new GameEngine();

// DOM 元素引用
const secSetup = document.getElementById("phase-setup");
const secBidVanguard = document.getElementById("phase-bid-vanguard");
const secBattleVanguard = document.getElementById("phase-battle-vanguard");
const secBidSupport = document.getElementById("phase-bid-support");
const secBattleSupport = document.getElementById("phase-battle-support");
const secRoundEnd = document.getElementById("phase-round-end");
const secGameOver = document.getElementById("phase-game-over");

// 資訊看板引用
const infoRound = document.getElementById("info-round");
const infoPhaseName = document.getElementById("info-phase-name");
const infoMonsterName = document.getElementById("info-monster-name");
const infoMonsterHp = document.getElementById("info-monster-hp");
const infoCoconutCount = document.getElementById("info-coconut-count");

// 日誌與小隊清單
const battleLogsBox = document.getElementById("battle-logs-box");
const asideTeamsList = document.getElementById("aside-teams-list");
const overrideTeamsContainer = document.getElementById("override-teams-container");

// 當前頁面初始化
document.addEventListener("DOMContentLoaded", () => {
    render();
    
    // 監聽本地儲存變更，如果是投影幕或別處修改了，這裡也可以自動同步
    window.addEventListener("storage", (e) => {
        if (e.key === "coconut_game_state") {
            engine.loadState();
            render();
        }
    });

    // 監聽引擎內部 saveState 觸發的事件
    window.addEventListener("state_updated", () => {
        render();
    });

    // 綁定表單提交
    document.getElementById("setup-form").addEventListener("submit", handleSetupSubmit);
    document.getElementById("bid-vanguard-form").addEventListener("submit", handleBidVanguardSubmit);
    document.getElementById("bid-support-form").addEventListener("submit", handleBidSupportSubmit);
});

// 主渲染函數
function render() {
    const state = engine.state;

    // 1. 更新側邊欄基本資訊
    infoRound.textContent = state.round;
    infoCoconutCount.textContent = state.evilCoconutTotal;
    
    const phaseNames = {
        "SETUP": "初始設定小隊",
        "BID_VANGUARD": "前鋒投標與召喚",
        "BATTLE_VANGUARD": "前鋒討伐戰",
        "BID_SUPPORT": "後援投標階段",
        "BATTLE_SUPPORT": "後援補刀戰",
        "ROUND_END": "回合結算",
        "GAME_OVER": "討伐大賽結束"
    };
    infoPhaseName.textContent = phaseNames[state.phase] || state.phase;

    if (state.monster) {
        infoMonsterName.textContent = state.monster.name;
        infoMonsterHp.textContent = `${state.monster.hp} / ${state.monster.maxHp}`;
    } else {
        infoMonsterName.textContent = "未召喚";
        infoMonsterHp.textContent = "-";
    }

    // 2. 渲染戰鬥日誌
    battleLogsBox.innerHTML = state.battleLogs
        .map(log => {
            let className = "system";
            if (log.includes("大獲全勝") || log.includes("成功擊敗") || log.includes("成功消滅")) className = "success";
            else if (log.includes("失敗") || log.includes("殘血")) className = "fail";
            else if (log.includes("攻擊力") || log.includes("投標")) className = "battle";
            
            return `<div class="log-entry ${className}">${log}</div>`;
        })
        .join("");

    // 3. 渲染側邊欄小隊分數與體力清單
    asideTeamsList.innerHTML = state.teams
        .map(t => {
            let roleBadge = "";
            if (t.role === "vanguard") roleBadge = `<span class="phase-header-badge" style="background: var(--danger-red); font-size: 0.75rem; padding: 0.1rem 0.4rem;">前鋒</span>`;
            else if (t.role === "support") roleBadge = `<span class="phase-header-badge" style="background: var(--success-green); font-size: 0.75rem; padding: 0.1rem 0.4rem;">後援</span>`;
            else if (t.role === "traitor") roleBadge = `<span class="phase-header-badge" style="background: #8b5cf6; font-size: 0.75rem; padding: 0.1rem 0.4rem;">背叛</span>`;

            return `
                <div style="background: rgba(255,255,255,0.6); padding: 0.5rem; border-radius: 8px; border: 1px solid var(--sand-dark);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong>${t.name} ${roleBadge}</strong>
                        <span style="font-weight:700; color:var(--sunset-orange);">${t.score} 分</span>
                    </div>
                    <div class="stamina-text" style="margin-top: 0.25rem; display:flex; justify-content:space-between;">
                        <span>體力: ${t.stamina} / 100</span>
                        <span>😈 椰子: ${t.evilCoconuts}</span>
                    </div>
                    <div class="stamina-bar-outer">
                        <div class="stamina-bar-inner" style="width: ${t.stamina}%; background: ${t.stamina < 30 ? 'var(--danger-red)' : 'var(--ocean-dark)'}"></div>
                    </div>
                </div>
            `;
        })
        .join("");

    // 4. 渲染主持人手動修正工具
    overrideTeamsContainer.innerHTML = state.teams
        .map(t => `
            <div class="override-card">
                <h5>${t.name}</h5>
                <p style="font-weight:700; color:var(--sunset-orange); font-size: 0.95rem;">${t.score} 分</p>
                <div class="override-btns">
                    <button class="btn btn-secondary btn-sm" onclick="overrideScore(${t.id}, 1)">+1分</button>
                    <button class="btn btn-secondary btn-sm" onclick="overrideScore(${t.id}, -1)">-1分</button>
                </div>
                <div style="margin-top:0.4rem; display:flex; align-items:center; gap:0.25rem;">
                    <span style="font-size:0.75rem; white-space:nowrap;">體力:</span>
                    <input type="number" id="override-stamina-${t.id}" value="${t.stamina}" min="0" max="100" style="width:100%; font-size:0.75rem; padding:0.1rem; border:1px solid var(--sand-dark); border-radius:4px; text-align:center;">
                    <button class="btn btn-success btn-sm" onclick="overrideStamina(${t.id})" style="padding:0.1rem 0.25rem; font-size:0.7rem;">改</button>
                </div>
            </div>
        `)
        .join("");

    // 5. 切換顯示當前階段的控制卡片
    secSetup.style.display = "none";
    secBidVanguard.style.display = "none";
    secBattleVanguard.style.display = "none";
    secBidSupport.style.display = "none";
    secBattleSupport.style.display = "none";
    secRoundEnd.style.display = "none";
    secGameOver.style.display = "none";

    // 更新各區塊回合字樣
    document.querySelectorAll(".round-num-text").forEach(el => el.textContent = state.round);

    if (state.phase === "SETUP") {
        secSetup.style.display = "block";
    } else if (state.phase === "BID_VANGUARD") {
        generateVanguardInputRows();
        secBidVanguard.style.display = "block";
    } else if (state.phase === "BATTLE_VANGUARD") {
        renderVanguardBattlePanel();
        secBattleVanguard.style.display = "block";
    } else if (state.phase === "BID_SUPPORT") {
        generateSupportInputRows();
        secBidSupport.style.display = "block";
    } else if (state.phase === "BATTLE_SUPPORT") {
        renderSupportBattlePanel();
        secBattleSupport.style.display = "block";
    } else if (state.phase === "ROUND_END") {
        renderRoundEndPanel();
        secRoundEnd.style.display = "block";
    } else if (state.phase === "GAME_OVER") {
        secGameOver.style.display = "block";
    }
}

// 動態產生前鋒輸入格
function generateVanguardInputRows() {
    const tbody = document.getElementById("vanguard-inputs-tbody");
    // 如果已經有輸入內容，保留輸入避免被 render 刷新覆蓋
    const existingCoconuts = {};
    const existingBids = {};
    tbody.querySelectorAll("tr").forEach(tr => {
        const teamId = tr.dataset.teamId;
        const coconutsInput = tr.querySelector(".coconut-input");
        const bidInput = tr.querySelector(".bid-input");
        if (coconutsInput) existingCoconuts[teamId] = coconutsInput.value;
        if (bidInput) existingBids[teamId] = bidInput.value;
    });

    tbody.innerHTML = engine.state.teams
        .map(t => {
            const cocoVal = existingCoconuts[t.id] !== undefined ? existingCoconuts[t.id] : 0;
            const bidVal = existingBids[t.id] !== undefined ? existingBids[t.id] : 0;
            return `
                <tr data-team-id="${t.id}">
                    <td><strong>${t.name}</strong> <span style="font-size:0.8rem; color:var(--text-muted);">(目前 ${t.score}分)</span></td>
                    <td>
                        <input type="number" class="form-input coconut-input" style="width: 80px;" min="0" max="3" value="${cocoVal}">
                    </td>
                    <td>
                        <input type="number" class="form-input bid-input" style="width: 100px;" min="0" max="100" value="${bidVal}">
                    </td>
                </tr>
            `;
        })
        .join("");
}

// 處理 SETUP 提交
function handleSetupSubmit(e) {
    e.preventDefault();
    const names = [];
    for (let i = 1; i <= 10; i++) {
        const nameVal = e.target.elements[`team-${i}`].value.trim();
        names.push(nameVal || `第 ${i} 小隊`);
    }
    engine.initTeams(names);
}

// 處理前鋒競標提交
function handleBidVanguardSubmit(e) {
    e.preventDefault();
    const coconutInputs = {};
    const bidInputs = {};
    
    document.querySelectorAll("#vanguard-inputs-tbody tr").forEach(tr => {
        const teamId = tr.dataset.teamId;
        const cocoVal = tr.querySelector(".coconut-input").value;
        const bidVal = tr.querySelector(".bid-input").value;
        coconutInputs[teamId] = cocoVal;
        bidInputs[teamId] = bidVal;
    });

    engine.submitVanguardBids(coconutInputs, bidInputs);
}

// 渲染前鋒決戰面板
function renderVanguardBattlePanel() {
    const state = engine.state;
    if (!state.monster) return;

    // 怪獸與前鋒資訊
    document.getElementById("vanguard-monster-name").textContent = state.monster.name;
    document.getElementById("vanguard-monster-hp").textContent = state.monster.hp;
    document.getElementById("vanguard-monster-maxhp").textContent = state.monster.maxHp;
    document.getElementById("vanguard-damage-text").textContent = state.vanguardDamage;

    const listContainer = document.getElementById("vanguard-team-list");
    const vanguardTeams = state.teams.filter(t => t.role === "vanguard");
    listContainer.innerHTML = vanguardTeams
        .map(t => `<li><strong>${t.name}</strong>：投標 ${t.bid1} 體力，以剩餘 <strong>${t.stamina}</strong> 體力出戰！</li>`)
        .join("");

    // 處理平手區塊
    const tieBox = document.getElementById("vanguard-tie-resolution-box");
    const battleControls = document.getElementById("vanguard-battle-controls");

    if (state.vanguardTieStatus && state.vanguardTieStatus.isTied) {
        tieBox.style.display = "block";
        battleControls.style.display = "none";

        const tieStatus = state.vanguardTieStatus;
        document.getElementById("vanguard-tie-text").innerHTML = `
            前鋒競標第 3 名出現體力與得分完全平手的情況！<br>
            必須在以下小隊中挑選出 <strong>${tieStatus.requiredCount}</strong> 隊進入前鋒：
        `;

        const candidatesContainer = document.getElementById("vanguard-tie-candidates-container");
        candidatesContainer.innerHTML = tieStatus.candidates
            .map(c => `
                <label class="glass-card" style="padding: 0.5rem 1rem; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; border-color: var(--sunset-orange);">
                    <input type="checkbox" name="vanguard-tie-candidate" value="${c.id}" style="width: 18px; height: 18px;">
                    <strong>${c.name}</strong> (投標:${c.bid}, 分數:${c.score})
                </label>
            `)
            .join("");
    } else {
        tieBox.style.display = "none";
        battleControls.style.display = "block";
    }
}

// 提交手動選擇的平手隊伍
function submitVanguardTieSelection() {
    const checkboxes = document.querySelectorAll("input[name='vanguard-tie-candidate']:checked");
    const selectedIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
    const required = engine.state.vanguardTieStatus.requiredCount;

    if (selectedIds.length !== required) {
        alert(`請剛好勾選 ${required} 個小隊進入前鋒！`);
        return;
    }

    engine.resolveVanguardTie(selectedIds);
}

// 進行前鋒討伐
function executeVanguardBattle() {
    engine.executeVanguardBattle();
}

// 動態產生後援輸入
function generateSupportInputRows() {
    const tbody = document.getElementById("support-inputs-tbody");
    
    // 如果已經有輸入，保留
    const existingBids = {};
    tbody.querySelectorAll("tr").forEach(tr => {
        const teamId = tr.dataset.teamId;
        const bidInput = tr.querySelector(".support-bid-input");
        if (bidInput) existingBids[teamId] = bidInput.value;
    });

    // 只有非前鋒隊伍需要後援投標
    const candidates = engine.state.teams.filter(t => t.role !== "vanguard");

    tbody.innerHTML = candidates
        .map(t => {
            const bidVal = existingBids[t.id] !== undefined ? existingBids[t.id] : 0;
            return `
                <tr data-team-id="${t.id}">
                    <td><strong>${t.name}</strong> <span style="font-size:0.8rem; color:var(--text-muted);">(目前 ${t.score}分)</span></td>
                    <td><strong style="color: var(--ocean-dark); font-size:1.1rem;">${t.stamina}</strong> 點</td>
                    <td>
                        <input type="number" class="form-input support-bid-input" style="width: 100px;" min="0" max="${t.stamina}" value="${bidVal}">
                    </td>
                </tr>
            `;
        })
        .join("");
}

// 處理後援競標提交
function handleBidSupportSubmit(e) {
    e.preventDefault();
    const bidInputs = {};
    
    document.querySelectorAll("#support-inputs-tbody tr").forEach(tr => {
        const teamId = tr.dataset.teamId;
        const bidVal = tr.querySelector(".support-bid-input").value;
        bidInputs[teamId] = bidVal;
    });

    engine.submitSupportBids(bidInputs);
}

// 渲染後援決戰面板
function renderSupportBattlePanel() {
    const state = engine.state;
    if (!state.monster) return;

    document.getElementById("support-monster-name").textContent = state.monster.name;
    document.getElementById("support-monster-hp").textContent = state.monster.hp;
    document.getElementById("support-damage-text").textContent = state.supportDamage;

    const listContainer = document.getElementById("support-team-list");
    const supportTeams = state.teams.filter(t => t.role === "support");
    listContainer.innerHTML = supportTeams
        .map(t => `<li><strong>${t.name}</strong>：剩餘 ${t.stamina + t.bid2} 體力，投標 ${t.bid2}，出戰 <strong>${t.stamina}</strong>！</li>`)
        .join("");
}

// 進行後援討伐
function executeSupportBattle() {
    engine.executeSupportBattle();
}

// 渲染回合結算面板
function renderRoundEndPanel() {
    const state = engine.state;
    const scoresList = document.getElementById("round-scores-list");
    
    scoresList.innerHTML = state.teams
        .map(t => {
            let roleName = "背叛者";
            if (t.role === "vanguard") roleName = "前鋒部隊";
            else if (t.role === "support") roleName = "後援部隊";

            let details = "";
            if (t.role === "vanguard") details = `(剩餘體力挑戰，投標:${t.bid1})`;
            else if (t.role === "support") details = `(剩餘體力挑戰，一標:${t.bid1},二標:${t.bid2})`;
            else if (t.role === "traitor") details = `(總投標:${t.bid1 + t.bid2})`;

            return `
                <li>
                    <strong>${t.name}</strong> (${roleName}) ${details}：
                    <span style="color: ${t.scoreGainedThisRound > 0 ? 'var(--success-green)' : '#64748b'}; font-weight:700;">
                        +${t.scoreGainedThisRound} 分
                    </span> (累計: ${t.score} 分)
                </li>
            `;
        })
        .join("");

    const nextBtnText = document.getElementById("next-round-num-text");
    if (state.round >= 8) {
        nextBtnText.parentElement.innerHTML = "🏆 結束討伐，進入最終排行榜";
    } else {
        nextBtnText.textContent = state.round + 1;
    }
}

// 下一輪
function nextRound() {
    engine.nextRound();
}

// 重置遊戲
function resetGame() {
    if (confirm("確定要重置並重新開始嗎？所有分數與紀錄將被清除。")) {
        engine.resetGame();
    }
}

// 手動調整分數
function overrideScore(teamId, offset) {
    engine.overrideTeamStats(teamId, offset);
}

// 手動調整體力
function overrideStamina(teamId) {
    const staminaVal = document.getElementById(`override-stamina-${teamId}`).value;
    engine.overrideTeamStats(teamId, 0, staminaVal);
}

/* ========================================================
   輪盤轉盤 (Roulette Tie-breaker) 控制邏輯
   ======================================================== */
const rouletteModal = document.getElementById("roulette-modal");
const rouletteWheel = document.getElementById("roulette-wheel");
const wheelResultText = document.getElementById("wheel-result-text");
const closeWheelBtn = document.getElementById("close-wheel-btn");
const spinBtn = document.getElementById("spin-btn");

let activeCandidates = [];
let winningCandidateIndex = -1;

function openWheelModal(candidates) {
    activeCandidates = candidates;
    winningCandidateIndex = -1;
    wheelResultText.textContent = "";
    closeWheelBtn.style.display = "none";
    spinBtn.disabled = false;
    rouletteWheel.style.transform = "rotate(0deg)";
    rouletteWheel.style.transition = "none";

    // 建立 conic-gradient 背景表示各隊區塊
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
    
    rouletteWheel.style.background = `conic-gradient(${conicParts.join(", ")})`;

    // 動態加入小標籤表示隊伍（選填顏色說明）
    rouletteWheel.innerHTML = candidates
        .map((c, i) => {
            const angle = (360 / n) * i + (360 / n) / 2;
            const colorCircle = colors[i % colors.length];
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

    rouletteModal.style.display = "flex";
}

function spinVanguardWheel() {
    if (engine.state.vanguardTieStatus && engine.state.vanguardTieStatus.isTied) {
        openWheelModal(engine.state.vanguardTieStatus.candidates);
    }
}

function spinTheWheelAction() {
    if (activeCandidates.length === 0) return;
    
    spinBtn.disabled = true;
    wheelResultText.textContent = "命運椰子樹正在搖晃...";

    // 1. 隨機選出贏家
    winningCandidateIndex = Math.floor(Math.random() * activeCandidates.length);
    const n = activeCandidates.length;

    // 2. 計算旋轉角度以使贏家區塊落在最上方 (12點鐘方向，即 0 度)
    // Conic gradient 的第 i 個區塊是在角度 (360/n)*i 到 (360/n)*(i+1)
    // 為了讓區塊 i 旋轉後指針 (頂端) 對準它，需要把輪盤轉動： 360 - 區塊中心角度
    const segmentAngle = 360 / n;
    const centerAngle = (winningCandidateIndex + 0.5) * segmentAngle;
    const targetDeg = 3600 + (360 - centerAngle); // 多轉10圈

    // 這裡把轉盤事件寫入 localStorage 以同步投影幕！
    const winner = activeCandidates[winningCandidateIndex];
    localStorage.setItem("coconut_spin_event", JSON.stringify({
        candidates: activeCandidates,
        winnerId: winner.id,
        targetDeg: targetDeg,
        timestamp: Date.now()
    }));

    // 3. 觸發 CSS 動效
    rouletteWheel.style.transition = "transform 4s cubic-bezier(0.15, 0.85, 0.35, 1.02)";
    rouletteWheel.style.transform = `rotate(${targetDeg}deg)`;

    // 4. 動效結束回呼
    setTimeout(() => {
        const winner = activeCandidates[winningCandidateIndex];
        wheelResultText.innerHTML = `🎉 恭喜！由 <strong>${winner.name}</strong> 獲得進入前鋒的資格！`;
        closeWheelBtn.style.display = "block";
    }, 4100);
}

function closeWheel() {
    rouletteModal.style.display = "none";
    if (winningCandidateIndex !== -1) {
        const winnerId = activeCandidates[winningCandidateIndex].id;
        
        // 將選擇的 ID 納入 resolvedIds，如果達到了 requiredCount 即可直接確認
        const status = engine.state.vanguardTieStatus;
        status.resolvedIds.push(winnerId);
        
        if (status.resolvedIds.length >= status.requiredCount) {
            engine.resolveVanguardTie(status.resolvedIds);
        } else {
            // 如果還需要選，就提示主持人繼續轉或手動選
            alert(`已選出第 1 個小隊：${engine.state.teams.find(t=>t.id === winnerId).name}，還需要再選出 ${status.requiredCount - status.resolvedIds.length} 個小隊。`);
            // 更新 UI
            engine.saveState();
        }
    }
}

function closeWheelModal() {
    rouletteModal.style.display = "none";
}
