from fastapi import FastAPI
from config import settings
from routes.dashboard_routes import router as dashboard_router
from routes.source_routes import router as source_router
from routes.utilities_routes import router as utilities_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title=settings.app_title, version=settings.version, debug=settings.debug)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard_router, prefix="/api/v1", tags=["dashboard"])
app.include_router(source_router, prefix="/api/v1", tags=["source"])
app.include_router(utilities_router, prefix="/api/v1", tags=["utils"])


@app.get("/")
def read_root():
    return {"message": "Dashboard Backend API"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
