from openai import OpenAI

# Configuração para o LM Studio (mantenha a mesma)
client = OpenAI(base_url="http://localhost:1205/v1", api_key="lm-studio")

def processar_chat(pergunta, contexto=None):
    # --- NOVO: Prompt de Sistema Inteligente ---
    if contexto:
        # Se houver contexto, instruímos a IA a ser um especialista rigoroso.
        prompt_sistema = """Você é um assistente de IA especialista em análise de transcrições de áudio. 
Abaixo, será fornecido o texto completo da transcrição. Sua missão é responder à pergunta do usuário utilizando APENAS 
as informações contidas no contexto abaixo.

Se a informação não estiver na transcrição, diga educadamente: 'Desculpe, mas não encontrei informações sobre isso na transcrição fornecida.'

### TEXTO DA TRANSCRIÇÃO (CONTEXTO) ###
{}
##########################################

Não invente informações."""
        # Injetamos o contexto no prompt do sistema
        prompt_sistema = prompt_sistema.format(contexto[:20000]) # Limitador de segurança (tokens)
    else:
        # Se não houver contexto, ela age normalmente.
        prompt_sistema = "Você é um assistente de IA prestativo e educado."

    try:
        # Chamada para o LM Studio
        response = client.chat.completions.create(
            model="local-model",
            messages=[
                {"role": "system", "content": prompt_sistema},
                {"role": "user", "content": pergunta} # Aqui vai a pergunta livre do usuário
            ],
            temperature=0.3, # Diminuímos a criatividade para evitar alucinações
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"❌ Erro ao conectar com o LM Studio: {str(e)}"