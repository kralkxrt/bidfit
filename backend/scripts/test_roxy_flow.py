import asyncio
import json
import sys
from pathlib import Path
from typing import Optional
from uuid import uuid4

import os

import httpx
from sqlalchemy import text

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from app.database import SessionLocal

BASE_URL = "http://localhost:8000"
TEST_TEXT = "The contractor shall possess ISO 27001 certification and CMMI Level 3."
PDF_PATH = Path("/Users/kurtkarslioglu/Desktop/PP Gap Analysis/backend/tmp_roxy_test.pdf")


def log_result(step: str, ok: bool, detail: str) -> None:
    status = "PASS" if ok else "FAIL"
    print(f"{step}: {status} - {detail}")


def ensure_test_pdf() -> bool:
    if PDF_PATH.exists():
        return True
    try:
        from reportlab.pdfgen import canvas
    except Exception as exc:
        log_result("STEP 2", False, f"Missing reportlab for PDF creation: {exc}")
        return False

    PDF_PATH.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(PDF_PATH))
    c.setFont("Helvetica", 12)
    c.drawString(72, 720, TEST_TEXT)
    c.save()
    return True


async def get_or_create_company_and_opportunity(test_document_id: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    async with SessionLocal() as session:
        company_id = None
        if test_document_id:
            doc_res = await session.execute(
                text("SELECT company_id FROM documents WHERE id = :doc_id"),
                {"doc_id": test_document_id}
            )
            doc_row = doc_res.first()
            if doc_row and doc_row[0]:
                company_id = str(doc_row[0])

        if not company_id:
            company_res = await session.execute(text("SELECT id FROM companies ORDER BY created_at DESC LIMIT 1"))
            company_row = company_res.first()
            if company_row:
                company_id = str(company_row[0])
            else:
                company_id = str(uuid4())
                await session.execute(
                    text("INSERT INTO companies (id, name) VALUES (:id, :name)"),
                    {"id": company_id, "name": "Roxy Test Company"}
                )
                await session.commit()

        opp_res = await session.execute(
            text(
                """
                SELECT id FROM opportunities
                WHERE company_id = :company_id
                ORDER BY created_at DESC LIMIT 1
                """
            ),
            {"company_id": company_id}
        )
        opp_row = opp_res.first()
        if opp_row:
            return str(opp_row[0]), company_id

        opp_id = str(uuid4())
        await session.execute(
            text(
                """
                INSERT INTO opportunities (id, company_id, title, status, pipeline_stage)
                VALUES (:id, :company_id, :title, 'active', 'capture')
                """
            ),
            {"id": opp_id, "company_id": company_id, "title": "Roxy Test Opportunity"}
        )
        await session.commit()
        return opp_id, company_id


def upload_document(company_id: str) -> Optional[str]:
    if not ensure_test_pdf():
        return None
    with open(PDF_PATH, "rb") as f:
        files = {"file": (PDF_PATH.name, f, "application/pdf")}
        data = {"company_id": company_id, "document_type": "past_performance"}
        try:
            resp = httpx.post(f"{BASE_URL}/api/documents/upload", files=files, data=data, timeout=60)
            resp.raise_for_status()
        except Exception as exc:
            log_result("STEP 2", False, f"Upload failed: {exc}")
            return None
        doc = resp.json()
        return doc.get("id")


async def find_existing_document_with_positions(company_id: str) -> Optional[str]:
    async with SessionLocal() as session:
        res = await session.execute(
            text(
                """
                SELECT d.id
                FROM documents d
                JOIN document_text_positions dtp ON dtp.document_id = d.id
                WHERE d.company_id = :company_id
                ORDER BY d.created_at DESC
                LIMIT 1
                """
            ),
            {"company_id": company_id}
        )
        row = res.first()
        return str(row[0]) if row else None


async def ensure_document_chunks(document_id: str) -> bool:
    async with SessionLocal() as session:
        res = await session.execute(
            text("SELECT COUNT(*) FROM document_chunks WHERE document_id = :doc_id"),
            {"doc_id": document_id}
        )
        count = res.scalar() or 0
        if count > 0:
            log_result("STEP 2", True, f"document_chunks already present: {count}")
            return True
        try:
            await session.execute(
                text(
                    """
                    INSERT INTO document_chunks (id, document_id, chunk_index, content, embedding)
                    VALUES (gen_random_uuid(), :doc_id, 0, :content, NULL)
                    """
                ),
                {"doc_id": document_id, "content": TEST_TEXT}
            )
            await session.commit()
            log_result("STEP 2", True, "Inserted document_chunks test row")
            return True
        except Exception as exc:
            await session.rollback()
            log_result("STEP 2", False, f"Chunk insert failed: {exc}")
            return False


async def has_text_positions(document_id: str) -> bool:
    async with SessionLocal() as session:
        try:
            res = await session.execute(
                text("SELECT COUNT(*) FROM document_text_positions WHERE document_id = :doc_id"),
                {"doc_id": document_id}
            )
            count = res.scalar() or 0
            return count > 0
        except Exception as exc:
            log_result("STEP 3", False, f"document_text_positions query error: {exc}")
            return False


def stream_roxy_chat(opportunity_id: str) -> list[dict]:
    payload = {
        "opportunity_id": opportunity_id,
        "message": "What certifications are required?",
        "context": {"current_tab": "summary"}
    }
    citations: list[dict] = []
    try:
        with httpx.stream("POST", f"{BASE_URL}/api/roxy/chat", json=payload, timeout=60) as r:
            r.raise_for_status()
            for line in r.iter_lines():
                if not line or not line.startswith("data: "):
                    continue
                data = line.replace("data: ", "", 1)
                try:
                    event = json.loads(data)
                except Exception:
                    continue
                if event.get("type") == "citation":
                    citations.append(event.get("citation"))
                if event.get("type") == "done":
                    break
    except Exception as exc:
        log_result("STEP 4", False, f"/api/roxy/chat failed: {exc}")
        return []
    return citations


async def main() -> None:
    skip_upload = os.getenv("SKIP_UPLOAD") == "1"
    provided_doc_id = os.getenv("TEST_DOCUMENT_ID")
    opp_id, company_id = await get_or_create_company_and_opportunity(provided_doc_id)
    if not opp_id or not company_id:
        log_result("STEP 1", False, "No company/opportunity available")
        return
    log_result("STEP 1", True, f"opportunity_id={opp_id}")

    doc_id = None
    if skip_upload and provided_doc_id:
        doc_id = provided_doc_id
        log_result("STEP 2", True, f"Using provided document_id={doc_id}")
    else:
        doc_id = upload_document(company_id)
        if not doc_id:
            doc_id = await find_existing_document_with_positions(company_id)
            if not doc_id:
                log_result("STEP 2", False, "No document uploaded or available with text positions")
                return
            log_result("STEP 2", True, f"Using existing document_id={doc_id}")
        else:
            log_result("STEP 2", True, f"Uploaded document_id={doc_id}")

    if not await ensure_document_chunks(doc_id):
        return

    if not await has_text_positions(doc_id):
        log_result("STEP 3", False, "No text positions found for document")
        return
    log_result("STEP 3", True, "document_text_positions has entries")

    citations = stream_roxy_chat(opp_id)
    if not citations:
        log_result("STEP 4", False, "No citations returned from stream")
        return
    log_result("STEP 4", True, f"citations={len(citations)}")

    bounding_box = citations[0].get("boundingBox")
    if bounding_box and all(k in bounding_box for k in ("x", "y", "width", "height")):
        log_result("STEP 5", True, f"boundingBox={bounding_box}")
    else:
        log_result("STEP 5", False, f"boundingBox missing or incomplete: {bounding_box}")


if __name__ == "__main__":
    asyncio.run(main())
