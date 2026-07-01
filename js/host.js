// 椰子怪討伐戰 - 主持人端腳本 (Host Control Script)

const engine = new GameEngine();

// 追蹤投影幕視窗引用
const projectorWindows = new Set();

function openProjector() {
    const win = window.open('projector.html', '_blank');
    if (win) {
        projectorWindows.add(win);
        setTimeout(() => {
            win.postMessage({ type: 'COCONUT_STATE_UPDATE', state: engine.state }, '*');
        }, 500);
    }
}

function broadcastMessage(msg) {
    projectorWindows.forEach(win => {
        if (win.closed) {
            projectorWindows.delete(win);
        } else {
            win.postMessage(msg, '*');
        }
    });
}

// 監聽來自投影網頁的主動連線要求
window.addEventListener('message', (event) => {
    if (!event.data) return;
    if (event.data.type === 'COCONUT_REQUEST_STATE') {
        projectorWindows.add(event.source);
        event.source.postMessage({ type: 'COCONUT_STATE_UPDATE', state: engine.state }, '*');
    }
});

// DOM 元素引用
const secSetup = document.getElementById("phase-setup");
const secBid = document.getElementById("phase-bid");
const secBattle = document.getElementById("phase-battle");
const secRoundEnd = document.getElementById("phase-round-end");
const secGameOver = document.getElementById("phase-game-over");

// 資訊看板引用
const infoRound = document.getElementById("info-round");
const infoPhaseName = document.getElementById("info-phase-name");
const infoMonsterName = document.getElementById("info-monster-name");
const infoMonsterHp = document.getElementById("info-monster-hp");

// 日誌與小隊清單
const battleLogsBox = document.getElementById("battle-logs-box");
const asideTeamsList = document.getElementById("aside-teams-list");
const overrideTeamsContainer = document.getElementById("override-teams-container");

// 當前頁面初始化
document.addEventListener("DOMContentLoaded", () => {
    render();
    
    // 監聽本地儲存變更
    window.addEventListener("storage", (e) => {
        if (e.key === "coconut_game_state") {
            engine.loadState();
            render();
        }
    });

    // 監聽引擎內部 saveState 觸發的事件
    window.addEventListener("state_updated", () => {
        render();
        broadcastMessage({ type: 'COCONUT_STATE_UPDATE', state: engine.state });
    });

    // 綁定表單提交
    document.getElementById("setup-form").addEventListener("submit", handleSetupSubmit);
    document.getElementById("bid-form").addEventListener("submit", handleBidSubmit);
});

// 主渲染函數
function render() {
    const state = engine.state;

    // 1. 更新側邊欄基本資訊
    infoRound.textContent = state.round;
    
    const phaseNames = {
        "SETUP": "初始設定小隊",
        "BID": "體力投入與競標",
        "BATTLE": "依序討伐戰",
        "ROUND_END": "回合結算",
        "GAME_OVER": "討伐大賽結束"
    };
    infoPhaseName.textContent = phaseNames[state.phase] || state.phase;

    if (state.monster) {
        infoMonsterName.textContent = state.monster.name;
        // 如果是戰鬥後，顯示當前血量，否則顯示滿血
        infoMonsterHp.textContent = `${state.monster.hp} / ${state.monster.maxHp}`;
        
        const bidMonsterName = document.getElementById("bid-monster-name");
        const bidMonsterHp = document.getElementById("bid-monster-hp");
        if (bidMonsterName) bidMonsterName.textContent = state.monster.name;
        if (bidMonsterHp) bidMonsterHp.textContent = state.monster.maxHp;
    } else {
        infoMonsterName.textContent = "未召喚";
        infoMonsterHp.textContent = "-";
        
        const bidMonsterName = document.getElementById("bid-monster-name");
        const bidMonsterHp = document.getElementById("bid-monster-hp");
        if (bidMonsterName) bidMonsterName.textContent = "-";
        if (bidMonsterHp) bidMonsterHp.textContent = "-";
    }

    // 2. 渲染戰鬥日誌
    battleLogsBox.innerHTML = state.battleLogs
        .map(log => {
            let className = "system";
            if (log.includes("大獲全勝") || log.includes("成功擊敗") || log.includes("獲得獎勵分數")) className = "success";
            else if (log.includes("失敗") || log.includes("殘血") || log.includes("棄權")) className = "fail";
            else if (log.includes("傷害") || log.includes("攻擊")) className = "battle";
            
            return `<div class="log-entry ${className}">${log}</div>`;
        })
        .join("");

    // 3. 渲染側邊欄小隊分數清單
    asideTeamsList.innerHTML = state.teams
        .map(t => {
            let statusBadge = "";
            if (t.status === "skipped") statusBadge = `<span class="phase-header-badge" style="background: var(--danger-red); font-size: 0.75rem; padding: 0.1rem 0.4rem;">棄權</span>`;
            else if (t.status === "winner_kill" || t.status === "winner_survive") statusBadge = `<span class="phase-header-badge" style="background: var(--success-green); font-size: 0.75rem; padding: 0.1rem 0.4rem;">勝出</span>`;
            else if (t.status === "valid") statusBadge = `<span class="phase-header-badge" style="background: var(--ocean-dark); font-size: 0.75rem; padding: 0.1rem 0.4rem;">參戰</span>`;

            return `
                <div style="background: rgba(255,255,255,0.6); padding: 0.5rem; border-radius: 8px; border: 1px solid var(--sand-dark);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong>${t.name} ${statusBadge}</strong>
                        <span style="font-weight:700; color:var(--sunset-orange);">${t.score} 分</span>
                    </div>
                    ${state.phase !== "SETUP" && state.phase !== "BID" ? `<div style="font-size:0.8rem; color:#64748b; margin-top:0.25rem;">本輪投入: ${t.bid}</div>` : ""}
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
            </div>
        `)
        .join("");

    // 5. 切換顯示當前階段的控制卡片
    secSetup.style.display = "none";
    secBid.style.display = "none";
    secBattle.style.display = "none";
    secRoundEnd.style.display = "none";
    secGameOver.style.display = "none";

    // 更新各區塊回合字樣
    document.querySelectorAll(".round-num-text").forEach(el => el.textContent = state.round);

    if (state.phase === "SETUP") {
        secSetup.style.display = "block";
    } else if (state.phase === "BID") {
        generateBidInputRows();
        secBid.style.display = "block";
    } else if (state.phase === "BATTLE") {
        renderBattlePanel();
        secBattle.style.display = "block";
    } else if (state.phase === "ROUND_END") {
        renderRoundEndPanel();
        secRoundEnd.style.display = "block";
    } else if (state.phase === "GAME_OVER") {
        secGameOver.style.display = "block";
    }
}

// 動態產生競標輸入格
function generateBidInputRows() {
    const tbody = document.getElementById("bid-inputs-tbody");
    // 保留已輸入內容
    const existingBids = {};
    tbody.querySelectorAll("tr").forEach(tr => {
        const teamId = tr.dataset.teamId;
        const bidInput = tr.querySelector(".bid-input");
        if (bidInput) existingBids[teamId] = bidInput.value;
    });

    tbody.innerHTML = engine.state.teams
        .map(t => {
            const bidVal = existingBids[t.id] !== undefined ? existingBids[t.id] : 0;
            return `
                <tr data-team-id="${t.id}">
                    <td><strong>${t.name}</strong> <span style="font-size:0.8rem; color:var(--text-muted);">(目前 ${t.score}分)</span></td>
                    <td>
                        <input type="number" class="form-input bid-input" style="width: 120px;" min="0" max="80" value="${bidVal}">
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

// 處理競標提交
function handleBidSubmit(e) {
    e.preventDefault();
    const bidInputs = {};
    
    document.querySelectorAll("#bid-inputs-tbody tr").forEach(tr => {
        const teamId = tr.dataset.teamId;
        const bidVal = tr.querySelector(".bid-input").value;
        bidInputs[teamId] = bidVal;
    });

    engine.submitBids(bidInputs);
}

// 渲染討伐決戰面板
function renderBattlePanel() {
    const state = engine.state;
    if (!state.monster) return;

    // 怪獸資訊
    document.getElementById("battle-monster-name").textContent = state.monster.name;
    document.getElementById("battle-monster-hp").textContent = `${state.monster.hp} / ${state.monster.maxHp}`;

    const listContainer = document.getElementById("battle-sequence-list");
    
    // 如果攻擊序列是空的，代表大家都棄權
    if (state.attackSequence.length === 0) {
        listContainer.innerHTML = "<li>無隊伍可攻擊（全數棄權或0體力）</li>";
    } else {
        listContainer.innerHTML = state.attackSequence
            .map((seq, i) => {
                const t = state.teams.find(tm => tm.id === seq.teamId);
                let resultText = "";
                if (seq.result === "win") resultText = "<span style='color:var(--success-green);'> [致命一擊!]</span>";
                else if (seq.result === "hit") resultText = ` [造成 ${seq.bid} 傷害]`;
                else if (seq.result === "skipped_boss_dead") resultText = " <span style='color:#94a3b8;'>[Boss已死，略過]</span>";
                else if (seq.result === "win_survived") resultText = "<span style='color:var(--success-green);'> [Boss存活，首位加分!]</span>";

                return `<li>${i + 1}. <strong>${t.name}</strong> (體力: ${seq.bid}) ${resultText}</li>`;
            })
            .join("");
    }
}

// 進行討伐
function executeBattle() {
    engine.executeBattleSequence();
}

// 渲染回合結算面板
function renderRoundEndPanel() {
    const state = engine.state;
    const scoresList = document.getElementById("round-scores-list");
    
    scoresList.innerHTML = state.teams
        .map(t => {
            let reason = "";
            if (t.status === "skipped") reason = " (撞號棄權扣分)";
            else if (t.status === "winner_kill") reason = " (成功討伐)";
            else if (t.status === "winner_survive") reason = " (勇氣的祝福!)";
            else reason = " (未得分)";

            return `
                <li>
                    <strong>${t.name}</strong> ${reason}：
                    <span style="color: ${t.scoreGainedThisRound > 0 ? 'var(--success-green)' : (t.scoreGainedThisRound < 0 ? 'var(--danger-red)' : '#64748b')}; font-weight:700;">
                        ${t.scoreGainedThisRound > 0 ? '+' : ''}${t.scoreGainedThisRound} 分
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
