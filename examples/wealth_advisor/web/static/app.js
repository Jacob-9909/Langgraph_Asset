/* ── State ─────────────────────────────────────────── */
let token = localStorage.getItem("wa_token");
let userName = localStorage.getItem("wa_name");
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
  loginTab.classList.toggle("border-navy-600", tab === "login");
  loginTab.classList.toggle("text-navy-700", tab === "login");
  loginTab.classList.toggle("border-transparent", tab !== "login");
  loginTab.classList.toggle("text-gray-400", tab !== "login");
  regTab.classList.toggle("border-navy-600", tab === "register");
  regTab.classList.toggle("text-navy-700", tab === "register");
  regTab.classList.toggle("border-transparent", tab !== "register");
  regTab.classList.toggle("text-gray-400", tab !== "register");
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
  localStorage.setItem("wa_token", token);
  localStorage.setItem("wa_name", userName);
  showDashboard();
}

function logout() {
  token = null;
  userName = null;
  localStorage.removeItem("wa_token");
  localStorage.removeItem("wa_name");
  showAuth();
}

/* ── Routing ───────────────────────────────────────── */
function showAuth() {
  document.getElementById("auth-page").classList.remove("hidden");
  document.getElementById("dashboard-page").classList.add("hidden");
}

function showDashboard() {
  document.getElementById("auth-page").classList.add("hidden");
  document.getElementById("dashboard-page").classList.remove("hidden");
  document.getElementById("user-name").textContent = userName || "";
  loadDashboard();
  loadAssets();
  loadResults();
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

    // Admin panel
    if (d.is_admin) {
      document.getElementById("admin-panel").classList.remove("hidden");
      loadPendingUsers();
    } else {
      document.getElementById("admin-panel").classList.add("hidden");
    }

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
    alert(r.message);
    loadPendingUsers();
  } catch (err) {
    alert(err.message);
  }
}

async function rejectUser(id) {
  if (!confirm("이 사용자의 가입을 거부하시겠습니까? 계정이 삭제됩니다.")) return;
  try {
    const r = await api(`/api/admin/reject/${id}`, { method: "DELETE" });
    alert(r.message);
    loadPendingUsers();
  } catch (err) {
    alert(err.message);
  }
}

/* ── Init ──────────────────────────────────────────── */
document.getElementById("af-qty")?.addEventListener("input", autoCalcAmount);
document.getElementById("af-cur-price")?.addEventListener("input", autoCalcAmount);

if (token) {
  showDashboard();
} else {
  showAuth();
}
