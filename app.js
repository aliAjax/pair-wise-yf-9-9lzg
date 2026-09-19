const storageKey = "zfl18-boardgame-rule-cards";
const RULE_KEYS = ["forgets", "disputes", "setup", "scoring"];
const today = new Date();

function makeRule(text) {
  return { id: crypto.randomUUID(), text };
}

const defaultState = {
  selectedId: "",
  sessionConfirmed: {},
  sessionPlayers: {},
  sessions: [],
  games: [
    {
      id: crypto.randomUUID(),
      name: "奥尔良",
      minPlayers: 2,
      maxPlayers: 4,
      duration: 90,
      complexity: "中",
      lastPlayed: "2025-11-20",
      cover: "",
      forgets: [
        makeRule("商站建造前先确认道路或水路连接"),
        makeRule("袋中随从抽完后不是重洗弃堆，而是从已回袋内容继续抽")
      ],
      disputes: [
        makeRule("事件顺序和玩家动作结算先后"),
        makeRule("科技板是否能替代所有同类随从")
      ],
      setup: [
        makeRule("按人数放置货物板块"),
        makeRule("每位玩家拿起始随从、商人和个人板")
      ],
      scoring: [
        makeRule("货物分数"),
        makeRule("商站和市民乘区块"),
        makeRule("金币和建筑剩余加分")
      ]
    },
    {
      id: crypto.randomUUID(),
      name: "盖亚计划",
      minPlayers: 1,
      maxPlayers: 4,
      duration: 150,
      complexity: "重",
      lastPlayed: "2025-08-02",
      cover: "",
      forgets: [
        makeRule("联邦连接时卫星数量和能量消耗要一起核对"),
        makeRule("研究升到顶必须拿对应科技板限制")
      ],
      disputes: [
        makeRule("被动充能是否能拒绝"),
        makeRule("星球改造费用受哪些能力影响")
      ],
      setup: [
        makeRule("随机终局计分板和回合得分板"),
        makeRule("按种族设置起始资源和母星")
      ],
      scoring: [
        makeRule("终局计分板"),
        makeRule("科技轨排名"),
        makeRule("联邦和建筑分")
      ]
    },
    {
      id: crypto.randomUUID(),
      name: "花砖物语",
      minPlayers: 2,
      maxPlayers: 4,
      duration: 45,
      complexity: "轻",
      lastPlayed: "2026-03-15",
      cover: "",
      forgets: [
        makeRule("每轮结束先铺墙再补工厂展示区"),
        makeRule("地板线扣分后清空对应砖")
      ],
      disputes: [
        makeRule("同色砖放置限制是否看整面墙"),
        makeRule("中央区起始玩家标记是否必须拿")
      ],
      setup: [
        makeRule("按人数放工厂圆盘"),
        makeRule("每个圆盘补4块砖")
      ],
      scoring: [
        makeRule("横竖相邻即时分"),
        makeRule("完整行列和颜色终局加分")
      ]
    }
  ]
};

let state = loadState();
if (!state.selectedId) state.selectedId = state.games[0]?.id || "";

const els = {
  searchInput: document.querySelector("#searchInput"),
  playerFilter: document.querySelector("#playerFilter"),
  complexityFilter: document.querySelector("#complexityFilter"),
  sortMode: document.querySelector("#sortMode"),
  gameForm: document.querySelector("#gameForm"),
  nameInput: document.querySelector("#nameInput"),
  minPlayersInput: document.querySelector("#minPlayersInput"),
  maxPlayersInput: document.querySelector("#maxPlayersInput"),
  durationInput: document.querySelector("#durationInput"),
  complexityInput: document.querySelector("#complexityInput"),
  lastPlayedInput: document.querySelector("#lastPlayedInput"),
  coverInput: document.querySelector("#coverInput"),
  gameList: document.querySelector("#gameList"),
  detailView: document.querySelector("#detailView"),
  gameCount: document.querySelector("#gameCount"),
  ruleCount: document.querySelector("#ruleCount"),
  sessionCount: document.querySelector("#sessionCount"),
  staleGame: document.querySelector("#staleGame"),
  visibleCount: document.querySelector("#visibleCount")
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(defaultState);
  try {
    return normalizeState({ ...structuredClone(defaultState), ...JSON.parse(saved) });
  } catch {
    return structuredClone(defaultState);
  }
}

function normalizeState(raw) {
  raw.games = (raw.games || []).map((game) => {
    for (const key of RULE_KEYS) {
      game[key] = (game[key] || []).map((item) => (typeof item === "string" ? makeRule(item) : item));
    }
    return game;
  });
  raw.sessionConfirmed = raw.sessionConfirmed || {};
  raw.sessionPlayers = raw.sessionPlayers || {};
  raw.sessions = raw.sessions || [];
  return raw;
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function daysSince(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return Math.max(0, Math.floor((today - date) / 86400000));
}

function getAllRules(game) {
  return RULE_KEYS.flatMap((key) => game[key]);
}

function getSessionInfo(game) {
  const raw = state.sessionPlayers[game.id];
  const hasValue = raw !== "" && raw != null;
  const players = hasValue ? Number(raw) : null;
  const playersValid = players != null && Number.isInteger(players) && players >= 1;
  const fits = playersValid && players >= game.minPlayers && players <= game.maxPlayers;
  const rules = getAllRules(game);
  const confirmedSet = new Set(state.sessionConfirmed[game.id] || []);
  const confirmedCount = rules.filter((item) => confirmedSet.has(item.id)).length;
  const allConfirmed = confirmedCount === rules.length;
  return {
    hasValue,
    players,
    playersValid,
    fits,
    total: rules.length,
    confirmedCount,
    allConfirmed,
    canPlay: fits && allConfirmed
  };
}

function getFilteredGames() {
  const keyword = els.searchInput.value.trim();
  const player = els.playerFilter.value;
  const complexity = els.complexityFilter.value;
  const games = state.games.filter((game) => {
    const text = `${game.name}${getAllRules(game).map((item) => item.text).join("")}`;
    const matchesKeyword = !keyword || text.includes(keyword);
    const matchesPlayer = player === "all" || (Number(player) >= game.minPlayers && Number(player) <= game.maxPlayers);
    const matchesComplexity = complexity === "all" || game.complexity === complexity;
    return matchesKeyword && matchesPlayer && matchesComplexity;
  });

  if (els.sortMode.value === "name") return games.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  if (els.sortMode.value === "complexity") {
    const rank = { 轻: 1, 中: 2, 重: 3 };
    return games.sort((a, b) => rank[b.complexity] - rank[a.complexity]);
  }
  return games.sort((a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed));
}

function renderSummary() {
  const allRuleCount = state.games.reduce((sum, game) => sum + getAllRules(game).length, 0);
  const stale = [...state.games].sort((a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed))[0];
  els.gameCount.textContent = state.games.length;
  els.ruleCount.textContent = allRuleCount;
  els.sessionCount.textContent = state.sessions.length;
  els.staleGame.textContent = stale ? `${daysSince(stale.lastPlayed)}天` : "-";
}

function renderList() {
  const games = getFilteredGames();
  const playCounts = state.sessions.reduce((map, item) => {
    map[item.gameId] = (map[item.gameId] || 0) + 1;
    return map;
  }, {});
  els.visibleCount.textContent = `${games.length}个匹配`;
  els.gameList.innerHTML =
    games
      .map((game) => {
        const selected = game.id === state.selectedId ? "selected" : "";
        return `
          <article class="game-card ${selected}" data-game-id="${game.id}">
            <div class="cover">
              ${
                game.cover
                  ? `<img src="${game.cover}" alt="${escapeHtml(game.name)}封面" />`
                  : `<span>${escapeHtml(game.name.slice(0, 2))}</span>`
              }
              <span class="stale-ribbon">${daysSince(game.lastPlayed)}天未玩</span>
            </div>
            <div class="game-body">
              <h3>${escapeHtml(game.name)}</h3>
              <div class="game-meta">
                <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
                <span class="pill">${game.duration}分钟</span>
                <span class="pill heavy">${escapeHtml(game.complexity)}</span>
                <span class="pill">已开${playCounts[game.id] || 0}次</span>
              </div>
            </div>
          </article>
        `;
      })
      .join("") || `<p class="empty">没有符合筛选的桌游。</p>`;
}

function renderDetail() {
  const game = state.games.find((item) => item.id === state.selectedId) || state.games[0];
  if (!game) {
    els.detailView.innerHTML = `<p class="empty">先添加一个桌游。</p>`;
    return;
  }
  state.selectedId = game.id;
  const confirmedSet = new Set(state.sessionConfirmed[game.id] || []);
  const playersDraft = state.sessionPlayers[game.id] ?? "";
  els.detailView.innerHTML = `
    <div class="quick-card">
      <div class="detail-cover">
        ${game.cover ? `<img src="${game.cover}" alt="${escapeHtml(game.name)}封面" />` : `<span>${escapeHtml(game.name.slice(0, 2))}</span>`}
      </div>
      <div>
        <h2>${escapeHtml(game.name)}</h2>
        <div class="game-meta">
          <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
          <span class="pill">${game.duration}分钟</span>
          <span class="pill heavy">${escapeHtml(game.complexity)}</span>
          <span class="pill">${daysSince(game.lastPlayed)}天未玩</span>
        </div>
      </div>
      <section class="session-box">
        <h3>准备开局</h3>
        <label>
          本次人数
          <input id="sessionPlayersInput" type="number" min="1" max="12" inputmode="numeric" placeholder="${game.minPlayers}-${game.maxPlayers}人" value="${escapeHtml(playersDraft)}" />
        </label>
        <div id="sessionStatus">${renderSessionStatus(game)}</div>
      </section>
      ${renderRuleSection("容易忘的规则", "forgets", game.forgets, confirmedSet)}
      ${renderRuleSection("常见争议", "disputes", game.disputes, confirmedSet)}
      ${renderRuleSection("开局准备", "setup", game.setup, confirmedSet)}
      ${renderRuleSection("计分提醒", "scoring", game.scoring, confirmedSet)}
      <form class="add-rule" id="ruleForm">
        <select id="ruleTypeInput">
          <option value="forgets">容易忘的规则</option>
          <option value="disputes">常见争议</option>
          <option value="setup">开局准备</option>
          <option value="scoring">计分提醒</option>
        </select>
        <textarea id="ruleTextInput" rows="3" placeholder="补充一条聚会前要看的提醒" required></textarea>
        <button class="primary" type="submit">加入规则卡片</button>
      </form>
      ${renderSessionHistory(game)}
      <div class="detail-actions">
        <button id="deleteGameBtn" type="button">删除桌游</button>
      </div>
    </div>
  `;
}

function renderSessionStatus(game) {
  const info = getSessionInfo(game);
  let hint;
  let tone = "";
  if (!info.hasValue) {
    hint = "输入本次人数，再逐张勾选规则卡标记已确认。";
  } else if (!info.playersValid) {
    hint = "请输入有效人数（正整数）。";
    tone = "warn";
  } else if (!info.fits) {
    hint = `人数不适配：${escapeHtml(game.name)}支持 ${game.minPlayers}-${game.maxPlayers} 人，无法开局。`;
    tone = "warn";
  } else if (!info.allConfirmed) {
    hint = `人数适配，还剩 ${info.total - info.confirmedCount} 张规则卡待确认。`;
  } else {
    hint = "人数适配，规则已全部确认，可以记为已玩。";
    tone = "ok";
  }
  const percent = info.total === 0 ? 100 : Math.round((info.confirmedCount / info.total) * 100);
  return `
    <p class="session-hint ${tone}">${hint}</p>
    <div class="progress"><span style="width:${percent}%"></span></div>
    <p class="session-progress">本次已确认 ${info.confirmedCount}/${info.total} 张规则卡</p>
    <button id="playedTodayBtn" class="primary" type="button" ${info.canPlay ? "" : "disabled"}>记为已玩</button>
  `;
}

function renderRuleSection(title, key, items, confirmedSet) {
  return `
    <section class="rule-section">
      <h3>${title}</h3>
      <ul class="rule-list">
        ${
          items
            .map(
              (item) => `
                <li class="${confirmedSet.has(item.id) ? "confirmed" : ""}">
                  <label class="rule-check">
                    <input type="checkbox" data-confirm-id="${item.id}" ${confirmedSet.has(item.id) ? "checked" : ""} />
                    <span>${escapeHtml(item.text)}</span>
                  </label>
                  <button type="button" title="删除" data-rule-key="${key}" data-rule-id="${item.id}">×</button>
                </li>
              `
            )
            .join("") || `<li><span>暂无内容。</span></li>`
        }
      </ul>
    </section>
  `;
}

function renderSessionHistory(game) {
  const records = state.sessions.filter((item) => item.gameId === game.id);
  const rows = records
    .slice(0, 5)
    .map(
      (item) => `
        <li>
          <span>${escapeHtml(item.date)}</span>
          <span>${item.players}人局 · 确认${item.ruleCount}张</span>
        </li>
      `
    )
    .join("");
  return `
    <section class="rule-section">
      <h3>开局记录（共${records.length}次）</h3>
      <ul class="rule-list session-list">
        ${rows || `<li><span>还没有开局记录。</span></li>`}
      </ul>
    </section>
  `;
}

function renderAll() {
  saveState();
  renderSummary();
  renderList();
  renderDetail();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

async function addGame(event) {
  event.preventDefault();
  const minPlayers = Number(els.minPlayersInput.value);
  const maxPlayers = Math.max(minPlayers, Number(els.maxPlayersInput.value));
  const cover = await readFileAsDataUrl(els.coverInput.files[0]);
  const game = {
    id: crypto.randomUUID(),
    name: els.nameInput.value.trim(),
    minPlayers,
    maxPlayers,
    duration: Number(els.durationInput.value),
    complexity: els.complexityInput.value,
    lastPlayed: els.lastPlayedInput.value,
    cover,
    forgets: [makeRule("本局开始前先补充容易忘的规则。")],
    disputes: [],
    setup: [makeRule("整理组件并按人数调整初始设置。")],
    scoring: [makeRule("确认终局计分项和即时得分项。")]
  };
  state.games.unshift(game);
  state.selectedId = game.id;
  els.gameForm.reset();
  setDefaultDate();
  renderAll();
}

function markPlayed(game) {
  const info = getSessionInfo(game);
  if (!info.canPlay) return;
  game.lastPlayed = todayString();
  state.sessions.unshift({
    id: crypto.randomUUID(),
    gameId: game.id,
    gameName: game.name,
    players: info.players,
    date: game.lastPlayed,
    ruleCount: info.total
  });
  delete state.sessionConfirmed[game.id];
  renderAll();
}

function setDefaultDate() {
  const date = new Date();
  date.setMonth(date.getMonth() - 2);
  els.lastPlayedInput.value = date.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

els.searchInput.addEventListener("input", renderAll);
els.playerFilter.addEventListener("change", renderAll);
els.complexityFilter.addEventListener("change", renderAll);
els.sortMode.addEventListener("change", renderAll);
els.gameForm.addEventListener("submit", addGame);

els.gameList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-game-id]");
  if (!card) return;
  state.selectedId = card.dataset.gameId;
  renderAll();
});

els.detailView.addEventListener("submit", (event) => {
  if (event.target.id !== "ruleForm") return;
  event.preventDefault();
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;
  const key = document.querySelector("#ruleTypeInput").value;
  const text = document.querySelector("#ruleTextInput").value.trim();
  if (!text) return;
  game[key].push(makeRule(text));
  renderAll();
});

els.detailView.addEventListener("input", (event) => {
  if (event.target.id !== "sessionPlayersInput") return;
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;
  state.sessionPlayers[game.id] = event.target.value;
  saveState();
  const status = document.querySelector("#sessionStatus");
  if (status) status.innerHTML = renderSessionStatus(game);
});

els.detailView.addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-confirm-id]");
  if (!checkbox) return;
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;
  const confirmedSet = new Set(state.sessionConfirmed[game.id] || []);
  if (checkbox.checked) {
    confirmedSet.add(checkbox.dataset.confirmId);
  } else {
    confirmedSet.delete(checkbox.dataset.confirmId);
  }
  state.sessionConfirmed[game.id] = [...confirmedSet];
  renderAll();
});

els.detailView.addEventListener("click", (event) => {
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;

  const ruleButton = event.target.closest("[data-rule-id]");
  if (ruleButton) {
    const key = ruleButton.dataset.ruleKey;
    const ruleId = ruleButton.dataset.ruleId;
    game[key] = game[key].filter((item) => item.id !== ruleId);
    const confirmedSet = new Set(state.sessionConfirmed[game.id] || []);
    confirmedSet.delete(ruleId);
    state.sessionConfirmed[game.id] = [...confirmedSet];
    renderAll();
    return;
  }

  if (event.target.closest("#playedTodayBtn")) {
    markPlayed(game);
    return;
  }

  if (event.target.closest("#deleteGameBtn")) {
    state.games = state.games.filter((item) => item.id !== game.id);
    delete state.sessionConfirmed[game.id];
    delete state.sessionPlayers[game.id];
    state.selectedId = state.games[0]?.id || "";
    renderAll();
  }
});

setDefaultDate();
renderAll();
