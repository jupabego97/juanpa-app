from sqlmodel import create_engine, SQLModel
import os

# Define la URL de la base de datos.
# Usará una base de datos SQLite llamada 'juanpa_app.db' en el directorio raíz del backend.
# DATABASE_URL = "sqlite:///./juanpa_app.db" # Si main.py está en backend/
# Si main.py está en backend/app/, entonces la ruta relativa es ../juanpa_app.db
# Para mayor simplicidad, usaremos una ruta basada en el directorio del script database.py
# y subiremos un nivel para colocarla en la raíz de 'backend'.

# Obtener la ruta del directorio actual del script (app)
current_dir = os.path.dirname(os.path.abspath(__file__))
# Subir un nivel para estar en 'backend'
backend_dir = os.path.dirname(current_dir)
DATABASE_FILE = "juanpa_app.db"
DATABASE_URL = f"sqlite:///{os.path.join(backend_dir, DATABASE_FILE)}"


# connect_args se recomienda para SQLite para evitar problemas con multithreading.
engine = create_engine(DATABASE_URL, echo=True, connect_args={"check_same_thread": False})

def create_db_and_tables():
    # Importar modelos aquí para evitar importaciones circulares y asegurar que SQLModel los conozca
    # cuando se llame a create_all.
    # Aunque los modelos están en db_models.py, SQLModel necesita que sean importados
    # en algún lugar antes de llamar a SQLModel.metadata.create_all().
    # No es estrictamente necesario importarlos *aquí* si ya están importados
    # en el ámbito donde se llama a esta función (ej. main.py), pero es una buena práctica
    # para asegurar que todos los modelos definidos con `table=True` sean registrados.
    from . import db_models # Asegura que los modelos de tabla sean cargados
    
    SQLModel.metadata.create_all(engine)

# Podrías querer una función para obtener una sesión de base de datos,
# pero con FastAPI y SQLModel, a menudo se maneja con dependencias.
# Por ahora, solo nos enfocamos en la creación del motor y las tablas.

if __name__ == "__main__":
    # Esto permite crear la base de datos y las tablas ejecutando este script directamente.
    # python -m app.database  (desde el directorio backend)
    print(f"Creando base de datos y tablas en: {DATABASE_URL}")
    create_db_and_tables()
    print("Base de datos y tablas creadas (si no existían).")
