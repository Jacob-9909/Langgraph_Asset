"""예제 04 상수·환경."""

from __future__ import annotations

import os

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
GEMINI_MODEL = "gemini-2.5-flash"
USE_MEMORY_CHECKPOINTER = False
PROFILE_MAX_HUMAN_MESSAGES = 6

# advisor 한 번 호출에 넣는 리서치 본문 상한(문자). 실제 프롬프트가 ~5k 토큰이면
# 이 값을 더 낮춰도 잘리지 않을 수 있음 → 체감 지연은 completion 쪽이 더 큼.
ADVISOR_MARKET_NOTES_MAX_CHARS = 4_500
ADVISOR_MACRO_NOTES_MAX_CHARS = 3_500
ADVISOR_TAX_NOTES_MAX_CHARS = 3_500

# 국세청 법령해석: 목록 API만 본문 없음 → 상세 URL에서 발췌(허용 도메인만).
NTS_LAW_FETCH_DETAIL_PAGE_TEXT = True
NTS_LAW_DETAIL_TOP_N = 2
NTS_LAW_DETAIL_TEXT_MAX_CHARS = 2_000
# taxlaw.nts.go.kr 는 본문이 JS로 로드됨 → Playwright로 렌더 후 추출(optional extra `nts-law-detail`).
# 환경변수 미지정 시: playwright 설치돼 있으면 True, 없으면 False(GET만·taxlaw 본문은 거의 없음).
def _playwright_installed() -> bool:
    try:
        import playwright  # noqa: F401
    except ImportError:
        return False
    return True


_pw = os.environ.get("NTS_LAW_USE_PLAYWRIGHT_DETAIL", "").strip().lower()
if _pw in ("0", "false", "no", "n"):
    NTS_LAW_USE_PLAYWRIGHT_DETAIL = False
elif _pw in ("1", "true", "yes", "y"):
    NTS_LAW_USE_PLAYWRIGHT_DETAIL = True
else:
    NTS_LAW_USE_PLAYWRIGHT_DETAIL = _playwright_installed()
NTS_LAW_PLAYWRIGHT_TIMEOUT_MS = int(
    os.environ.get("NTS_LAW_PLAYWRIGHT_TIMEOUT_MS", "60000") or "60000"
)

# ntsCgmExpc: 프로필의 nts_law_api_queries 로만 검색(고정 3키워드 없음). 비었을 때만 폴백.
NTS_LAW_MAX_API_QUERIES = max(
    1, min(10, int(os.environ.get("NTS_LAW_MAX_API_QUERIES", "5") or "5"))
)
_fb = (os.environ.get("NTS_LAW_FALLBACK_API_QUERIES") or "소득세").strip()
NTS_LAW_FALLBACK_API_QUERIES: tuple[str, ...] = tuple(
    x.strip() for x in _fb.split(",") if x.strip()
) or ("소득세",)

# 첫 입력 시 profile_missing_labels(목표·나이·월여유 또는 기간·소득형태·연소득구간)를
# 채우기 쉽도록 예시에 직장/사업·연봉·기간·금액을 함께 넣는다.
USER_INPUT_EXAMPLES: tuple[str, ...] = (
    "34세 직장인, 연봉은 세전 기준 대략 6천만 원대야. 월 80만 원 정도 여유 있고 1년 안에 원금 보존으로 모으고 싶어. 위험은 낮게, 연금저축은 아직 없어.",
    "27살 회사 다니는 직장인, 연소득은 대략 4천만 원 초반 느낌. 첫 월급부터 저축 습관 들이고 싶고 위험은 낮췄으면 해. 목표 기간은 약 3년.",
    "52세 직장인, 연봉은 한 1억 안팎이야. 은퇴까지 한 10년 남았는데 연금저축이랑 예금·적금을 어떻게 섞으면 좋을지 알려줘.",
    "41세 직장인, 세후 느낌으로 연소득 5천만 원대. 주식은 부담돼서 고정 금리 쪽 위주로 하고 싶어. 매달 150만 원씩 넣을 수 있어.",
    "29살 프리랜서(디자인), 연 수입은 들쭉날쭉하지만 대략 5~6천만 원으로 보면 돼. 2년 뒤 결혼 자금이 필요하고 대출은 없어. 월 100만 원은 저축으로 빼둘 수 있어.",
)