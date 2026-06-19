// 椰子怪討伐戰 - 核心遊戲引擎 (Core Game Engine)

// 椰子怪定義
const MONSTER_BLUEPRINTS = [
    {
        name: "椰漿軟泥酋長",
        coconutsRange: [0, 4],
        baseHp: 60,
        desc: "由濃稠的椰奶與椰果聚合而成的果凍狀怪物，走過的地方都會留下甜膩的椰漿。",
        img: "assets/slime_chief.png"
    },
    {
        name: "椰殼小妖頭目",
        coconutsRange: [5, 7],
        baseHp: 90,
        desc: "戴著半顆椰子殼當作頭盔與盾牌的部落小怪物，喜歡成群結隊在沙灘上惡作劇。",
        img: "assets/goblin_chief.png"
    },
    {
        name: "狂野椰棕猛獸",
        coconutsRange: [8, 10],
        baseHp: 125,
        desc: "身上披著厚重、堅韌「椰子纖維（椰棕）」的叢林巨獸，防禦力極高。",
        img: "assets/beast_king.png"
    },
    {
        name: "鐵殼椰核食人魔",
        coconutsRange: [11, 12],
        baseHp: 140,
        desc: "以堅硬無比的椰核為核心變異而成的南島巨漢，手持巨大的芭蕉葉當作武器。",
        img: "assets/troll_ogre.png"
    },
    {
        name: "遠古珊瑚椰石像",
        coconutsRange: [13, 14],
        baseHp: 160,
        desc: "長滿青苔與附著著熱帶珊瑚的巨大摩艾石像，頭頂長著一顆巨大的椰子樹。",
        img: "assets/coral_golem.png"
    },
    {
        name: "黑潮椰蟹騎士",
        coconutsRange: [15, 17],
        baseHp: 180,
        desc: "南島原住民的怨靈，騎乘著體型巨大的深海椰子蟹，從黑潮中登陸。",
        img: "assets/crab_rider.png"
    },
    {
        name: "風暴椰鱗巨翼龍",
        coconutsRange: [18, 20],
        baseHp: 205,
        desc: "鱗片由堅硬的綠色椰子殼組成，拍打翅膀時會捲起熱帶氣旋與熱帶雨林的風暴。",
        img: "assets/storm_dragon.png"
    },
    {
        name: "枯朽椰骸大祭司",
        coconutsRange: [21, 23],
        baseHp: 230,
        desc: "被吸乾水分的枯死椰子樹與白骨結合，手持插著骷髏的椰子手杖，會施放南島巫術。",
        img: "assets/skeleton_priest.png"
    },
    {
        name: "海溝腐椰海神",
        coconutsRange: [24, 27],
        baseHp: 245,
        desc: "沉入深海海溝、吸收了無數深海怨念的巨大腐爛椰子，周圍伴隨著深海的海妖。",
        img: "assets/abyss_sea_god.png"
    },
    {
        name: "終焉滅世巨椰祖靈",
        coconutsRange: [28, 30],
        baseHp: 300,
        desc: "一切椰子的起源，宛如隕石般巨大、即將從天而降砸毀整座島嶼的神話級巨型椰子。",
        img: "assets/final_boss_ancestor.png"
    }
];

// 預設狀態
const DEFAULT_STATE = {
    teams: Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `第 ${i + 1} 小隊`,
        score: 0,
        prevScore: 0,
        stamina: 100, // 當前剩餘體力
        evilCoconuts: 0,
        bid1: 0, // 前鋒投標體力
        bid2: 0, // 後援投標體力
        role: "none", // vanguard (前鋒), support (後援), traitor (背叛者), none
        scoreGainedThisRound: 0
    })),
    round: 1,
    phase: "SETUP", // SETUP, BID_VANGUARD, BATTLE_VANGUARD, BID_SUPPORT, BATTLE_SUPPORT, ROUND_END, GAME_OVER
    monster: null, // { name, baseHp, maxHp, hp, desc, img }
    evilCoconutTotal: 0,
    vanguardDamage: 0,
    supportDamage: 0,
    monsterHpScale: 1, // 4組前鋒時為 4/3，後援時為後援組數/3
    battleLogs: [],
    // 用於處理前鋒平手的臨時狀態
    vanguardTieStatus: {
        isTied: false,
        candidates: [], // 候選平手小隊 ID
        requiredCount: 0, // 還需要選出幾隊
        resolvedIds: [] // 已選出的平手小隊 ID
    }
};

class GameEngine {
    constructor() {
        this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        this.loadState();
    }

    // 儲存狀態至 localStorage
    saveState() {
        localStorage.setItem("coconut_game_state", JSON.stringify(this.state));
        // 發送自訂事件以便同網頁即時更新
        window.dispatchEvent(new Event("state_updated"));
    }

    // 從 localStorage 讀取狀態
    loadState() {
        const stored = localStorage.getItem("coconut_game_state");
        if (stored) {
            try {
                this.state = JSON.parse(stored);
            } catch (e) {
                console.error("讀取遊戲狀態失敗，初始化為預設狀態", e);
                this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
            }
        } else {
            this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
            this.saveState();
        }
    }

    // 重置遊戲
    resetGame() {
        this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        this.saveState();
    }

    // 初始化隊伍名稱
    initTeams(names) {
        this.state.teams = Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            name: names[i] || `第 ${i + 1} 小隊`,
            score: 0,
            prevScore: 0,
            stamina: 100,
            evilCoconuts: 0,
            bid1: 0,
            bid2: 0,
            role: "none",
            scoreGainedThisRound: 0
        }));
        this.state.round = 1;
        this.state.phase = "BID_VANGUARD";
        this.state.battleLogs = ["遊戲開始！請隊伍秘密提交邪惡椰子數量與前鋒競標體力。"];
        this.saveState();
    }

    // 新增 Log 紀錄
    addLog(msg) {
        const time = new Date().toLocaleTimeString();
        this.state.battleLogs.unshift(`[${time}] ${msg}`);
    }

    // 階段轉換
    setPhase(phase) {
        this.state.phase = phase;
        this.saveState();
    }

    // 輸入邪惡椰子與前鋒體力
    submitVanguardBids(coconutInputs, bidInputs) {
        let totalCoconuts = 0;
        this.state.teams.forEach(team => {
            const coconuts = Math.min(3, Math.max(0, parseInt(coconutInputs[team.id]) || 0));
            const bid = Math.min(100, Math.max(0, parseInt(bidInputs[team.id]) || 0));
            
            team.evilCoconuts = coconuts;
            team.bid1 = bid;
            team.stamina = 100 - bid; // 前鋒剩餘體力
            team.role = "none";
            team.scoreGainedThisRound = 0;
            totalCoconuts += coconuts;
        });

        this.state.evilCoconutTotal = totalCoconuts;
        
        // 決定椰子怪種類與血量
        const blueprint = MONSTER_BLUEPRINTS.find(m => 
            totalCoconuts >= m.coconutsRange[0] && totalCoconuts <= m.coconutsRange[1]
        ) || MONSTER_BLUEPRINTS[0];

        this.state.monster = {
            name: blueprint.name,
            baseHp: blueprint.baseHp,
            maxHp: blueprint.baseHp,
            hp: blueprint.baseHp,
            desc: blueprint.desc,
            img: blueprint.img
        };

        this.addLog(`本輪召喚出【${blueprint.name}】，消耗邪惡椰子共 ${totalCoconuts} 顆。`);
        this.state.phase = "BATTLE_VANGUARD";
        
        // 運算前鋒隊伍篩選
        this.calculateVanguardTeams();
        this.saveState();
    }

    // 計算前鋒隊伍篩選
    calculateVanguardTeams(resolvedTieIds = null) {
        const sorted = [...this.state.teams].sort((a, b) => b.bid1 - a.bid1);
        
        // 尋找投標體力前三名的門檻
        const bid1s = sorted.map(t => t.bid1);
        const cutoffBid = bid1s[2] || 0; // 第三名的投標體力

        const aboveCutoff = this.state.teams.filter(t => t.bid1 > cutoffBid);
        const atCutoff = this.state.teams.filter(t => t.bid1 === cutoffBid);

        let vanguardTeams = [];
        
        if (aboveCutoff.length >= 3) {
            // 如果大於門檻的就已經有3組以上了（例如前三名分別為 80, 70, 60, 60...）
            // 我們直接取大於門檻的隊伍，若剛好有平手，取分數低的
            // 這裡直接對整個 aboveCutoff 排序：Bid降序 -> 分數升序 (分數低優先)
            const sortedAbove = [...aboveCutoff].sort((a, b) => {
                if (b.bid1 !== a.bid1) return b.bid1 - a.bid1;
                return a.score - b.score; // 分數低優先
            });
            vanguardTeams = sortedAbove.slice(0, 3);
            
            // 檢查是否有剛好壓在第3名跟第4名同體力且同分數的情況
            if (sortedAbove.length > 3 && 
                sortedAbove[2].bid1 === sortedAbove[3].bid1 && 
                sortedAbove[2].score === sortedAbove[3].score) {
                // 需要平手決議！
                this.handleVanguardTie(sortedAbove.filter(t => t.bid1 === sortedAbove[2].bid1 && t.score === sortedAbove[2].score), 3 - vanguardTeams.filter(t => t.bid1 > sortedAbove[2].bid1).length, resolvedTieIds);
                return;
            }
        } else {
            // 正常情況下，大於門檻的有 K 隊 (K < 3)，我們需要從 atCutoff 中挑選 (3 - K) 隊
            const required = 3 - aboveCutoff.length;
            
            // 對 atCutoff 進行分數升序排列（分數低的優先進入前鋒）
            const sortedAt = [...atCutoff].sort((a, b) => a.score - b.score);
            
            // 先取前幾名，但要看是否有第四組也可以進入的情況 (至多取四組進前鋒討伐隊)
            // 規則：先取分數低的組別(至多取四組進前鋒討伐隊)
            // 如果 atCutoff 中，前 required 名的分數和第 (required + 1) 名不同，則可以直接分出勝負。
            // 舉例：我們需要 2 隊， atCutoff 有 3 隊，分數分別為 5, 8, 10 -> 直接選 5, 8。
            // 如果分數為 5, 5, 10 -> 選兩個 5 分的。
            // 如果分數為 5, 8, 8 -> 我們可以選 5 分的，另外一個 8 分的需要平手處理。但等等，規則說「至多取四組進前鋒討伐隊」。
            // 如果我們選 4 組，此時如果把兩個 8 分的都選進去（共選了 5, 8, 8 三隊），總共就變成 1 (aboveCutoff) + 3 = 4 隊！
            // 這樣是符合「至多取四組進前鋒」的！
            
            // 讓我們精準實作：
            // 我們把選取目標放寬到「最多4隊」：
            // 如果 atCutoff 中的隊伍，我們排序後：
            // 優先挑選分數低者。
            // 假設我們選到第 3 隊（此時 Vanguard 共 3 隊）。
            // 檢查第 4 隊（如果加入就是 4 隊）是否與第 3 隊平手？
            // 若第 4 隊的 bid 相同，且分數也相同，我們可以把第 4 隊也直接納入前鋒隊伍（總共 4 隊）。
            // 若總共要拿到的隊伍是 Vanguard，我們直接挑選：
            const tempSelected = [...aboveCutoff];
            
            // 排序 atCutoff 以分數升序
            const sortedCandidates = [...atCutoff].sort((a, b) => a.score - b.score);
            
            // 先放最前面的 candidate
            let idx = 0;
            while (tempSelected.length < 3 && idx < sortedCandidates.length) {
                tempSelected.push(sortedCandidates[idx]);
                idx++;
            }
            
            // 此時 tempSelected 長度可能為 3（或小於3，若總體不足3隊）。
            // 如果 tempSelected 長度為 3，檢查下一位 candidates[idx] 是否與 tempSelected[2] 同分數同 bid？
            // 如果同分數同 bid，且我們把下一位也加入，總數會是 4，且不會再有更低分數的平手爭議：
            if (tempSelected.length === 3 && idx < sortedCandidates.length) {
                const currentLast = tempSelected[2];
                const nextCandidate = sortedCandidates[idx];
                
                if (nextCandidate.score === currentLast.score) {
                    // 他們同分同投標！檢查是否還有其他人也同分同投標？
                    const allTiedWithSameScore = sortedCandidates.slice(idx - 1).filter(t => t.score === currentLast.score);
                    
                    if (allTiedWithSameScore.length + (tempSelected.length - 1) <= 4) {
                        // 如果加上所有同分同投標的，總數不超過4，那就全部加入！
                        for (let k = idx; k < sortedCandidates.length; k++) {
                            if (sortedCandidates[k].score === currentLast.score) {
                                tempSelected.push(sortedCandidates[k]);
                            }
                        }
                    } else {
                        // 如果加上所有同分同投標的，總數會超過4，此時就必須平手決議！
                        // 我們需要從這些同分同投標的隊伍中選出足夠的隊伍以達到 3 隊或 4 隊。
                        const safeBaseCount = tempSelected.length - 1; // 扣除最後一隊
                        const remainingSlots = 4 - safeBaseCount; // 為了不超過4，我們可以在平手隊伍中抽籤選
                        const tieCandidates = sortedCandidates.filter(t => t.score === currentLast.score);
                        
                        this.handleVanguardTie(tieCandidates, 3 - safeBaseCount, resolvedTieIds);
                        return;
                    }
                }
            }
            
            // 如果在 tempSelected 的過程中，需要 2 隊，但 atCutoff 中的前兩隊（甚至三隊）分數就相同：
            // 例如：aboveCutoff = 1 隊， atCutoff = 3 隊（分數均為 10 分）。
            // 我們需要挑選 2 隊（達到 3 隊）或最多 3 隊（達到 4 隊）。
            // 如果全部挑選，總數是 4 隊，那可以直接全進！
            // 如果 atCutoff 有 4 隊同為 10 分，全部加入會變成 5 隊，那就必須平手處理。
            if (aboveCutoff.length < 3) {
                const needed = 3 - aboveCutoff.length;
                // 檢查從 atCutoff 取出Needed隊伍時，邊界的平手狀況
                const limitIndex = needed - 1;
                if (sortedCandidates.length > limitIndex) {
                    const cutoffScore = sortedCandidates[limitIndex].score;
                    const sameScoreCandidates = sortedCandidates.filter(t => t.score === cutoffScore);
                    const betterScoreCandidates = sortedCandidates.filter(t => t.score < cutoffScore);
                    
                    const totalIfAllSameScore = aboveCutoff.length + betterScoreCandidates.length + sameScoreCandidates.length;
                    
                    if (totalIfAllSameScore <= 4) {
                        // 全部加入也不會超過4，那直接全部加入
                        vanguardTeams = [...aboveCutoff, ...betterScoreCandidates, ...sameScoreCandidates];
                    } else {
                        // 超過4了，需要進行平手處理！
                        const alreadyInCount = aboveCutoff.length + betterScoreCandidates.length;
                        const slotsToFill = 3 - alreadyInCount; // 至少到3隊
                        
                        this.handleVanguardTie(sameScoreCandidates, slotsToFill, resolvedTieIds);
                        return;
                    }
                } else {
                    vanguardTeams = [...aboveCutoff, ...sortedCandidates];
                }
            } else {
                vanguardTeams = tempSelected;
            }
        }

        // 確認前鋒隊伍！
        this.confirmVanguardTeams(vanguardTeams);
    }

    // 處理前鋒平手
    handleVanguardTie(candidates, requiredCount, resolvedTieIds) {
        if (resolvedTieIds && resolvedTieIds.length >= requiredCount) {
            // 已經手動決議平手
            const resolvedTeams = this.state.teams.filter(t => resolvedTieIds.includes(t.id));
            const otherTeams = this.state.teams.filter(t => 
                t.bid1 > candidates[0].bid1 || 
                (t.bid1 === candidates[0].bid1 && t.score < candidates[0].score)
            );
            
            this.confirmVanguardTeams([...otherTeams, ...resolvedTeams]);
        } else {
            // 設定平手狀態，等待主持人點選或轉盤
            this.state.vanguardTieStatus = {
                isTied: true,
                candidates: candidates.map(t => ({ id: t.id, name: t.name, score: t.score, bid: t.bid1 })),
                requiredCount: requiredCount,
                resolvedIds: []
            };
            this.addLog(`前鋒篩選遇到平手！需要在 ${candidates.map(t => t.name).join("、")} 中挑選至少 ${requiredCount} 隊進入前鋒。`);
            this.saveState();
        }
    }

    // 確認前鋒隊伍名單並套用規則
    confirmVanguardTeams(vanguardTeams) {
        // 重設平手狀態
        this.state.vanguardTieStatus = {
            isTied: false,
            candidates: [],
            requiredCount: 0,
            resolvedIds: []
        };

        // 標註前鋒隊伍
        const vanguardIds = vanguardTeams.map(t => t.id);
        this.state.teams.forEach(t => {
            if (vanguardIds.includes(t.id)) {
                t.role = "vanguard";
            } else {
                t.role = "none";
            }
        });

        // 調整血量：若前鋒為四組，血量 = 原始體力 * 4/3
        const count = vanguardTeams.length;
        if (count === 4) {
            this.state.monsterHpScale = 4 / 3;
            this.state.monster.maxHp = Math.round(this.state.monster.baseHp * (4 / 3));
            this.state.monster.hp = this.state.monster.maxHp;
            this.addLog(`前鋒隊伍共有 4 組，椰子怪血量調整為 ${this.state.monster.maxHp} (原始為 ${this.state.monster.baseHp})。`);
        } else {
            this.state.monsterHpScale = 1;
            this.state.monster.maxHp = this.state.monster.baseHp;
            this.state.monster.hp = this.state.monster.maxHp;
        }

        // 計算前鋒總剩餘體力（即攻擊力）
        const totalDamage = vanguardTeams.reduce((sum, t) => sum + t.stamina, 0);
        this.state.vanguardDamage = totalDamage;

        this.addLog(`前鋒隊伍：${vanguardTeams.map(t => t.name).join("、")}。前鋒總攻擊力（剩餘體力之和）為 ${totalDamage}。`);
        this.saveState();
    }

    // 手動或轉盤決議前鋒平手
    resolveVanguardTie(selectedIds) {
        this.calculateVanguardTeams(selectedIds);
    }

    // 進行前鋒討伐戰
    executeVanguardBattle() {
        if (!this.state.monster) return;

        const damage = this.state.vanguardDamage;
        const currentHp = this.state.monster.hp;
        const newHp = Math.max(0, currentHp - damage);
        this.state.monster.hp = newHp;

        if (newHp === 0) {
            // 討伐成功！
            this.addLog(`前鋒隊伍大獲全勝！成功擊敗【${this.state.monster.name}】！`);
            
            // 前鋒各隊 + 4分
            this.state.teams.forEach(t => {
                if (t.role === "vanguard") {
                    t.prevScore = t.score;
                    t.score += 4;
                    t.scoreGainedThisRound = 4;
                } else {
                    t.prevScore = t.score;
                    t.scoreGainedThisRound = 0;
                }
            });

            this.state.phase = "ROUND_END";
        } else {
            // 討伐失敗，殘血存活，進入 step3
            this.addLog(`【${this.state.monster.name}】仍然殘血存活！剩餘血量為 ${newHp}。遊戲進入後援隊與背叛者階段。`);
            
            // 前鋒此輪不得分
            this.state.teams.forEach(t => {
                if (t.role === "vanguard") {
                    t.prevScore = t.score;
                    t.scoreGainedThisRound = 0;
                }
            });

            this.state.phase = "BID_SUPPORT";
        }
        this.saveState();
    }

    // 提交後援隊競標體力
    submitSupportBids(bidInputs) {
        // bidInputs: { teamId: bidValue }
        this.state.teams.forEach(team => {
            if (team.role !== "vanguard") {
                const remainingStamina = team.stamina; // 上一次投標剩下的體力
                const bid = Math.min(remainingStamina, Math.max(0, parseInt(bidInputs[team.id]) || 0));
                team.bid2 = bid;
                team.stamina = remainingStamina - bid; // 兩次投標後剩下的體力（即攻擊力）
                team.role = "none";
            }
        });

        // 運算後援隊伍篩選
        this.calculateSupportTeams();
        this.saveState();
    }

    // 計算後援隊伍
    calculateSupportTeams() {
        const candidates = this.state.teams.filter(t => t.role !== "vanguard");
        
        // 排序候選隊伍：投標體力降序 -> 邪惡椰子少優先
        // 規則：「若平手，則邪惡椰子較少的優先進入後援隊」
        const sorted = [...candidates].sort((a, b) => {
            if (b.bid2 !== a.bid2) return b.bid2 - a.bid2;
            return a.evilCoconuts - b.evilCoconuts; // 邪惡椰子少優先
        });

        const bid2s = sorted.map(t => t.bid2);
        
        // 我們需要取前3名作為後援隊
        // 檢查第三名與第四名是否有絕對平手（投標相同且邪惡椰子也相同）
        // 規則：「對策：找到能使組數不小於三組的體力門檻，大於等於門檻全部進入後援，且 椰子怪剩餘體力＝原剩餘體力＊（後援隊組數／３）」
        
        let supportTeams = [];
        let isAbsoluteTieAtCutoff = false;

        if (sorted.length >= 3) {
            const cutoffBid = sorted[2].bid2;
            const cutoffCoconuts = sorted[2].evilCoconuts;

            // 檢查第 4 個（如果有）是否與第 3 個完全一致（Bid 和 Coconuts 都相同）
            if (sorted.length > 3 && sorted[3].bid2 === cutoffBid && sorted[3].evilCoconuts === cutoffCoconuts) {
                isAbsoluteTieAtCutoff = true;
            }
            
            if (!isAbsoluteTieAtCutoff) {
                // 沒有平手，直接取前三
                supportTeams = sorted.slice(0, 3);
                this.state.monsterHpScale = 1;
            } else {
                // 有平手！套用門檻對策：
                // 體力門檻設定為該平手的投標體力 `cutoffBid`
                // 所有投標大於等於 `cutoffBid` 的隊伍都進入後援隊。
                supportTeams = candidates.filter(t => t.bid2 >= cutoffBid);
                const count = supportTeams.length;
                this.state.monsterHpScale = count / 3;
                
                // 調整怪物剩餘血量
                const originalRemHp = this.state.monster.hp;
                this.state.monster.hp = Math.round(originalRemHp * (count / 3));
                this.addLog(`後援篩選遇到完全平手！所有投標 >= ${cutoffBid} 的隊伍（共 ${count} 組）均進入後援。椰子怪剩餘血量按比例調整為 ${this.state.monster.hp} (原為 ${originalRemHp})。`);
            }
        } else {
            // 候選隊伍不足3組，全部加入後援
            supportTeams = [...sorted];
            this.state.monsterHpScale = 1;
        }

        // 標記角色
        const supportIds = supportTeams.map(t => t.id);
        this.state.teams.forEach(t => {
            if (t.role !== "vanguard") {
                if (supportIds.includes(t.id)) {
                    t.role = "support";
                } else {
                    t.role = "traitor";
                }
            }
        });

        // 計算後援總攻擊力
        const totalDamage = supportTeams.reduce((sum, t) => sum + t.stamina, 0);
        this.state.supportDamage = totalDamage;

        this.addLog(`後援隊伍：${supportTeams.map(t => t.name).join("、")}。總攻擊力（兩次競標後剩餘體力之和）為 ${totalDamage}。`);
        this.addLog(`背叛者隊伍：${this.state.teams.filter(t => t.role === "traitor").map(t => t.name).join("、") || "無"}。`);
        
        this.state.phase = "BATTLE_SUPPORT";
        this.saveState();
    }

    // 進行後援討伐戰
    executeSupportBattle() {
        if (!this.state.monster) return;

        const damage = this.state.supportDamage;
        const currentHp = this.state.monster.hp;
        const newHp = Math.max(0, currentHp - damage);
        this.state.monster.hp = newHp;

        let supportSuccess = (newHp === 0);

        if (supportSuccess) {
            this.addLog(`後援隊伍補刀成功！成功消滅殘血的【${this.state.monster.name}】！`);
        } else {
            this.addLog(`後援補刀失敗，【${this.state.monster.name}】成功存活逃脫！`);
        }

        // 計算分數
        this.state.teams.forEach(t => {
            t.prevScore = t.score;
            t.scoreGainedThisRound = 0;

            if (t.role === "support" && supportSuccess) {
                // 後援成功各 +2 分
                t.score += 2;
                t.scoreGainedThisRound = 2;
            } else if (t.role === "traitor" && !supportSuccess) {
                // 背叛者：後援討伐失敗，且當前回合只要有投入體力（bid1 > 0 或 bid2 > 0）即可加 1 分
                if (t.bid1 > 0 || t.bid2 > 0) {
                    t.score += 1;
                    t.scoreGainedThisRound = 1;
                }
            }
        });

        this.state.phase = "ROUND_END";
        this.saveState();
    }

    // 進行下一輪或結束遊戲
    nextRound() {
        if (this.state.round >= 8) {
            this.state.phase = "GAME_OVER";
            this.addLog(`8 回合討伐戰結束！遊戲進入最終結算。`);
        } else {
            this.state.round += 1;
            this.state.phase = "BID_VANGUARD";
            
            // 重設每輪狀態，體力恢復至 100
            this.state.teams.forEach(t => {
                t.stamina = 100;
                t.evilCoconuts = 0;
                t.bid1 = 0;
                t.bid2 = 0;
                t.role = "none";
                t.scoreGainedThisRound = 0;
            });

            this.state.monster = null;
            this.state.evilCoconutTotal = 0;
            this.state.vanguardDamage = 0;
            this.state.supportDamage = 0;
            this.state.monsterHpScale = 1;

            this.addLog(`進入第 ${this.state.round} 回合！請各隊伍提交本輪的邪惡椰子數量與前鋒競標體力。`);
        }
        this.saveState();
    }

    // 手動修改隊伍分數與體力（主持人後台 Override 用）
    overrideTeamStats(teamId, scoreOffset, staminaValue = null) {
        const team = this.state.teams.find(t => t.id === teamId);
        if (team) {
            const oldScore = team.score;
            team.score = Math.max(0, team.score + scoreOffset);
            this.addLog(`主持人修改【${team.name}】的分數：${oldScore} -> ${team.score}`);
            
            if (staminaValue !== null) {
                const oldStamina = team.stamina;
                team.stamina = Math.min(100, Math.max(0, parseInt(staminaValue) || 0));
                this.addLog(`主持人修改【${team.name}】的剩餘體力：${oldStamina} -> ${team.stamina}`);
            }
            this.saveState();
        }
    }
}

// 匯出（用於網頁端全域變數或模組）
window.GameEngine = GameEngine;
