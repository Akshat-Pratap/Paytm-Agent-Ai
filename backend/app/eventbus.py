"""In-process pub/sub for SSE + DB persistence hook."""
import asyncio
from collections import defaultdict
from datetime import datetime

_subscribers: dict[str, list[asyncio.Queue]] = defaultdict(list)
_MAX_QUEUE = 200


def publish(case_id: str, event: dict):
    event = dict(event)
    event.setdefault("timestamp", datetime.utcnow().isoformat())
    event.setdefault("case_id", case_id)
    for key in (case_id, "*"):
        for q in list(_subscribers.get(key, [])):
            try:
                if q.qsize() >= _MAX_QUEUE:
                    try:
                        q.get_nowait()
                    except asyncio.QueueEmpty:
                        pass
                q.put_nowait(event)
            except Exception:
                pass


def subscribe(case_id: str, maxsize: int = _MAX_QUEUE) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue(maxsize=maxsize)
    _subscribers[case_id].append(q)
    return q


def unsubscribe(case_id: str, q: asyncio.Queue):
    try:
        _subscribers[case_id].remove(q)
    except ValueError:
        pass
    if not _subscribers.get(case_id):
        _subscribers.pop(case_id, None)
