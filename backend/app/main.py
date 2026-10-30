
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from app.auth import router as auth_router
from app.bootstrap import ensure_admin_exists
from app.exams import router as exams_router
from app.content import router as content_router

from app.institution_users import router as institution_users_router

from app.institutions import router as institutions_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the application when the server starts."""
    await run_in_threadpool(ensure_admin_exists)
    yield


app = FastAPI(
    title="EnglishPrep AI API",
    description="Backend API for EnglishPrep AI",
    version="0.1.0",
    lifespan=lifespan,
)

# Allow the local React development server to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://englishprep-ai.vercel.app",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth_router)
app.include_router(institutions_router)
app.include_router(institution_users_router)
app.include_router(exams_router)
app.include_router(content_router)


@app.get("/")
def root():
    return {
        "message": "EnglishPrep AI API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }
