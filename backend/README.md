A FastAPI-based backend service that provides structured data for a dashboard, including tariff rates, import/export statistics, and recommendations.

## Features

- FastAPI with Pydantic models for strict type validation
- Modular structure for scalability
- JSON response for dashboard consumption
- Example data for demonstration

## Prerequisites

- Python 3.12 or higher
- `pip` package manager

## Installation

1. **Clone the repository** (or set up the project structure using the provided script)

2. **Create a virtual environment** (recommended):

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**:

```bash
pip install -r requirements.txt
```

4. **Set up environment variables**:

Copy the example environment file:

```bash
cp .env.example .env
```

You can edit `.env` if needed, though the default settings should work for local development.

5. **Run the application**:

```bash
fastapi dev main.py
```

The API will be available at `http://127.0.0.1:8000`.

## API Endpoints

- `GET /`: Root endpoint
- `GET /api/v1/dashboard`: Returns the dashboard data in JSON format

## Project Structure

- `main.py`: FastAPI application entry point
- `config.py`: Application settings
- `models/`: Pydantic models for data structures
- `schemas/`: API response schemas
- `routes/`: API route definitions
- `services/`: Business logic
- `requirements.txt`: Python dependencies
- `.env.example`: Example environment variables file
