# Snake Game

A browser-based Snake game served by FastAPI. The backend exposes a leaderboard REST API with Swagger UI, while the frontend runs entirely in the browser using HTML5 Canvas.

## Features

- **Browser game** — no installation needed to play, runs in any modern browser
- **FastAPI backend** — leaderboard REST API with auto-generated Swagger UI
- **Persistent leaderboard** — scores saved to `snake_history.json`, sorted by highest score
- **Special food system**:
  - 🍎 Normal Food — +1 segment, +10 pts
  - ⭐ Super Food — +3 segments, +50 pts (timed, blinks before expiring)
  - 💀 Poison Food — shrinks snake by half (timed, blinks before expiring)
- **Speed progression** — game speeds up as your snake grows
- **Pause / resume** with `P`
- **HUD** showing player name, current score, and snake length

---

## Project Structure

```
final/
├── main.py              # FastAPI server — routes + Swagger config
├── history.py           # Leaderboard read/write (snake_history.json)
├── decorators.py        # Logging and pipeline decorators
├── config.py            # Grid/color constants (reference)
├── entities.py          # Original Pygame entity classes (unused by server)
├── ui.py                # Original Pygame UI widgets (unused by server)
├── test_game.py         # Pytest unit tests for Snake logic and history
├── requirements.txt     # Production dependencies
├── Procfile             # Railway/Heroku start command
├── snake_history.json   # Leaderboard data (auto-created on first score)
└── static/              # Browser frontend (served by FastAPI)
    ├── index.html       # Menu, game canvas, leaderboard screens
    ├── game.js          # Game logic + app controller (vanilla JS)
    └── style.css        # Dark theme styling
```

---

## Requirements

- Python 3.8+
- Dependencies listed in `requirements.txt`:

| Package | Purpose |
|---|---|
| `fastapi` | Web framework and OpenAPI/Swagger generation |
| `uvicorn[standard]` | ASGI server to run FastAPI |
| `aiofiles` | Async static file serving |

---

## Installation

```bash
# 1. Clone or download the project
# 2. Install dependencies
pip install -r requirements.txt
```

---

## Running Locally

```bash
uvicorn main:app --reload
```

Then open your browser:

| URL | What you get |
|---|---|
| `http://localhost:8000/` | The game |
| `http://localhost:8000/docs` | Swagger UI (interactive API docs) |
| `http://localhost:8000/redoc` | ReDoc (read-only API docs) |
| `http://localhost:8000/api/scores` | Raw leaderboard JSON |

---

## API Reference

### `GET /api/scores`
Returns all leaderboard records sorted by score descending.

**Response `200 OK`**
```json
[
  { "name": "Player1", "score": 120, "timestamp": "2026-06-12 14:30:00" },
  { "name": "Player2", "score": 60,  "timestamp": "2026-06-12 13:00:00" }
]
```

---

### `POST /api/scores`
Submit a score after a game session.

**Request body**
```json
{ "name": "Player1", "score": 120 }
```

**Response `201 Created`**
```json
{ "ok": true }
```

**Validation rules**
- `name` — 1–14 characters; blank names default to `Anonymous`
- `score` — integer ≥ 0

> Full interactive docs with a **Try it out** button are available at `/docs`.

---

## How to Play

| Action | Key |
|---|---|
| Move | Arrow keys or WASD |
| Pause / Resume | `P` |
| Return to menu | `ESC` |
| Restart after game over | `R` |

Start a game by entering your name on the menu screen and clicking **Start Game**.  
Your score is automatically submitted to the leaderboard when the game ends.

---

## Deploying to Railway

1. Push your project to a GitHub repository
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
3. Select your repository — Railway auto-detects Python and installs `requirements.txt`
4. Railway uses the `Procfile` to start the server:
   ```
   web: uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
5. Your game is live at the Railway-provided URL

> **Note:** Railway's filesystem resets on each redeploy, so `snake_history.json` (the leaderboard) will be cleared unless you attach a Railway Volume.

---

## Running Tests

```bash
pytest test_game.py -v
```

The test suite covers:
- Snake initialization, movement, direction changes, growth, and shrinkage
- Wall collision detection
- Leaderboard save and sort order

> Tests require `pytest` (`pip install pytest`) and `pygame` (`pip install pygame`).

---

## Troubleshooting

**`ModuleNotFoundError: No module named 'fastapi'`**
```bash
pip install -r requirements.txt
```

**Static files not loading**  
Run `uvicorn` from the project root directory (the folder containing `static/`).

**Leaderboard not saving**  
Ensure the process has write permission to the project directory.

---

## License

This project is provided as-is for educational purposes.
