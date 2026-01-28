import json
import re
from typing import Any, Dict, List, Optional, AsyncGenerator
from uuid import UUID, uuid4

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI
from sqlalchemy import select, text, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import (
    Company,
    CompanyProfile,
    Opportunity,
    Document,
    DocumentTextPosition,
    OpportunityDocument,
    Analysis,
    RoxySession,
    RoxyMessage,
    RoxyMemory
)
from app.prompts.roxy import ROXY_PERSONA, ROXY_FORMATTING
from app.services.pdf_text_service import PdfTextService


class RoxyService:
    def __init__(
        self,
        anthropic_api_key: Optional[str] = None,
        openai_api_key: Optional[str] = None,
        model: Optional[str] = None
    ):
        self.anthropic_client = AsyncAnthropic(api_key=anthropic_api_key or settings.ANTHROPIC_API_KEY)
        self.openai_client = AsyncOpenAI(api_key=openai_api_key or settings.OPENAI_API_KEY)
        self.model = model or settings.CLAUDE_MODEL
        self.embedding_model = settings.EMBEDDING_MODEL
        self.pdf_text_service = PdfTextService()

    async def get_or_create_session(self, db: AsyncSession, opportunity_id: UUID) -> RoxySession:
        result = await db.execute(
            select(RoxySession).where(RoxySession.opportunity_id == opportunity_id)
        )
        session = result.scalars().first()
        if session:
            return session

        session = RoxySession(opportunity_id=opportunity_id)
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return session

    async def get_history(self, db: AsyncSession, opportunity_id: UUID) -> List[RoxyMessage]:
        result = await db.execute(
            select(RoxySession).where(RoxySession.opportunity_id == opportunity_id)
        )
        session = result.scalars().first()
        if not session:
            return []

        result = await db.execute(
            select(RoxyMessage)
            .where(RoxyMessage.session_id == session.id)
            .order_by(RoxyMessage.created_at.asc())
        )
        return result.scalars().all()

    async def stream_chat(
        self,
        db: AsyncSession,
        session_id: UUID,
        opportunity_id: UUID,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        context = context or {}
        context_data = await self._build_context(db, opportunity_id)
        chunks = await self._retrieve_relevant_chunks(
            db,
            opportunity_id=opportunity_id,
            company_id=context_data.get("company_id"),
            query=message
        )
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(message, context, context_data, chunks)

        full_text = ""
        async with self.anthropic_client.messages.stream(
            model=self.model,
            max_tokens=1200,
            temperature=0.2,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        ) as stream:
            async for event in stream:
                if event.type == "content_block_delta":
                    delta = event.delta.text or ""
                    if delta:
                        full_text += delta
                        yield {"type": "text", "content": delta}

        if not full_text:
            try:
                final_msg = await stream.get_final_message()
                if final_msg and final_msg.content:
                    full_text = final_msg.content[0].text
            except Exception:
                pass

        citations = await self._build_citations_from_chunks(db, chunks)

        # Save assistant message
        assistant_msg = RoxyMessage(
            session_id=session_id,
            role="assistant",
            content=full_text or "",
            citations=citations,
            tool_used=None
        )
        db.add(assistant_msg)
        await db.commit()
        await db.refresh(assistant_msg)

        # Emit citations as separate events so UI can render inline
        for citation in citations:
            yield {"type": "citation", "citation": citation}

        yield {"type": "done", "messageId": str(assistant_msg.id)}

    async def auto_analyze(self, db: AsyncSession, opportunity_id: UUID) -> Dict[str, Any]:
        context_data = await self._build_context(db, opportunity_id)
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_auto_analysis_prompt(context_data)

        response = await self.anthropic_client.messages.create(
            model=self.model,
            max_tokens=1000,
            temperature=0.2,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )
        text_response = response.content[0].text if response.content else ""
        parsed = self._parse_json_safe(text_response)

        if not parsed:
            parsed = {
                "summary": text_response.strip()[:1200],
                "fit_assessment": "UNKNOWN",
                "bid_recommendation": "CONDITIONAL"
            }

        return parsed

    async def summarize_attachment(self, db: AsyncSession, document_id: UUID) -> Dict[str, Any]:
        doc_res = await db.execute(select(Document).where(Document.id == document_id))
        document = doc_res.scalars().first()
        if not document:
            raise ValueError("Document not found")

        page_res = await db.execute(
            select(func.max(DocumentTextPosition.page_number))
            .where(DocumentTextPosition.document_id == document_id)
        )
        page_count = page_res.scalar() or 0

        text_input = document.raw_text or ""
        if not text_input:
            text_input = document.parsed_content.get("summary", "") if document.parsed_content else ""
        text_input = text_input.strip()

        system_prompt = self._build_system_prompt()
        if text_input:
            truncated = text_input[:12000]
            user_prompt = (
                "Summarize the document content below. Return JSON with fields "
                '"summary" (string) and "key_points" (array of strings).\n\n'
                f"Document filename: {document.filename}\n"
                f"Content:\n{truncated}"
            )
        else:
            user_prompt = (
                "Summarize the document based on filename and metadata only. "
                'Return JSON with fields "summary" (string) and "key_points" (array of strings).\n\n'
                f"Document filename: {document.filename}\n"
                f"Document type: {document.document_type}"
            )

        response = await self.anthropic_client.messages.create(
            model=self.model,
            max_tokens=700,
            temperature=0.2,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )
        text_response = response.content[0].text if response.content else ""
        parsed = self._parse_json_safe(text_response) or {}

        summary = parsed.get("summary") or text_response.strip()[:1200]
        key_points = parsed.get("key_points")
        if not isinstance(key_points, list):
            key_points = []

        return {
            "summary": summary,
            "key_points": key_points,
            "page_count": int(page_count)
        }

    async def bid_decision(self, db: AsyncSession, opportunity_id: UUID) -> Dict[str, Any]:
        """
        Return a GO/NO-GO/CONDITIONAL recommendation based on company profile,
        opportunity requirements, and latest gap analysis (if any).
        """
        opp_res = await db.execute(select(Opportunity).where(Opportunity.id == opportunity_id))
        opportunity = opp_res.scalars().first()
        if not opportunity:
            raise ValueError("Opportunity not found")

        comp_res = await db.execute(select(Company).where(Company.id == opportunity.company_id))
        company = comp_res.scalars().first()

        analysis_res = await db.execute(
            select(Analysis)
            .where(Analysis.opportunity_id == opportunity_id)
            .order_by(Analysis.created_at.desc())
        )
        analysis = analysis_res.scalars().first()

        go_factors: List[str] = []
        risk_factors: List[str] = []
        reasoning_parts: List[str] = []

        # Evaluate set-aside fit
        if opportunity.set_aside_type:
            certs = [c.lower() for c in (company.certifications or [])] if company else []
            set_aside = opportunity.set_aside_type.lower()
            if certs and any(set_aside in c for c in certs):
                go_factors.append(f"Company certifications align with set-aside: {opportunity.set_aside_type}")
            else:
                risk_factors.append(f"Set-aside requirement may not be met: {opportunity.set_aside_type}")

        # Use analysis signals if present
        if analysis:
            if analysis.overall_relevance_label:
                go_factors.append(f"Gap analysis relevance: {analysis.overall_relevance_label}")

            company_compliance = analysis.company_compliance or {}
            disqualifiers = company_compliance.get("disqualifiers") or []
            if disqualifiers:
                for item in disqualifiers:
                    risk_factors.append(f"Disqualifier: {item}")

            compliance_flags = company_compliance.get("compliance_flags") or []
            for flag in compliance_flags:
                status = (flag.get("status") or "").upper()
                if status in ("GAP", "WEAKNESS"):
                    risk_factors.append(
                        f"{flag.get('field')}: {flag.get('note') or flag.get('requirement')}"
                    )

            red_flags = analysis.red_flags or []
            for flag in red_flags:
                warning = flag.get("warning") if isinstance(flag, dict) else str(flag)
                risk_factors.append(f"Red flag: {warning}")

            # Pull specific RFP requirements if available
            doc_analysis = analysis.document_analysis or {}
            pp_reqs = doc_analysis.get("pp_requirements") or {}
            if pp_reqs.get("mandatory_requirements"):
                reasoning_parts.append(
                    f"Section L mandatory requirements: {', '.join(pp_reqs.get('mandatory_requirements'))}"
                )

        # Recommendation logic
        recommendation = "CONDITIONAL"
        if any(r.startswith("Disqualifier:") for r in risk_factors):
            recommendation = "NO-GO"
        elif risk_factors and not go_factors:
            recommendation = "NO-GO"
        elif risk_factors and go_factors:
            recommendation = "CONDITIONAL"
        else:
            recommendation = "GO"

        # Confidence estimate
        confidence = 0.3
        if analysis:
            confidence += 0.3
            if analysis.company_compliance:
                confidence += 0.2
            if analysis.document_analysis:
                confidence += 0.1
        confidence = min(confidence, 0.95)

        reasoning = " ".join(reasoning_parts) if reasoning_parts else "Decision based on available profile and gap analysis signals."

        return {
            "recommendation": recommendation,
            "confidence": round(confidence, 2),
            "go_factors": go_factors,
            "risk_factors": risk_factors,
            "reasoning": reasoning
        }

    async def explain(self, db: AsyncSession, opportunity_id: UUID, topic: str) -> str:
        context_data = await self._build_context(db, opportunity_id)
        system_prompt = self._build_system_prompt()

        allowed_topics = {"gap_score", "recommendation", "requirement"}
        if topic not in allowed_topics:
            raise ValueError("Invalid topic")

        user_prompt = f"""
Explain the topic "{topic}" with evidence from the context below.
- Be direct, specific, and cite sources.
- If evidence is missing, say "No cited excerpts available for this question."

Context:
{self._build_user_prompt("Explain topic", {"current_tab": "summary"}, context_data, [])}
"""

        response = await self.anthropic_client.messages.create(
            model=self.model,
            max_tokens=700,
            temperature=0.2,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )
        return response.content[0].text if response.content else ""

    async def compliance_check(self, db: AsyncSession, opportunity_id: UUID) -> Dict[str, Any]:
        opp_res = await db.execute(select(Opportunity).where(Opportunity.id == opportunity_id))
        opportunity = opp_res.scalars().first()
        if not opportunity:
            raise ValueError("Opportunity not found")

        company_res = await db.execute(select(Company).where(Company.id == opportunity.company_id))
        company = company_res.scalars().first()

        profile_res = await db.execute(select(CompanyProfile).where(CompanyProfile.id == opportunity.company_id))
        company_profile = profile_res.scalars().first()

        analysis_res = await db.execute(
            select(Analysis)
            .where(Analysis.opportunity_id == opportunity_id)
            .order_by(Analysis.created_at.desc())
            .limit(1)
        )
        analysis = analysis_res.scalars().first()
        pp_requirements = {}
        if analysis and analysis.document_analysis:
            pp_requirements = analysis.document_analysis.get("pp_requirements") or {}

        docs_res = await db.execute(
            select(Document)
            .where(Document.company_id == opportunity.company_id)
            .where(Document.deleted_at.is_(None))
        )
        documents = docs_res.scalars().all()

        contract_docs = []
        for doc in documents:
            doc_type = (doc.document_type or "").lower()
            parsed = doc.parsed_content or {}
            actual_type = (parsed.get("actual_document_type") or "").upper()
            if actual_type == "CONTRACT_CPARS" or doc_type in {"past_performance", "contract", "cpars", "contract_cpars"}:
                contract_docs.append(doc)

        company_certs = []
        if company_profile and company_profile.certifications:
            company_certs = [c.lower() for c in company_profile.certifications]
        elif company and company.certifications:
            company_certs = [c.lower() for c in (company.certifications or [])]

        facility_clearance = ""
        if company_profile and company_profile.clearances:
            facility_clearance = " ".join(company_profile.clearances).lower()
        elif company and company.facility_clearance:
            facility_clearance = (company.facility_clearance or "").lower()

        company_naics = []
        if company_profile and company_profile.naics_codes:
            company_naics = company_profile.naics_codes
        elif company and company.primary_naics:
            company_naics = company.primary_naics
        if company and company.primary_naic_code:
            company_naics = list(set(company_naics + [company.primary_naic_code]))

        geo_coverage = []
        if company_profile and company_profile.set_asides:
            pass
        if company and company.geographic_coverage:
            geo_coverage = company.geographic_coverage or []

        requirements: List[Dict[str, Any]] = []

        def add_requirement(
            category: str,
            requirement_text: str,
            source: str,
            status: str,
            details: str,
            evidence: Optional[List[str]] = None,
            recommendation: Optional[str] = None
        ):
            requirements.append({
                "id": str(uuid4()),
                "category": category,
                "requirement": requirement_text,
                "source": source,
                "met": status == "pass",
                "status": status,
                "details": details,
                "evidence": evidence or [],
                **({"recommendation": recommendation} if recommendation else {})
            })

        references_required = (pp_requirements.get("references_required") or {})
        min_refs = references_required.get("min")
        recency_years = pp_requirements.get("recency_years")
        value_min = (pp_requirements.get("contract_value") or {}).get("min")

        def doc_within_recency(doc: Document) -> bool:
            if not recency_years:
                return True
            end_date = doc.period_of_performance_end or doc.period_of_performance_start
            if not end_date:
                return False
            delta_years = (datetime.utcnow().date() - end_date).days / 365
            return delta_years <= recency_years

        qualifying_refs = []
        for doc in contract_docs:
            if doc_within_recency(doc):
                qualifying_refs.append(doc)

        if min_refs:
            status = "pass" if len(qualifying_refs) >= min_refs else "fail"
            add_requirement(
                category="past_performance",
                requirement_text=f"Minimum {min_refs} references within {recency_years or 'required'} years",
                source="Section L/M",
                status=status,
                details=f"You have {len(qualifying_refs)} qualifying references",
                evidence=[doc.contract_title or doc.filename for doc in qualifying_refs],
                recommendation=None if status == "pass" else "Add qualifying past performance or team"
            )

        if value_min:
            meets_value = []
            misses_value = []
            for doc in contract_docs:
                if doc.contract_value and float(doc.contract_value) >= float(value_min):
                    meets_value.append(doc)
                else:
                    misses_value.append(doc)
            status = "pass" if meets_value and not misses_value else "partial" if meets_value else "fail"
            evidence = [
                f"{doc.contract_title or doc.filename}: ${doc.contract_value or 'N/A'}"
                for doc in (meets_value + misses_value)
            ]
            add_requirement(
                category="past_performance",
                requirement_text=f"Minimum contract value ${value_min}",
                source="Section L/M",
                status=status,
                details=f"{len(meets_value)} of {len(contract_docs)} contracts meet threshold",
                evidence=evidence,
                recommendation=None if status == "pass" else "Add higher-value contracts or partner"
            )

        mandatory_requirements = pp_requirements.get("mandatory_requirements") or []
        cert_keywords = ["iso", "cmmi", "fedramp", "soc 2", "soc2", "cmmc"]
        for req in mandatory_requirements:
            req_lower = req.lower()
            matched_cert = next((k for k in cert_keywords if k in req_lower), None)
            if matched_cert:
                cert_name = req
                has_cert = any(matched_cert in c for c in company_certs)
                add_requirement(
                    category="certification",
                    requirement_text=cert_name,
                    source="Section L/M",
                    status="pass" if has_cert else "fail",
                    details="Found in company profile" if has_cert else "Not found in company profile",
                    recommendation=None if has_cert else "Obtain certification or find teaming partner"
                )

            if "clearance" in req_lower or "secret" in req_lower or "ts/sci" in req_lower:
                required = req
                has_clearance = bool(facility_clearance and req_lower.split()[0] in facility_clearance)
                add_requirement(
                    category="eligibility",
                    requirement_text=required,
                    source="Section L/M",
                    status="pass" if has_clearance else "fail",
                    details="Clearance matches" if has_clearance else "Clearance not found",
                    recommendation=None if has_clearance else "Obtain clearance or team"
                )

        if opportunity.set_aside_type:
            set_aside = opportunity.set_aside_type.lower()
            has_set_aside = any(set_aside in c for c in company_certs)
            add_requirement(
                category="eligibility",
                requirement_text=f"{opportunity.set_aside_type} set-aside eligibility",
                source="Header",
                status="pass" if has_set_aside else "fail",
                details="Company certification matches" if has_set_aside else "Company not certified for set-aside",
                recommendation=None if has_set_aside else "Verify eligibility or team"
            )

        if opportunity.naics_code:
            matches_naics = opportunity.naics_code in company_naics if company_naics else False
            add_requirement(
                category="eligibility",
                requirement_text=f"NAICS code match ({opportunity.naics_code})",
                source="Header",
                status="pass" if matches_naics else "partial" if company_naics else "unknown",
                details="Company NAICS includes requirement" if matches_naics else "Company NAICS not listed",
                recommendation=None if matches_naics else "Update company NAICS or verify applicability"
            )

        geo_pref = pp_requirements.get("geographic_preference")
        if geo_pref:
            has_geo = any(geo_pref.lower() in str(g).lower() for g in geo_coverage)
            add_requirement(
                category="other",
                requirement_text=f"Geographic preference: {geo_pref}",
                source="Section L/M",
                status="pass" if has_geo else "partial" if geo_coverage else "unknown",
                details="Geographic coverage matches" if has_geo else "No matching geographic coverage listed",
                recommendation=None if has_geo else "Confirm coverage or plan teaming"
            )

        met_count = len([r for r in requirements if r["status"] == "pass"])
        total_count = len(requirements)
        any_fail = any(r["status"] == "fail" for r in requirements)
        any_unknown = any(r["status"] == "unknown" for r in requirements)

        if total_count == 0:
            overall_status = "partial"
        elif any_fail and met_count == 0:
            overall_status = "fail"
        elif any_fail or any_unknown:
            overall_status = "partial"
        else:
            overall_status = "pass"

        return {
            "overall_status": overall_status,
            "met_count": met_count,
            "total_count": total_count,
            "requirements": requirements
        }

    async def _build_context(self, db: AsyncSession, opportunity_id: UUID) -> Dict[str, Any]:
        # Opportunity
        opp_res = await db.execute(select(Opportunity).where(Opportunity.id == opportunity_id))
        opportunity_obj = opp_res.scalars().first()
        if not opportunity_obj:
            raise ValueError("Opportunity not found")

        # Company
        company_res = await db.execute(select(Company).where(Company.id == opportunity_obj.company_id))
        company_obj = company_res.scalars().first()

        # Documents
        docs_res = await db.execute(
            select(Document).where(Document.company_id == opportunity_obj.company_id)
        )
        documents = [
            {"id": d.id, "filename": d.filename, "document_type": d.document_type}
            for d in docs_res.scalars().all()
        ]

        # Opportunity documents
        opp_docs_res = await db.execute(
            select(OpportunityDocument).where(OpportunityDocument.opportunity_id == opportunity_id)
        )
        opp_docs = [
            {"id": d.id, "filename": d.filename, "document_type": d.document_type}
            for d in opp_docs_res.scalars().all()
        ]

        # Latest analysis
        analysis_res = await db.execute(
            select(Analysis)
            .where(Analysis.opportunity_id == opportunity_id)
            .order_by(Analysis.created_at.desc())
        )
        latest_analysis = analysis_res.scalars().first()
        analysis_summary = None
        if latest_analysis:
            analysis_summary = {
                "overall_relevance_label": latest_analysis.overall_relevance_label,
                "red_flags": latest_analysis.red_flags
            }

        opportunity = {
            "id": opportunity_obj.id,
            "title": opportunity_obj.title,
            "solicitation_number": opportunity_obj.solicitation_number,
            "agency": opportunity_obj.agency,
            "set_aside_type": opportunity_obj.set_aside_type,
            "response_due_date": opportunity_obj.response_due_date,
            "company_id": opportunity_obj.company_id
        }

        company = None
        if company_obj:
            company = {
                "id": company_obj.id,
                "name": company_obj.name,
                "business_size": company_obj.business_size,
                "certifications": company_obj.certifications or [],
                "facility_clearance": company_obj.facility_clearance,
                "primary_naics": company_obj.primary_naics or []
            }

        memories = await self._get_memories(db, opportunity_obj.company_id)

        return {
            "opportunity": opportunity,
            "company": company,
            "documents": documents,
            "opportunity_documents": opp_docs,
            "latest_analysis": analysis_summary,
            "company_id": opportunity_obj.company_id,
            "memories": memories
        }

    def _build_system_prompt(self) -> str:
        # Ensure formatting rules are actually enforced by the model.
        return f"{ROXY_PERSONA}\n\n{ROXY_FORMATTING}".strip()

    def _build_user_prompt(
        self,
        message: str,
        ui_context: Dict[str, Any],
        context_data: Dict[str, Any],
        chunks: List[Dict[str, Any]]
    ) -> str:
        opportunity = context_data.get("opportunity") or {}
        company = context_data.get("company") or {}
        documents = context_data.get("documents", [])
        opp_docs = context_data.get("opportunity_documents", [])
        analysis = context_data.get("latest_analysis")
        memories = context_data.get("memories", [])

        doc_list = "\n".join([f"- {d['filename']} ({d['document_type']})" for d in documents]) or "None"
        opp_doc_list = "\n".join([f"- {d['filename']} ({d['document_type']})" for d in opp_docs]) or "None"

        chunk_block = "\n".join(
            [f"[{c.get('document_name', 'Unknown')}] {c.get('content', '')}" for c in chunks]
        ) or "No relevant excerpts found."

        memories_block = "\n".join(
            [f"- [{m.get('memory_type')}] {m.get('content')}" for m in memories]
        ) or "None"

        return f"""
Response rules:
- Be direct and specific. No filler.
- Cite sources for any requirement using the excerpts below.
- Use this exact citation format:
  - Source: <Document>, Section L.5.2, Page 12
  - Source: <Document>, Page 12
  - Source: <Document>
- If excerpts are missing, say "No cited excerpts available for this question."
- Do not ask to confirm or say "let me check" before answering.
- Do not say you need to review or analyze documents beyond the excerpts.

User Question: {message}
Current Tab: {ui_context.get('current_tab', 'unknown')}

### Company Profile
Name: {company.get('name', 'Unknown')}
Business Size: {company.get('business_size') or 'N/A'}
Certifications: {', '.join(company.get('certifications') or []) or 'None'}
Facility Clearance: {company.get('facility_clearance') or 'None'}
NAICS: {', '.join(company.get('primary_naics') or []) or 'None'}

### Opportunity
Title: {opportunity.get('title', 'Unknown')}
Solicitation: {opportunity.get('solicitation_number') or 'N/A'}
Agency: {opportunity.get('agency') or 'N/A'}
Set-Aside: {opportunity.get('set_aside_type') or 'N/A'}
Due Date: {opportunity.get('response_due_date') or 'N/A'}

### Uploaded Documents (Company)
{doc_list}

### Uploaded Documents (Opportunity)
{opp_doc_list}

### Roxy Memory (Company Insights)
{memories_block}

### Latest Gap Analysis (if any)
{analysis.get('overall_relevance_label') if analysis else 'No analysis available'}

### Relevant Excerpts
{chunk_block}

Answer with evidence-based guidance and explicit citations (document name + section/page if available).
"""

    def _build_auto_analysis_prompt(self, context_data: Dict[str, Any]) -> str:
        opportunity = context_data.get("opportunity") or {}
        company = context_data.get("company") or {}
        analysis = context_data.get("latest_analysis")

        return f"""
Provide a concise auto-analysis for the opportunity below.
Return JSON with keys: summary, fit_assessment, bid_recommendation.

Company: {company.get('name', 'Unknown')}
Opportunity: {opportunity.get('title', 'Unknown')}
Solicitation: {opportunity.get('solicitation_number') or 'N/A'}
Agency: {opportunity.get('agency') or 'N/A'}
Set-Aside: {opportunity.get('set_aside_type') or 'N/A'}

Latest Gap Analysis Label: {analysis.get('overall_relevance_label') if analysis else 'None'}
Key Red Flags: {analysis.get('red_flags') if analysis else 'None'}

Return JSON only.
"""

    async def _retrieve_relevant_chunks(
        self,
        db: AsyncSession,
        opportunity_id: UUID,
        company_id: UUID,
        query: str,
        limit: int = 6
    ) -> List[Dict[str, Any]]:
        if not query:
            return []

        embedding = await self._get_query_embedding(query)
        query = query.strip()
        keywords = self._extract_query_keywords(query)

        try:
            if embedding:
                sql = text(
                    """
                    SELECT dc.document_id, dc.content, COALESCE(d.filename, od.filename) AS filename
                    FROM document_chunks dc
                    LEFT JOIN documents d ON d.id = dc.document_id
                    LEFT JOIN opportunity_documents od ON od.id = dc.document_id
                    WHERE (d.company_id = :company_id OR od.opportunity_id = :opportunity_id)
                    ORDER BY dc.embedding <-> :embedding
                    LIMIT :limit
                    """
                )
                result = await db.execute(
                    sql,
                    {
                        "company_id": company_id,
                        "opportunity_id": opportunity_id,
                        "embedding": embedding,
                        "limit": limit
                    }
                )
            else:
                if keywords:
                    sql = text(
                        """
                        SELECT dc.document_id, dc.content, COALESCE(d.filename, od.filename) AS filename
                        FROM document_chunks dc
                        LEFT JOIN documents d ON d.id = dc.document_id
                        LEFT JOIN opportunity_documents od ON od.id = dc.document_id
                        WHERE (d.company_id = :company_id OR od.opportunity_id = :opportunity_id)
                        AND dc.content ILIKE ANY(:patterns)
                        LIMIT :limit
                        """
                    )
                    patterns = [f"%{kw}%" for kw in keywords]
                    result = await db.execute(
                        sql,
                        {
                            "company_id": company_id,
                            "opportunity_id": opportunity_id,
                            "patterns": patterns,
                            "limit": limit
                        }
                    )
                else:
                    sql = text(
                        """
                        SELECT dc.document_id, dc.content, COALESCE(d.filename, od.filename) AS filename
                        FROM document_chunks dc
                        LEFT JOIN documents d ON d.id = dc.document_id
                        LEFT JOIN opportunity_documents od ON od.id = dc.document_id
                        WHERE (d.company_id = :company_id OR od.opportunity_id = :opportunity_id)
                        AND dc.content ILIKE :q
                        LIMIT :limit
                        """
                    )
                    result = await db.execute(
                        sql,
                        {
                            "company_id": company_id,
                            "opportunity_id": opportunity_id,
                            "q": f"%{query}%",
                            "limit": limit
                        }
                    )
        except Exception:
            await db.rollback()
            # If document_chunks table is missing or query fails, return empty results
            return []

        rows = result.fetchall()
        print(f"ROXY RAG: query='{query}' keywords={keywords} chunks={len(rows)}")
        return [
            {
                "document_id": row[0],
                "content": row[1],
                "document_name": row[2]
            }
            for row in rows
        ]

    def _extract_query_keywords(self, query: str) -> List[str]:
        if not query:
            return []
        stopwords = {"the", "and", "are", "for", "with", "that", "this", "what", "which", "your", "from", "must", "have"}
        words = [w.strip(".,!?;:()[]{}\"'").lower() for w in query.split()]
        keywords = [w for w in words if len(w) > 3 and w not in stopwords]
        expanded: List[str] = []
        for kw in keywords:
            expanded.append(kw)
            if kw.endswith("s") and len(kw) > 4:
                expanded.append(kw[:-1])
        return list(dict.fromkeys(expanded))[:8]

    async def _get_query_embedding(self, text_input: str) -> Optional[List[float]]:
        if not text_input:
            return None
        if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "sk-placeholder":
            return None
        try:
            response = await self.openai_client.embeddings.create(
                model=self.embedding_model,
                input=text_input
            )
            return response.data[0].embedding
        except Exception:
            return None

    async def _build_citations_from_chunks(
        self,
        db: AsyncSession,
        chunks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        citations: List[Dict[str, Any]] = []
        for chunk in chunks:
            content = chunk.get("content", "")
            section = self._extract_section(content)
            page = self._extract_page_number(content)
            citation = {
                "id": str(uuid4()),
                "documentId": str(chunk.get("document_id")),
                "documentName": chunk.get("document_name"),
                "pageNumber": page,
                "section": section,
                "textSnippet": content[:240].strip(),
                "boundingBox": None
            }
            try:
                bounding_box = await self.pdf_text_service.find_best_match(
                    db=db,
                    document_id=citation["documentId"],
                    text_snippet=citation["textSnippet"],
                    page_number=citation.get("pageNumber")
                )
                if hasattr(bounding_box, "bounding_box"):
                    citation["boundingBox"] = getattr(bounding_box, "bounding_box")
                else:
                    citation["boundingBox"] = bounding_box
            except Exception:
                await db.rollback()
            citations.append({
                **citation
            })
        return citations

    def _extract_section(self, text_input: str) -> Optional[str]:
        match = re.search(r"(Section\\s+[A-Z]\\.\\d+(?:\\.\\d+)*)", text_input)
        if match:
            return match.group(1)
        return None

    def _extract_page_number(self, text_input: str) -> Optional[int]:
        match = re.search(r"Page\\s+(\\d+)", text_input, re.IGNORECASE)
        if match:
            try:
                return int(match.group(1))
            except ValueError:
                return None
        return None

    def _parse_json_safe(self, text_input: str) -> Optional[Dict[str, Any]]:
        if not text_input:
            return None
        try:
            text_input = text_input.strip()
            if "```json" in text_input:
                json_start = text_input.index("```json") + 7
                json_end = text_input.index("```", json_start)
                json_str = text_input[json_start:json_end].strip()
            elif "{" in text_input:
                json_start = text_input.index("{")
                json_end = text_input.rindex("}") + 1
                json_str = text_input[json_start:json_end]
            else:
                json_str = text_input
            return json.loads(json_str)
        except Exception:
            return None

    def _parse_json_list_safe(self, text_input: str) -> List[Dict[str, Any]]:
        if not text_input:
            return []
        try:
            text_input = text_input.strip()
            if "```json" in text_input:
                json_start = text_input.index("```json") + 7
                json_end = text_input.index("```", json_start)
                json_str = text_input[json_start:json_end].strip()
            elif "[" in text_input:
                json_start = text_input.index("[")
                json_end = text_input.rindex("]") + 1
                json_str = text_input[json_start:json_end]
            else:
                json_str = text_input
            parsed = json.loads(json_str)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            return []
        return []

    async def _get_memories(self, db: AsyncSession, company_id: UUID) -> List[Dict[str, Any]]:
        if not company_id:
            return []
        result = await db.execute(
            select(RoxyMemory)
            .where(RoxyMemory.company_id == company_id)
            .order_by(RoxyMemory.updated_at.desc())
            .limit(20)
        )
        memories = result.scalars().all()
        return [
            {
                "id": str(m.id),
                "memory_type": m.memory_type,
                "content": m.content,
                "source": m.source,
                "confidence": m.confidence
            }
            for m in memories
        ]

    async def extract_memories(
        self,
        db: AsyncSession,
        opportunity_id: UUID,
        session_id: Optional[UUID] = None
    ) -> List[Dict[str, Any]]:
        opp_res = await db.execute(select(Opportunity).where(Opportunity.id == opportunity_id))
        opportunity = opp_res.scalars().first()
        if not opportunity:
            raise ValueError("Opportunity not found")

        if session_id:
            session_res = await db.execute(select(RoxySession).where(RoxySession.id == session_id))
        else:
            session_res = await db.execute(
                select(RoxySession).where(RoxySession.opportunity_id == opportunity_id)
            )
        session = session_res.scalars().first()
        if not session:
            return []

        messages_res = await db.execute(
            select(RoxyMessage)
            .where(RoxyMessage.session_id == session.id)
            .order_by(RoxyMessage.created_at.asc())
        )
        messages = messages_res.scalars().all()
        if not messages:
            return []

        conversation = "\n".join([f"{m.role.upper()}: {m.content}" for m in messages])
        system_prompt = self._build_system_prompt()
        user_prompt = f"""
Review this conversation and extract any HIGH-CONFIDENCE insights about the user's company:
- Business preferences
- Capability strengths
- Known gaps/weaknesses
- Bidding patterns

Return a JSON array of objects:
[
  {{
    "memory_type": "preference" | "strength" | "weakness" | "pattern",
    "content": "short insight",
    "source": "Learned from conversation on YYYY-MM-DD",
    "confidence": 0.0 to 1.0
  }}
]

Only include items you are confident about (>= 0.7). If none, return [].

Conversation:
{conversation[:12000]}
"""

        response = await self.anthropic_client.messages.create(
            model=self.model,
            max_tokens=800,
            temperature=0.1,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )
        text_response = response.content[0].text if response.content else ""
        parsed = self._parse_json_list_safe(text_response)

        filtered = []
        for item in parsed:
            confidence = item.get("confidence")
            if confidence is None or confidence < 0.7:
                continue
            content = (item.get("content") or "").strip()
            memory_type = (item.get("memory_type") or "").strip()
            if not content or not memory_type:
                continue
            filtered.append({
                "memory_type": memory_type,
                "content": content,
                "source": item.get("source"),
                "confidence": float(confidence)
            })

        if not filtered:
            return []

        existing_res = await db.execute(
            select(RoxyMemory.content)
            .where(RoxyMemory.company_id == opportunity.company_id)
        )
        existing_contents = {row[0] for row in existing_res.fetchall()}

        new_records = []
        for item in filtered:
            if item["content"] in existing_contents:
                continue
            new_records.append(
                RoxyMemory(
                    company_id=opportunity.company_id,
                    memory_type=item["memory_type"],
                    content=item["content"],
                    source=item.get("source"),
                    confidence=item.get("confidence")
                )
            )
        if new_records:
            db.add_all(new_records)
            await db.commit()

        return filtered
