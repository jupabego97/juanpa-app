#!/usr/bin/env python3
"""
Servidor específico para Windows con configuración explícita
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import sys
import os
import logging

# Configurar logging detallado
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Crear aplicación básica
app = FastAPI(
    title="JuanPA Windows Test Server",
    description="Servidor de prueba para Windows",
    version="1.0.0"
)

# CORS muy permisivo para testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "🎉 ¡Servidor JuanPA funcionando en Windows!",
        "status": "OK",
        "server": "Windows Test Server"
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "juanpa-backend"}

@app.post("/api/v1/sync/push")
async def test_sync_push(payload: dict):
    logger.info(f"Sync push recibido: {payload}")
    return {
        "message": "✅ Sync push test exitoso",
        "received_payload": payload,
        "created_decks": [
            {
                "id": 999,
                "name": "Test Deck from Windows Server",
                "description": "Creado desde el servidor de Windows"
            }
        ],
        "conflicts": []
    }

@app.get("/api/v1/decks/")
async def list_decks():
    return [
        {
            "id": 1,
            "name": "Deck de Prueba",
            "description": "Mazos de ejemplo desde Windows server",
            "created_at": "2025-05-24T12:00:00Z"
        }
    ]

if __name__ == "__main__":
    print("🚀 Iniciando servidor específico para Windows...")
    print("📡 Configuración de red:")
    print("   - Host: 127.0.0.1 (localhost)")
    print("   - Puerto: 8004")
    print("   - Modo: Desarrollo")
    print()
    
    try:
        # Configuración específica para Windows
        config = uvicorn.Config(
            app=app,
            host="127.0.0.1",  # Localhost específico
            port=8004,
            log_level="info",
            access_log=True,
            use_colors=True,
            loop="asyncio"  # Usar asyncio explícitamente
        )
        
        server = uvicorn.Server(config)
        print("✅ Configuración del servidor creada")
        print("🔄 Iniciando servidor...")
        
        server.run()
        
    except KeyboardInterrupt:
        print("\n🛑 Servidor detenido por el usuario")
    except Exception as e:
        print(f"❌ Error iniciando servidor: {e}")
        import traceback
        traceback.print_exc() 