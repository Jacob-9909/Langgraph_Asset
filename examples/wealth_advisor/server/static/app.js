/* ── State ─────────────────────────────────────────── */
let token = sessionStorage.getItem("wa_token");
let userName = sessionStorage.getItem("wa_name");
let portfolioChart = null;


const ASSET_TYPE_LABELS = {
  deposit: "예금", savings: "적금", stock: "주식", bond: "채권",
  fund: "펀드", insurance: "보험", pension: "연금", real_estate: "부동산",
  crypto: "암호화폐", cash: "현금/CMA", other: "기타",
};

const RISK_LABELS = { low: "낮음 (안전)", mid: "중간", high: "높음 (수익 추구)" };
const EMPLOYMENT_LABELS = {
  employee: "직장인(근로)", self_employed: "사업/자영업",
  freelancer: "프리랜서", homemaker_student_retiree: "주부/학생/은퇴", other: "기타",
};
const INCOME_LABELS = {
  under_35m: "~약 3,500만원", "35m_to_70m": "3,500~7,000만원",
  "70m_to_120m": "7,000만~1.2억원", over_120m: "1.2억원 초과", prefer_not_say: "비공개",
};

/* ── API Helper ────────────────────────────────────── */
async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(path, { ...opts, headers });
  if (res.status === 401) { logout(); throw new Error("Unauthorized"); }
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

/* ── Auth ──────────────────────────────────────────── */
function showAuthTab(tab) {
  document.getElementById("login-form").classList.toggle("hidden", tab !== "login");
  document.getElementById("register-form").classList.toggle("hidden", tab !== "register");
  const loginTab = document.getElementById("tab-login");
  const regTab = document.getElementById("tab-register");
  const active = ["bg-gray-600", "text-navy-200", "shadow-sm"];
  const inactive = ["text-gray-400"];
  if (tab === "login") {
    active.forEach(c => { loginTab.classList.add(c); regTab.classList.remove(c); });
    inactive.forEach(c => { loginTab.classList.remove(c); regTab.classList.add(c); });
  } else {
    active.forEach(c => { regTab.classList.add(c); loginTab.classList.remove(c); });
    inactive.forEach(c => { regTab.classList.remove(c); loginTab.classList.add(c); });
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const errEl = document.getElementById("login-error");
  errEl.classList.add("hidden");
  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: document.getElementById("login-email").value,
        password: document.getElementById("login-password").value,
      }),
    });
    setAuth(data);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove("hidden");
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const errEl = document.getElementById("reg-error");
  const okEl = document.getElementById("reg-success");
  errEl.classList.add("hidden");
  okEl.classList.add("hidden");
  try {
    const data = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: document.getElementById("reg-name").value,
        email: document.getElementById("reg-email").value,
        password: document.getElementById("reg-password").value,
      }),
    });
    if (data.status === "pending") {
      okEl.textContent = data.message;
      okEl.classList.remove("hidden");
      document.getElementById("register-form").reset();
    } else {
      setAuth(data);
    }
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove("hidden");
  }
}

function setAuth(data) {
  token = data.access_token;
  userName = data.name;
  sessionStorage.setItem("wa_token", token);
  sessionStorage.setItem("wa_name", userName);
  routeAfterLogin();
}

function logout() {
  token = null;
  userName = null;
  sessionStorage.removeItem("wa_token");
  sessionStorage.removeItem("wa_name");
  showHome();
}

/* ── Routing ───────────────────────────────────────── */
function hideAllPages() {
  document.getElementById("home-page").classList.add("hidden");
  document.getElementById("auth-page").classList.add("hidden");
  document.getElementById("dashboard-page").classList.add("hidden");
  document.getElementById("admin-page").classList.add("hidden");
  document.getElementById("backtest-page").classList.add("hidden");
  document.getElementById("cheongyak-page").classList.add("hidden");
}

function showHome() {
  hideAllPages();
  document.getElementById("home-page").classList.remove("hidden");
  initScrollAnimations();
}

function showAuth() {
  hideAllPages();
  document.getElementById("auth-page").classList.remove("hidden");
}

function showDashboard() {
  hideAllPages();
  document.getElementById("dashboard-page").classList.remove("hidden");
  document.getElementById("user-name").textContent = userName || "";
  loadDashboard();
  loadAssets();
  loadResults();
}

function showBacktest() {
  hideAllPages();
  document.getElementById("backtest-page").classList.remove("hidden");
  loadStrategies();
  loadBacktestHistory();
}

function showAdminPage() {
  hideAllPages();
  document.getElementById("admin-page").classList.remove("hidden");
  document.getElementById("admin-user-name").textContent = userName || "";
  loadAdminStats();
  loadAdminUsers();
  loadPendingUsers();
}

async function routeAfterLogin() {
  try {
    const d = await api("/api/dashboard");
    if (d.is_admin) {
      showAdminPage();
    } else {
      showDashboard();
    }
  } catch {
    showDashboard();
  }
}

/* ── Dashboard ─────────────────────────────────────── */
let dashboardData = null;

async function loadDashboard() {
  try {
    const d = await api("/api/dashboard");
    dashboardData = d;
    document.getElementById("total-assets").textContent = formatKRW(d.total_assets_krw);
    document.getElementById("asset-count").textContent = d.asset_count + "개";
    document.getElementById("risk-display").textContent =
      d.profile?.risk_tolerance ? RISK_LABELS[d.profile.risk_tolerance] || d.profile.risk_tolerance : "-";

    renderProfile(d.profile);
    renderChart(d.assets_by_type);

    if (d.recent_recommendation) {
      document.getElementById("agent-result").classList.remove("hidden");
      document.getElementById("agent-result-time").textContent =
        "최근 상담: " + new Date(d.recent_recommendation.executed_at).toLocaleString("ko-KR");
      renderAgentResult(d.recent_recommendation);
      renderAssetSnapshot(d.assets, d.profile);
    }
  } catch (err) {
    console.error("Dashboard load failed:", err);
  }
}

function renderProfile(p) {
  const el = document.getElementById("profile-info");
  if (!p || (!p.age_band && !p.employment_type && !p.goal)) {
    el.innerHTML = '<p class="text-gray-300">프로필을 입력해주세요.</p>';
    return;
  }
  const rows = [];
  if (p.age_band) rows.push(["나이/연령대", p.age_band]);
  if (p.employment_type) rows.push(["소득 형태", EMPLOYMENT_LABELS[p.employment_type] || p.employment_type]);
  if (p.annual_income_band) rows.push(["연 소득", INCOME_LABELS[p.annual_income_band] || p.annual_income_band]);
  if (p.monthly_surplus_krw) rows.push(["월 여유 자금", formatKRW(p.monthly_surplus_krw)]);
  if (p.horizon_months) rows.push(["목표 기간", p.horizon_months + "개월"]);
  if (p.risk_tolerance) rows.push(["위험 성향", RISK_LABELS[p.risk_tolerance] || p.risk_tolerance]);
  if (p.goal) rows.push(["목표", p.goal]);
  if (p.tax_wrappers_note) rows.push(["세제 계좌", p.tax_wrappers_note]);

  el.innerHTML = rows.map(([k, v]) =>
    `<div class="flex justify-between py-1.5 border-b border-gray-100 text-sm">
      <span class="text-gray-400">${k}</span>
      <span class="text-gray-700">${v}</span>
    </div>`
  ).join("");
}

const CHART_COLORS = [
  "#1e3a5f", "#2c6faa", "#4a9bd9", "#7cb9e0", "#a8d4f0",
  "#3d7a5f", "#5fa87d", "#8cbfa0", "#c4d9cc", "#e0c87a", "#d4a857",
];

function renderChart(byType) {
  const canvas = document.getElementById("portfolio-chart");
  const emptyMsg = document.getElementById("chart-empty");
  const labels = Object.keys(byType);
  if (!labels.length) {
    canvas.style.display = "none";
    emptyMsg.classList.remove("hidden");
    return;
  }
  canvas.style.display = "block";
  emptyMsg.classList.add("hidden");

  if (portfolioChart) portfolioChart.destroy();
  portfolioChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: labels.map(k => ASSET_TYPE_LABELS[k] || k),
      datasets: [{
        data: Object.values(byType),
        backgroundColor: CHART_COLORS.slice(0, labels.length),
        borderWidth: 2,
        borderColor: "#fff",
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { padding: 16, usePointStyle: true } },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.label}: ${formatKRW(ctx.raw)}`,
          },
        },
      },
    },
  });
}

/* ── Assets ────────────────────────────────────────── */
let assetsData = [];

async function loadAssets() {
  try {
    assetsData = await api("/api/assets");
    renderAssetsTable();
  } catch (err) {
    console.error("Assets load failed:", err);
  }
}

function assetDetail(a) {
  const parts = [];
  if (a.quantity && a.buy_price_krw) {
    parts.push(`${a.quantity}주 x ${formatKRW(a.buy_price_krw)}`);
  }
  if (a.current_price_krw) {
    const label = a.asset_type === "real_estate" ? "시세" : "현재가";
    parts.push(`${label} ${formatKRW(a.current_price_krw)}`);
  }
  if (a.quantity && a.buy_price_krw && a.current_price_krw) {
    const cost = a.quantity * a.buy_price_krw;
    const pct = cost > 0 ? ((a.current_price_krw * a.quantity - cost) / cost * 100).toFixed(1) : 0;
    const sign = pct >= 0 ? "+" : "";
    const color = pct >= 0 ? "text-red-600" : "text-blue-600";
    parts.push(`<span class="${color}">${sign}${pct}%</span>`);
  }
  if (a.interest_rate) parts.push(`금리 ${a.interest_rate}%`);
  if (a.maturity_date) parts.push(`만기 ${a.maturity_date}`);
  if (a.start_date) parts.push(`시작 ${a.start_date}`);
  return parts.length ? parts.join(" / ") : "-";
}

function renderAssetsTable() {
  const tbody = document.getElementById("assets-tbody");
  if (!assetsData.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="px-3 py-8 text-center text-gray-300 text-sm">등록된 자산이 없습니다</td></tr>';
    return;
  }
  tbody.innerHTML = assetsData.map(a => `
    <tr class="hover:bg-gray-50">
      <td class="px-3 py-2.5 text-sm">${esc(a.asset_name)}</td>
      <td class="px-3 py-2.5 text-xs text-gray-500">${ASSET_TYPE_LABELS[a.asset_type] || a.asset_type}</td>
      <td class="px-3 py-2.5 text-sm text-right tabular-nums">${formatKRW(a.amount_krw)}</td>
      <td class="px-3 py-2.5 text-xs text-gray-400">${assetDetail(a)}</td>
      <td class="px-3 py-2.5 text-center">
        <button onclick="editAsset(${a.id})" class="text-navy-600 hover:underline text-xs mr-1">수정</button>
        <button onclick="deleteAsset(${a.id})" class="text-gray-400 hover:text-red-500 text-xs">삭제</button>
      </td>
    </tr>
  `).join("");
}

/* ── Asset type field config ───────────────────────── */
const ASSET_FIELD_CONFIG = {
  deposit:     { groups: ["rate"], amountLabel: "예치 금액 (원)" },
  savings:     { groups: ["rate"], amountLabel: "총 납입 금액 (원)" },
  stock:       { groups: ["quantity"], amountLabel: "총 평가금액 (원)", amountHint: "수량 x 현재가로 자동 계산됩니다" },
  bond:        { groups: ["rate"], amountLabel: "매입 금액 (원)" },
  fund:        { groups: ["period"], amountLabel: "평가 금액 (원)" },
  insurance:   { groups: ["period"], amountLabel: "납입 총액 (원)" },
  pension:     { groups: ["period"], amountLabel: "적립 총액 (원)" },
  real_estate: { groups: ["realestate"], amountLabel: "현재 시세 (원)", amountHint: "현재 시세를 입력하세요" },
  crypto:      { groups: ["quantity"], amountLabel: "총 평가금액 (원)", amountHint: "수량 x 현재가로 자동 계산됩니다" },
  cash:        { groups: ["rate"], amountLabel: "보유 금액 (원)" },
  other:       { groups: [], amountLabel: "금액 (원)" },
};

function onAssetTypeChange() {
  const type = document.getElementById("af-type").value;
  const cfg = ASSET_FIELD_CONFIG[type] || { groups: [], amountLabel: "금액 (원)" };

  // Toggle field groups
  ["rate", "quantity", "realestate", "period"].forEach(g => {
    const el = document.getElementById(`af-group-${g}`);
    if (el) el.classList.toggle("hidden", !cfg.groups.includes(g));
  });

  // Amount label & hint
  document.getElementById("af-amount-label").textContent = cfg.amountLabel;
  const hint = document.getElementById("af-amount-hint");
  if (cfg.amountHint) {
    hint.textContent = cfg.amountHint;
    hint.classList.remove("hidden");
  } else {
    hint.classList.add("hidden");
  }

  // Auto-calc for stock/crypto
  if (cfg.groups.includes("quantity")) {
    document.getElementById("af-amount").readOnly = true;
    document.getElementById("af-amount").classList.add("bg-gray-50");
    autoCalcAmount();
  } else {
    document.getElementById("af-amount").readOnly = false;
    document.getElementById("af-amount").classList.remove("bg-gray-50");
  }
}

function autoCalcAmount() {
  const qty = parseFloat(document.getElementById("af-qty").value) || 0;
  const cur = parseInt(document.getElementById("af-cur-price").value) || 0;
  if (qty && cur) {
    document.getElementById("af-amount").value = Math.round(qty * cur);
  }
}

function openAssetModal(asset) {
  document.getElementById("asset-modal-title").textContent = asset ? "자산 수정" : "자산 추가";
  document.getElementById("asset-edit-id").value = asset?.id || "";
  document.getElementById("af-type").value = asset?.asset_type || "";
  document.getElementById("af-name").value = asset?.asset_name || "";
  document.getElementById("af-amount").value = asset?.amount_krw || "";
  document.getElementById("af-rate").value = asset?.interest_rate || "";
  document.getElementById("af-maturity").value = asset?.maturity_date || "";
  document.getElementById("af-qty").value = asset?.quantity || "";
  document.getElementById("af-buy-price").value = asset?.buy_price_krw || "";
  document.getElementById("af-cur-price").value = asset?.current_price_krw || "";
  document.getElementById("af-re-buy").value = asset?.buy_price_krw || "";
  document.getElementById("af-re-current").value = asset?.current_price_krw || "";
  document.getElementById("af-start").value = asset?.start_date || "";
  document.getElementById("af-period-maturity").value = asset?.maturity_date || "";
  document.getElementById("af-notes").value = asset?.notes || "";
  onAssetTypeChange();
  document.getElementById("asset-modal").classList.remove("hidden");
}

function editAsset(id) {
  const asset = assetsData.find(a => a.id === id);
  if (asset) openAssetModal(asset);
}

function collectAssetBody() {
  const type = document.getElementById("af-type").value;
  const cfg = ASSET_FIELD_CONFIG[type] || { groups: [] };
  const body = {
    asset_type: type,
    asset_name: document.getElementById("af-name").value,
    amount_krw: parseInt(document.getElementById("af-amount").value) || 0,
    notes: document.getElementById("af-notes").value || null,
    interest_rate: null,
    quantity: null,
    buy_price_krw: null,
    current_price_krw: null,
    start_date: null,
    maturity_date: null,
  };

  if (cfg.groups.includes("rate")) {
    body.interest_rate = parseFloat(document.getElementById("af-rate").value) || null;
    body.maturity_date = document.getElementById("af-maturity").value || null;
  }
  if (cfg.groups.includes("quantity")) {
    body.quantity = parseFloat(document.getElementById("af-qty").value) || null;
    body.buy_price_krw = parseInt(document.getElementById("af-buy-price").value) || null;
    body.current_price_krw = parseInt(document.getElementById("af-cur-price").value) || null;
  }
  if (cfg.groups.includes("realestate")) {
    body.buy_price_krw = parseInt(document.getElementById("af-re-buy").value) || null;
    body.current_price_krw = parseInt(document.getElementById("af-re-current").value) || null;
  }
  if (cfg.groups.includes("period")) {
    body.start_date = document.getElementById("af-start").value || null;
    body.maturity_date = document.getElementById("af-period-maturity").value || null;
  }
  return body;
}

async function saveAsset(e) {
  e.preventDefault();
  const editId = document.getElementById("asset-edit-id").value;
  const body = collectAssetBody();
  try {
    if (editId) {
      await api(`/api/assets/${editId}`, { method: "PUT", body: JSON.stringify(body) });
    } else {
      await api("/api/assets", { method: "POST", body: JSON.stringify(body) });
    }
    closeModal("asset-modal");
    loadAssets();
    loadDashboard();
  } catch (err) {
    alert("저장 실패: " + err.message);
  }
}

async function deleteAsset(id) {
  if (!confirm("이 자산을 삭제하시겠습니까?")) return;
  try {
    await api(`/api/assets/${id}`, { method: "DELETE" });
    loadAssets();
    loadDashboard();
  } catch (err) {
    alert("삭제 실패: " + err.message);
  }
}

/* ── Profile Modal ─────────────────────────────────── */
async function openProfileModal() {
  try {
    const p = await api("/api/profile");
    document.getElementById("pf-age").value = p.age_band || "";
    document.getElementById("pf-employment").value = p.employment_type || "";
    document.getElementById("pf-income").value = p.annual_income_band || "";
    document.getElementById("pf-surplus").value = p.monthly_surplus_krw || "";
    document.getElementById("pf-horizon").value = p.horizon_months || "";
    document.getElementById("pf-risk").value = p.risk_tolerance || "";
    document.getElementById("pf-goal").value = p.goal || "";
    document.getElementById("pf-tax").value = p.tax_wrappers_note || "";
  } catch {}
  document.getElementById("profile-modal").classList.remove("hidden");
}

async function saveProfile(e) {
  e.preventDefault();
  const body = {
    age_band: document.getElementById("pf-age").value || null,
    employment_type: document.getElementById("pf-employment").value || null,
    annual_income_band: document.getElementById("pf-income").value || null,
    monthly_surplus_krw: parseInt(document.getElementById("pf-surplus").value) || null,
    horizon_months: parseInt(document.getElementById("pf-horizon").value) || null,
    risk_tolerance: document.getElementById("pf-risk").value || null,
    goal: document.getElementById("pf-goal").value || null,
    tax_wrappers_note: document.getElementById("pf-tax").value || null,
  };
  try {
    await api("/api/profile", { method: "PUT", body: JSON.stringify(body) });
    closeModal("profile-modal");
    loadDashboard();
  } catch (err) {
    alert("저장 실패: " + err.message);
  }
}

/* ── Agent ─────────────────────────────────────────── */
function switchResultTab(tabName) {
  document.querySelectorAll(".result-tab").forEach(btn => {
    btn.classList.toggle("result-tab-active", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === `tab-panel-${tabName}`);
  });
}

function renderAgentResult(data) {
  const setText = (id, text, fallback) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text || fallback;
  };
  setText("tab-panel-recommendation", data.recommendation, "(추천 결과 없음)");
  setText("tab-panel-market", data.market_notes, "(시장 리서치 데이터 없음)");
  setText("tab-panel-macro", data.macro_market_notes, "(거시경제 리서치 데이터 없음)");
  setText("tab-panel-tax", data.tax_market_notes, "(세금 리서치 데이터 없음)");
  switchResultTab("recommendation");
}

function renderAssetSnapshot(assets, profile) {
  const el = document.getElementById("agent-snapshot-content");
  if (!el) return;
  const parts = [];

  // Profile one-liner
  if (profile) {
    const chips = [];
    if (profile.age_band) chips.push(profile.age_band);
    if (profile.employment_type) chips.push(EMPLOYMENT_LABELS[profile.employment_type] || profile.employment_type);
    if (profile.risk_tolerance) chips.push("위험: " + (RISK_LABELS[profile.risk_tolerance] || profile.risk_tolerance));
    if (profile.goal) chips.push("목표: " + profile.goal);
    if (chips.length) {
      parts.push(`<div class="flex flex-wrap gap-1.5 mb-3">${chips.map(c =>
        `<span class="inline-block px-2 py-0.5 text-xs rounded border border-gray-200 text-gray-600 bg-white">${esc(c)}</span>`
      ).join("")}</div>`);
    }
  }

  // Asset table
  if (assets && assets.length) {
    const total = assets.reduce((s, a) => s + a.amount_krw, 0);
    parts.push(`<table class="w-full text-xs">
      <thead><tr class="border-b">
        <th class="text-left py-1 font-medium text-gray-500">자산명</th>
        <th class="text-left py-1 font-medium text-gray-500">유형</th>
        <th class="text-right py-1 font-medium text-gray-500">금액</th>
      </tr></thead>
      <tbody>${assets.map(a => `<tr class="border-b border-gray-100">
        <td class="py-1">${esc(a.asset_name)}</td>
        <td class="py-1">${ASSET_TYPE_LABELS[a.asset_type] || a.asset_type}</td>
        <td class="py-1 text-right font-mono">${formatKRW(a.amount_krw)}</td>
      </tr>`).join("")}
      <tr class="font-semibold"><td colspan="2" class="py-1">합계</td>
        <td class="py-1 text-right font-mono">${formatKRW(total)}</td></tr>
      </tbody></table>`);
  } else {
    parts.push('<p class="text-gray-400">등록된 자산이 없습니다</p>');
  }

  el.innerHTML = parts.join("");
}

async function runAgent() {
  const btn = document.getElementById("run-agent-btn");
  const loading = document.getElementById("agent-loading");
  const result = document.getElementById("agent-result");

  btn.disabled = true;
  btn.classList.add("opacity-50");
  loading.classList.remove("hidden");
  result.classList.add("hidden");

  try {
    const data = await api("/api/agent/run", { method: "POST" });
    document.getElementById("agent-result-time").textContent =
      "상담 시간: " + new Date(data.executed_at).toLocaleString("ko-KR");
    renderAgentResult(data);
    // Use current dashboard assets for snapshot
    if (dashboardData) {
      renderAssetSnapshot(dashboardData.assets, dashboardData.profile);
    }
    result.classList.remove("hidden");
    loadResults();
  } catch (err) {
    alert("에이전트 실행 실패: " + err.message);
  } finally {
    btn.disabled = false;
    btn.classList.remove("opacity-50");
    loading.classList.add("hidden");
  }
}

function renderPastResultDetail(r) {
  const section = (title, content, fallback) => {
    const text = content || fallback;
    return `<div class="past-result-section">
      <h4>${esc(title)}</h4>
      <div class="text-sm whitespace-pre-wrap text-gray-700">${esc(text)}</div>
    </div>`;
  };
  return section("최종 추천", r.recommendation, "(추천 결과 없음)")
    + section("시장 리서치", r.market_notes, "(데이터 없음)")
    + section("거시경제 리서치", r.macro_market_notes, "(데이터 없음)")
    + section("세금 리서치", r.tax_market_notes, "(데이터 없음)");
}

async function loadResults() {
  try {
    const results = await api("/api/agent/results");
    const section = document.getElementById("past-results-section");
    const list = document.getElementById("past-results-list");
    if (results.length <= 1) { section.classList.add("hidden"); return; }
    section.classList.remove("hidden");
    list.innerHTML = results.slice(1).map(r => `
      <details class="border rounded-lg">
        <summary class="px-4 py-3 cursor-pointer hover:bg-gray-50 text-sm font-medium">
          ${new Date(r.executed_at).toLocaleString("ko-KR")}
        </summary>
        <div class="px-4 py-3 bg-gray-50 space-y-2">${renderPastResultDetail(r)}</div>
      </details>
    `).join("");
  } catch {}
}

/* ── Utils ─────────────────────────────────────────── */
function formatKRW(n) {
  if (!n) return "0원";
  if (n >= 100000000) return (n / 100000000).toFixed(1).replace(/\.0$/, "") + "억원";
  if (n >= 10000) return (n / 10000).toFixed(0) + "만원";
  return n.toLocaleString("ko-KR") + "원";
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

/* ── Admin ─────────────────────────────────────────── */
async function loadAdminStats() {
  try {
    const s = await api("/api/admin/stats");
    document.getElementById("stat-total").textContent = s.total_users;
    document.getElementById("stat-approved").textContent = s.approved_users;
    document.getElementById("stat-pending").textContent = s.pending_users;
    document.getElementById("stat-total-assets").textContent = formatKRW(s.total_assets_all_krw);
    document.getElementById("admin-pending-section").classList.toggle("hidden", s.pending_users === 0);
  } catch {}
}

async function loadAdminUsers() {
  try {
    const users = await api("/api/admin/users");
    const tbody = document.getElementById("admin-users-tbody");
    tbody.innerHTML = users.map(u => {
      const statusBadge = u.is_admin
        ? '<span class="px-2 py-0.5 text-xs rounded bg-navy-800 text-white">관리자</span>'
        : u.is_approved
          ? '<span class="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700">승인</span>'
          : '<span class="px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-700">대기</span>';
      const actions = u.is_admin ? '-' : u.is_approved
        ? `<button onclick="deleteUser(${u.id}, '${esc(u.name)}')" class="text-xs text-gray-400 hover:text-red-500">삭제</button>`
        : `<button onclick="approveUser(${u.id})" class="text-xs text-green-600 hover:underline mr-1">승인</button>
           <button onclick="deleteUser(${u.id}, '${esc(u.name)}')" class="text-xs text-gray-400 hover:text-red-500">삭제</button>`;
      return `<tr class="hover:bg-gray-50">
        <td class="px-3 py-2.5">${esc(u.name)}</td>
        <td class="px-3 py-2.5 text-gray-500">${esc(u.email)}</td>
        <td class="px-3 py-2.5 text-center">${statusBadge}</td>
        <td class="px-3 py-2.5 text-right tabular-nums">${u.asset_count}개</td>
        <td class="px-3 py-2.5 text-right tabular-nums">${formatKRW(u.total_assets_krw)}</td>
        <td class="px-3 py-2.5 text-gray-400">${new Date(u.created_at).toLocaleDateString("ko-KR")}</td>
        <td class="px-3 py-2.5 text-center">${actions}</td>
      </tr>`;
    }).join("");
  } catch {}
}

async function loadPendingUsers() {
  try {
    const users = await api("/api/admin/pending");
    const el = document.getElementById("pending-list");
    if (!users.length) {
      el.innerHTML = '<p class="text-amber-400 text-xs">대기 중인 사용자가 없습니다</p>';
      return;
    }
    el.innerHTML = users.map(u => `
      <div class="flex items-center justify-between bg-white rounded border border-amber-100 px-3 py-2">
        <div>
          <span class="font-medium text-gray-800">${esc(u.name)}</span>
          <span class="text-gray-400 ml-2">${esc(u.email)}</span>
          <span class="text-gray-300 ml-2 text-xs">${new Date(u.created_at).toLocaleDateString("ko-KR")}</span>
        </div>
        <div class="flex gap-2">
          <button onclick="approveUser(${u.id})" class="text-xs bg-green-600 text-white px-2.5 py-1 rounded hover:bg-green-700">승인</button>
          <button onclick="rejectUser(${u.id})" class="text-xs border border-gray-300 text-gray-500 px-2.5 py-1 rounded hover:bg-red-50 hover:text-red-600">거부</button>
        </div>
      </div>
    `).join("");
  } catch {}
}

async function approveUser(id) {
  try {
    const r = await api(`/api/admin/approve/${id}`, { method: "POST" });
    loadAdminStats();
    loadAdminUsers();
    loadPendingUsers();
  } catch (err) {
    alert(err.message);
  }
}

async function rejectUser(id) {
  if (!confirm("가입을 거부하시겠습니까? 계정이 삭제됩니다.")) return;
  try {
    await api(`/api/admin/reject/${id}`, { method: "DELETE" });
    loadAdminStats();
    loadAdminUsers();
    loadPendingUsers();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteUser(id, name) {
  if (!confirm(`${name} 사용자를 삭제하시겠습니까?`)) return;
  try {
    await api(`/api/admin/reject/${id}`, { method: "DELETE" });
    loadAdminStats();
    loadAdminUsers();
  } catch (err) {
    alert(err.message);
  }
}

/* ── Trading Lab / Backtest ────────────────────────── */
let backtestChart = null;
let currentBacktestId = null;

const STRATEGY_LABELS_JS = {
  sma_crossover: "SMA 교차", macd: "MACD", rsi: "RSI",
  bollinger: "볼린저 밴드", obv: "OBV", combined: "복합 전략",
};

/* ── Ticker autocomplete ──────────────────────────── */
let _tickerTimer = null;
let _tickerIdx = -1;

function onTickerInput(val) {
  clearTimeout(_tickerTimer);
  _tickerIdx = -1;
  const dropdown = document.getElementById("bt-ticker-dropdown");
  if (val.trim().length < 1) { dropdown.classList.add("hidden"); return; }
  _tickerTimer = setTimeout(() => fetchTickerSuggestions(val.trim()), 250);
}

function onTickerKeydown(e) {
  const dropdown = document.getElementById("bt-ticker-dropdown");
  if (dropdown.classList.contains("hidden")) return;
  const items = dropdown.querySelectorAll("[data-ticker]");
  if (!items.length) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    _tickerIdx = Math.min(_tickerIdx + 1, items.length - 1);
    highlightTickerItem(items);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    _tickerIdx = Math.max(_tickerIdx - 1, 0);
    highlightTickerItem(items);
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (_tickerIdx >= 0 && _tickerIdx < items.length) {
      selectTicker(items[_tickerIdx].dataset.ticker);
    } else {
      dropdown.classList.add("hidden");
    }
  } else if (e.key === "Escape") {
    dropdown.classList.add("hidden");
    _tickerIdx = -1;
  }
}

function highlightTickerItem(items) {
  items.forEach((el, i) => {
    if (i === _tickerIdx) {
      el.classList.add("bg-gray-700");
      el.scrollIntoView({ block: "nearest" });
    } else {
      el.classList.remove("bg-gray-700");
    }
  });
}

async function fetchTickerSuggestions(q) {
  const dropdown = document.getElementById("bt-ticker-dropdown");
  try {
    const results = await api(`/api/backtest/ticker-search?q=${encodeURIComponent(q)}`);
    if (!results.length) { dropdown.classList.add("hidden"); return; }
    _tickerIdx = -1;
    dropdown.innerHTML = results.map(r =>
      `<div data-ticker="${esc(r.symbol)}" class="px-4 py-2.5 cursor-pointer flex items-center justify-between transition" onclick="selectTicker('${esc(r.symbol)}')" onmouseenter="_tickerIdx=${results.indexOf(r)};highlightTickerItem(document.querySelectorAll('[data-ticker]'))">
        <div>
          <span class="font-medium text-sm text-gray-200">${esc(r.symbol)}</span>
          <span class="text-xs text-gray-500 ml-2">${esc(r.name)}</span>
        </div>
        <span class="text-xs text-gray-600">${esc(r.exchange)}</span>
      </div>`
    ).join("");
    dropdown.classList.remove("hidden");
  } catch { dropdown.classList.add("hidden"); }
}

function selectTicker(symbol) {
  document.getElementById("bt-ticker").value = symbol;
  document.getElementById("bt-ticker-dropdown").classList.add("hidden");
  _tickerIdx = -1;
}

document.addEventListener("click", (e) => {
  const dropdown = document.getElementById("bt-ticker-dropdown");
  if (dropdown && !e.target.closest("#bt-ticker") && !e.target.closest("#bt-ticker-dropdown")) {
    dropdown.classList.add("hidden");
    _tickerIdx = -1;
  }
});

/* ── Capital input formatting ─────────────────────── */
function formatCapitalInput(el) {
  const pos = el.selectionStart;
  const oldLen = el.value.length;
  const raw = el.value.replace(/[^0-9]/g, "");
  el.value = raw ? Number(raw).toLocaleString("ko-KR") : "";
  const newLen = el.value.length;
  el.setSelectionRange(pos + newLen - oldLen, pos + newLen - oldLen);
}

function getCapitalValue() {
  return parseInt(document.getElementById("bt-capital").value.replace(/[^0-9]/g, ""), 10) || 100000000;
}

async function loadStrategies() {
  try {
    const list = await api("/api/backtest/strategies");
    const sel = document.getElementById("bt-strategy");
    sel.innerHTML = list.map(s => `<option value="${s.name}">${esc(s.label)} — ${esc(s.description)}</option>`).join("");
  } catch { /* ignore */ }

  // set default dates
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 3);
  document.getElementById("bt-end").value = end.toISOString().slice(0, 10);
  document.getElementById("bt-start").value = start.toISOString().slice(0, 10);
}

async function runBacktest() {
  const body = {
    ticker: document.getElementById("bt-ticker").value.trim(),
    strategy: document.getElementById("bt-strategy").value,
    start_date: document.getElementById("bt-start").value,
    end_date: document.getElementById("bt-end").value,
    initial_capital: getCapitalValue(),
  };
  if (!body.ticker) { alert("종목 티커를 입력하세요"); return; }

  document.getElementById("bt-loading").classList.remove("hidden");
  document.getElementById("bt-loading-text").textContent = "백테스트 실행 중...";
  document.getElementById("bt-metrics").classList.add("hidden");
  document.getElementById("bt-chart-section").classList.add("hidden");
  document.getElementById("bt-ai-section").classList.add("hidden");
  document.getElementById("bt-grid-result").classList.add("hidden");

  try {
    const res = await api("/api/backtest/run", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(body) });
    renderBacktestResult(res);
    loadBacktestHistory();
  } catch (err) {
    alert(err.message || "백테스트 실행 실패");
  } finally {
    document.getElementById("bt-loading").classList.add("hidden");
  }
}

function renderBacktestResult(res) {
  const m = res.metrics;
  currentBacktestId = res.backtest_id;

  // metrics
  const retColor = (v) => v >= 0 ? "text-green-400" : "text-red-400";
  document.getElementById("bt-m-return").className = `text-xl font-bold mt-1 tabular-nums ${retColor(m.total_return)}`;
  document.getElementById("bt-m-return").textContent = (m.total_return * 100).toFixed(2) + "%";
  document.getElementById("bt-m-annual").className = `text-xl font-bold mt-1 tabular-nums ${retColor(m.annual_return)}`;
  document.getElementById("bt-m-annual").textContent = (m.annual_return * 100).toFixed(2) + "%";
  document.getElementById("bt-m-drawdown").textContent = (m.max_drawdown * 100).toFixed(2) + "%";
  document.getElementById("bt-m-buyhold").className = `text-xl font-bold mt-1 tabular-nums ${retColor(m.buy_hold_return)}`;
  document.getElementById("bt-m-buyhold").textContent = (m.buy_hold_return * 100).toFixed(2) + "%";
  document.getElementById("bt-m-trades").textContent = m.total_trades + "회";
  document.getElementById("bt-m-final").textContent = formatKRW(m.final_value);
  document.getElementById("bt-metrics").classList.remove("hidden");

  // chart
  renderBacktestChart(res.chart_data, res.strategy);
  document.getElementById("bt-chart-section").classList.remove("hidden");

  // show AI section
  document.getElementById("bt-ai-content").innerHTML = "";
  document.getElementById("bt-ai-section").classList.remove("hidden");
}

function renderBacktestChart(chartData, strategy) {
  const ctx = document.getElementById("bt-chart");
  if (backtestChart) backtestChart.destroy();

  const labels = chartData.map(d => d.date);
  const closes = chartData.map(d => d.close);
  const portfolio = chartData.map(d => d.portfolio_value);
  const buyPts = chartData.filter(d => d.signal === 1).map(d => ({ x: d.date, y: d.close }));
  const sellPts = chartData.filter(d => d.signal === -1).map(d => ({ x: d.date, y: d.close }));

  backtestChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "종가",
          data: closes,
          borderColor: "#1e3a5f",
          backgroundColor: "transparent",
          borderWidth: 1.5,
          pointRadius: 0,
          yAxisID: "y",
          order: 2,
        },
        {
          label: "포트폴리오",
          data: portfolio,
          borderColor: "#6681b8",
          backgroundColor: "transparent",
          borderWidth: 1.5,
          pointRadius: 0,
          borderDash: [4, 2],
          yAxisID: "y1",
          order: 3,
        },
        {
          label: "매수",
          data: buyPts,
          type: "scatter",
          pointStyle: "triangle",
          pointRadius: 6,
          backgroundColor: "#16a34a",
          borderColor: "#16a34a",
          yAxisID: "y",
          order: 1,
        },
        {
          label: "매도",
          data: sellPts,
          type: "scatter",
          pointStyle: "triangle",
          rotation: 180,
          pointRadius: 6,
          backgroundColor: "#dc2626",
          borderColor: "#dc2626",
          yAxisID: "y",
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "top", labels: { font: { size: 11 }, usePointStyle: true } },
        tooltip: { callbacks: { label: (ctx) => ctx.dataset.label + ": " + (ctx.parsed.y?.toLocaleString() ?? "") } },
      },
      scales: {
        x: { display: true, ticks: { maxTicksLimit: 12, font: { size: 10 } }, grid: { display: false } },
        y: { position: "left", ticks: { font: { size: 10 } }, grid: { color: "rgba(0,0,0,0.05)" } },
        y1: { position: "right", ticks: { font: { size: 10 }, callback: (v) => formatKRW(v) }, grid: { drawOnChartArea: false } },
      },
    },
  });
}

async function runGridSearch() {
  const body = {
    ticker: document.getElementById("bt-ticker").value.trim(),
    strategy: document.getElementById("bt-strategy").value,
    start_date: document.getElementById("bt-start").value,
    end_date: document.getElementById("bt-end").value,
    initial_capital: getCapitalValue(),
  };
  if (body.strategy === "combined") { alert("복합 전략은 그리드 서치를 지원하지 않습니다"); return; }

  // show live grid UI
  const container = document.getElementById("bt-grid-result");
  container.classList.remove("hidden");
  container.innerHTML = `
    <div class="flex items-center gap-3 mb-4">
      <div class="inline-block animate-spin rounded-full h-5 w-5 border-2 border-navy-600 border-t-transparent"></div>
      <div>
        <h3 class="text-sm font-semibold text-gray-200">파라미터 최적화 진행 중</h3>
        <p id="gs-progress-text" class="text-xs text-gray-500">준비 중...</p>
      </div>
    </div>
    <div class="mb-3">
      <div class="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
        <div id="gs-progress-bar" class="h-full bg-navy-400 rounded-full transition-all duration-300" style="width:0%"></div>
      </div>
    </div>
    <div id="gs-best-card" class="hidden mb-4 bg-green-900/20 border border-green-700/50 rounded-lg px-4 py-3">
      <p class="text-xs text-green-400 uppercase tracking-wider font-medium mb-1">현재 최적</p>
      <p id="gs-best-params" class="text-sm font-mono text-gray-200"></p>
      <p id="gs-best-return" class="text-lg font-bold tabular-nums mt-0.5"></p>
    </div>
    <div class="max-h-48 overflow-y-auto" id="gs-log-container">
      <table class="w-full text-xs">
        <thead class="sticky top-0 bg-gray-800"><tr class="border-b border-gray-700">
          <th class="text-left px-2 py-1.5 text-gray-500">#</th>
          <th class="text-left px-2 py-1.5 text-gray-500">파라미터</th>
          <th class="text-right px-2 py-1.5 text-gray-500">수익률</th>
        </tr></thead>
        <tbody id="gs-log-tbody"></tbody>
      </table>
    </div>
  `;

  const tbody = document.getElementById("gs-log-tbody");
  const progressBar = document.getElementById("gs-progress-bar");
  const progressText = document.getElementById("gs-progress-text");
  const bestCard = document.getElementById("gs-best-card");
  const bestParamsEl = document.getElementById("gs-best-params");
  const bestReturnEl = document.getElementById("gs-best-return");

  try {
    const resp = await fetch("/api/backtest/grid-search-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || "그리드 서치 실패");
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("event: done")) break;
        if (!line.startsWith("data: ")) continue;
        const data = JSON.parse(line.slice(6));

        // progress
        const pct = Math.round((data.index / data.total) * 100);
        progressBar.style.width = pct + "%";
        progressText.textContent = `${data.index} / ${data.total} 조합 테스트 (${pct}%)`;

        // log row
        const paramStr = Object.entries(data.params).map(([k,v]) => `${k}=${v}`).join(", ");
        const retPct = (data.total_return * 100).toFixed(2);
        const retClass = data.total_return >= 0 ? "text-green-400" : "text-red-400";
        const bestMark = data.is_best ? ' <span class="text-yellow-400 ml-1">★</span>' : "";
        const tr = document.createElement("tr");
        tr.className = `border-b border-gray-800 ${data.is_best ? "bg-green-900/10" : ""}`;
        tr.innerHTML = `
          <td class="px-2 py-1.5 text-gray-600">${data.index}</td>
          <td class="px-2 py-1.5 font-mono text-gray-400">${esc(paramStr)}${bestMark}</td>
          <td class="px-2 py-1.5 text-right tabular-nums ${retClass}">${retPct}%</td>
        `;
        tbody.appendChild(tr);

        // auto-scroll
        const logContainer = document.getElementById("gs-log-container");
        logContainer.scrollTop = logContainer.scrollHeight;

        // best card
        if (data.is_best) {
          bestCard.classList.remove("hidden");
          bestParamsEl.textContent = Object.entries(data.current_best_params).map(([k,v]) => `${k}=${v}`).join("  ·  ");
          const bestRetPct = (data.current_best_return * 100).toFixed(2);
          bestReturnEl.className = `text-lg font-bold tabular-nums mt-0.5 ${data.current_best_return >= 0 ? "text-green-400" : "text-red-400"}`;
          bestReturnEl.textContent = bestRetPct + "%";
        }
      }
    }

    // finished — update header
    progressBar.style.width = "100%";
    progressBar.classList.remove("bg-navy-400");
    progressBar.classList.add("bg-green-500");
    container.querySelector("h3").textContent = "파라미터 최적화 완료";
    container.querySelector(".animate-spin")?.remove();
    progressText.textContent = `${tbody.children.length}개 조합 테스트 완료`;

  } catch (err) {
    container.innerHTML = `<p class="text-red-400 text-sm">${esc(err.message || "그리드 서치 실패")}</p>`;
  }
}

async function requestAiAnalysis() {
  if (!currentBacktestId) { alert("먼저 백테스트를 실행하세요"); return; }

  document.getElementById("bt-ai-loading").classList.remove("hidden");
  document.getElementById("bt-ai-btn").disabled = true;

  try {
    const res = await api("/api/backtest/ai-analysis", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ backtest_id: currentBacktestId }),
    });
    document.getElementById("bt-ai-content").innerHTML = marked.parse(res.analysis || "");
  } catch (err) {
    document.getElementById("bt-ai-content").innerHTML = `<p class="text-red-500 text-sm">${esc(err.message || "AI 분석 실패")}</p>`;
  } finally {
    document.getElementById("bt-ai-loading").classList.add("hidden");
    document.getElementById("bt-ai-btn").disabled = false;
  }
}

async function loadBacktestHistory() {
  try {
    const list = await api("/api/backtest/history");
    const tbody = document.getElementById("bt-history-tbody");
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="px-3 py-6 text-center text-gray-600 text-sm">아직 백테스트 기록이 없습니다</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(r => {
      const ret = r.total_return != null ? (r.total_return * 100).toFixed(2) + "%" : "-";
      const retClass = (r.total_return || 0) >= 0 ? "text-green-400" : "text-red-400";
      const date = new Date(r.executed_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      return `<tr>
        <td class="px-3 py-2 text-xs text-gray-500">${esc(date)}</td>
        <td class="px-3 py-2 font-medium">${esc(r.ticker)}</td>
        <td class="px-3 py-2">${esc(STRATEGY_LABELS_JS[r.strategy] || r.strategy)}</td>
        <td class="px-3 py-2 text-right tabular-nums ${retClass}">${ret}</td>
        <td class="px-3 py-2 text-right tabular-nums">${r.final_value ? formatKRW(r.final_value) : "-"}</td>
        <td class="px-3 py-2 text-center">
          ${r.ai_analysis ? '<span class="text-xs text-green-600">AI 완료</span>' : ''}
          <button onclick="deleteBacktest(${r.id})" class="text-xs text-red-400 hover:text-red-600 ml-2">삭제</button>
        </td>
      </tr>`;
    }).join("");
  } catch { /* ignore */ }
}

async function deleteBacktest(id) {
  if (!confirm("이 백테스트 기록을 삭제하시겠습니까?")) return;
  try {
    await api(`/api/backtest/history/${id}`, { method: "DELETE" });
    loadBacktestHistory();
  } catch (err) { alert(err.message); }
}

/* ── Scroll Animations ─────────────────────────────── */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("is-visible"); });
  }, { threshold: 0.15 });
  document.querySelectorAll(".animate-fadein-scroll").forEach(el => {
    el.classList.remove("is-visible");
    observer.observe(el);
  });
}

/* ── Refresh ───────────────────────────────────────── */
function refreshAdmin() {
  loadAdminStats();
  loadAdminUsers();
  loadPendingUsers();
}

function refreshDashboard() {
  loadDashboard();
  loadAssets();
  loadResults();
}

/* ── Init ──────────────────────────────────────────── */
document.getElementById("af-qty")?.addEventListener("input", autoCalcAmount);
document.getElementById("af-cur-price")?.addEventListener("input", autoCalcAmount);

if (token) {
  routeAfterLogin();
} else {
  showHome();
}

/* ── 청약 정보 (서울 전용) ─────────────────────────── */
let _cyData = { all: null, apt: null, officetel: null, remaining: null, publicrent: null, opt: null };
let _cyTab = "apt";
let _cyMap = null;
let _cySeoulLayer = null;
let _cyGeoCache = {};
let _cySelectedGu = null;
let _cyMarkerLayer = null;

const _cyTypeColors = {
  apt:        { border: "border-l-sky-500",    bg: "bg-sky-900/30",    text: "text-sky-400",    dot: "#38bdf8",  label: "APT" },
  officetel:  { border: "border-l-violet-500", bg: "bg-violet-900/30", text: "text-violet-400", dot: "#a78bfa",  label: "오피스텔" },
  remaining:  { border: "border-l-orange-500", bg: "bg-orange-900/30", text: "text-orange-400", dot: "#fb923c",  label: "무순위" },
  publicrent: { border: "border-l-lime-500",   bg: "bg-lime-900/30",   text: "text-lime-400",   dot: "#a3e635",  label: "공공임대" },
  opt:        { border: "border-l-rose-500",   bg: "bg-rose-900/30",   text: "text-rose-400",   dot: "#fb7185",  label: "임의공급" },
  all:        { border: "border-l-gray-500",   bg: "bg-gray-900/30",   text: "text-gray-300",   dot: "#9ca3af",  label: "전체" },
};

function _cyExtractGu(item) {
  const m = (item.address || "").match(/서울특별시\s+(\S+구)/);
  return m ? m[1] : null;
}

function _cyFilterSeoul(data) {
  return (data || []).filter(d => d.region === "서울");
}

function _cyCountByGu(data) {
  const counts = {};
  for (const d of _cyFilterSeoul(data)) {
    const gu = _cyExtractGu(d) || "기타";
    counts[gu] = (counts[gu] || 0) + 1;
  }
  return counts;
}

let _cyDominantTypeByGu = {};
function _cyCalcDominantTypes(data) {
  _cyDominantTypeByGu = {};
  const guTypes = {};
  for (const d of _cyFilterSeoul(data)) {
    const gu = _cyExtractGu(d) || "기타";
    const t = d._type || "apt";
    if (!guTypes[gu]) guTypes[gu] = {};
    guTypes[gu][t] = (guTypes[gu][t] || 0) + 1;
  }
  for (const [gu, types] of Object.entries(guTypes)) {
    _cyDominantTypeByGu[gu] = Object.entries(types).sort((a, b) => b[1] - a[1])[0][0];
  }
}

const _cyPalettes = {
  apt:        ["#0c4a6e","#0369a1","#0ea5e9","#38bdf8","#7dd3fc"],
  officetel:  ["#4c1d95","#6d28d9","#8b5cf6","#a78bfa","#c4b5fd"],
  remaining:  ["#7c2d12","#c2410c","#ea580c","#fb923c","#fdba74"],
  publicrent: ["#365314","#4d7c0f","#65a30d","#a3e635","#d9f99d"],
  opt:        ["#881337","#be123c","#f43f5e","#fb7185","#fda4af"],
};

function _cyChoroplethColor(count, gu) {
  let tabKey = _cyTab;
  if (_cyTab === "all" && gu && _cyDominantTypeByGu[gu]) {
    tabKey = _cyDominantTypeByGu[gu];
  }
  const p = _cyPalettes[tabKey] || _cyPalettes.apt;
  if (count >= 5) return p[0];
  if (count >= 3) return p[1];
  if (count >= 2) return p[2];
  if (count >= 1) return p[3];
  return "#1f2937";
}

async function _cyLoadGeo(url, key) {
  if (_cyGeoCache[key]) return _cyGeoCache[key];
  const resp = await fetch(url);
  const topo = await resp.json();
  const objKey = Object.keys(topo.objects)[0];
  const geo = topojson.feature(topo, topo.objects[objKey]);
  _cyGeoCache[key] = geo;
  return geo;
}

function _cyInitMap() {
  if (_cyMap) return;
  const el = document.getElementById("cy-map");
  if (!el) return;
  const seoulBounds = [[37.413, 126.764], [37.716, 127.184]];
  _cyMap = L.map("cy-map", {
    center: [37.5665, 126.978],
    zoom: 11,
    zoomControl: true,
    attributionControl: false,
    minZoom: 10,
    maxZoom: 14,
    maxBounds: seoulBounds,
    maxBoundsViscosity: 1.0,
  });
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd",
  }).addTo(_cyMap);
}

async function _cyRenderSeoulMap(data) {
  _cyInitMap();
  const counts = _cyCountByGu(data);
  try {
    const geo = await _cyLoadGeo(
      "https://raw.githubusercontent.com/southkorea/seoul-maps/master/kostat/2013/json/seoul_municipalities_topo_simple.json",
      "seoul"
    );
    if (_cySeoulLayer) _cyMap.removeLayer(_cySeoulLayer);
    _cySeoulLayer = L.geoJSON(geo, {
      style: (feature) => {
        const gu = feature.properties.name;
        const count = counts[gu] || 0;
        const isSelected = _cySelectedGu === gu;
        return {
          fillColor: _cyChoroplethColor(count, gu),
          fillOpacity: count > 0 ? (isSelected ? 0.8 : 0.5) : 0.1,
          color: isSelected ? (_cyTypeColors[_cyTab === "all" ? (_cyDominantTypeByGu[gu] || "apt") : _cyTab] || _cyTypeColors.apt).dot : "#4b5563",
          weight: isSelected ? 3 : 1,
        };
      },
      onEachFeature: (feature, layer) => {
        const gu = feature.properties.name;
        const count = counts[gu] || 0;
        layer.bindTooltip(`<strong>${gu}</strong> ${count}건`, { sticky: true, className: "cy-tooltip" });
        layer.on("click", () => _cySelectGu(gu, data));
      },
    }).addTo(_cyMap);
    _cyMap.fitBounds(_cySeoulLayer.getBounds(), { padding: [10, 10] });
    _cyRenderActiveMarkers(data, geo);
  } catch (err) { console.error("Seoul GeoJSON load failed:", err); }
}

function _cyRenderActiveMarkers(data, geo) {
  if (_cyMarkerLayer) _cyMap.removeLayer(_cyMarkerLayer);
  _cyMarkerLayer = L.layerGroup().addTo(_cyMap);
  const seoulActive = _cyFilterSeoul(data).filter(d => d.status === "접수중");
  const guCentroids = {};
  geo.features.forEach(f => {
    const name = f.properties.name;
    const bounds = L.geoJSON(f).getBounds();
    guCentroids[name] = bounds.getCenter();
  });
  const activeByGu = {};
  for (const d of seoulActive) {
    const gu = _cyExtractGu(d) || "기타";
    activeByGu[gu] = (activeByGu[gu] || 0) + 1;
  }
  for (const [gu, count] of Object.entries(activeByGu)) {
    const center = guCentroids[gu];
    if (!center) continue;
    const r = Math.max(8, Math.min(18, 6 + count * 4));
    L.circleMarker(center, {
      radius: r,
      fillColor: "#10b981",
      fillOpacity: 0.9,
      color: "#ffffff",
      weight: 2,
      className: "cy-active-pulse",
    }).bindTooltip(`<strong>${gu}</strong> 접수중 ${count}건`, { className: "cy-tooltip" })
      .on("click", () => _cySelectGu(gu, data))
      .addTo(_cyMarkerLayer);
  }
}

function _cySelectGu(gu, data) {
  _cySelectedGu = (_cySelectedGu === gu) ? null : gu;
  if (_cySeoulLayer) {
    const counts = _cyCountByGu(data);
    _cySeoulLayer.eachLayer(layer => {
      const name = layer.feature.properties.name;
      const count = counts[name] || 0;
      const isSel = _cySelectedGu === name;
      layer.setStyle({ fillColor: _cyChoroplethColor(count, name), fillOpacity: count > 0 ? (isSel ? 0.8 : 0.5) : 0.1, color: isSel ? (_cyTypeColors[_cyTab === "all" ? (_cyDominantTypeByGu[name] || "apt") : _cyTab] || _cyTypeColors.apt).dot : "#4b5563", weight: isSel ? 3 : 1 });
      if (isSel) layer.bringToFront();
    });
  }
  const seoulData = _cyFilterSeoul(data);
  const filtered = _cySelectedGu ? seoulData.filter(d => _cyExtractGu(d) === _cySelectedGu) : seoulData;
  _cyRenderGroupedList(filtered, data);
  _cyUpdateSummary(filtered);
}

function cyMapReset() {
  const data = _cyData[_cyTab];
  _cySelectedGu = null;
  if (data) { _cyRenderGroupedList(_cyFilterSeoul(data), data); _cyUpdateSummary(_cyFilterSeoul(data)); _cyRenderSeoulMap(data); _cyRenderGuBars(data); }
}

function _cyUpdateSummary(list) {
  document.getElementById("cy-stat-active").textContent = list.filter(d => d.status === "접수중").length;
  document.getElementById("cy-stat-upcoming").textContent = list.filter(d => d.status === "접수예정").length;
  document.getElementById("cy-stat-closed").textContent = list.filter(d => d.status === "마감").length;
  document.getElementById("cy-stat-total").textContent = list.reduce((s, d) => s + (d.total_supply || 0), 0).toLocaleString("ko-KR") + "세대";
}

function _cyRenderGuBars(data) {
  const counts = _cyCountByGu(data);
  const el = document.getElementById("cy-gu-bars");
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = sorted.length ? sorted[0][1] : 1;
  if (!sorted.length) { el.innerHTML = '<p class="text-xs text-gray-600 text-center py-2">서울 지역 데이터 없음</p>'; return; }
  el.innerHTML = sorted.map(([gu, count]) => {
    const tc = _cyTab === "all" ? (_cyTypeColors[_cyDominantTypeByGu[gu] || "apt"] || _cyTypeColors.apt) : (_cyTypeColors[_cyTab] || _cyTypeColors.apt);
    const pct = Math.round((count / max) * 100);
    const isSel = _cySelectedGu === gu;
    return `<div class="flex items-center gap-2 cursor-pointer hover:bg-gray-700/30 rounded px-1 py-0.5 transition ${isSel ? "bg-gray-700/50" : ""}" onclick="_cySelectGu('${esc(gu)}', _cyData['${_cyTab}'])">
      <span class="text-xs text-gray-400 w-14 flex-shrink-0 truncate ${isSel ? tc.text + " font-medium" : ""}">${esc(gu)}</span>
      <div class="flex-1 bg-gray-800 rounded-full h-2.5 overflow-hidden"><div class="h-full rounded-full transition-all" style="width:${pct}%;background:${_cyChoroplethColor(count, gu)}"></div></div>
      <span class="text-xs tabular-nums w-6 text-right ${isSel ? tc.text + " font-bold" : "text-gray-500"}">${count}</span>
    </div>`;
  }).join("");
}

function cyStatusBadge(status) {
  if (status === "접수중") return `<span class="px-2 py-0.5 text-xs rounded border bg-emerald-600 text-white border-emerald-500 font-bold shadow-sm shadow-emerald-500/30 animate-pulse-slow">${esc(status)}</span>`;
  const map = { "접수예정": "bg-amber-900/50 text-amber-400 border-amber-700", "마감": "bg-gray-800 text-gray-500 border-gray-700", "일정미정": "bg-gray-800 text-gray-500 border-gray-700" };
  return `<span class="px-2 py-0.5 text-xs rounded border ${map[status] || map["일정미정"]}">${esc(status)}</span>`;
}

function _cyRenderCard(d, globalIdx) {
  const itemType = (_cyTab === "all" && d._type) ? d._type : _cyTab;
  const tc = _cyTypeColors[itemType] || _cyTypeColors.apt;
  const isActive = d.status === "접수중";
  const activeClass = isActive ? "cy-card-active ring-1 ring-emerald-500/40" : "";
  const typeLabel = _cyTab === "all" ? `<span class="text-[10px] ${tc.text} opacity-70">${tc.label}</span>` : "";
  return `<div class="cy-card wa-card cursor-pointer hover:border-gray-600 transition border-l-[3px] ${tc.border} !p-3 ${activeClass}" onclick="openCyDetail(${globalIdx})">
    <div class="flex items-center gap-1.5 mb-1">${cyStatusBadge(d.status)}${typeLabel}<span class="text-xs ${tc.text} font-medium">${d.total_supply}세대</span></div>
    <h4 class="text-sm font-semibold text-gray-200 leading-snug line-clamp-1">${esc(d.house_nm)}</h4>
    <p class="text-xs text-gray-500 truncate mt-0.5">${esc(d.address || "")}</p>
  </div>`;
}

function _cyRenderGroupedList(filtered, allData) {
  const listEl = document.getElementById("cy-list");
  if (!filtered.length) { listEl.innerHTML = '<div class="wa-card text-center py-8 text-gray-500 text-sm">서울 지역 분양 공고가 없습니다</div>'; return; }
  const groups = {};
  const allSeoul = _cyFilterSeoul(allData);
  for (const d of filtered) { const gu = _cyExtractGu(d) || "기타"; if (!groups[gu]) groups[gu] = []; groups[gu].push(d); }
  const sortedGroups = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  const guTc = (_cyTab === "all") ? null : (_cyTypeColors[_cyTab] || _cyTypeColors.apt);
  const groupHtml = sortedGroups.map(([gu, items]) => {
    const tc = guTc || _cyTypeColors[_cyDominantTypeByGu[gu] || "apt"] || _cyTypeColors.apt;
    const cards = items.map(d => _cyRenderCard(d, allSeoul.indexOf(d))).join("");
    return `<div class="cy-gu-block wa-card !p-3 mb-3"><div class="flex items-center gap-2 mb-2"><h3 class="text-sm font-bold text-gray-300">${esc(gu)}</h3><span class="text-xs ${tc.text} font-medium">${items.length}건</span></div><div class="space-y-1.5">${cards}</div></div>`;
  }).join("");
  listEl.innerHTML = `<div class="cy-masonry">${groupHtml}</div>`;
}

function showCheongyak() {
  hideAllPages();
  document.getElementById("cheongyak-page").classList.remove("hidden");
  if (!_cyData[_cyTab]) { loadCheongyakTab(_cyTab); }
  else { setTimeout(() => { _cyInitMap(); if (_cyMap) _cyMap.invalidateSize(); _cyRenderSeoulMap(_cyData[_cyTab]); }, 100); }
}

function _cyUpdateTabBadges() {
  const tabs = ["apt", "officetel", "remaining", "publicrent", "opt"];
  for (const t of tabs) {
    const btn = document.querySelector(`[data-cy-tab="${t}"]`);
    if (!btn) continue;
    let badge = btn.querySelector(".cy-tab-badge");
    const d = _cyData[t];
    if (!d) { if (badge) badge.remove(); continue; }
    const seoul = _cyFilterSeoul(d);
    const active = seoul.filter(x => x.status === "접수중").length;
    const upcoming = seoul.filter(x => x.status === "접수예정" || x.status === "일정미정").length;
    if (active + upcoming === 0) { if (badge) badge.remove(); continue; }
    const text = active > 0 ? `${active}` + (upcoming > 0 ? `+${upcoming}` : "") : `${upcoming}`;
    if (!badge) { badge = document.createElement("span"); badge.className = "cy-tab-badge"; btn.appendChild(badge); }
    badge.className = `cy-tab-badge ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${active > 0 ? "bg-emerald-600 text-white" : "bg-gray-600 text-gray-300"}`;
    badge.textContent = text;
  }
  // "전체" tab badge = sum of all
  const allBtn = document.querySelector('[data-cy-tab="all"]');
  if (allBtn) {
    let badge = allBtn.querySelector(".cy-tab-badge");
    let totalActive = 0, totalUpcoming = 0;
    for (const t of tabs) { const d = _cyData[t]; if (!d) continue; const s = _cyFilterSeoul(d); totalActive += s.filter(x => x.status === "접수중").length; totalUpcoming += s.filter(x => x.status === "접수예정" || x.status === "일정미정").length; }
    if (totalActive + totalUpcoming === 0) { if (badge) badge.remove(); }
    else {
      const text = totalActive > 0 ? `${totalActive}` + (totalUpcoming > 0 ? `+${totalUpcoming}` : "") : `${totalUpcoming}`;
      if (!badge) { badge = document.createElement("span"); badge.className = "cy-tab-badge"; allBtn.appendChild(badge); }
      badge.className = `cy-tab-badge ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${totalActive > 0 ? "bg-emerald-600 text-white" : "bg-gray-600 text-gray-300"}`;
      badge.textContent = text;
    }
  }
}

function switchCyTab(tab) {
  _cyTab = tab; _cySelectedGu = null;
  document.querySelectorAll(".cy-tab").forEach(btn => { btn.classList.toggle("cy-tab-active", btn.dataset.cyTab === tab); btn.classList.toggle("text-gray-400", btn.dataset.cyTab !== tab); });
  if (_cyData[tab]) { const s = _cyFilterSeoul(_cyData[tab]); _cyRenderGroupedList(s, _cyData[tab]); _cyUpdateSummary(s); _cyRenderGuBars(_cyData[tab]); _cyRenderSeoulMap(_cyData[tab]); }
  else { loadCheongyakTab(tab); }
}

async function loadCheongyakTab(tab) {
  const loading = document.getElementById("cy-loading"); const errorEl = document.getElementById("cy-error"); const listEl = document.getElementById("cy-list");
  loading.classList.remove("hidden"); errorEl.classList.add("hidden"); listEl.innerHTML = "";
  const endpoints = { apt: "/api/cheongyak/apt", officetel: "/api/cheongyak/officetel", remaining: "/api/cheongyak/remaining", publicrent: "/api/cheongyak/public-rent", opt: "/api/cheongyak/opt" };
  try {
    let data;
    if (tab === "all") {
      const types = ["apt", "officetel", "remaining", "publicrent", "opt"];
      const results = await Promise.allSettled(types.map(t => api(endpoints[t])));
      data = [];
      results.forEach((r, i) => {
        if (r.status === "fulfilled" && Array.isArray(r.value)) {
          _cyData[types[i]] = r.value;
          for (const d of r.value) { d._type = types[i]; }
          data.push(...r.value);
        }
      });
      const statusOrder = {"접수중": 0, "접수예정": 1, "일정미정": 2, "마감": 3};
      data.sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));
      _cyCalcDominantTypes(data);
    } else {
      data = await api(endpoints[tab]);
    }
    _cyData[tab] = data;
    const s = _cyFilterSeoul(data); _cyRenderGroupedList(s, data); _cyUpdateSummary(s); _cyRenderGuBars(data); _cyUpdateTabBadges();
    setTimeout(() => { _cyInitMap(); if (_cyMap) _cyMap.invalidateSize(); _cyRenderSeoulMap(data); }, 100);
  } catch (err) { document.getElementById("cy-error-text").textContent = err.message; errorEl.classList.remove("hidden"); }
  finally { loading.classList.add("hidden"); }
}

function openCyDetail(idx) {
  const allSeoul = _cyFilterSeoul(_cyData[_cyTab]); const d = allSeoul[idx]; if (!d) return;
  document.getElementById("cy-detail-title").textContent = d.house_nm;
  const rows = [["상태", cyStatusBadge(d.status)],["주택구분", `${d.house_secd_nm||""} / ${d.house_dtl_secd_nm||""}`],["분양유형", d.rent_secd_nm||"-"],["지역", (_cyExtractGu(d)||d.region)||"-"],["공급위치", d.address||"-"],["총 공급세대", `${d.total_supply}세대`],["모집공고일", d.announcement_date||"-"],["특별공급 접수", d.special_start&&d.special_end?`${d.special_start} ~ ${d.special_end}`:"-"],["일반 접수", d.reception_start&&d.reception_end?`${d.reception_start} ~ ${d.reception_end}`:"-"],["당첨자 발표", d.winner_date||"-"],["계약기간", d.contract_start&&d.contract_end?`${d.contract_start} ~ ${d.contract_end}`:"-"],["시공사", d.constructor||"-"],["문의전화", d.phone||"-"],["입주예정", d.move_in_month||"-"]];
  let html = `<table class="w-full text-sm">${rows.map(([k,v])=>`<tr class="border-b border-gray-700/50"><td class="py-2 pr-3 text-gray-500 whitespace-nowrap align-top" style="width:100px">${esc(k)}</td><td class="py-2 text-gray-300">${v}</td></tr>`).join("")}</table>`;
  if (d.homepage) html += `<a href="${esc(d.homepage)}" target="_blank" rel="noopener" class="inline-block mt-3 text-xs text-navy-400 hover:underline">시행사 홈페이지 &rarr;</a>`;
  if (d.pblanc_url) html += `<a href="${esc(d.pblanc_url)}" target="_blank" rel="noopener" class="inline-block mt-2 ml-3 text-xs text-emerald-400 hover:underline">청약홈 공고 보기 &rarr;</a>`;
  if (d.house_manage_no && d.pblanc_no) {
    const itemTab = (_cyTab === "all" && d._type) ? d._type : _cyTab;
    const hm = esc(d.house_manage_no), pn = esc(d.pblanc_no), tt = itemTab === "officetel" ? "officetel" : (itemTab === "publicrent" ? "public-rent" : (itemTab === "opt" ? "opt" : "apt"));
    const isAptType = ["apt","remaining"].includes(itemTab);
    html += `<div class="mt-4 pt-4 border-t border-gray-700 flex flex-wrap gap-2">${isAptType?`<button onclick="loadCyHousingTypes('${hm}','${pn}')" class="text-xs bg-navy-700 text-white px-3 py-1.5 rounded hover:bg-navy-800 transition">주택형별 상세</button>`:""}<button onclick="loadCyCompetition('${hm}','${pn}','${tt}')" class="text-xs bg-emerald-700 text-white px-3 py-1.5 rounded hover:bg-emerald-800 transition">경쟁률</button>${isAptType?`<button onclick="loadCyScores('${hm}','${pn}')" class="text-xs bg-amber-700 text-white px-3 py-1.5 rounded hover:bg-amber-800 transition">당첨 가점</button><button onclick="loadCySpecialSupply('${hm}','${pn}')" class="text-xs bg-purple-700 text-white px-3 py-1.5 rounded hover:bg-purple-800 transition">특별공급 현황</button>`:""}</div><div id="cy-detail-types" class="mt-3"></div><div id="cy-detail-competition" class="mt-3"></div><div id="cy-detail-scores" class="mt-3"></div><div id="cy-detail-special" class="mt-3"></div>`;
  }
  document.getElementById("cy-detail-content").innerHTML = html;
  document.getElementById("cy-detail-modal").classList.remove("hidden");
}

async function loadCyHousingTypes(hm, pn) {
  const c = document.getElementById("cy-detail-types"); c.innerHTML = '<p class="text-xs text-gray-500">불러오는 중...</p>';
  try { const types = await api(`/api/cheongyak/apt/${encodeURIComponent(hm)}/${encodeURIComponent(pn)}/types`); if (!types.length) { c.innerHTML = '<p class="text-xs text-gray-500">주택형별 정보 없음</p>'; return; }
    c.innerHTML = `<h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">주택형별 공급 현황</h4><div class="overflow-x-auto"><table class="w-full text-xs"><thead><tr class="border-b border-gray-700"><th class="text-left px-2 py-1.5 text-gray-500">주택형</th><th class="text-right px-2 py-1.5 text-gray-500">공급면적</th><th class="text-right px-2 py-1.5 text-gray-500">공급</th><th class="text-right px-2 py-1.5 text-gray-500">특별</th><th class="text-right px-2 py-1.5 text-gray-500">일반</th><th class="text-right px-2 py-1.5 text-gray-500">최고분양가</th></tr></thead><tbody class="divide-y divide-gray-800">${types.map(t=>`<tr><td class="px-2 py-1.5 font-medium text-gray-300">${esc(t.house_ty)}</td><td class="px-2 py-1.5 text-right tabular-nums">${t.supply_area||"-"}</td><td class="px-2 py-1.5 text-right tabular-nums font-medium">${t.supply_count}</td><td class="px-2 py-1.5 text-right tabular-nums">${t.special_count}</td><td class="px-2 py-1.5 text-right tabular-nums">${t.general_count}</td><td class="px-2 py-1.5 text-right tabular-nums">${t.lttot_top_amount?Number(t.lttot_top_amount).toLocaleString("ko-KR")+"만원":"-"}</td></tr>`).join("")}</tbody></table></div>`;
  } catch (err) { c.innerHTML = `<p class="text-xs text-red-400">${esc(err.message)}</p>`; }
}

async function loadCyCompetition(hm, pn, tabType) {
  const c = document.getElementById("cy-detail-competition"); c.innerHTML = '<p class="text-xs text-gray-500">경쟁률 불러오는 중...</p>';
  try { const data = await api(`/api/cheongyak/${tabType}/${encodeURIComponent(hm)}/${encodeURIComponent(pn)}/competition`); if (!data.length) { c.innerHTML = '<p class="text-xs text-gray-500">경쟁률 정보 없음</p>'; return; }
    const isApt = tabType === "apt";
    c.innerHTML = `<h4 class="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">경쟁률</h4><div class="overflow-x-auto"><table class="w-full text-xs"><thead><tr class="border-b border-gray-700"><th class="text-left px-2 py-1.5 text-gray-500">주택형</th>${isApt?'<th class="text-center px-2 py-1.5 text-gray-500">순위</th><th class="text-left px-2 py-1.5 text-gray-500">지역</th>':''}<th class="text-right px-2 py-1.5 text-gray-500">공급</th><th class="text-right px-2 py-1.5 text-gray-500">신청</th><th class="text-right px-2 py-1.5 text-gray-500">경쟁률</th></tr></thead><tbody class="divide-y divide-gray-800">${data.map(r=>{const rate=parseFloat(r.competition_rate)||0;const cls=rate>=10?"text-red-400 font-bold":rate>=3?"text-amber-400":"text-gray-300";return `<tr><td class="px-2 py-1.5 text-gray-300">${esc(r.house_ty)}</td>${isApt?`<td class="px-2 py-1.5 text-center">${r.rank}순위</td><td class="px-2 py-1.5 text-gray-400">${esc(r.region_name||"")}</td>`:""}<td class="px-2 py-1.5 text-right tabular-nums">${r.supply_count}</td><td class="px-2 py-1.5 text-right tabular-nums">${Number(r.applicants).toLocaleString("ko-KR")}</td><td class="px-2 py-1.5 text-right tabular-nums ${cls}">${r.competition_rate}:1</td></tr>`;}).join("")}</tbody></table></div>`;
  } catch (err) { c.innerHTML = `<p class="text-xs text-red-400">${esc(err.message)}</p>`; }
}

async function loadCyScores(hm, pn) {
  const c = document.getElementById("cy-detail-scores"); c.innerHTML = '<p class="text-xs text-gray-500">가점 불러오는 중...</p>';
  try { const data = await api(`/api/cheongyak/apt/${encodeURIComponent(hm)}/${encodeURIComponent(pn)}/scores`); if (!data.length) { c.innerHTML = '<p class="text-xs text-gray-500">가점 정보 없음</p>'; return; }
    c.innerHTML = `<h4 class="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">당첨 가점</h4><div class="overflow-x-auto"><table class="w-full text-xs"><thead><tr class="border-b border-gray-700"><th class="text-left px-2 py-1.5 text-gray-500">주택형</th><th class="text-left px-2 py-1.5 text-gray-500">지역</th><th class="text-right px-2 py-1.5 text-gray-500">최저</th><th class="text-right px-2 py-1.5 text-gray-500">최고</th><th class="text-right px-2 py-1.5 text-gray-500">평균</th></tr></thead><tbody class="divide-y divide-gray-800">${data.map(r=>`<tr><td class="px-2 py-1.5 text-gray-300">${esc(r.house_ty)}</td><td class="px-2 py-1.5 text-gray-400">${esc(r.region_name)}</td><td class="px-2 py-1.5 text-right tabular-nums">${r.min_score||"-"}</td><td class="px-2 py-1.5 text-right tabular-nums font-bold text-amber-300">${r.max_score||"-"}</td><td class="px-2 py-1.5 text-right tabular-nums">${r.avg_score||"-"}</td></tr>`).join("")}</tbody></table></div>`;
  } catch (err) { c.innerHTML = `<p class="text-xs text-red-400">${esc(err.message)}</p>`; }
}

async function loadCySpecialSupply(hm, pn) {
  const c = document.getElementById("cy-detail-special"); c.innerHTML = '<p class="text-xs text-gray-500">특별공급 불러오는 중...</p>';
  try { const data = await api(`/api/cheongyak/apt/${encodeURIComponent(hm)}/${encodeURIComponent(pn)}/special-supply`); if (!data.length) { c.innerHTML = '<p class="text-xs text-gray-500">특별공급 정보 없음</p>'; return; }
    c.innerHTML = `<h4 class="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">특별공급 신청현황</h4><div class="overflow-x-auto"><table class="w-full text-xs"><thead><tr class="border-b border-gray-700"><th class="text-left px-2 py-1.5 text-gray-500">주택형</th><th class="text-right px-2 py-1.5 text-gray-500">총 특별</th><th class="text-right px-2 py-1.5 text-gray-500">다자녀</th><th class="text-right px-2 py-1.5 text-gray-500">신혼</th><th class="text-right px-2 py-1.5 text-gray-500">생애최초</th><th class="text-right px-2 py-1.5 text-gray-500">노부모</th><th class="text-right px-2 py-1.5 text-gray-500">기관</th></tr></thead><tbody class="divide-y divide-gray-800">${data.map(r=>`<tr><td class="px-2 py-1.5 text-gray-300">${esc(r.house_ty)}</td><td class="px-2 py-1.5 text-right tabular-nums font-medium">${r.special_total}</td><td class="px-2 py-1.5 text-right tabular-nums">${r.multi_child}</td><td class="px-2 py-1.5 text-right tabular-nums">${r.newlywed}</td><td class="px-2 py-1.5 text-right tabular-nums">${r.first_life}</td><td class="px-2 py-1.5 text-right tabular-nums">${r.elderly_parent}</td><td class="px-2 py-1.5 text-right tabular-nums">${r.institution}</td></tr>`).join("")}</tbody></table></div>`;
  } catch (err) { c.innerHTML = `<p class="text-xs text-red-400">${esc(err.message)}</p>`; }
}

function refreshCheongyak() {
  _cyData = { all: null, apt: null, officetel: null, remaining: null, publicrent: null, opt: null };
  _cySelectedGu = null;
  loadCheongyakTab(_cyTab);
}
