from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, cast, Float
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_org_id
from app.models import Analysis, Opportunity, User

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary")
async def get_dashboard_summary(
    org_id: UUID = Depends(require_org_id),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    active_res = await db.execute(
        select(func.count())
        .select_from(Opportunity)
        .where(Opportunity.company_id == org_id)
        .where(Opportunity.is_hidden == False)
    )
    active_opportunities = int(active_res.scalar() or 0)

    analyzed_res = await db.execute(
        select(func.count())
        .select_from(Analysis)
        .where(Analysis.company_id == org_id)
        .where(Analysis.created_at >= start_of_month)
    )
    analyzed_this_month = int(analyzed_res.scalar() or 0)

    numeric_score = Analysis.overall_relevance_score.op("~")("^[0-9]+(\\.[0-9]+)?$")
    avg_res = await db.execute(
        select(func.avg(cast(Analysis.overall_relevance_score, Float)))
        .where(Analysis.company_id == org_id)
        .where(numeric_score)
    )
    avg_gap_score = avg_res.scalar()

    go_res = await db.execute(
        select(func.count())
        .select_from(Analysis)
        .where(Analysis.company_id == org_id)
        .where(Analysis.go_no_go_recommendation == "GO")
    )
    no_go_res = await db.execute(
        select(func.count())
        .select_from(Analysis)
        .where(Analysis.company_id == org_id)
        .where(Analysis.go_no_go_recommendation == "NO-GO")
    )
    conditional_res = await db.execute(
        select(func.count())
        .select_from(Analysis)
        .where(Analysis.company_id == org_id)
        .where(Analysis.go_no_go_recommendation == "CONDITIONAL")
    )

    recent_res = await db.execute(
        select(
            Opportunity.id,
            Opportunity.title,
            Opportunity.agency,
            Opportunity.solicitation_number,
            Opportunity.updated_at,
        )
        .where(Opportunity.company_id == org_id)
        .where(Opportunity.deleted_at == None)
        .order_by(Opportunity.updated_at.desc())
        .limit(5)
    )

    recent_opportunities = [
        {
            "id": str(row.id),
            "title": row.title,
            "agency": row.agency,
            "solicitation_number": row.solicitation_number,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        }
        for row in recent_res.all()
    ]

    return {
        "activeOpportunities": active_opportunities,
        "analyzedThisMonth": analyzed_this_month,
        "avgGapScore": float(avg_gap_score) if avg_gap_score is not None else None,
        "goCount": int(go_res.scalar() or 0),
        "noGoCount": int(no_go_res.scalar() or 0),
        "conditionalCount": int(conditional_res.scalar() or 0),
        "recentOpportunities": recent_opportunities,
    }
