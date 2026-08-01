from fastapi import FastAPI

from app.api.tts import router as tts_router


def create_app() -> FastAPI:
    app = FastAPI(title="Local Academic TTS", version="0.1.0")
    app.include_router(tts_router)
    return app


app = create_app()
