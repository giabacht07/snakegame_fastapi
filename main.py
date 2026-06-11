"""FastAPI server — serves the Snake Game frontend and leaderboard API."""

import os

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from history import GameHistoryManager

app = FastAPI()
_history = GameHistoryManager()


class ScoreIn(BaseModel):
    name: str
    score: int


@app.get("/api/scores")
def get_scores():
    return _history.load_history()


@app.post("/api/scores")
def post_score(body: ScoreIn):
    name = body.name.strip() or "Anonymous"
    _history.save_record(name, body.score)
    return {"ok": True}


@app.get("/")
def index():
    return FileResponse(os.path.join("static", "index.html"))


app.mount("/static", StaticFiles(directory="static"), name="static")
