from __future__ import annotations

from typing import Any
from datetime import datetime, timedelta
from db.config import now_utc
from models.review import ReviewItemRecord


def rating_to_int(rating: Any) -> int:
    if isinstance(rating, int):
        return max(1, min(4, rating))
    if isinstance(rating, str):
        return {"again": 1, "hard": 2, "good": 3, "easy": 4}.get(rating.lower(), 3)
    try:
        return max(1, min(4, int(rating)))
    except Exception:
        return 3


class SimpleReviewScheduler:
    def schedule_new(self) -> datetime:
        return now_utc()

    def schedule_review(self, item: ReviewItemRecord, rating: int) -> tuple[datetime, int, float]:
        if rating <= 1:
            next_due = now_utc() + timedelta(minutes=10)
            interval_days = 0
        elif rating == 2:
            next_due = now_utc() + timedelta(days=1)
            interval_days = 1
        elif rating == 3:
            interval_days = max(3, item.interval_days + 2)
            next_due = now_utc() + timedelta(days=interval_days)
        else:
            interval_days = max(7, item.interval_days + 5)
            next_due = now_utc() + timedelta(days=interval_days)

        ease = max(1.3, float(item.ease or 2.5) + (rating - 3) * 0.15)
        return next_due, interval_days, ease


review_scheduler = SimpleReviewScheduler()
