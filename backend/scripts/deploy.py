#!/usr/bin/env python3
"""
Script de deployment para JuanPA.
Automatiza el proceso de despliegue en diferentes entornos.
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path
from typing import List, Optional

# Colores para output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


def log(message: str, color: str = Colors.OKBLUE):
    """Imprime un mensaje con color."""
    print(f"{color}{message}{Colors.ENDC}")


def run_command(command: List[str], cwd: Optional[Path] = None) -> bool:
    """Ejecuta un comando y retorna True si fue exitoso."""
    try:
        log(f"Ejecutando: {' '.join(command)}", Colors.OKCYAN)
        result = subprocess.run(command, cwd=cwd, check=True, capture_output=True, text=True)
        if result.stdout:
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        log(f"Error ejecutando comando: {e}", Colors.FAIL)
        if e.stderr:
            print(e.stderr)
        return False


def check_requirements():
    """Verifica que los requisitos estén instalados."""
    log("Verificando requisitos...", Colors.HEADER)
    
    # Verificar Python
    python_version = sys.version_info
    if python_version.major < 3 or (python_version.major == 3 and python_version.minor < 8):
        log("ERROR: Se requiere Python 3.8 o superior", Colors.FAIL)
        return False
    
    log(f"✓ Python {python_version.major}.{python_version.minor}", Colors.OKGREEN)
    
    # Verificar Git
    if not run_command(["git", "--version"]):
        log("ERROR: Git no está instalado", Colors.FAIL)
        return False
    
    log("✓ Git disponible", Colors.OKGREEN)
    return True


def setup_environment(env: str):
    """Configura el entorno de desarrollo/producción."""
    log(f"Configurando entorno: {env}", Colors.HEADER)
    
    # Crear archivo .env si no existe
    env_file = Path(".env")
    if not env_file.exists():
        log("Creando archivo .env...", Colors.WARNING)
        
        env_content = f"""# Configuración de JuanPA
JUANPA_ENVIRONMENT={env}
JUANPA_DEBUG={'true' if env == 'development' else 'false'}
JUANPA_LOG_LEVEL={'DEBUG' if env == 'development' else 'INFO'}
JUANPA_DATABASE_URL=sqlite:///./juanpa.db
JUANPA_SECRET_KEY=your-secret-key-here-change-in-production
JUANPA_CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]

# APIs externas (opcional)
# JUANPA_GOOGLE_API_KEY=
# JUANPA_OPENAI_API_KEY=
"""
        
        with open(env_file, 'w') as f:
            f.write(env_content)
        
        log("✓ Archivo .env creado", Colors.OKGREEN)
        log("⚠️  Recuerda configurar JUANPA_SECRET_KEY en producción", Colors.WARNING)
    else:
        log("✓ Archivo .env ya existe", Colors.OKGREEN)


def install_dependencies():
    """Instala las dependencias del proyecto."""
    log("Instalando dependencias...", Colors.HEADER)
    
    # Verificar si existe virtual environment
    venv_path = Path("venv")
    if not venv_path.exists():
        log("Creando entorno virtual...", Colors.WARNING)
        if not run_command([sys.executable, "-m", "venv", "venv"]):
            return False
    
    # Activar entorno virtual y instalar dependencias
    if os.name == 'nt':  # Windows
        pip_path = venv_path / "Scripts" / "pip.exe"
        python_path = venv_path / "Scripts" / "python.exe"
    else:  # Unix/Linux/macOS
        pip_path = venv_path / "bin" / "pip"
        python_path = venv_path / "bin" / "python"
    
    if not run_command([str(pip_path), "install", "--upgrade", "pip"]):
        return False
    
    if not run_command([str(pip_path), "install", "-r", "requirements.txt"]):
        return False
    
    log("✓ Dependencias instaladas", Colors.OKGREEN)
    return True


def run_tests():
    """Ejecuta los tests del proyecto."""
    log("Ejecutando tests...", Colors.HEADER)
    
    venv_path = Path("venv")
    if os.name == 'nt':  # Windows
        python_path = venv_path / "Scripts" / "python.exe"
    else:  # Unix/Linux/macOS
        python_path = venv_path / "bin" / "python"
    
    if not run_command([str(python_path), "-m", "pytest", "tests/", "-v"]):
        log("❌ Tests fallaron", Colors.FAIL)
        return False
    
    log("✓ Todos los tests pasaron", Colors.OKGREEN)
    return True


def setup_database():
    """Configura la base de datos."""
    log("Configurando base de datos...", Colors.HEADER)
    
    venv_path = Path("venv")
    if os.name == 'nt':  # Windows
        python_path = venv_path / "Scripts" / "python.exe"
    else:  # Unix/Linux/macOS
        python_path = venv_path / "bin" / "python"
    
    # Ejecutar migraciones de Alembic si es necesario
    alembic_ini = Path("alembic.ini")
    if alembic_ini.exists():
        log("Ejecutando migraciones de base de datos...", Colors.WARNING)
        if not run_command([str(python_path), "-m", "alembic", "upgrade", "head"]):
            log("⚠️  Error en migraciones, continuando...", Colors.WARNING)
    
    log("✓ Base de datos configurada", Colors.OKGREEN)
    return True


def create_systemd_service():
    """Crea un servicio systemd para producción (Linux)."""
    if os.name == 'nt':
        log("⚠️  Servicios systemd no disponibles en Windows", Colors.WARNING)
        return True
    
    log("Creando servicio systemd...", Colors.HEADER)
    
    current_dir = Path.cwd()
    venv_python = current_dir / "venv" / "bin" / "python"
    
    service_content = f"""[Unit]
Description=JuanPA Spaced Repetition API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory={current_dir}
Environment=PATH={current_dir}/venv/bin
ExecStart={venv_python} -m uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
"""
    
    service_file = Path("/tmp/juanpa.service")
    with open(service_file, 'w') as f:
        f.write(service_content)
    
    log(f"✓ Archivo de servicio creado en {service_file}", Colors.OKGREEN)
    log("Para instalarlo ejecuta:", Colors.WARNING)
    log(f"  sudo cp {service_file} /etc/systemd/system/", Colors.WARNING)
    log("  sudo systemctl daemon-reload", Colors.WARNING)
    log("  sudo systemctl enable juanpa", Colors.WARNING)
    log("  sudo systemctl start juanpa", Colors.WARNING)
    
    return True


def deploy_development():
    """Deployment para desarrollo."""
    log("=== DEPLOYMENT DESARROLLO ===", Colors.HEADER)
    
    steps = [
        ("Verificar requisitos", check_requirements),
        ("Configurar entorno", lambda: setup_environment("development")),
        ("Instalar dependencias", install_dependencies),
        ("Configurar base de datos", setup_database),
        ("Ejecutar tests", run_tests),
    ]
    
    for step_name, step_func in steps:
        log(f"\n{step_name}...", Colors.BOLD)
        if not step_func():
            log(f"❌ Falló: {step_name}", Colors.FAIL)
            return False
    
    log("\n✅ Deployment de desarrollo completado!", Colors.OKGREEN)
    log("\nPara iniciar el servidor ejecuta:", Colors.WARNING)
    log("  cd juanpa/backend", Colors.WARNING)
    log("  venv/bin/python -m uvicorn app.main:app --reload", Colors.WARNING)
    
    return True


def deploy_production():
    """Deployment para producción."""
    log("=== DEPLOYMENT PRODUCCIÓN ===", Colors.HEADER)
    
    steps = [
        ("Verificar requisitos", check_requirements),
        ("Configurar entorno", lambda: setup_environment("production")),
        ("Instalar dependencias", install_dependencies),
        ("Configurar base de datos", setup_database),
        ("Ejecutar tests", run_tests),
        ("Crear servicio systemd", create_systemd_service),
    ]
    
    for step_name, step_func in steps:
        log(f"\n{step_name}...", Colors.BOLD)
        if not step_func():
            log(f"❌ Falló: {step_name}", Colors.FAIL)
            return False
    
    log("\n✅ Deployment de producción completado!", Colors.OKGREEN)
    log("\nPasos finales manuales:", Colors.WARNING)
    log("1. Configurar JUANPA_SECRET_KEY en .env", Colors.WARNING)
    log("2. Configurar CORS origins apropiados", Colors.WARNING)
    log("3. Configurar reverse proxy (nginx/apache)", Colors.WARNING)
    log("4. Configurar SSL/TLS", Colors.WARNING)
    log("5. Configurar backup de base de datos", Colors.WARNING)
    
    return True


def main():
    """Función principal."""
    parser = argparse.ArgumentParser(description="Script de deployment para JuanPA")
    parser.add_argument(
        "environment",
        choices=["development", "production"],
        help="Entorno de deployment"
    )
    parser.add_argument(
        "--skip-tests",
        action="store_true",
        help="Omitir ejecución de tests"
    )
    
    args = parser.parse_args()
    
    # Verificar que estamos en el directorio correcto
    if not Path("app").exists() or not Path("requirements.txt").exists():
        log("❌ Error: Ejecuta este script desde el directorio backend/", Colors.FAIL)
        sys.exit(1)
    
    # Ejecutar deployment según el entorno
    if args.environment == "development":
        success = deploy_development()
    else:
        success = deploy_production()
    
    if not success:
        log("\n❌ Deployment falló", Colors.FAIL)
        sys.exit(1)
    
    log(f"\n🎉 Deployment de {args.environment} exitoso!", Colors.OKGREEN)


if __name__ == "__main__":
    main() 