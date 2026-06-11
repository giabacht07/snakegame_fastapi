# Snake Game

A browser-based Snake Game served by FastAPI. The backend exposes a leaderboard API, while the frontend runs in the browser and provides a fully playable Snake experience with special foods and score persistence.

## Features

- **Browser game front-end** served from `/static`
- **FastAPI backend** with leaderboard endpoints
- **Persistent leaderboard** saved to `snake_history.json`
- **Special food types**:
  - 🍎 **Normal Food**: +1 segment, +10 points
  - ⭐ **Super Food**: +3 segments, +50 points
  - 💀 **Poison Food**: Shrinks snake by half on contact
- **Blinking warning** for special food after 3 seconds
- **HUD overlay** with score, length, and player name
- **Keyboard controls** for movement, pause, reset, and menu navigation

## Requirements

- Python 3.8+
- `fastapi`
- `uvicorn[standard]`
- `aiofiles`

## Installation

### 1. Install Python
Ensure Python 3.8 or higher is installed on your system. Download from [python.org](https://www.python.org/).

### 2. Install Dependencies
From the project directory, install packages with pip:
```bash
pip install -r requirements.txt
```

## Running the Server

Start the FastAPI server with Uvicorn:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Then open:
```text
http://127.0.0.1:8000/
```

## How to Play

- **Start game**: Enter player name and click **Start Game**
- **Move**: Arrow keys or WASD
- **Pause**: `P`
- **Return to menu**: `ESC`
- **Restart after game over**: `R`
- **Open leaderboard**: Click **Leaderboard** from the main menu

## Backend API

### GET `/api/scores`
Returns the leaderboard records as JSON.

### POST `/api/scores`
Accepts JSON payload:
```json
{
  "name": "Player1",
  "score": 42
}
```

## Project Structure

```
final/
├── main.py              # FastAPI backend application
├── history.py           # Leaderboard persistence manager
├── decorators.py        # Logging and pipeline decorators
├── requirements.txt     # Python dependencies
├── README.md            # Project documentation
└── static/              # Browser game frontend
    ├── index.html
    ├── style.css
    └── game.js
```

## Notes

- The game frontend is served from `static/index.html`.
- Leaderboard records are stored in `snake_history.json`.
- This project is designed to run in a browser; it is not a desktop Pygame application.

## Troubleshooting

### `ModuleNotFoundError: fastapi`
Install dependencies again:
```bash
pip install -r requirements.txt
```

### Unable to load static files
Make sure `main.py` is started from the project root where the `static/` folder exists.

### Leaderboard not saving
Check that the process has write permission to `snake_history.json` and that the directory is writable.

## License

This project is provided as-is for educational purposes.
