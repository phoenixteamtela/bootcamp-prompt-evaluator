from fastapi import APIRouter

from app.services.llm_service import ALL_MODELS, ANTHROPIC_MODELS, OPENAI_MODELS

router = APIRouter()


@router.get("/models")
async def list_models():
    return {
        "models": [
            {
                "id": m,
                "provider": "anthropic" if m in ANTHROPIC_MODELS else "openai",
            }
            for m in ALL_MODELS
        ]
    }
