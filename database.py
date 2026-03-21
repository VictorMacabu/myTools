from sqlalchemy import create_engine, Column, Integer, String, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

Base = declarative_base()

class Projeto(Base):
    __tablename__ = 'projetos'
    id = Column(Integer, primary_key=True)
    nome = Column(String, unique=True)
    arquivos = relationship("Arquivo", back_populates="projeto")

class Arquivo(Base):
    __tablename__ = 'arquivos'
    id = Column(Integer, primary_key=True)
    nome = Column(String)
    caminho = Column(String)
    tipo = Column(String) # audio, documento, etc.
    transcricao = Column(String, nullable=True) 
    projeto_id = Column(Integer, ForeignKey('projetos.id'))
    projeto = relationship("Projeto", back_populates="arquivos")

# Configuração do SQLite
engine = create_engine('sqlite:///sistema.db')
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)