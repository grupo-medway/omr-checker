import os
import sys
from pathlib import Path
from typing import List, Dict
import csv

sys.path.append(str(Path(__file__).parent.parent.parent))

from main import entry_point_for_args
from api.models import OMRResult, ProcessResponse
from api.utils import FileHandler


class OMRProcessor:
    @staticmethod
    def process_omr_files(
        image_files: List[Path], 
        template_name: str, 
        temp_dir: str
    ) -> ProcessResponse:
        """
        Processa arquivos OMR e retorna resultados
        """
        # Criar diretório de saída
        output_dir = os.path.join(temp_dir, "outputs")
        os.makedirs(output_dir, exist_ok=True)
        
        # Configurar argumentos para o OMRChecker
        args = {
            "input_paths": [str(temp_dir)],
            "output_dir": output_dir,
            "debug": False,
            "autoAlign": False,
            "setLayout": False
        }
        
        try:
            entry_point_for_args(args)
            results = OMRProcessor._collect_results(output_dir, temp_dir)
            return ProcessResponse(
                status="success",
                results=results,
                summary={
                    "total": len(image_files),
                    "processed": len(results),
                    "errors": len(image_files) - len(results)
                }
            )
            
        except Exception as e:
            return ProcessResponse(
                status="error",
                results=[],
                summary={
                    "total": len(image_files),
                    "processed": 0,
                    "errors": len(image_files)
                },
                errors=[str(e)]
            )
    
    @staticmethod
    def _collect_results(output_dir: str, temp_dir: str) -> List[OMRResult]:
        """
        Coleta resultados do processamento
        """
        results = []
        
        # Procurar por arquivos CSV de resultados
        results_dir = Path(output_dir) / "Results"
        
        if not results_dir.exists():
            return results
        csv_files = list(results_dir.glob("*.csv"))
        if not csv_files:
            return results
        
        # Usar o CSV mais recente
        latest_csv = max(csv_files, key=os.path.getctime)
        
        # Ler dados do CSV
        csv_data = OMRProcessor._read_csv_results(latest_csv)
        
        # Procurar por imagens processadas
        checked_dir = Path(output_dir) / "CheckedOMRs"
        
        for row in csv_data:
            filename = row.get("file_id", "")
            if not filename:
                continue
            
            # Procurar imagem processada correspondente
            processed_image_path = None
            if checked_dir.exists():
                # Tentar diferentes extensões
                for ext in ['.jpg', '.png', '.jpeg']:
                    img_path = checked_dir / f"{Path(filename).stem}{ext}"
                    if img_path.exists():
                        processed_image_path = img_path
                        break
            
            # Converter imagem para base64 se encontrada
            processed_image_base64 = ""
            if processed_image_path:
                processed_image_base64 = FileHandler.image_to_base64(processed_image_path)
            
            # Filtrar apenas campos relevantes
            filtered_data = {}
            for key, value in row.items():
                # Incluir matrícula, língua e questões
                if key.startswith('matricula') or key.startswith('lingua') or key.startswith('q'):
                    filtered_data[key] = value
            
            # Criar resultado
            result = OMRResult(
                filename=filename,
                data=filtered_data,
                processed_image=processed_image_base64,
                warnings=[]
            )
            results.append(result)
        
        return results
    
    @staticmethod
    def _read_csv_results(csv_path: Path) -> List[Dict[str, str]]:
        """
        Lê resultados do arquivo CSV
        """
        results = []
        
        try:
            with open(csv_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    results.append(dict(row))
        except Exception as e:
            print(f"Erro ao ler CSV: {e}")
        
        return results