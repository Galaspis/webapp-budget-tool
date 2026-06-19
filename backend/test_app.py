from fastapi import FastAPI

app = FastAPI()

@app.post("/test")
def test_post():
    return {"message": "🔥 This works"}
