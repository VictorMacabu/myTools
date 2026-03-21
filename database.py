from contextlib import contextmanager
from enum import Enum as PyEnum
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Enum, CheckConstraint, event
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

Base = declarative_base()

class TipoArquivo(PyEnum):
    """Tipos de arquivo suportados"""
    AUDIO = "audio"
    DOCUMENTO = "documento"
    VIDEO = "video"
    IMAGEM = "imagem"

class Projeto(Base):
    __tablename__ = 'projetos'
    id = Column(Integer, primary_key=True)
    nome = Column(String(255), nullable=False, unique=True, index=True)
    arquivos = relationship("Arquivo", back_populates="projeto", cascade="all, delete-orphan")

class Arquivo(Base):
    __tablename__ = 'arquivos'
    id = Column(Integer, primary_key=True)
    nome = Column(String(255), nullable=False, index=True)
    caminho = Column(String(500), nullable=False)
    tipo = Column(Enum(TipoArquivo), nullable=False, index=True)
    transcricao = Column(String(5000), nullable=True)
    projeto_id = Column(Integer, ForeignKey('projetos.id', ondelete='CASCADE'), nullable=False, index=True)
    projeto = relationship("Projeto", back_populates="arquivos")

    __table_args__ = (
        CheckConstraint('LENGTH(TRIM(nome)) > 0', name='check_nome_not_empty'),
        CheckConstraint('LENGTH(TRIM(caminho)) > 0', name='check_caminho_not_empty'),
    )

# Lazy initialization - não cria conexão na importação
_engine = None
_Session = None

def init_db(database_url: str = 'sqlite:///sistema.db'):
    """Inicializa o banco de dados. Deve ser chamado uma vez na startup."""
    global _engine, _Session

    _engine = create_engine(
        database_url,
        connect_args={'check_same_thread': False} if 'sqlite' in database_url else {}
    )

    # Habilita foreign keys no SQLite
    if 'sqlite' in database_url:
        @event.listens_for(_engine, 'connect')
        def set_sqlite_pragma(dbapi_conn, connection_record):
            cursor = dbapi_conn.cursor()
            cursor.execute('PRAGMA foreign_keys=ON')
            cursor.close()

    Base.metadata.create_all(_engine)
    _Session = sessionmaker(bind=_engine)
    return _engine

def get_session():
    """Cria uma nova sessão. Deve ser usada com context manager."""
    if _Session is None:
        init_db()
    return _Session()

@contextmanager
def session_scope():
    """Context manager para gerenciar a sessão do banco de dados."""
    session = get_session()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

# Retrocompatibilidade: cria Session se necessário (deprecated)
def get_Session():
    """Deprecated: use session_scope() context manager em vez disso."""
    if _Session is None:
        init_db()
    return _Session

# Alias para compatibilidade com código antigo
class Session:
    """Alias compatível com código antigo. Deprecated: use session_scope() em vez disso."""
    def __init__(self):
        if _Session is None:
            init_db()
        self._session = _Session()

    def __getattr__(self, name):
        return getattr(self._session, name)