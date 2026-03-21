import streamlit as st
import os
import uuid
from database import init_db, Session, Projeto, Arquivo, TipoArquivo
from tools.transcriber import transcrever_audio
from tools.llm_engine import processar_chat

# Inicializa o banco de dados na startup
if "db_initialized" not in st.session_state:
    init_db()
    st.session_state.db_initialized = True

# Configuração para ocupar a tela toda
st.set_page_config(page_title="Ferramentas", layout="wide")
session = Session()

def get_tipo_arquivo(nome_arquivo: str) -> TipoArquivo:
    """Identifica o tipo de arquivo pela extensão."""
    extensao = os.path.splitext(nome_arquivo)[1].lower()
    if extensao in ['.mp3', '.wav', '.m4a']:
        return TipoArquivo.AUDIO
    elif extensao == '.mp4':
        return TipoArquivo.VIDEO
    else:
        return TipoArquivo.DOCUMENTO

# --- CSS Customizado para melhorar a estética ---
st.markdown("""
    <style>
    .stButton>button { width: 100%; border-radius: 5px; }
    .project-card { border: 1px solid #ddd; padding: 15px; border-radius: 10px; background-color: #f9f9f9; }
    </style>
""", unsafe_allow_html=True)

# --- Lógica de Navegação ---
if "projeto_id" not in st.session_state:
    st.session_state.projeto_id = None

def selecionar_projeto(id):
    st.session_state.projeto_id = id

def voltar_home():
    st.session_state.projeto_id = None

# =========================================================
# TELA 1: DASHBOARD DE PROJETOS (INICIAL)
# =========================================================
if st.session_state.projeto_id is None:
    st.title("📂 Meus Projetos")
    
    col_header1, col_header2 = st.columns([3, 1])
    with col_header2:
        if st.button("➕ Novo Projeto"):
            st.session_state.criando_projeto = True
    
    # Modal Simulado para Novo Projeto
    if st.session_state.get("criando_projeto"):
        with st.container():
            nome_novo = st.text_input("Nome do Projeto:")
            c1, c2 = st.columns(2)
            if c1.button("Salvar"):
                if nome_novo:
                    p = Projeto(nome=nome_novo)
                    session.add(p)
                    session.commit()
                    st.session_state.criando_projeto = False
                    st.rerun()
            if c2.button("Cancelar"):
                st.session_state.criando_projeto = False
                st.rerun()

    # Busca Rápida
    busca = st.text_input("🔍 Buscar projeto...")
    
    # Grid de Projetos
    projetos = session.query(Projeto).filter(Projeto.nome.like(f"%{busca}%")).all()
    
    cols = st.columns(3) # Exibe em 3 colunas
    for i, proj in enumerate(projetos):
        with cols[i % 3]:
            st.markdown(f"### {proj.nome}")
            st.write(f"📁 {len(proj.arquivos)} arquivos")
            if st.button(f"Abrir Projeto", key=f"open_{proj.id}"):
                selecionar_projeto(proj.id)
                st.rerun()
            st.divider()

# =========================================================
# TELA 2: VISUALIZAÇÃO DO PROJETO (TRIPARTITE)
# =========================================================
else:
    proj_atual = session.query(Projeto).get(st.session_state.projeto_id)
    
    # Barra Superior de Navegação
    col_nav1, col_nav2 = st.columns([12, 1])
    with col_nav1:
        st.markdown(f"<h2 style='margin:0;'>📂 {proj_atual.nome}</h2>", unsafe_allow_html=True)
    with col_nav2:
        if st.button("⬅", help="Voltar para Projetos"):
            st.session_state.projeto_id = None
            st.rerun()

    st.divider()

    # Layout: Esquerda (20%), Centro (60%), Direita (20%)
    col_left, col_main, col_right = st.columns([1, 3, 1])

    # --- COLUNA ESQUERDA: Arquivos/Contextos e Upload (20%) ---
    with col_left:
        st.markdown("<div class='sidebar-panel'>", unsafe_allow_html=True)
        st.markdown("<h5><i class='bi bi-files'></i> Assets</h5>", unsafe_allow_html=True)
        
        # Upload de Arquivo
        uploaded_file = st.file_uploader("Upload", type=['mp3', 'wav', 'm4a', 'mp4'], label_visibility="collapsed")
        if uploaded_file:
            if st.button("📥 Salvar", use_container_width=True):
                path = os.path.join("uploads", uploaded_file.name)
                with open(path, "wb") as f: f.write(uploaded_file.getbuffer())
                novo_arq = Arquivo(nome=uploaded_file.name, caminho=path, tipo=get_tipo_arquivo(uploaded_file.name), projeto=proj_atual)
                session.add(novo_arq)
                session.commit()
                st.success("Salvo!")
                st.rerun()

        st.markdown("<hr>", unsafe_allow_html=True)

        # Lista de Arquivos com Transcrição
        for arq in proj_atual.arquivos:
            with st.expander(f"📄 {arq.nome[:15]}...", expanded=False):
                if not arq.transcricao:
                    if st.button("🎙️ Transcrever", key=f"t_{arq.id}", use_container_width=True):
                        # Chama a função do transcriber.py
                        texto = transcrever_audio(arq.caminho)
                        arq.transcricao = texto
                        session.commit()
                        st.rerun()
                st.caption("✅ Transcrito" if arq.transcricao else "⏳ Pendente")
        st.markdown("</div>", unsafe_allow_html=True)

    # --- COLUNA CENTRAL: Chat e Transcrição (60%) ---
    st.markdown("<div class='chat-panel'>", unsafe_allow_html=True)
    arquivos_transcritos = [a for a in proj_atual.arquivos if a.transcricao]
        
    tab_texto, tab_chat = st.tabs(["📜 Texto Completo", "🗨️ Chat de Análise"])
        
    with tab_texto:
        if arquivos_transcritos:
            arq_view = st.selectbox("Selecionar arquivo:", arquivos_transcritos, format_func=lambda x: x.nome, key="sel_centro")
            if arq_view:
                st.text_area("Transcrição:", arq_view.transcricao, height=250)
                # BOTÃO DE INJETAR CONTEXTO
                if st.button("🧠 Injetar no Contexto do Chat", key=f"inj_{arq_view.id}", use_container_width=True):
                    st.session_state.contexto_ativo = arq_view.transcricao
                    st.session_state.nome_arq_contexto = arq_view.nome
                    st.success(f"Contexto de '{arq_view.nome}' carregado!")
            else:
                st.info("Transcreva um áudio para habilitar o chat e a visualização.")

        with tab_chat:
            if "historico_chat" not in st.session_state: st.session_state.historico_chat = []
            
            # Mostra se há contexto ativo
            if "contexto_ativo" in st.session_state:
                st.markdown(f"<p style='color:var(--primary-color); font-size:0.8rem;'><b>Contexto:</b> {st.session_state.nome_arq_contexto}</p>", unsafe_allow_html=True)
            
            # Histórico de Mensagens
            chat_box = st.container(height=350)
            with chat_box:
                for msg in st.session_state.historico_chat:
                    st.chat_message(msg["role"]).write(msg["content"])

            # Entrada do Chat
            prompt = st.chat_input("Pergunte algo sobre o áudio...")
            if prompt:
                st.session_state.historico_chat.append({"role": "user", "content": prompt})
                # Chama a IA no llm_engine.py
                with st.spinner("Analisando..."):
                    resposta = processar_chat(prompt, st.session_state.get("contexto_ativo"))
                st.session_state.historico_chat.append({"role": "assistant", "content": resposta})
                st.rerun()
        st.markdown("</div>", unsafe_allow_html=True)
   # --- COLUNA DIREITA: Ferramentas (20%) ---
    with col_right:
        st.subheader("🛠️ Ferramentas")
        
        # Filtra apenas os arquivos que já têm transcrição
        arquivos_prontos = [a.nome for a in proj_atual.arquivos if a.transcricao]
        arquivo_selecionado = st.selectbox("Alvo da IA:", arquivos_prontos)
        
        if arquivo_selecionado:
            arq_obj = next(a for a in proj_atual.arquivos if a.nome == arquivo_selecionado)
            
            if st.button("✨ Resumo Executivo", key=f"res_{arq_obj.id}"):
                with st.spinner("Conectando ao LM Studio..."):
                    try:
                        prompt_resumo = "Faça um resumo executivo em tópicos deste texto."
                        # Usamos a nova função passando o prompt e o texto como contexto
                        res = processar_chat(prompt_resumo, arq_obj.transcricao)
                        st.info(res)
                    except Exception as e:
                        st.error("Erro ao conectar ao LM Studio.")
                
            if st.button("🔍 Extrair Contexto", key=f"ctx_{arq_obj.id}"):
                with st.spinner("Analisando contexto..."):
                    try:
                        prompt_contexto = "Extraia os principais nomes, datas e decisões deste texto."
                        # Usamos a nova função aqui também
                        ctx = processar_chat(prompt_contexto, arq_obj.transcricao)
                        st.success(ctx)
                    except Exception as e:
                        st.error("Erro ao conectar ao LM Studio.")
        else:
            st.warning("Transcreva um arquivo para usar a IA.")