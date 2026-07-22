from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from markers.models import Marker, ReviewerIdentity
from typing import List, Optional

class MarkerRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_marker(self, marker: Marker) -> Marker:
        from sqlalchemy import func
        result = await self.db.execute(
            select(func.coalesce(func.max(Marker.marker_number), 0))
            .where(Marker.session_id == marker.session_id)
        )
        max_num = result.scalar() or 0
        marker.marker_number = max_num + 1

        self.db.add(marker)
        await self.db.flush()
        return marker

    async def get_marker_by_id(self, marker_id: str) -> Optional[Marker]:
        result = await self.db.execute(select(Marker).where(Marker.id == marker_id))
        return result.scalar_one_or_none()

    async def list_markers_by_session(
        self, 
        session_id: str, 
        include_deleted: bool = False,
        page_url: Optional[str] = None,
        creator_role: Optional[str] = None,
        creator_id: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Marker]:
        query = select(Marker).where(Marker.session_id == session_id)
        if not include_deleted:
            query = query.where(Marker.is_deleted == False)
        if page_url is not None:
            query = query.where(Marker.page_url == page_url)
        if creator_role is not None:
            query = query.where(Marker.creator_role == creator_role)
        if creator_id is not None:
            query = query.where(Marker.creator_id == creator_id)
        if status is not None:
            query = query.where(Marker.status == status)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def soft_delete_marker(self, marker: Marker) -> Marker:
        marker.is_deleted = True
        marker.deleted_at = datetime.utcnow()
        await self.db.flush()
        return marker

    async def hard_delete_marker(self, marker: Marker) -> None:
        await self.db.delete(marker)
        await self.db.flush()

    async def create_reviewer_identity(self, reviewer: ReviewerIdentity) -> ReviewerIdentity:
        self.db.add(reviewer)
        await self.db.flush()
        return reviewer

    async def get_reviewer_identity(self, reviewer_id: str) -> Optional[ReviewerIdentity]:
        result = await self.db.execute(select(ReviewerIdentity).where(ReviewerIdentity.id == reviewer_id))
        return result.scalar_one_or_none()
