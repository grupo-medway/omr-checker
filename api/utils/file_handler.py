import tempfile
import zipfile
import os
import shutil
from pathlib import Path
from typing import List, Tuple
import base64


class FileHandler:
    @staticmethod
    def extract_zip(zip_content: bytes, extract_to: str) -> List[Path]:
        """
        Extrai arquivos ZIP com segurança e retorna lista de imagens encontradas
        """
        zip_path = os.path.join(extract_to, "upload.zip")
        
        # Salvar conteúdo do ZIP
        with open(zip_path, "wb") as f:
            f.write(zip_content)
        
        # Extrair arquivos diretamente no diretório temporário
        # O OMRChecker espera as imagens no diretório raiz, não em subpastas
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            # Validar arquivos antes de extrair
            for file_info in zip_ref.filelist:
                # Prevenir path traversal
                if ".." in file_info.filename or file_info.filename.startswith("/"):
                    raise ValueError(f"Arquivo suspeito no ZIP: {file_info.filename}")
            
            # Extrair apenas arquivos de imagem, ignorando estrutura de diretórios
            for file_info in zip_ref.filelist:
                if not file_info.is_dir():
                    # Extrair apenas o nome do arquivo, sem diretórios
                    filename = os.path.basename(file_info.filename)
                    if filename and Path(filename).suffix.lower() in {'.png', '.jpg', '.jpeg'}:
                        # Extrair diretamente no extract_to
                        with zip_ref.open(file_info) as source, open(os.path.join(extract_to, filename), "wb") as target:
                            target.write(source.read())
        
        # Encontrar imagens válidas no diretório de extração
        valid_extensions = {'.png', '.jpg', '.jpeg', '.PNG', '.JPG', '.JPEG'}
        image_files = []
        
        for file in os.listdir(extract_to):
            file_path = Path(extract_to) / file
            if file_path.is_file() and file_path.suffix in valid_extensions:
                image_files.append(file_path)
        
        return sorted(image_files)
    
    @staticmethod
    def copy_template_files(template_name: str, dest_dir: str) -> Tuple[bool, str]:
        """
        Copia arquivos do template para o diretório de processamento
        """
        template_dir = Path(f"samples/{template_name}")
        
        if not template_dir.exists():
            return False, f"Template '{template_name}' não encontrado"
        
        # Copiar arquivos necessários
        files_to_copy = ["template.json", "config.json", "evaluation.json"]
        
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
    
    @staticmethod
    def cleanup_temp_dir(temp_dir: str):
        """
        Remove diretório temporário com segurança
        """
        try:
            if os.path.exists(temp_dir) and temp_dir.startswith(tempfile.gettempdir()):
                shutil.rmtree(temp_dir)
        except Exception as e:
            # Log erro mas não falha
            print(f"Erro ao limpar diretório temporário: {e}")
    
    @staticmethod
    def validate_template_exists(template_name: str) -> bool:
        """
        Valida se o template existe
        """
        template_dir = Path(f"samples/{template_name}")
        template_file = template_dir / "template.json"
        return template_file.exists()