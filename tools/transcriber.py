import whisper
import os
import streamlit as st

_model = None

def transcrever_audio(caminho_arquivo):
    global _model
    
    if not os.path.exists(caminho_arquivo):
        return "Erro: Arquivo não encontrado."

    # Carrega o modelo apenas uma vez (Singleton)
    if _model is None:
        # 'medium' para qualidade máxima.
        _model = whisper.load_model("medium") 
    
    # --- MUDANÇA: Parâmetros extras para qualidade ---
    # language="pt": Força o idioma para o Whisper não ter que adivinhar.
    # prompt: Lista de termos técnicos ou nomes que podem aparecer no áudio.
    prompt_termos = "reunião da empresa desenvolvimento de projetos tecnologia inovação equipe resultados metas desafios soluções feedbacks"
    
    with st.spinner("Whisper processando áudio..."):
        result = _model.transcribe(
            caminho_arquivo, 
            fp16=False, 
            language="pt", 
            prompt=prompt_termos # Ajuda a IA a acertar termos difíceis
        )
    
    return result["text"].strip()