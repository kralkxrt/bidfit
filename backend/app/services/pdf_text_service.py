from __future__ import annotations

import re
from typing import Any, Iterable, Optional

import fitz  # PyMuPDF
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DocumentTextPosition, OpportunityDocumentTextPosition


class PdfTextService:
    def extract_text_positions(self, file_content: bytes) -> list[dict[str, Any]]:
        doc = fitz.open(stream=file_content, filetype="pdf")
        positions: list[dict[str, Any]] = []

        for page_index, page in enumerate(doc):
            blocks = page.get_text("dict").get("blocks", [])
            for block in blocks:
                if block.get("type") != 0:
                    continue
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        text = (span.get("text") or "").strip()
                        if not text:
                            continue
                        x0, y0, x1, y1 = span.get("bbox", [0, 0, 0, 0])
                        positions.append({
                            "page_number": page_index + 1,
                            "text_content": text,
                            "bounding_box": {
                                "x": x0,
                                "y": y0,
                                "width": x1 - x0,
                                "height": y1 - y0,
                            },
                        })

        return positions

    async def store_text_positions(
        self,
        db: AsyncSession,
        document_id: str,
        positions: Iterable[dict[str, Any]],
    ) -> None:
        records = [
            DocumentTextPosition(
                document_id=document_id,
                page_number=pos["page_number"],
                text_content=pos["text_content"],
                bounding_box=pos["bounding_box"],
            )
            for pos in positions
        ]
        if not records:
            return
        db.add_all(records)
        await db.commit()

    async def store_opportunity_text_positions(
        self,
        db: AsyncSession,
        opportunity_document_id: str,
        positions: Iterable[dict[str, Any]],
    ) -> None:
        records = [
            OpportunityDocumentTextPosition(
                opportunity_document_id=opportunity_document_id,
                page_number=pos["page_number"],
                text_content=pos["text_content"],
                bounding_box=pos["bounding_box"],
            )
            for pos in positions
        ]
        if not records:
            return
        db.add_all(records)
        await db.commit()

    async def find_best_match(
        self,
        db: AsyncSession,
        document_id: str,
        text_snippet: str,
        page_number: Optional[int] = None,
    ) -> Optional[DocumentTextPosition]:
        normalized = self._normalize_snippet(text_snippet)
        if not normalized:
            return None

        record = await self._find_match_in_table(
            db=db,
            model=DocumentTextPosition,
            id_field="document_id",
            doc_id=document_id,
            normalized=normalized,
            page_number=page_number,
        )
        if record:
            return record

        # Try opportunity document positions if not found in company docs
        opp_record = await self._find_match_in_table(
            db=db,
            model=OpportunityDocumentTextPosition,
            id_field="opportunity_document_id",
            doc_id=document_id,
            normalized=normalized,
            page_number=page_number,
        )
        return opp_record

    async def _find_match_in_table(
        self,
        db: AsyncSession,
        model: Any,
        id_field: str,
        doc_id: str,
        normalized: str,
        page_number: Optional[int],
    ) -> Optional[Any]:
        query = select(model).where(getattr(model, id_field) == doc_id)
        if page_number:
            query = query.where(model.page_number == page_number)

        full_match = await db.execute(
            query.where(model.text_content.ilike(f"%{normalized}%"))
        )
        record = full_match.scalars().first()
        if record:
            return record

        tokens = list(self._tokenize(normalized))
        if not tokens:
            return None
        short = " ".join(tokens[:6])
        fallback = await db.execute(
            query.where(model.text_content.ilike(f"%{short}%"))
        )
        return fallback.scalars().first()

    def _normalize_snippet(self, text: str) -> str:
        if not text:
            return ""
        cleaned = re.sub(r"\s+", " ", text)
        return cleaned.strip()

    def _tokenize(self, text: str) -> Iterable[str]:
        for token in re.split(r"\s+", text):
            if token:
                yield token
