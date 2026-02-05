from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class AnalyzeRequest(BaseModel):
    text: str

@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    words = req.text.split()
    return {
        "summary": "Quick content insight",
        "insights": [
            f"Word count: {len(words)}",
            f"Character count: {len(req.text)}"
        ]
    }
