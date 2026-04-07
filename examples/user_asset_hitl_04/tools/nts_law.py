"""국가법령정보 국세청 법령해석 목록 API (ntsCgmExpc, XML)."""

from __future__ import annotations

import json
import logging
import os
import xml.etree.ElementTree as ET
from typing import Any

import requests

logger = logging.getLogger(__name__)

NTS_LAW_SEARCH_URL = "http://www.law.go.kr/DRF/lawSearch.do"


def nts_law_use_mock() -> bool:
    if (os.environ.get("NTS_LAW_FORCE_MOCK") or "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    ):
        return True
    return not (os.environ.get("LAW_GO_KR_OC") or "").strip()


def nts_xml_local_tag(tag: str) -> str:
    if not tag:
        return ""
    if "}" in tag:
        return tag.rsplit("}", 1)[-1]
    return tag


def mock_nts_law_records(query: str) -> list[dict[str, Any]]:
    q = (query or "").strip()[:60]
    return [
        {
            "id": "1",
            "법령해석일련번호": "900001",
            "안건명": f"[MOCK] 「{q}」에 대한 법령해석 요지(샘플)",
            "안건번호": "MOCK-2025-001",
            "질의기관명": "",
            "질의기관코드": "",
            "해석기관명": "국세청(샘플)",
            "해석기관코드": "1210000",
            "해석일자": "2025.01.02",
            "법령해석상세링크": "https://www.law.go.kr/(mock-detail-1)",
            "데이터기준일시": "2025.04.07",
        },
        {
            "id": "2",
            "법령해석일련번호": "900002",
            "안건명": "[MOCK] 발급 OC·등록 IP로 live 호출 시 위 XML 형식으로 대체됩니다.",
            "안건번호": "MOCK-2025-002",
            "질의기관명": "",
            "질의기관코드": "",
            "해석기관명": "국세청(샘플)",
            "해석기관코드": "1210000",
            "해석일자": "2024.12.10",
            "법령해석상세링크": "https://www.law.go.kr/(mock-detail-2)",
            "데이터기준일시": "2025.04.07",
        },
    ]


def parse_cgm_expc_xml(
    xml_text: str,
) -> tuple[list[dict[str, Any]], str | None, str | None]:
    raw = (xml_text or "").strip()
    if not raw:
        return [], "빈 응답", None
    try:
        root = ET.fromstring(raw)
    except ET.ParseError as exc:
        return [], f"XML 파싱 오류: {exc}", None

    root_name = nts_xml_local_tag(root.tag)
    if root_name.lower() != "cgmexpc":
        return [], f"루트 태그가 CgmExpc 가 아님: {root_name!r}", None

    result_code = (root.findtext("resultCode") or "").strip()
    result_msg = (root.findtext("resultMsg") or "").strip()
    if result_code and result_code != "00":
        return [], f"API resultCode={result_code} {result_msg}".strip(), None

    total_cnt = root.findtext("totalCnt")
    records: list[dict[str, Any]] = []
    for child in root:
        if nts_xml_local_tag(child.tag).lower() != "cgmexpc":
            continue
        rec: dict[str, Any] = {}
        cid = child.attrib.get("id")
        if cid is not None:
            rec["id"] = cid
        for sub in child:
            key = nts_xml_local_tag(sub.tag)
            rec[key] = (sub.text or "").strip()
        if rec:
            records.append(rec)

    return records, None, (total_cnt.strip() if total_cnt else None) or None


def rec_detail_link(rec: dict[str, Any]) -> str:
    explicit = (
        rec.get("법령해석상세링크")
        or rec.get("법령해석 상세링크")
        or rec.get("lsEfLink")
    )
    if explicit:
        return str(explicit).strip()
    for k, v in rec.items():
        if not isinstance(k, str) or v is None:
            continue
        collapsed = k.replace(" ", "")
        if "상세링크" in collapsed or (
            "상세" in collapsed and "링크" in collapsed
        ):
            return str(v).strip()
    return ""


def law_record_to_line(rec: dict[str, Any], idx: int) -> str:
    rid = rec.get("id")
    serial = rec.get("법령해석일련번호")
    title = (rec.get("안건명") or rec.get("lawItmNm") or "").strip()
    no = (rec.get("안건번호") or "").strip()
    ymd = (rec.get("해석일자") or "").strip()
    inq_c = rec.get("질의기관코드")
    inq_n = (rec.get("질의기관명") or "").strip()
    rpl_c = rec.get("해석기관코드")
    org = (rec.get("해석기관명") or "").strip()
    data_dt = (rec.get("데이터기준일시") or "").strip()
    link = rec_detail_link(rec)

    lines = [f"{idx}. {title}"]
    if rid is not None:
        lines.append(f"   id: {rid}")
    if serial is not None:
        lines.append(f"   법령해석일련번호: {serial}")
    if no:
        lines.append(f"   안건번호: {no}")
    if ymd:
        lines.append(f"   해석일자: {ymd}")
    if inq_n:
        lines.append(
            f"   질의기관: {inq_n}"
            + (f" (코드 {inq_c})" if inq_c is not None else "")
        )
    elif inq_c is not None:
        lines.append(f"   질의기관코드: {inq_c}")
    if org or rpl_c is not None:
        bits: list[str] = []
        if org:
            bits.append(org)
        if rpl_c is not None:
            bits.append(f"해석기관코드 {rpl_c}")
        lines.append("   해석기관: " + " · ".join(bits))
    if data_dt:
        lines.append(f"   데이터기준일시: {data_dt}")
    if link:
        lines.append(f"   법령해석 상세링크: {link}")
    return "\n".join(lines)


def law_records_to_text(records: list[dict[str, Any]], *, header: str) -> str:
    if not records:
        return "(검색 결과 없음)"
    max_items = 12
    body = "\n".join(
        law_record_to_line(r, i + 1) for i, r in enumerate(records[:max_items])
    )
    return f"{header}\n{body}".strip()


def nts_cgm_search_once(query: str, *, display: int = 8) -> str:
    use_mock = nts_law_use_mock()
    if use_mock:
        recs = mock_nts_law_records(query)
        text = law_records_to_text(
            recs,
            header=f"[MOCK 국세청 법령해석·XML동형] query={query!r} (OC 미설정 또는 NTS_LAW_FORCE_MOCK)",
        )
        logger.info("NTS 법령해석 mock query=%r records=%d", query, len(recs))
        return text

    oc = (os.environ.get("LAW_GO_KR_OC") or "").strip()
    params = {
        "OC": oc,
        "target": "ntsCgmExpc",
        "type": "XML",
        "search": 1,
        "query": query,
        "display": min(max(1, display), 100),
        "page": 1,
    }
    try:
        r = requests.get(NTS_LAW_SEARCH_URL, params=params, timeout=25)
        r.raise_for_status()
        body = r.text.strip()
    except Exception as exc:  # noqa: BLE001
        return f"(국세청 법령해석 API 요청 실패: {exc})"

    if body.startswith("{"):
        try:
            err_obj = json.loads(body)
            if isinstance(err_obj, dict) and (
                err_obj.get("msg") or err_obj.get("result")
            ):
                return (
                    "(국세청 법령해석 API: "
                    f"{err_obj.get('msg') or err_obj.get('result')})"
                )
        except json.JSONDecodeError:
            pass

    recs, err, total_cnt = parse_cgm_expc_xml(body)
    if err:
        return f"(국세청 법령해석 XML: {err})"
    head = f"[국세청 법령해석·XML] query={query!r}"
    if total_cnt:
        head += f" totalCnt={total_cnt}"
    return law_records_to_text(recs, header=head)


def tax_research_query_specs(profile: dict[str, Any]) -> list[tuple[str, str]]:
    emp = str(profile.get("employment_type") or "unknown").strip().lower()
    band = str(profile.get("annual_income_band") or "unknown").strip().lower()

    specs: list[tuple[str, str]] = [
        ("연금저축_IRP", "연금저축"),
        ("ISA", "종합자산관리계좌"),
        ("연말정산", "연말정산"),
    ]
    if emp in ("self_employed", "freelancer"):
        specs.append(("자영업_연금저축", "종합소득"))
    if band in ("70m_to_120m", "over_120m"):
        specs.append(("세액공제한도", "세액공제"))
    return specs
