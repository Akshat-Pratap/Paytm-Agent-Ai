"""In-process pub/sub for SSE + DB persistence hook."""
import asyncio
import json
from collections import defaultdict
from datetime import datetime

_subscribers: dict[str, list[asyncio.Queue]] = defaultdict(list)


def publish(case_id: str, event: dict):
    event = dict(event)
    event.setdefault("timestamp", datetime.utcnow().isoformat())
    event.setdefault("case_id", case_id)
    for q in list(_subscribers.get(case_id, [])):
        try:
            q.put_nowait(event)
        except Exception:
            pass
    for q in list(_subscribers.get("*", [])):
        try:
            q.put_nowait(event)
        except Exception:
            pass


def subscribe(case_id: str) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue()
    _subscribers[case_id].append(q)
    return q


def unsubscribe(case_id: str, q: asyncio.Queue):
    try:
        _subscribers[case_id].remove(q)
    except ValueError:
        pass
