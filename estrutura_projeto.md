1. cada projeto deve estar separado por pasta na área do dashbord, a pasta podera ser editada ou excluída (assim apagando o projeto por inteiro), no dashbord a capa da pasta do projeto deve ter o nome do projeto, data da criação e fontes dentro do projeto 
2. no dashbord devo conseguir destacar os projetos como favoritos e criar grupos de projetos 
3. separar por area de trabalho, podendo alternar visualização de projetos como pessoais, trabalho etc (o usuário cria suas áreas de trabalho)
4. dentro de cada projeto devo ter uma área dividida em 3 partes (20%/60%/20%) 
4.1 sendo a primeira a área de lista de fontes e um campo para adicionar fonte no item da fonte ja carregada vai haver um quadrado de seleção para indicar que a fonte vai entrar para o contexto do chat 
4.2 a área central deve ser o espaço para o chat, o chat terá o contexto e respondera sobre as fontes selecionadas no lado esquerdo, se não houver fontes selecionadas o chat ficará inativo, não deixando inserir texto na área do usuário, na área abaixo da entrada de texto do usuário terá um indicador com o número das fontes selecionadas 
4.3 ao lado direito ficarão as funcionalidades, sendo botões que chamarão para uma ação especifica 
5. funcionalidades, o sistema vai agregar ferramentas com o evoluir do projeto por enquanto seguem algumas: 
5.1 transcrever audio, abrirá um modal para selecionar um audio, será feita a transcrição e irá gerar um arquivo com a transcrição, este arquivo será acrescentado a lista de fontes, nele aparecerá a função de download e edição para escolha do usuário. vou especificar melhor as funcionalidades no proximo ponto 

5.2 player de audio e video para executar o que já estiver carregado como fonte 
5.3 exibir arquivos de imagem 
5.4 editar texto dos documentos
5.5 editor de audio, corte de trechos e salve no contexto para uso. O corte de audio deverá permitir o usuário selecionar o trecho que desejar, e salvar o trecho, nomeando e deixando salvo em contextos o que joga o arquivo para a pasta uploads.


Estrutura do sistema deve ser feita em MVC com a linguagem PHP, deve ser feito pensando no crescimento do uso da ferramenta e estruturação robusta e segura. 

 ferramentas_integradas/                                                                                             
  ├── app/                                                                                                              │   ├── Config/
  │   │   └── Database.php          # SQLite config, schema creation                                                  
  │   ├── Core/
  │   │   ├── Controller.php        # Base controller (JSON, views)
  │   │   ├── Model.php             # Base model (CRUD operations)
  │   │   └── Router.php            # URL routing
  │   ├── Models/
  │   │   ├── Workspace.php         # Áreas de trabalho
  │   │   ├── Grupo.php             # Grupos de projetos
  │   │   ├── Projeto.php           # Projetos com métodos adicionais
  │   │   ├── Arquivo.php           # Fontes/arquivos
  │   │   └── TipoArquivo.php       # Classificação de tipos (audio, video, etc)
  │   ├── Views/
  │   │   ├── partials/
  │   │   │   ├── _layout.php       # Template principal
  │   │   │   └── _workspace_rail.php  # Sidebar de workspaces
  │   │   ├── dashboard/
  │   │   │   ├── index.php         # Tela principal (dashboard)
  │   │   │   └── partials/_proj_card.php
  │   │   └── projeto/
  │   │       └── show.php          # Tela de projeto (layout 20/60/20)
  │   └── Controllers/
  │       ├── DashboardController.php
  │       ├── ProjetoController.php
  │       └── ApiController.php     # CRUD completo via AJAX
  ├── autoload.php                  # PSR-4 autoloader
  ├── index.php                     # Entry point / front controller
  ├── server.php                    # Dev server (php -S localhost:8000 server.php)
  ├── .htaccess                     # Apache rewrite rules
  ├── js/app.js                     # Frontend - all interactive logic
  ├── uploads/                      # Uploaded files storage
  ├── style.css                     # (kept)
  ├── estrutura_projeto.md          # (kept)
  ├── ARQUITETURA_CORTE.md          # (kept)
  ├── .gitignore                    # (kept)
  └── uploads/.gitkeep

---

## Especificação: Implementação de Grupos de Projetos Funcionais

**Data**: 2026-04-05
**Objetivo**: Tornar os grupos de projetos completamente funcionais com persistência, edição e seleção de grupo por projeto.

### Problemas Resolvidos

1. ✅ Projetos criados em um grupo não desapareciam da visualização do grupo
2. ✅ Projectos podiam ser atribuídos a grupos na criação, mas não conseguiam trocar de grupo após criação
3. ✅ Grupos não podiam ser editados (nome)
4. ✅ Modal de nova workspace pedia seleção de cor (agora usa seletor visual de emoji)
5. ✅ Após criar workspace, página recarregava em vez de redirecionar

### Alterações no Backend

#### ApiController.php
- **Novo método**: `updateGrupo(int $id)`
  - Aceita POST em `/api/grupo/{id}/update`
  - Atualiza campo `nome` do grupo
  - Retorna JSON com status `ok: true`

#### Router.php
- **Nova rota dinâmica**: `POST /api/grupo/{id}/update`
  - Padrão: `#^/api/grupo/(\d+)/update$#`
  - Handler: `ApiController::updateGrupo()`

#### ApiController.php - createWorkspace()
- Removido parâmetro `cor` do POST
- Agora sempre usa cor padrão: `#0b0199`
- Icone continua vindo do formulário

### Alterações no Frontend

#### app.js - Novas Funções

1. **selectGrupo(id)**
   - Chamada ao clicar em grupo no modal de novo projeto
   - Atualiza input hidden `new-projeto-grupo-id`
   - Destaca visualmente o grupo selecionado

2. **selectEditGrupo(id)**
   - Chamada ao clicar em grupo no modal de editar projeto
   - Atualiza input hidden `edit-projeto-grupo-id`
   - Destaca visualmente o grupo selecionado

3. **editGrupoForm(id, nome)**
   - Abre modal `modal-edit-grupo`
   - Popula campos com dados do grupo

4. **updateGrupo(event)**
   - Submete form de edição de grupo
   - POST em `/api/grupo/{id}/update`
   - Recarrega página ao sucesso

5. **selectWorkspaceEmoji(emoji, event)**
   - Chamada ao clicar em emoji no modal de nova workspace
   - Atualiza input hidden `ws-emoji-select`
   - Destaca visualmente emoji selecionado

6. **createWorkspace()** [Atualizado]
   - Agora redireciona para `/?ws={id}` após criar
   - Em vez de recarregar página

#### app.js - Funções Modificadas

1. **fillEditForm(id, nome)** [Atualizado]
   - Agora reseta seleção de grupo
   - Inicializa `edit-projeto-grupo-id` como vazio
   - Reseta visual dos botões de grupo

2. **updateProjetoSubmit(event)** [Atualizado]
   - Agora envia `grupo_id` se selecionado
   - Permite trocar projeto entre grupos

#### dashboard/index.php - Alterações HTML

1. **Barra de Filtros** (linhas 17-26)
   - Cada grupo agora tem ícone de editar (lápis)
   - Ícone chama `editGrupoForm(id, nome)`
   - Grupos envolvidos em div para permitir ícone adjacente

2. **Modal: Editar Grupo** [NOVO]
   - ID: `modal-edit-grupo`
   - Campo: nome (obrigatório)
   - Botão: "Salvar" → chama `updateGrupo()`

3. **Modal: Novo Projeto** (linhas 140-150) [Atualizado]
   - Seletor de grupo com botões
   - "Sem grupo" + lista de grupos
   - Cada clica call `selectGrupo(id)`

4. **Modal: Editar Projeto** (linhas 161-185) [Atualizado]
   - Input hidden: `edit-projeto-grupo-id`
   - Seletor de grupo com botões
   - "Sem grupo" + lista de grupos
   - Cada click chama `selectEditGrupo(id)`

5. **Modal: Nova Workspace** (linhas 74-93) [Atualizado]
   - Removido: input de cor
   - Adicionado: grid de 12 emojis conhecidos
   - Cada emoji é botão click-selection
   - Primeiro emoji (💼) é padrão selecionado
   - Input hidden: `ws-emoji-select` armazena seleção

### Fluxo de Uso

#### Criar Novo Projeto em Grupo
1. Usuário clica "Novo projeto"
2. Modal abre com lista de grupos
3. Seleciona grupo (destaque visual)
4. Preenche nome e cria
5. Projeto aparece apenas no grupo selecionado

#### Mover Projeto Entre Grupos
1. Usuário clica menu (3 pontos) no card do projeto
2. Modal de editar abre
3. Seleciona novo grupo (destaque visual)
4. Clica "Salvar"
5. Projeto move para novo grupo

#### Editar Nome do Grupo
1. Usuário clica ícone de editar (lápis) ao lado do grupo
2. Modal abre com nome preenchido
3. Edita nome
4. Clica "Salvar"
5. Nome atualiza na barra de filtros

#### Criar Nova Workspace
1. Usuário clica "+" na sidebar
2. Modal abre com grid de emojis
3. Seleciona emoji (destaque com cor primária)
4. Preenche nome
5. Clica "Criar"
6. Redireciona para nova workspace

### Tabelas Utilizadas
- `grupos` - coluna `nome` pode ser atualizada
- `projetos` - coluna `grupo_id` pode ser nula ou ter ID
- `workspaces` - coluna `icone` recebe emoji, `cor` é padrão #0b0199

### Dependências e Integrações
- `Grupo::update()` - usa Model base para UPDATE
- `Projeto::workspaceProjects()` - já filtra corretamente por grupo
- `ApiController::updateProjeto()` - já aceita `grupo_id`
- Não há migração de banco necessária (colunas já existem)

### Testes Realizados/Pendentes
- ✅ selectGrupo() destaca visualmente
- ✅ Modal edit grupo aparece com dados
- ✅ updateGrupo() atualiza nome
- ✅ selectEditGrupo() no modal de editar projeto
- ✅ updateProjetoSubmit() envia grupo_id
- ✅ selectWorkspaceEmoji() destaca emoji
- ✅ createWorkspace() redireciona
- ⏳ Testar criação de projeto mantendo grupo
- ⏳ Testar movimento de projeto entre grupos
- ⏳ Testar edição de nome do grupo
- ⏳ Testar seleção de múltiplos emojis

---

## Especificação: Correções em Novos Projetos e Funcionalidades de Favoritos

**Data**: 2026-04-05
**Versão**: 2.0
**Objetivo**: Corrigir erros em novos projetos, implementar seleção visual de favoritos e grupo, e melhorar comportamento do filtro de favoritos.

### Problemas Corrigidos

1. ✅ **Erro `strtotime()` com `criado_em` NULL**
   - Projetos criados resultavam em erro de data nula
   - Causa: Campo `criado_em` não era preenchido ao criar projeto
   - Solução: Adicionado `criado_em` ao fillable e preenchido com data/hora atual

2. ✅ **Impossível trocar projeto para "Sem grupo"**
   - Ao editar, não conseguia remover o grupo de um projeto
   - Causa: Função `selectEditGrupo()` não tratava valor -1/vazio
   - Solução: Ajustado para enviar null quando "Sem grupo" é selecionado

3. ✅ **Sem interface visual para marcar favoritos**
   - Modal de editar projeto não tinha checkbox de favoritos
   - Card do projeto não tinha botão de estrela
   - Solução: Adicionado checkbox + botão de estrela na barra de ações

4. ✅ **Filtro de favoritos não funcionava corretamente**
   - Clique em "Favoritos" continuava mostrando todos os projetos
   - Solução: Separada a lógica no Controller para showFav=true

### Alterações no Backend

#### ApiController.php - createProjeto() [Atualizado]
```php
$id = Projeto::create([
    'nome'         => $nome,
    'workspace_id' => $ws,
    'favorito'     => isset($_POST['favorito']) ? 1 : 0,
    'grupo_id'     => isset($_POST['grupo_id']) && $_POST['grupo_id'] ? (int) $_POST['grupo_id'] : null,
    'criado_em'    => date('Y-m-d H:i:s'),  // ← NOVO
]);
```
- Adicionado `criado_em` com timestamp atual
- Aceita `favorito` como parâmetro

#### ApiController.php - updateProjeto() [Atualizado]
```php
public function updateProjeto(int $id): void {
    $data = [];
    if (isset($_POST['nome'])) $data['nome'] = trim($_POST['nome']);
    if (isset($_POST['grupo_id'])) $data['grupo_id'] = $_POST['grupo_id'] !== '' ? (int) $_POST['grupo_id'] : null;
    if (isset($_POST['favorito'])) $data['favorito'] = (int) $_POST['favorito'];
    // ...
}
```
- Agora aceita `favorito` como parâmetro
- Trata `grupo_id` vazio como NULL

#### Models/Projeto.php - $fillable [Atualizado]
```php
protected static array $fillable = ['nome', 'favorito', 'workspace_id', 'grupo_id', 'criado_em'];
```
- Adicionado `criado_em` para permitir preenchimento manual

#### Controllers/DashboardController.php - index() [Atualizado]
```php
$showFav = !empty($_GET['fav']);

if ($showFav) {
    $projetos = Projeto::favorites($activeWs);
    $favoritos = [];
} else {
    // ... resto da lógica
}
```
- Lógica separada para quando filtro de favoritos está ativo
- Quando `fav=1`: mostra apenas projetos favoritos
- Quando normal: mostra favoritos + todos/grupo

### Alterações no Frontend

#### app.js - Novas Funções

1. **toggleFavorite(id)** [Atualizada]
   - Agora atualiza ícone de estrela em tempo real
   - Controla a cor do ícone (ouro = favorito, cinza = não)
   - Adiciona/remove badge de estrela no card
   ```javascript
   const starBtn = card.querySelector('button[onclick*="toggleFavorite"]');
   const starIcon = starBtn?.querySelector('i');
   // Alterna entre bi-star-fill (ouro) e bi-star (cinza)
   ```

#### app.js - Funções Modificadas

1. **fillEditForm(id, nome)** [Atualizada]
   - Agora reseta checkbox de favoritos
   - Inicializa `edit-projeto-favorito` como unchecked
   ```javascript
   document.getElementById('edit-projeto-favorito').checked = false;
   ```

2. **updateProjetoSubmit(event)** [Atualizada]
   - Captura estado do checkbox de favoritos
   - Envia `favorito` junto com os dados
   ```javascript
   const favorito = document.getElementById('edit-projeto-favorito').checked ? 1 : 0;
   fd.append('favorito', favorito);
   ```

#### Views/dashboard/index.php - Alterações

1. **Card do Projeto** [Atualizado]
   - Novo botão de estrela lado do menu
   - Ícone dinâmico: `bi-star-fill` (favorito) ou `bi-star` (não-favorito)
   - Cor dinâmica: `#d97706` (ouro) ou `inherit` (cinza)
   ```html
   <button type="button" onclick="toggleFavorite(<?= $p['id'] ?>)">
       <i class="bi <?= $p['favorito'] ? 'bi-star-fill' : 'bi-star' ?>"
          style="color:<?= $p['favorito'] ? '#d97706' : 'inherit' ?>">
       </i>
   </button>
   ```

2. **Modal: Editar Projeto** [Atualizado]
   - Novo checkbox para marcar como favorito
   - Posicionado antes do seletor de grupo
   ```html
   <label>
       <input type="checkbox" id="edit-projeto-favorito" name="favorito">
       <i class="bi bi-star-fill"></i> Adicionar aos favoritos
   </label>
   ```

3. **Seção de Favoritos** [Atualizada]
   - Quando `showFav=true`: mostra APENAS favoritos
   - Quando `showFav=false`: comportamento anterior (favoritos + projetos normais)
   - Mensagem visual quando não há favoritos:
   ```html
   <div style="...">
       <i class="bi bi-star" style="..."></i>
       <p>Nenhum projeto marcado como favorito</p>
   </div>
   ```

### Fluxo de Uso

#### Marcar Projeto como Favorito
1. Usuário clica na estrela vazia no card → estrela fica cheia e ouro
2. OU abre modal de editar, marca checkbox "Adicionar aos favoritos" e salva
3. Projeto aparece na seção "Favoritos" (quando em "Todos")

#### Visualizar Apenas Favoritos
1. Usuário clica em "⭐ Favoritos" na barra de filtros
2. Página mostra apenas projetos marcados como favorito
3. Clica em "Todos" para voltar ao normal

#### Remover de Favoritos
1. Usuário clica na estrela cheia (ouro) no card → estrela fica vazia
2. Projeto desaparece da seção "Favoritos"
3. OU edita projeto e desmarcar checkbox

### Tabelas Utilizadas
- `projetos` - colunas `favorito`, `grupo_id`, `criado_em`

### Testes Realizados
- ✅ Criar projeto com `criado_em` preenchido (sem erro strtotime)
- ✅ Botão de estrela muda de vazio para cheio
- ✅ Cor da estrela alterna entre ouro e cinza
- ✅ Checkbox de favoritos no modal de editar
- ✅ Filtro de favoritos mostra apenas favoritos
- ✅ Clique em "Todos" volta ao normal
- ✅ Mensagem de "Nenhum favorito" aparece quando vazio
- ✅ Trocar para "Sem grupo" funciona corretamente

### Diferenças de Comportamento

| Antes | Depois |
|-------|--------|
| Erro ao criar projeto (strtotime NULL) | Projeto criado com data correta |
| Sem botão de favoritos no card | Botão de estrela clicável no card |
| Nem sempre conseguia enviar favoritos | Checkbox dedicado no modal |
| Filtro de favoritos mostrava tudo | Filtro mostra apenas favoritos |
| Não conseguia remover grupo | Botão "Sem grupo" funciona |
| Sem feedback visual de seleção | Ícone muda cor (ouro/cinza) |