// 椰子怪討伐戰 - 核心遊戲引擎 (Core Game Engine)

// 椰子怪定義 (依據 10 回合固定順序與血量)
const ROUND_MONSTERS = [
    {
        name: "椰殼小妖頭目",
        hp: 170,
        desc: "戴著半顆椰子殼當作頭盔與盾牌的部落小怪物，喜歡成群結隊在沙灘上惡作劇。",
        img: "assets/goblin_chief.png"
    },
    {
        name: "鐵殼椰核食人魔",
        hp: 320,
        desc: "以堅硬無比的椰核為核心變異而成的南島巨漢，手持巨大的芭蕉葉當作武器。",
        img: "assets/troll_ogre.png"
    },
    {
        name: "狂野椰棕猛獸",
        hp: 225,
        desc: "身上披著厚重、堅韌「椰子纖維（椰棕）」的叢林巨獸，防禦力極高。",
        img: "assets/beast_king.png"
    },
    {
        name: "風暴椰鱗巨翼龍",
        hp: 512,
        desc: "鱗片由堅硬的綠色椰子殼組成，拍打翅膀時會捲起熱帶氣旋與熱帶雨林的風暴。",
        img: "assets/storm_dragon.png"
    },
    {
        name: "椰漿軟泥酋長",
        hp: 81,
        desc: "由濃稠的椰奶與椰果聚合而成的果凍狀怪物，走過的地方都會留下甜膩的椰漿。",
        img: "assets/slime_chief.png"
    },
    {
        name: "海溝腐椰海神",
        hp: 700,
        desc: "沉入深海海溝、吸收了無數深海怨念的巨大腐爛椰子，周圍伴隨著深海的海妖。",
        img: "assets/abyss_sea_god.png"
    },
    {
        name: "遠古珊瑚椰石像",
        hp: 399,
        desc: "長滿青苔與附著著熱帶珊瑚的巨大摩艾石像，頭頂長著一顆巨大的椰子樹。",
        img: "assets/coral_golem.png"
    },
    {
        name: "黑潮椰蟹騎士",
        hp: 468,
        desc: "南島原住民的怨靈，騎乘著體型巨大的深海椰子蟹，從黑潮中登陸。",
        img: "assets/crab_rider.png"
    },
    {
        name: "枯朽椰骸大祭司",
        hp: 654,
        desc: "被吸乾水分的枯死椰子樹與白骨結合，手持插著骷髏的椰子手杖，會施放南島巫術。",
        img: "assets/skeleton_priest.png"
    },
    {
        name: "終焉滅世巨椰祖靈",
        hp: 755,
        desc: "一切椰子的起源，宛如隕石般巨大、即將從天而降砸毀整座島嶼的神話級巨型椰子。",
        img: "assets/final_boss_ancestor.png"
    }
];

// 預設狀態
const DEFAULT_STATE = {
    teams: Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `第 ${i + 1} 小隊`,
        score: 10,
        prevScore: 10,
        bid: 0, // 投入體力
        status: "none", // none, valid, skipped, winner
        scoreGainedThisRound: 0
    })),
    round: 1,
    phase: "SETUP", // SETUP, BID, BATTLE, ROUND_END, GAME_OVER
    monster: null, // { name, maxHp, hp, desc, img }
    battleLogs: [],
    attackSequence: [] // 記錄攻擊順序與結果，例如 [{teamId, bid, result: 'hit'|'skipped'|'win', hpAfter}]
};

class GameEngine {
    constructor() {
        this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        this.loadState();
    }

    // 儲存狀態至 localStorage
    saveState() {
        localStorage.setItem("coconut_game_state", JSON.stringify(this.state));
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

    // 初始化隊伍與第一回合
    initTeams(names) {
        this.state.teams = Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            name: names[i] || `第 ${i + 1} 小隊`,
            score: 10,
            prevScore: 10,
            bid: 0,
            status: "none",
            scoreGainedThisRound: 0
        }));
        this.state.round = 1;
        this.state.battleLogs = ["遊戲開始！請各隊伍秘密提交第一回合投入的體力。"];
        this.setupRoundMonster();
        this.saveState();
    }

    // 設定回合怪獸
    setupRoundMonster() {
        const roundIdx = this.state.round - 1;
        if (roundIdx < ROUND_MONSTERS.length) {
            const m = ROUND_MONSTERS[roundIdx];
            this.state.monster = {
                name: m.name,
                maxHp: m.hp,
                hp: m.hp,
                desc: m.desc,
                img: m.img
            };
            this.state.phase = "BID";
            this.addLog(`第 ${this.state.round} 回合：【${m.name}】出現了！Boss 血量為 ${m.hp}。`);
        } else {
            this.state.phase = "GAME_OVER";
            this.addLog("所有回合已結束！");
        }
    }

    // 提交體力競標
    submitBids(bidInputs) {
        // bidInputs: { teamId: bidValue }
        
        // 1. 記錄每個隊伍的 bid 並分類
        const bidCounts = {}; // 用於統計每個 bid 出現的次數
        
        this.state.teams.forEach(team => {
            const bid = Math.min(80, Math.max(0, parseInt(bidInputs[team.id]) || 0));
            team.bid = bid;
            team.prevScore = team.score;
            team.scoreGainedThisRound = 0;
            team.status = "none";
            
            if (!bidCounts[bid]) bidCounts[bid] = 0;
            bidCounts[bid]++;
        });

        // 2. 判斷是否重複（棄權扣 1 分）
        this.state.teams.forEach(team => {
            if (bidCounts[team.bid] > 1) {
                team.status = "skipped";
                team.score -= 1;
                team.scoreGainedThisRound = -1;
                this.addLog(`【${team.name}】投入了 ${team.bid} 體力，但與其他隊伍撞號，判定棄權並扣 1 分！`);
            } else {
                team.status = "valid";
            }
        });

        this.state.phase = "BATTLE";
        
        // 準備攻擊順序 (由高到低，剔除棄權)
        const validTeams = this.state.teams.filter(t => t.status === "valid");
        validTeams.sort((a, b) => b.bid - a.bid);
        
        this.state.attackSequence = validTeams.map(t => ({
            teamId: t.id,
            bid: t.bid,
            result: 'pending',
            hpAfter: null
        }));

        this.addLog("體力結算完畢！準備開始按投入體力依序攻擊...");
        this.saveState();
    }

    // 進行討伐戰 (自動推演整個攻擊序列)
    executeBattleSequence() {
        if (!this.state.monster || this.state.phase !== "BATTLE") return;

        let bossDefeated = false;
        let winnerTeamId = null;

        for (let i = 0; i < this.state.attackSequence.length; i++) {
            const seq = this.state.attackSequence[i];
            const team = this.state.teams.find(t => t.id === seq.teamId);
            
            if (bossDefeated) {
                seq.result = 'skipped_boss_dead';
                seq.hpAfter = 0;
                continue;
            }

            // 進行攻擊
            this.state.monster.hp -= seq.bid;
            
            if (this.state.monster.hp <= 0) {
                this.state.monster.hp = 0;
                seq.hpAfter = 0;
                seq.result = 'win';
                bossDefeated = true;
                winnerTeamId = team.id;
                this.addLog(`【${team.name}】造成 ${seq.bid} 傷害，成功擊敗了【${this.state.monster.name}】！`);
            } else {
                seq.hpAfter = this.state.monster.hp;
                seq.result = 'hit';
                this.addLog(`【${team.name}】造成 ${seq.bid} 傷害，Boss 剩餘血量 ${this.state.monster.hp}。`);
            }
        }

        // 如果所有人都打完，Boss 還活著，由第一個打的人獲得 1 分
        if (!bossDefeated && this.state.attackSequence.length > 0) {
            const firstSeq = this.state.attackSequence[0];
            winnerTeamId = firstSeq.teamId;
            const firstTeam = this.state.teams.find(t => t.id === winnerTeamId);
            firstSeq.result = 'win_survived';
            this.addLog(`【${this.state.monster.name}】承受了所有攻擊並存活！由率先攻擊的【${firstTeam.name}】獲得獎勵分數！`);
        } else if (!bossDefeated && this.state.attackSequence.length === 0) {
            this.addLog(`本輪所有隊伍皆棄權，【${this.state.monster.name}】毫髮無傷地離開了！`);
        }

        // 處理贏家加分
        if (winnerTeamId) {
            const winner = this.state.teams.find(t => t.id === winnerTeamId);
            winner.status = bossDefeated ? "winner_kill" : "winner_survive";
            winner.score += 1;
            winner.scoreGainedThisRound += 1;
        }

        this.state.phase = "ROUND_END";
        this.saveState();
    }

    // 進行下一輪或結束遊戲
    nextRound() {
        if (this.state.round >= 10) {
            this.state.phase = "GAME_OVER";
            this.addLog(`10 回合討伐戰結束！遊戲進入最終結算。`);
        } else {
            this.state.round += 1;
            
            // 重設每輪狀態
            this.state.teams.forEach(t => {
                t.bid = 0;
                t.status = "none";
                t.scoreGainedThisRound = 0;
            });
            this.state.attackSequence = [];

            this.setupRoundMonster();
        }
        this.saveState();
    }

    // 手動修改隊伍分數（主持人後台 Override 用）
    overrideTeamStats(teamId, scoreOffset) {
        const team = this.state.teams.find(t => t.id === teamId);
        if (team) {
            const oldScore = team.score;
            team.score = team.score + scoreOffset;
            this.addLog(`主持人修改【${team.name}】的分數：${oldScore} -> ${team.score}`);
            this.saveState();
        }
    }
}

// 匯出（用於網頁端全域變數或模組）
window.GameEngine = GameEngine;
