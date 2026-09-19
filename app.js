const storageKey = "boardgame-review-card-library-v2";

const ruleCategories = [
  { value: "forget", label: "容易忘的规则" },
  { value: "dispute", label: "常见争议" },
  { value: "setup", label: "开局准备" },
  { value: "scoring", label: "计分提醒" }
];
const categoryLabel = Object.fromEntries(ruleCategories.map((item) => [item.value, item.label]));
const complexityRank = { 轻: 1, 中: 2, 重: 3 };

function makeRule(text, category) {
  return { id: crypto.randomUUID(), category, text, mastered: false };
}

function seedGame(name, minPlayers, maxPlayers, complexity, lastPlayed, rules) {
  return {
    id: crypto.randomUUID(),
    name,
    minPlayers,
    maxPlayers,
    complexity,
    lastPlayed,
    confirmed: {},
    rules: rules.map(([category, text]) => makeRule(text, category))
  };
}

const defaultState = {
  selectedId: "",
  session: null,
  games: [
    seedGame("奥尔良", 2, 4, "中", "2026-06-20", [
      ["setup", "按人数放置货物板块，每位玩家拿起始随从、商人和个人板"],
      ["forget", "商站建造前先确认道路或水路连接"],
      ["forget", "袋中随从抽完后不是重洗弃堆，而是从已回袋内容继续抽"],
      ["dispute", "事件顺序和玩家动作结算先后"],
      ["dispute", "科技板是否能替代所有同类随从"],
      ["scoring", "货物分数 + 商站和市民乘区块 + 金币和建筑剩余加分"]
    ]),
    seedGame("盖亚计划", 1, 4, "重", "2026-03-02", [
      ["setup", "随机终局计分板和回合得分板，按种族设置起始资源和母星"],
      ["forget", "联邦连接时卫星数量和能量消耗要一起核对"],
      ["forget", "研究升到顶必须拿对应科技板限制"],
      ["dispute", "被动充能是否能拒绝"],
      ["dispute", "星球改造费用受哪些能力影响"],
      ["scoring", "终局计分板 + 科技轨排名 + 联邦和建筑分"]
    ]),
    seedGame("花砖物语", 2, 4, "轻", "2026-08-15", [
      ["setup", "按人数放工厂圆盘，每个圆盘补4块砖"],
      ["forget", "每轮结束先铺墙再补工厂展示区"],
      ["forget", "地板线扣分后清空对应砖"],
      ["dispute", "同色砖放置限制是否看整面墙"],
      ["dispute", "中央区起始玩家标记是否必须拿"],
      ["scoring", "横竖相邻即时分，完整行列和颜色终局加分"]
    ])
  ],
  records: []
};

let state = loadState();
if (!state.selectedId) state.selectedId = state.games[0]?.id || "";
if (state.session && !state.games.some((game) => game.id === state.session.gameId)) {
  state.session = null;
}

const els = {
  searchInput: document.querySelector("#searchInput"),
  playerFilter: document.querySelector("#playerFilter"),
  complexityFilter: document.querySelector("#complexityFilter"),
  sortMode: document.querySelector("#sortMode"),
  gameForm: document.querySelector("#gameForm"),
  nameInput: document.querySelector("#nameInput"),
  minPlayersInput: document.querySelector("#minPlayersInput"),
  maxPlayersInput: document.querySelector("#maxPlayersInput"),
  complexityInput: document.querySelector("#complexityInput"),
  lastPlayedInput: document.querySelector("#lastPlayedInput"),
  gameList: document.querySelector("#gameList"),
  detailView: document.querySelector("#detailView"),
  gameCount: document.querySelector("#gameCount"),
  ruleCount: document.querySelector("#ruleCount"),
  recordCount: document.querySelector("#recordCount"),
  staleGame: document.querySelector("#staleGame"),
  visibleCount: document.querySelector("#visibleCount"),
  recordList: document.querySelector("#recordList"),
  recordHint: document.querySelector("#recordHint")
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(defaultState);
  try {
    return { ...structuredClone(defaultState), ...JSON.parse(saved) };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function daysSince(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return Math.max(0, Math.floor((new Date() - date) / 86400000));
}

function unmasteredRules(game) {
  return game.rules.filter((rule) => !rule.mastered);
}

function confirmedCount(game) {
  return unmasteredRules(game).filter((rule) => game.confirmed[rule.id]).length;
}

function getFilteredGames() {
  const keyword = els.searchInput.value.trim();
  const player = els.playerFilter.value;
  const complexity = els.complexityFilter.value;
  const games = state.games.filter((game) => {
    const text = `${game.name}${game.rules.map((rule) => rule.text).join("")}`;
    const matchesKeyword = !keyword || text.includes(keyword);
    const matchesPlayer =
      player === "all" ||
      (player === "7+"
        ? game.maxPlayers >= 7
        : Number(player) >= game.minPlayers && Number(player) <= game.maxPlayers);
    const matchesComplexity = complexity === "all" || game.complexity === complexity;
    return matchesKeyword && matchesPlayer && matchesComplexity;
  });

  if (els.sortMode.value === "name") return games.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  if (els.sortMode.value === "complexity") {
    return games.sort((a, b) => complexityRank[b.complexity] - complexityRank[a.complexity]);
  }
  return games.sort((a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed));
}

function renderSummary() {
  const unmasteredCount = state.games.reduce((sum, game) => sum + unmasteredRules(game).length, 0);
  const stale = [...state.games].sort(
    (a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed)
  )[0];
  els.gameCount.textContent = state.games.length;
  els.ruleCount.textContent = unmasteredCount;
  els.recordCount.textContent = state.records.length;
  els.staleGame.textContent = stale
    ? `${escapeHtml(stale.name)} · ${daysSince(stale.lastPlayed)}天`
    : "-";
}

function renderList() {
  const games = getFilteredGames();
  els.visibleCount.textContent = `${games.length}个匹配`;
  els.gameList.innerHTML =
    games
      .map((game) => {
        const selected = game.id === state.selectedId ? "selected" : "";
        const inSession = state.session?.gameId === game.id;
        const done = confirmedCount(game);
        const total = unmasteredRules(game).length;
        return `
          <article class="game-card ${selected}" data-game-id="${game.id}">
            <div class="cover">
              <span>${escapeHtml(game.name.slice(0, 2))}</span>
              <span class="stale-ribbon">${daysSince(game.lastPlayed)}天未玩</span>
              ${inSession ? `<span class="session-ribbon">开局中 ${done}/${total}</span>` : ""}
            </div>
            <div class="game-body">
              <h3>${escapeHtml(game.name)}</h3>
              <div class="game-meta">
                <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
                <span class="pill heavy">${escapeHtml(game.complexity)}</span>
                <span class="pill">${game.rules.length}张卡</span>
              </div>
            </div>
          </article>
        `;
      })
      .join("") || `<p class="empty">没有符合筛选的桌游。</p>`;
}

function renderDetail() {
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) {
    els.detailView.innerHTML = `<p class="empty">先录入一个桌游。</p>`;
    return;
  }

  const total = unmasteredRules(game).length;
  const done = confirmedCount(game);
  const isSessionGame = state.session?.gameId === game.id;

  els.detailView.innerHTML = `
    <div class="quick-card">
      <div>
        <h2>${escapeHtml(game.name)}</h2>
        <div class="game-meta">
          <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
          <span class="pill heavy">${escapeHtml(game.complexity)}</span>
          <span class="pill">上次 ${escapeHtml(game.lastPlayed)}（${daysSince(game.lastPlayed)}天前）</span>
          ${isSessionGame ? `<span class="pill session">开局中 · ${state.session.players}人</span>` : ""}
        </div>
      </div>

      ${renderSessionPanel(game, isSessionGame, done, total)}

      <div class="rule-groups">
        ${ruleCategories
          .map((category) => renderRuleGroup(game, category, isSessionGame))
          .join("")}
      </div>

      <form class="add-rule" id="ruleForm">
        <select id="ruleCategoryInput">
          ${ruleCategories
            .map((category) => `<option value="${category.value}">${category.label}</option>`)
            .join("")}
        </select>
        <textarea id="ruleTextInput" rows="2" placeholder="补充一条规则复习卡" required></textarea>
        <button class="primary" type="submit">加入规则卡</button>
      </form>
      <div class="detail-actions">
        <button id="deleteGameBtn" type="button">删除该游戏</button>
      </div>
    </div>
  `;

  refreshPlayerHint();
}

function renderSessionPanel(game, isSessionGame, done, total) {
  if (!state.session) {
    return `
      <section class="session-panel prep">
        <h3>准备开局</h3>
        <p class="hint">选择本次人数，人数适配支持范围才可开局。</p>
        <div class="session-row">
          <label class="players-label">
            本次人数
            <input id="sessionPlayersInput" type="number" min="1" max="12" value="${game.minPlayers}" />
          </label>
          <button class="primary" id="startSessionBtn" type="button">开始开局</button>
        </div>
        <p class="hint" id="playerHint"></p>
      </section>
    `;
  }

  if (!isSessionGame) {
    const other = state.games.find((item) => item.id === state.session.gameId);
    return `
      <section class="session-panel blocked">
        <h3>开局进行中</h3>
        <p class="hint">当前正在开 <strong>${escapeHtml(other?.name || "另一款游戏")}</strong>（${state.session.players}人），完成或取消后才能为其他游戏开局。</p>
      </section>
    `;
  }

  const allDone = done === total;
  const percent = total === 0 ? 100 : Math.round((done / total) * 100);
  return `
    <section class="session-panel active">
      <div class="session-head">
        <h3>本次开局 · ${state.session.players}人</h3>
        <span class="${allDone ? "ok" : "pending"}">${done}/${total} 已确认</span>
      </div>
      <div class="progress"><span style="width:${percent}%"></span></div>
      <p class="hint">
        ${
          total === 0
            ? "没有待掌握的规则卡，可以直接记为已玩。"
            : allDone
              ? "未掌握规则已全部确认，可以记为已玩。"
              : "逐张勾选「本次已确认」，全部确认后才能记为已玩。"
        }
      </p>
      <div class="session-row">
        <button class="primary" id="completeSessionBtn" type="button" ${allDone ? "" : "disabled"}>
          全部确认并记为已玩
        </button>
        <button id="cancelSessionBtn" type="button">取消开局</button>
      </div>
    </section>
  `;
}

function renderRuleGroup(game, category, isSessionGame) {
  const items = game.rules.filter((rule) => rule.category === category.value);
  return `
    <section class="rule-section">
      <h3>${category.label}</h3>
      <ul class="rule-list">
        ${
          items
            .map((rule) => {
              const checked = game.confirmed[rule.id] ? "checked" : "";
              const confirmControl =
                isSessionGame && !rule.mastered
                  ? `<label class="confirm-check"><input type="checkbox" data-rule-confirm="${rule.id}" ${checked} />本次已确认</label>`
                  : "";
              return `
                <li class="${rule.mastered ? "mastered" : ""}">
                  <div class="rule-main">
                    <span class="rule-text">${escapeHtml(rule.text)}</span>
                    <div class="rule-tools">
                      ${confirmControl}
                      <button type="button" data-rule-master="${rule.id}">
                        ${rule.mastered ? "标为未掌握" : "标为已掌握"}
                      </button>
                      <button type="button" title="删除" data-rule-delete="${rule.id}">×</button>
                    </div>
                  </div>
                </li>
              `;
            })
            .join("") || `<li class="placeholder"><span>暂无卡片。</span></li>`
        }
      </ul>
    </section>
  `;
}

function renderRecords() {
  els.recordCount.textContent = state.records.length;
  els.recordList.innerHTML =
    state.records
      .map(
        (record) => `
          <article class="record-item">
            <div>
              <strong>${escapeHtml(record.gameName)}</strong>
              <span>${record.players}人局</span>
            </div>
            <time>${escapeHtml(record.date)}</time>
            <button type="button" title="删除记录" data-record-delete="${record.id}">×</button>
          </article>
        `
      )
      .join("") || `<p class="empty">还没有开局记录。</p>`;
}

function renderAll() {
  saveState();
  renderSummary();
  renderList();
  renderDetail();
  renderRecords();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setDefaultDate() {
  const date = new Date();
  date.setMonth(date.getMonth() - 2);
  els.lastPlayedInput.value = date.toISOString().slice(0, 10);
}

function addGame(event) {
  event.preventDefault();
  let minPlayers = Number(els.minPlayersInput.value);
  let maxPlayers = Number(els.maxPlayersInput.value);
  if (maxPlayers < minPlayers) maxPlayers = minPlayers;
  const game = seedGame(
    els.nameInput.value.trim(),
    minPlayers,
    maxPlayers,
    els.complexityInput.value,
    els.lastPlayedInput.value,
    [
      ["setup", "开局前补充本作的组件摆放与人数设置。"],
      ["forget", "开局前补充一条容易忘记的规则。"]
    ]
  );
  state.games.unshift(game);
  state.selectedId = game.id;
  els.gameForm.reset();
  setDefaultDate();
  renderAll();
}

function refreshPlayerHint() {
  const game = state.games.find((item) => item.id === state.selectedId);
  const input = document.querySelector("#sessionPlayersInput");
  const button = document.querySelector("#startSessionBtn");
  const hint = document.querySelector("#playerHint");
  if (!game || !input || !button || !hint) return;
  const players = Number(input.value);
  const fits = players >= game.minPlayers && players <= game.maxPlayers;
  button.disabled = !fits;
  hint.textContent = fits
    ? `${players}人适配，可开始开局。`
    : `${game.name} 仅支持 ${game.minPlayers}-${game.maxPlayers} 人，当前 ${players} 人无法开局。`;
  hint.className = `hint ${fits ? "fits" : "blocked-text"}`;
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
  const category = document.querySelector("#ruleCategoryInput").value;
  const text = document.querySelector("#ruleTextInput").value.trim();
  if (!text) return;
  game.rules.push(makeRule(text, category));
  renderAll();
});

els.detailView.addEventListener("input", (event) => {
  if (event.target.id === "sessionPlayersInput") refreshPlayerHint();
});

els.detailView.addEventListener("click", (event) => {
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;

  const startButton = event.target.closest("#startSessionBtn");
  const cancelButton = event.target.closest("#cancelSessionBtn");
  const completeButton = event.target.closest("#completeSessionBtn");
  const confirmBox = event.target.closest("[data-rule-confirm]");
  const masterButton = event.target.closest("[data-rule-master]");
  const deleteRuleButton = event.target.closest("[data-rule-delete]");
  const deleteGameButton = event.target.closest("#deleteGameBtn");

  if (startButton && !state.session) {
    const players = Number(document.querySelector("#sessionPlayersInput").value);
    if (players >= game.minPlayers && players <= game.maxPlayers) {
      state.session = { gameId: game.id, players };
      renderAll();
    }
    return;
  }

  if (cancelButton && state.session?.gameId === game.id) {
    state.session = null;
    renderAll();
    return;
  }

  if (completeButton && state.session?.gameId === game.id) {
    const total = unmasteredRules(game).length;
    if (confirmedCount(game) !== total) return;
    const today = todayString();
    game.lastPlayed = today;
    game.confirmed = {};
    state.records.unshift({
      id: crypto.randomUUID(),
      gameId: game.id,
      gameName: game.name,
      players: state.session.players,
      date: today
    });
    state.session = null;
    renderAll();
    return;
  }

  if (confirmBox && state.session?.gameId === game.id) {
    const ruleId = confirmBox.dataset.ruleConfirm;
    if (confirmBox.checked) game.confirmed[ruleId] = true;
    else delete game.confirmed[ruleId];
    renderAll();
    return;
  }

  if (masterButton) {
    const rule = game.rules.find((item) => item.id === masterButton.dataset.ruleMaster);
    if (!rule) return;
    rule.mastered = !rule.mastered;
    delete game.confirmed[rule.id];
    renderAll();
    return;
  }

  if (deleteRuleButton) {
    const ruleId = deleteRuleButton.dataset.ruleDelete;
    game.rules = game.rules.filter((item) => item.id !== ruleId);
    delete game.confirmed[ruleId];
    renderAll();
    return;
  }

  if (deleteGameButton) {
    state.games = state.games.filter((item) => item.id !== game.id);
    if (state.session?.gameId === game.id) state.session = null;
    state.selectedId = state.games[0]?.id || "";
    renderAll();
  }
});

els.recordList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-record-delete]");
  if (!button) return;
  state.records = state.records.filter((record) => record.id !== button.dataset.recordDelete);
  renderAll();
});

setDefaultDate();
renderAll();
refreshPlayerHint();
