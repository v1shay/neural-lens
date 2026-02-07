from __future__ import annotations

import json
import os
import re
import urllib.request
from collections import Counter

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Allow MV3 extension fetch() to local backend during development.
# (application/json triggers CORS preflight)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "but",
    "by",
    "for",
    "from",
    "has",
    "have",
    "he",
    "her",
    "his",
    "i",
    "if",
    "in",
    "into",
    "is",
    "it",
    "its",
    "me",
    "my",
    "not",
    "of",
    "on",
    "or",
    "our",
    "she",
    "so",
    "that",
    "the",
    "their",
    "them",
    "then",
    "there",
    "these",
    "they",
    "this",
    "to",
    "was",
    "we",
    "were",
    "what",
    "when",
    "where",
    "which",
    "who",
    "will",
    "with",
    "you",
    "your",
}


class AnalyzeRequest(BaseModel):
    text: str


class AnalyzeResponse(BaseModel):
    summary: str
    insights: list[str]


_WORD_RE = re.compile(r"[A-Za-z0-9']+")
_URL_RE = re.compile(r"https?://\S+", re.IGNORECASE)


def _tokenize(text: str) -> list[str]:
    return [t.lower() for t in _WORD_RE.findall(text)]


def _sentences(text: str) -> list[str]:
    # Very lightweight sentence splitting; good enough for heuristics.
    parts = re.split(r"[.!?]+\s+", text.strip())
    return [p for p in (p.strip() for p in parts) if p]


def _ollama_post(path: str, payload: dict, timeout_s: float) -> dict:
    url = f"http://127.0.0.1:11434{path}"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _ollama_get(path: str, timeout_s: float) -> dict:
    url = f"http://127.0.0.1:11434{path}"
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _pick_model(timeout_s: float) -> str | None:
    # Prefer an explicit model; otherwise pick the first installed model tag.
    env_model = (os.getenv("OLLAMA_MODEL") or "").strip()
    if env_model:
        return env_model

    try:
        tags = _ollama_get("/api/tags", timeout_s=timeout_s)
        models = tags.get("models") or []
        if models and isinstance(models, list) and models[0].get("name"):
            return str(models[0]["name"])
    except Exception:
        return None

    return None


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    text = (req.text or "").strip()
    char_count = len(text)

    tokens = _tokenize(text)
    word_count = len(tokens)

    sentences = _sentences(text)
    sentence_count = len(sentences)

    alpha_tokens = [t for t in tokens if re.search(r"[a-z]", t)]
    unique_alpha = set(alpha_tokens)

    avg_word_len = (
        sum(len(t) for t in alpha_tokens) / len(alpha_tokens) if alpha_tokens else 0.0
    )
    lexical_diversity = (
        len(unique_alpha) / len(alpha_tokens) if alpha_tokens else 0.0
    )

    # Keywords: drop stopwords + very short tokens
    keyword_tokens = [
        t
        for t in alpha_tokens
        if t not in _STOPWORDS and len(t) >= 4
    ]
    top_keywords = [w for (w, _) in Counter(keyword_tokens).most_common(5)]

    digit_token_count = sum(1 for t in tokens if any(ch.isdigit() for ch in t))
    question_count = text.count("?")
    url_count = len(_URL_RE.findall(text))

    reading_time_min = word_count / 200 if word_count else 0.0  # ~200 wpm heuristic

    insights: list[str] = [
        f"Word count: {word_count}",
        f"Character count: {char_count}",
    ]

    if sentence_count:
        insights.append(f"Sentence count: {sentence_count}")
        insights.append(f"Avg words/sentence: {word_count / sentence_count:.1f}")

    if alpha_tokens:
        insights.append(f"Avg word length: {avg_word_len:.1f} chars")
        insights.append(f"Lexical diversity: {lexical_diversity:.2f} (unique/total)")

    if top_keywords:
        insights.append(f"Top keywords: {', '.join(top_keywords)}")

    if digit_token_count:
        insights.append(f"Contains {digit_token_count} token(s) with digits (potential data points).")

    if url_count:
        insights.append(f"Contains {url_count} URL(s) (may reference sources).")

    if question_count:
        insights.append(f"Contains {question_count} question(s) — likely seeking an answer or decision.")

    if word_count:
        insights.append(f"Estimated reading time: {reading_time_min:.1f} min (@200 wpm)")

    # Conditional insight (short vs long text) + next-best action
    if word_count <= 8:
        summary = "Too little context for deep analysis"
        insights.append(
            "This is short text; include a full paragraph for stronger, more reliable insights."
        )
    elif word_count <= 60:
        summary = "Quick, data-driven snapshot"
        insights.append(
            "This is moderate-length text; insights focus on keywords, structure, and signals (numbers/questions/links)."
        )
    else:
        summary = "Deeper signals detected"
        insights.append(
            "This is longer text; next step is extracting claims, evidence, and a concise structured summary."
        )

    # Optional: ask Ollama for deeper, model-generated insight.
    # Keep the same response schema; append the model output as additional insights.
    model_timeout_s = float(os.getenv("OLLAMA_TIMEOUT_S") or "60")
    model = _pick_model(timeout_s=min(5.0, model_timeout_s))

    if model and text:
        prompt = (
            "You are an analyst. Given the text, produce:\n"
            "1) One-sentence summary\n"
            "2) 3-5 concise, data-driven insights (mention any numbers, entities, claims)\n"
            "Return STRICT JSON with keys: summary (string), insights (array of strings).\n\n"
            f"TEXT:\n{text}\n"
        )

        try:
            resp = _ollama_post(
                "/api/generate",
                payload={"model": model, "prompt": prompt, "stream": False},
                timeout_s=model_timeout_s,
            )
            llm_text = (resp.get("response") or "").strip()

            # Try to parse the model's JSON. If it fails, fall back to raw.
            def _parse_json_maybe(s: str) -> dict | None:
                try:
                    return json.loads(s)
                except Exception:
                    pass

                # Common failure: model wraps JSON in prose. Extract the first {...} block.
                start = s.find("{")
                end = s.rfind("}")
                if start != -1 and end != -1 and end > start:
                    try:
                        return json.loads(s[start : end + 1])
                    except Exception:
                        return None

                return None

            llm_json = _parse_json_maybe(llm_text)
            if isinstance(llm_json, dict):
                llm_summary = str(llm_json.get("summary") or "").strip()
                llm_insights = llm_json.get("insights")
                if llm_summary:
                    summary = llm_summary
                if isinstance(llm_insights, list):
                    for i in llm_insights:
                        if isinstance(i, str) and i.strip():
                            insights.append(i.strip())
                else:
                    insights.append(f"Ollama ({model}) output: {llm_text[:400]}")
            else:
                insights.append(f"Ollama ({model}) output: {llm_text[:400]}")

        except Exception as e:
            insights.append(f"Ollama call failed: {type(e).__name__}")

    return AnalyzeResponse(summary=summary, insights=insights)
