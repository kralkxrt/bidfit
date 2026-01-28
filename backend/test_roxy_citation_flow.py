import json
from pathlib import Path

import httpx
from reportlab.pdfgen import canvas
from sqlalchemy import text

from app.database import SessionLocal

BASE_URL = "http://localhost:8000"
PDF_PATH = Path("/Users/kurtkarslioglu/Desktop/PP Gap Analysis/backend/tmp_roxy_test.pdf")
TEST_TEXT = "The contractor shall possess ISO 27001 certification and CMMI Level 3."


def create_test_pdf(path: Path, text_content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(path))
    c.setFont("Helvetica", 12)
    c.drawString(72, 720, text_content)
    c.save()


async def get_first_opportunity_and_company():
    async with SessionLocal() as session:
        res = await session.execute(text("SELECT id, company_id FROM opportunities LIMIT 1"))
        row = res.first()
        if not row:
            print("NO_OPPORTUNITIES_FOUND")
            return None, None
        return row[0], row[1]


async def check_text_positions(doc_id: str) -> bool:
    async with SessionLocal() as session:
        try:
            res = await session.execute(
                text("SELECT bounding_box FROM document_text_positions WHERE document_id = :doc_id LIMIT 1"),
                {"doc_id": doc_id}
            )
            row = res.first()
            if not row:
                print("NO_TEXT_POSITIONS_FOUND")
                return False
            print(f"TEXT_POSITION_SAMPLE={row[0]}")
            return True
        except Exception as e:
            print(f"TEXT_POSITIONS_ERROR={e}")
            return False


async def seed_document_chunks(doc_id: str):
    async with SessionLocal() as session:
        try:
            await session.execute(
                text(
                    """
                    INSERT INTO document_chunks (id, document_id, chunk_index, content, embedding)
                    VALUES (gen_random_uuid(), :doc_id, 0, :content, NULL)
                    """
                ),
                {"doc_id": doc_id, "content": TEST_TEXT}
            )
            await session.commit()
            print("DOCUMENT_CHUNKS_INSERTED")
        except Exception as e:
            await session.rollback()
            print(f"DOCUMENT_CHUNKS_ERROR={e}")


def upload_document(company_id: str) -> str:
    with open(PDF_PATH, "rb") as f:
        files = {"file": (PDF_PATH.name, f, "application/pdf")}
        data = {"company_id": company_id, "document_type": "past_performance"}
        resp = httpx.post(f"{BASE_URL}/api/documents/upload", files=files, data=data, timeout=60)
        try:
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            print(f"UPLOAD_ERROR_STATUS={resp.status_code} BODY={resp.text}")
            raise
        doc = resp.json()
        print(f"UPLOADED_DOCUMENT_ID={doc.get('id')}")
        return doc.get("id")


def stream_roxy_chat(opportunity_id: str) -> dict:
    payload = {
        "opportunity_id": opportunity_id,
        "message": "What certifications are required?",
        "context": {"current_tab": "summary"}
    }
    with httpx.stream("POST", f"{BASE_URL}/api/roxy/chat", json=payload, timeout=60) as r:
        r.raise_for_status()
        citations = []
        done_id = None
        for line in r.iter_lines():
            if not line:
                continue
            if not line.startswith("data: "):
                continue
            data = line.replace("data: ", "", 1)
            try:
                event = json.loads(data)
            except Exception:
                continue
            if event.get("type") == "citation":
                citations.append(event.get("citation"))
            if event.get("type") == "done":
                done_id = event.get("messageId")
                break
        return {"citations": citations, "messageId": done_id}


async def main():
    opp_id, company_id = await get_first_opportunity_and_company()
    if not opp_id:
        return

    print(f"OPPORTUNITY_ID={opp_id} COMPANY_ID={company_id}")
    create_test_pdf(PDF_PATH, TEST_TEXT)
    print(f"PDF_CREATED={PDF_PATH}")

    try:
        doc_id = upload_document(str(company_id))
        if not doc_id:
            print("UPLOAD_FAILED")
            return
    except httpx.HTTPStatusError:
        return

    if not await check_text_positions(doc_id):
        print("TEXT_POSITIONS_MISSING")
        return

    await seed_document_chunks(doc_id)

    result = stream_roxy_chat(str(opp_id))
    print(f"ROXY_MESSAGE_ID={result.get('messageId')}")
    citations = result.get("citations", [])
    if not citations:
        print("NO_CITATIONS_RETURNED")
        return

    bb = citations[0].get("boundingBox")
    print(f"CITATION_BOUNDING_BOX={bb}")
    if bb:
        print("FULL_FLOW_OK")
    else:
        print("BOUNDING_BOX_MISSING")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
