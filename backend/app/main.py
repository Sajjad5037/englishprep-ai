from fastapi import FastAPI

app = FastAPI(
    title="EnglishPrep AI API",
    description="Backend API for EnglishPrep AI",
    version="0.1.0",
)


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