import hmac
import logging
import threading
import time
from typing import Any

import anthropic
import httpx
from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel

from .analyzer import AnalysisError, analyze
from .config import load_settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("contract-service")

settings = load_settings()
claude = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from the environment
job_slots = threading.BoundedSemaphore(settings.max_concurrent_jobs)

app = FastAPI(title="Furniche Contract Service")


def require_token(x_service_token: str = Header(default="")) -> None:
    if not hmac.compare_digest(x_service_token, settings.service_token):
        raise HTTPException(status_code=401, detail="Unauthorized")


class AnalyzeRequest(BaseModel):
    analysis_id: str
    file_url: str
    file_name: str


def send_callback(payload: dict[str, Any]) -> None:
    """Deliver the result to the Next.js app, retrying transient failures."""
    for attempt in range(4):
        try:
            res = httpx.post(
                settings.callback_url,
                json=payload,
                headers={"X-Service-Token": settings.service_token},
                timeout=30.0,
            )
            if res.status_code < 500:
                if res.status_code >= 400:
                    log.error("Callback rejected (%s): %s", res.status_code, res.text[:300])
                return
            log.warning("Callback failed with %s, retrying", res.status_code)
        except httpx.HTTPError as e:
            log.warning("Callback error: %s, retrying", e)
        time.sleep(2 ** attempt * 2)
    log.error("Giving up on callback for analysis %s", payload.get("analysisId"))


def run_job(req: AnalyzeRequest) -> None:
    with job_slots:
        started = time.monotonic()
        send_callback({"analysisId": req.analysis_id, "status": "PROCESSING"})
        try:
            outcome = analyze(claude, req.file_url, req.file_name, settings)
            log.info(
                "Analysis %s done in %.1fs (%s in / %s out tokens)",
                req.analysis_id, time.monotonic() - started, outcome.input_tokens, outcome.output_tokens,
            )
            send_callback({
                "analysisId": req.analysis_id,
                "status": "COMPLETED",
                "result": outcome.result,
                "model": outcome.model,
            })
        except AnalysisError as e:
            log.warning("Analysis %s failed: %s", req.analysis_id, e)
            send_callback({"analysisId": req.analysis_id, "status": "FAILED", "error": str(e)})
        except Exception:
            log.exception("Analysis %s crashed", req.analysis_id)
            send_callback({
                "analysisId": req.analysis_id,
                "status": "FAILED",
                "error": "Unexpected error while analyzing the contract",
            })


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": settings.model}


@app.post("/analyze", status_code=202, dependencies=[Depends(require_token)])
def start_analysis(req: AnalyzeRequest, background: BackgroundTasks) -> dict[str, str]:
    background.add_task(run_job, req)
    return {"analysisId": req.analysis_id, "status": "PENDING"}
