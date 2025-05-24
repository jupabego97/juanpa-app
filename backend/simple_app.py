#!/usr/bin/env python3
"""
Aplicación FastAPI simplificada para diagnóstico
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Crear la aplicación
app = FastAPI(title="JuanPA Test API")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "JuanPA Test Server is running!"}

@app.get("/test")
async def test():
    return {"status": "OK", "message": "Test endpoint working"}

@app.post("/api/v1/sync/push")
async def sync_push_test(payload: dict):
    return {
        "message": "Sync push test successful",
        "received": payload,
        "created_decks": [],
        "conflicts": []
    }

if __name__ == "__main__":
    print("Iniciando servidor de prueba simplificado...")
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8003,
        log_level="info"
    ) 