"""예제 04 상수·환경."""

from __future__ import annotations

import os

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
GEMINI_MODEL = "gemini-2.5-flash"
USE_MEMORY_CHECKPOINTER = False
PROFILE_MAX_HUMAN_MESSAGES = 6

USER_INPUT_EXAMPLES: tuple[str, ...] = (
    "32세 직장인, 연봉은 대략 6천만 원대야. 월 80만 원 정도 여유 있고 1년 안에 원금 보존으로 모으고 싶어. 연금저축은 아직 없어.",
    "20대 후반이고 첫 월급부터 저축 습관 들이고 싶어. 위험은 낮췄으면 좋겠고 목표는 3년 정도.",
    "50대야. 은퇴까지 한 10년 남았는데 연금저축이랑 예금·적금을 어떻게 섞으면 좋을지 알려줘.",
    "주식은 부담돼서 고정 금리 쪽 위주로 돈 굴리고 싶어. 매달 150만 원씩 넣을 수 있어. 나이는 41.",
    "2년 뒤 결혼 자금이 필요해. 지금 29살이고 대출은 없어. 월 순수입에서 100만 원은 저축으로 빼둘 수 있어.",
)