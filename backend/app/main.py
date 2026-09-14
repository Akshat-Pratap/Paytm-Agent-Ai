"""FastAPI entrypoint: CORS, DB init+seed, routers."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import Base, engine, SessionLocal
from . import models  # noqa: F401  (register tables)
from .api.routes_cases import router as cases_router
from .api.routes_misc import mock as mock_router, dash as dash_router

Base.metadata.create_all(bind=engine)
from .seed import seed
db = SessionLocal()
try:
    seed(db)
finally:
    db.close()

app = FastAPI(title=settings.APP_NAME, version="1.0.0",
              description="Multi-agent autonomous payment resolution hub (simulated payments, demo-safe).")
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(cases_router, prefix="/api")
app.include_router(mock_router, prefix="/api")
app.include_router(dash_router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "ai_mode": settings.AI_MODE, "provider": settings.LLM_PROVIDER}
