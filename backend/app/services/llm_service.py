from dataclasses import dataclass

import anthropic
import openai

from app.config import get_settings

ANTHROPIC_MODELS = {
    "claude-haiku-4-5-20251001",
    "claude-sonnet-4-5-20250929",
    "claude-opus-4-20250514",
}

OPENAI_MODELS = {
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4.1-nano",
}

ALL_MODELS = sorted(ANTHROPIC_MODELS | OPENAI_MODELS)


@dataclass
class LLMResponse:
    text: str
    input_tokens: int
    output_tokens: int
    model: str
    provider: str


def get_provider(model: str) -> str:
    if model in ANTHROPIC_MODELS:
        return "anthropic"
    if model in OPENAI_MODELS:
        return "openai"
    raise ValueError(f"Unknown model: {model}")


def chat(
    messages: list[dict],
    model: str,
    system: str | None = None,
    temperature: float = 1.0,
    max_tokens: int = 1000,
    stop_sequences: list[str] | None = None,
) -> LLMResponse:
    """Unified LLM call interface. Routes to Anthropic or OpenAI based on model ID."""
    provider = get_provider(model)

    if provider == "anthropic":
        return _call_anthropic(messages, model, system, temperature, max_tokens, stop_sequences)
    else:
        return _call_openai(messages, model, system, temperature, max_tokens, stop_sequences)


def _call_anthropic(
    messages: list[dict],
    model: str,
    system: str | None,
    temperature: float,
    max_tokens: int,
    stop_sequences: list[str] | None,
) -> LLMResponse:
    settings = get_settings()
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    params: dict = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": messages,
        "temperature": temperature,
    }
    if system:
        params["system"] = system
    if stop_sequences:
        params["stop_sequences"] = stop_sequences

    response = client.messages.create(**params)

    return LLMResponse(
        text=response.content[0].text,
        input_tokens=response.usage.input_tokens,
        output_tokens=response.usage.output_tokens,
        model=model,
        provider="anthropic",
    )


def _call_openai(
    messages: list[dict],
    model: str,
    system: str | None,
    temperature: float,
    max_tokens: int,
    stop_sequences: list[str] | None,
) -> LLMResponse:
    settings = get_settings()
    client = openai.OpenAI(api_key=settings.openai_api_key)

    oai_messages = []
    if system:
        oai_messages.append({"role": "system", "content": system})

    # OpenAI doesn't support Anthropic-style assistant prefill.
    # Drop the trailing assistant message and its paired stop_sequences,
    # since that pattern is designed for Anthropic's continuation API.
    had_prefill = messages and messages[-1]["role"] == "assistant"
    effective_messages = messages[:-1] if had_prefill else messages
    effective_stop = None if had_prefill else stop_sequences

    for msg in effective_messages:
        oai_messages.append({"role": msg["role"], "content": msg["content"]})

    params: dict = {
        "model": model,
        "messages": oai_messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if effective_stop:
        params["stop"] = effective_stop

    response = client.chat.completions.create(**params)

    choice = response.choices[0]
    text = choice.message.content or ""

    # If stop sequence was hit, the text may include the stop sequence for OpenAI — strip it
    if effective_stop:
        for seq in effective_stop:
            if text.endswith(seq):
                text = text[: -len(seq)]

    # Strip markdown code fences that OpenAI models wrap JSON responses in
    stripped = text.strip()
    if stripped.startswith("```"):
        newline = stripped.find("\n")
        if newline != -1:
            stripped = stripped[newline + 1:]
    if stripped.endswith("```"):
        stripped = stripped[:-3]
    text = stripped.strip()

    return LLMResponse(
        text=text,
        input_tokens=response.usage.prompt_tokens if response.usage else 0,
        output_tokens=response.usage.completion_tokens if response.usage else 0,
        model=model,
        provider="openai",
    )
