"""
Validadores personalizados para JuanPA.
Implementa reglas de negocio y validaciones específicas del dominio.
"""

import re
import os
from typing import Any, Dict, List, Optional, Union
from datetime import datetime
from pathlib import Path

from .exceptions import ValidationError, FileProcessingError, SecurityError


class ContentValidator:
    """Validador para contenido de tarjetas."""
    
    # Patrones de seguridad
    DANGEROUS_HTML_PATTERNS = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'on\w+\s*=',
        r'<iframe[^>]*>',
        r'<object[^>]*>',
        r'<embed[^>]*>',
        r'data:text/html',
    ]
    
    CLOZE_PATTERN = r'\{\{c(\d+)::([^}]+)(?:::([^}]*))?\}\}'
    
    @classmethod
    def validate_deck_name(cls, name: str) -> str:
        """Valida el nombre de un mazo."""
        if not name or not name.strip():
            raise ValidationError("El nombre del mazo es requerido", field="name")
        
        name = name.strip()
        
        if len(name) < 1:
            raise ValidationError("El nombre del mazo debe tener al menos 1 caracter", field="name")
        
        if len(name) > 100:
            raise ValidationError("El nombre del mazo no puede exceder 100 caracteres", field="name")
        
        # Caracteres no permitidos para evitar problemas de archivos/URLs
        forbidden_chars = ['<', '>', ':', '"', '|', '?', '*', '\\', '/']
        for char in forbidden_chars:
            if char in name:
                raise ValidationError(
                    f"El nombre del mazo no puede contener el caracter '{char}'",
                    field="name",
                    value=name
                )
        
        return name
    
    @classmethod
    def validate_deck_description(cls, description: Optional[str]) -> Optional[str]:
        """Valida la descripción de un mazo."""
        if description is None:
            return None
        
        description = description.strip()
        if not description:
            return None
        
        if len(description) > 1000:
            raise ValidationError(
                "La descripción del mazo no puede exceder 1000 caracteres",
                field="description"
            )
        
        # Verificar contenido peligroso
        cls._check_dangerous_content(description, "description")
        
        return description
    
    @classmethod
    def validate_card_content(cls, content: Any, field_name: str) -> Any:
        """Valida el contenido de una tarjeta."""
        if content is None:
            return None
        
        # Si es una lista de bloques de contenido
        if isinstance(content, list):
            return cls._validate_content_blocks(content, field_name)
        
        # Si es un diccionario (bloque único o estructura simple)
        if isinstance(content, dict):
            return cls._validate_content_dict(content, field_name)
        
        # Si es texto simple
        if isinstance(content, str):
            return cls._validate_text_content(content, field_name)
        
        raise ValidationError(
            f"Tipo de contenido no válido para {field_name}",
            field=field_name,
            value=type(content).__name__
        )
    
    @classmethod
    def validate_cloze_text(cls, text: str) -> str:
        """Valida texto cloze con formato {{c1::...}}."""
        if not text or not text.strip():
            raise ValidationError("El texto cloze es requerido", field="raw_cloze_text")
        
        text = text.strip()
        
        # Verificar contenido peligroso
        cls._check_dangerous_content(text, "raw_cloze_text")
        
        # Validar formato cloze
        matches = re.findall(cls.CLOZE_PATTERN, text, re.IGNORECASE | re.DOTALL)
        if not matches:
            raise ValidationError(
                "El texto debe contener al menos un elemento cloze con formato {{c1::texto}}",
                field="raw_cloze_text"
            )
        
        # Validar números de cloze
        cloze_numbers = set()
        for match in matches:
            cloze_num = int(match[0])
            if cloze_num < 1 or cloze_num > 20:
                raise ValidationError(
                    f"Los números de cloze deben estar entre 1 y 20. Encontrado: c{cloze_num}",
                    field="raw_cloze_text"
                )
            cloze_numbers.add(cloze_num)
        
        # Verificar secuencia consecutiva
        if cloze_numbers:
            max_num = max(cloze_numbers)
            expected_nums = set(range(1, max_num + 1))
            if cloze_numbers != expected_nums:
                missing = expected_nums - cloze_numbers
                raise ValidationError(
                    f"Los números de cloze deben ser consecutivos desde 1. Faltan: {sorted(missing)}",
                    field="raw_cloze_text"
                )
        
        return text
    
    @classmethod
    def validate_tags(cls, tags: Optional[List[str]]) -> Optional[List[str]]:
        """Valida las etiquetas de una tarjeta."""
        if tags is None:
            return None
        
        if not isinstance(tags, list):
            raise ValidationError("Las etiquetas deben ser una lista", field="tags")
        
        if len(tags) > 20:
            raise ValidationError("No se pueden tener más de 20 etiquetas", field="tags")
        
        validated_tags = []
        for i, tag in enumerate(tags):
            if not isinstance(tag, str):
                raise ValidationError(f"La etiqueta {i+1} debe ser texto", field="tags")
            
            tag = tag.strip()
            if not tag:
                continue  # Omitir etiquetas vacías
            
            if len(tag) > 50:
                raise ValidationError(
                    f"La etiqueta '{tag}' excede 50 caracteres",
                    field="tags"
                )
            
            # Caracteres no permitidos en etiquetas (solo los realmente peligrosos)
            if re.search(r'[<>"\'\\]', tag):
                raise ValidationError(
                    f"La etiqueta '{tag}' contiene caracteres no permitidos",
                    field="tags"
                )
            
            if tag.lower() not in [t.lower() for t in validated_tags]:
                validated_tags.append(tag)
        
        return validated_tags if validated_tags else None
    
    @classmethod
    def validate_fsrs_rating(cls, rating: int) -> int:
        """Valida una calificación FSRS."""
        if not isinstance(rating, int):
            raise ValidationError("La calificación debe ser un número entero", field="rating")
        
        if rating < 1 or rating > 4:
            raise ValidationError(
                "La calificación debe estar entre 1 (Again) y 4 (Easy)",
                field="rating",
                value=rating
            )
        
        return rating
    
    @classmethod
    def _validate_content_blocks(cls, blocks: List[Any], field_name: str) -> List[Dict[str, Any]]:
        """Valida una lista de bloques de contenido."""
        if len(blocks) > 50:
            raise ValidationError(
                f"Demasiados bloques de contenido en {field_name} (máximo 50)",
                field=field_name
            )
        
        validated_blocks = []
        for i, block in enumerate(blocks):
            if not isinstance(block, dict):
                raise ValidationError(
                    f"El bloque {i+1} en {field_name} debe ser un objeto",
                    field=field_name
                )
            
            validated_block = cls._validate_content_dict(block, f"{field_name}.{i}")
            validated_blocks.append(validated_block)
        
        return validated_blocks
    
    @classmethod
    def _validate_content_dict(cls, content: Dict[str, Any], field_name: str) -> Dict[str, Any]:
        """Valida un diccionario de contenido."""
        block_type = content.get("type", "text")
        
        if block_type == "text":
            return cls._validate_text_block(content, field_name)
        elif block_type == "html":
            return cls._validate_html_block(content, field_name)
        elif block_type == "image":
            return cls._validate_image_block(content, field_name)
        elif block_type == "audio":
            return cls._validate_audio_block(content, field_name)
        elif block_type == "cloze_text":
            return cls._validate_cloze_block(content, field_name)
        else:
            raise ValidationError(
                f"Tipo de bloque no válido: {block_type}",
                field=field_name,
                value=block_type
            )
    
    @classmethod
    def _validate_text_block(cls, block: Dict[str, Any], field_name: str) -> Dict[str, Any]:
        """Valida un bloque de texto."""
        content = block.get("content", "")
        if not isinstance(content, str):
            raise ValidationError(f"El contenido de texto en {field_name} debe ser string")
        
        content = cls._validate_text_content(content, field_name)
        
        return {
            "type": "text",
            "content": content
        }
    
    @classmethod
    def _validate_html_block(cls, block: Dict[str, Any], field_name: str) -> Dict[str, Any]:
        """Valida un bloque HTML (para cloze)."""
        content = block.get("content", "")
        if not isinstance(content, str):
            raise ValidationError(f"El contenido HTML en {field_name} debe ser string")
        
        # HTML permitido solo para cloze (muy restrictivo)
        allowed_tags = ['span', 'mark', 'em', 'strong', 'u', 'i', 'b']
        cls._validate_html_content(content, field_name, allowed_tags)
        
        return {
            "type": "html",
            "content": content
        }
    
    @classmethod
    def _validate_image_block(cls, block: Dict[str, Any], field_name: str) -> Dict[str, Any]:
        """Valida un bloque de imagen."""
        src = block.get("src", "")
        alt = block.get("alt", "")
        
        if not isinstance(src, str) or not src.strip():
            raise ValidationError(f"La URL de imagen en {field_name} es requerida")
        
        src = src.strip()
        
        # Validar URL de imagen
        if not (src.startswith("/static/") or src.startswith("data:image/")):
            raise ValidationError(
                f"URL de imagen no válida en {field_name}. Debe ser /static/ o data:image/",
                field=field_name,
                value=src
            )
        
        if isinstance(alt, str):
            alt = alt.strip()[:200]  # Limitar alt text
        else:
            alt = ""
        
        return {
            "type": "image",
            "src": src,
            "alt": alt
        }
    
    @classmethod
    def _validate_audio_block(cls, block: Dict[str, Any], field_name: str) -> Dict[str, Any]:
        """Valida un bloque de audio."""
        src = block.get("src", "")
        
        if not isinstance(src, str) or not src.strip():
            raise ValidationError(f"La URL de audio en {field_name} es requerida")
        
        src = src.strip()
        
        # Validar URL de audio
        if not src.startswith("/static/"):
            raise ValidationError(
                f"URL de audio no válida en {field_name}. Debe comenzar con /static/",
                field=field_name,
                value=src
            )
        
        return {
            "type": "audio",
            "src": src
        }
    
    @classmethod
    def _validate_cloze_block(cls, block: Dict[str, Any], field_name: str) -> Dict[str, Any]:
        """Valida un bloque de cloze."""
        placeholders = block.get("textWithPlaceholders", "")
        if not isinstance(placeholders, str):
            raise ValidationError(f"textWithPlaceholders en {field_name} debe ser string")
        
        return {
            "type": "cloze_text",
            "textWithPlaceholders": placeholders
        }
    
    @classmethod
    def _validate_text_content(cls, text: str, field_name: str) -> str:
        """Valida contenido de texto simple."""
        if len(text) > 10000:
            raise ValidationError(
                f"El contenido de {field_name} excede 10,000 caracteres",
                field=field_name
            )
        
        cls._check_dangerous_content(text, field_name)
        return text.strip()
    
    @classmethod
    def _validate_html_content(cls, html: str, field_name: str, allowed_tags: List[str]) -> None:
        """Valida contenido HTML con tags permitidas."""
        # Verificar contenido peligroso
        cls._check_dangerous_content(html, field_name)
        
        # Verificar solo tags permitidas (validación básica)
        tag_pattern = r'<(/?)(\w+)[^>]*>'
        tags_found = re.findall(tag_pattern, html, re.IGNORECASE)
        
        for is_closing, tag in tags_found:
            if tag.lower() not in allowed_tags:
                raise ValidationError(
                    f"Tag HTML no permitida en {field_name}: <{tag}>",
                    field=field_name
                )
    
    @classmethod
    def _check_dangerous_content(cls, content: str, field_name: str) -> None:
        """Verifica contenido potencialmente peligroso."""
        content_lower = content.lower()
        
        for pattern in cls.DANGEROUS_HTML_PATTERNS:
            if re.search(pattern, content_lower, re.IGNORECASE | re.DOTALL):
                raise SecurityError(
                    f"Contenido potencialmente peligroso detectado en {field_name}",
                    security_context=f"pattern_matched:{pattern}"
                )


class FileValidator:
    """Validador para archivos subidos."""
    
    # Tipos MIME permitidos
    ALLOWED_IMAGE_TYPES = {
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
    }
    
    ALLOWED_AUDIO_TYPES = {
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'
    }
    
    ALLOWED_DOCUMENT_TYPES = {
        'text/markdown', 'text/plain', 'application/pdf'
    }
    
    # Límites de tamaño (en bytes)
    MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_AUDIO_SIZE = 50 * 1024 * 1024  # 50MB  
    MAX_DOCUMENT_SIZE = 100 * 1024 * 1024  # 100MB
    
    @classmethod
    def validate_uploaded_file(
        cls,
        filename: str,
        content_type: Optional[str],
        file_size: int,
        file_category: str = "image"
    ) -> None:
        """Valida un archivo subido."""
        
        # Validar nombre de archivo
        if not filename or not filename.strip():
            raise FileProcessingError("Nombre de archivo requerido")
        
        filename = filename.strip()
        
        # Verificar caracteres peligrosos en nombre
        dangerous_chars = ['..', '/', '\\', '<', '>', ':', '"', '|', '?', '*']
        for char in dangerous_chars:
            if char in filename:
                raise SecurityError(
                    f"Nombre de archivo contiene caracteres peligrosos: {char}",
                    security_context="filename_validation"
                )
        
        # Validar extensión
        file_ext = Path(filename).suffix.lower()
        if not file_ext:
            raise FileProcessingError("El archivo debe tener una extensión")
        
        # Validar según categoría
        if file_category == "image":
            cls._validate_image_file(content_type, file_size, file_ext, filename)
        elif file_category == "audio":
            cls._validate_audio_file(content_type, file_size, file_ext, filename)
        elif file_category == "document":
            cls._validate_document_file(content_type, file_size, file_ext, filename)
        else:
            raise ValidationError(f"Categoría de archivo no válida: {file_category}")
    
    @classmethod
    def _validate_image_file(cls, content_type: Optional[str], file_size: int, file_ext: str, filename: str) -> None:
        """Valida archivo de imagen."""
        allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
        
        if file_ext not in allowed_extensions:
            raise FileProcessingError(
                f"Extensión de imagen no permitida: {file_ext}",
                filename=filename,
                file_type="image"
            )
        
        if content_type and content_type not in cls.ALLOWED_IMAGE_TYPES:
            raise FileProcessingError(
                f"Tipo MIME de imagen no permitido: {content_type}",
                filename=filename,
                file_type="image"
            )
        
        if file_size > cls.MAX_IMAGE_SIZE:
            raise FileProcessingError(
                f"Imagen demasiado grande: {file_size / 1024 / 1024:.1f}MB (máximo {cls.MAX_IMAGE_SIZE / 1024 / 1024}MB)",
                filename=filename,
                file_size=file_size
            )
    
    @classmethod
    def _validate_audio_file(cls, content_type: Optional[str], file_size: int, file_ext: str, filename: str) -> None:
        """Valida archivo de audio."""
        allowed_extensions = {'.mp3', '.wav', '.ogg', '.m4a'}
        
        if file_ext not in allowed_extensions:
            raise FileProcessingError(
                f"Extensión de audio no permitida: {file_ext}",
                filename=filename,
                file_type="audio"
            )
        
        if content_type and content_type not in cls.ALLOWED_AUDIO_TYPES:
            raise FileProcessingError(
                f"Tipo MIME de audio no permitido: {content_type}",
                filename=filename,
                file_type="audio"
            )
        
        if file_size > cls.MAX_AUDIO_SIZE:
            raise FileProcessingError(
                f"Audio demasiado grande: {file_size / 1024 / 1024:.1f}MB (máximo {cls.MAX_AUDIO_SIZE / 1024 / 1024}MB)",
                filename=filename,
                file_size=file_size
            )
    
    @classmethod  
    def _validate_document_file(cls, content_type: Optional[str], file_size: int, file_ext: str, filename: str) -> None:
        """Valida archivo de documento."""
        allowed_extensions = {'.md', '.txt', '.pdf'}
        
        if file_ext not in allowed_extensions:
            raise FileProcessingError(
                f"Extensión de documento no permitida: {file_ext}",
                filename=filename,
                file_type="document"
            )
        
        if content_type and content_type not in cls.ALLOWED_DOCUMENT_TYPES:
            raise FileProcessingError(
                f"Tipo MIME de documento no permitido: {content_type}",
                filename=filename,
                file_type="document"
            )
        
        if file_size > cls.MAX_DOCUMENT_SIZE:
            raise FileProcessingError(
                f"Documento demasiado grande: {file_size / 1024 / 1024:.1f}MB (máximo {cls.MAX_DOCUMENT_SIZE / 1024 / 1024}MB)",
                filename=filename,
                file_size=file_size
            )


class SyncValidator:
    """Validador para operaciones de sincronización."""
    
    @classmethod
    def validate_timestamp(cls, timestamp: Optional[datetime], field_name: str) -> Optional[datetime]:
        """Valida un timestamp de sincronización."""
        if timestamp is None:
            return None
        
        if not isinstance(timestamp, datetime):
            raise ValidationError(f"{field_name} debe ser un datetime válido", field=field_name)
        
        # Verificar que no sea demasiado en el futuro
        max_future = datetime.now().timestamp() + 3600  # 1 hora en el futuro
        if timestamp.timestamp() > max_future:
            raise ValidationError(
                f"{field_name} no puede estar muy en el futuro",
                field=field_name,
                value=timestamp.isoformat()
            )
        
        return timestamp
    
    @classmethod
    def validate_sync_payload_size(cls, payload: Dict[str, Any]) -> None:
        """Valida el tamaño del payload de sincronización."""
        import json
        
        try:
            payload_str = json.dumps(payload)
            payload_size = len(payload_str.encode('utf-8'))
            
            # Límite de 50MB para payload de sync
            max_size = 50 * 1024 * 1024
            if payload_size > max_size:
                raise ValidationError(
                    f"Payload de sincronización demasiado grande: {payload_size / 1024 / 1024:.1f}MB (máximo {max_size / 1024 / 1024}MB)"
                )
        except (TypeError, ValueError) as e:
            raise ValidationError(f"Error al validar payload de sincronización: {str(e)}") 