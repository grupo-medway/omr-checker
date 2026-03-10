import base64
import os
import shutil
import zipfile
from pathlib import Path
from typing import Iterable, List, Tuple


class FileHandler:
    @staticmethod
    def extract_zip(
        zip_content: bytes,
        extract_to: str,
        *,
        allowed_extensions: Iterable[str],
        max_files: int,
        max_upload_bytes: int,
    ) -> List[Path]:
        """
        Extrai arquivos ZIP com segurança e retorna lista de imagens encontradas
        """
        if len(zip_content) > max_upload_bytes:
            raise ValueError("ZIP exceeds the maximum allowed upload size")

        zip_path = os.path.join(extract_to, "upload.zip")
        normalized_extensions = {extension.lower() for extension in allowed_extensions}
        
        # Salvar conteúdo do ZIP
        with open(zip_path, "wb") as f:
            f.write(zip_content)
        
        # Extrair arquivos diretamente no diretório temporário
        # O OMRChecker espera as imagens no diretório raiz, não em subpastas
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            # Validar arquivos antes de extrair
            extracted_images = 0
            for file_info in zip_ref.filelist:
                # Prevenir path traversal
                if ".." in file_info.filename or file_info.filename.startswith("/"):
                    raise ValueError(f"Arquivo suspeito no ZIP: {file_info.filename}")
                if not file_info.is_dir():
                    suffix = Path(file_info.filename).suffix.lower()
                    if suffix in normalized_extensions:
                        extracted_images += 1

            if extracted_images > max_files:
                raise ValueError(f"ZIP contains too many images (limit: {max_files})")
            
            # Extrair apenas arquivos de imagem, ignorando estrutura de diretórios
            for file_info in zip_ref.filelist:
                if not file_info.is_dir():
                    # Extrair apenas o nome do arquivo, sem diretórios
                    filename = os.path.basename(file_info.filename)
                    if filename and Path(filename).suffix.lower() in normalized_extensions:
                        # Extrair diretamente no extract_to
                        with zip_ref.open(file_info) as source, open(os.path.join(extract_to, filename), "wb") as target:
                            target.write(source.read())
        
        # Encontrar imagens válidas no diretório de extração
        image_files = []

        for file in os.listdir(extract_to):
            file_path = Path(extract_to) / file
            if file_path.is_file() and file_path.suffix.lower() in normalized_extensions:
                image_files.append(file_path)
        
        return sorted(image_files)
    
    @staticmethod
    def copy_template_files(template_dir: Path, dest_dir: str) -> Tuple[bool, str]:
        """
        Copia arquivos do template para o diretório de processamento
        """
        if not template_dir.exists():
            return False, f"Template directory '{template_dir}' não encontrado"
        
        # Copiar arquivos necessários
        files_to_copy = ["template.json", "config.json", "evaluation.json", "template_reference.jpg", "omr_marker.jpg"]
        
        for file_name in files_to_copy:
            src_file = template_dir / file_name
            if src_file.exists():
                shutil.copy(src_file, dest_dir)
        
        return True, "Template copiado com sucesso"
    
    @staticmethod
    def image_to_base64(image_path: Path) -> str:
        """
        Converte imagem para base64
        """
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    
