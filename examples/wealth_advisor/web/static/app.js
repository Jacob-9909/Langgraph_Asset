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
