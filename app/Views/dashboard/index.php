<?php $basePath = '/'; ?>
<div class="dash-wrap">
    <!-- Header -->
    <div class="dash-header">
        <div>
            <span class="dash-header__ws-label"><?= htmlspecialchars($wsSelected['icone']) ?> <?= htmlspecialchars($wsSelected['nome']) ?></span>
            <h1>Projetos</h1>
        </div>
    </div>

    <!-- Filter bar -->
    <div class="filter-bar">
        <a href="<?= $basePath ?>?ws=<?= $activeWs ?>" class="fpill <?= $activeGroup === 'all' && empty($_GET['fav']) ? 'active' : '' ?>">Todos</a>
        <a href="<?= $basePath ?>?ws=<?= $activeWs ?>&fav=1" class="fpill <?= !empty($_GET['fav']) ? 'fav' : '' ?>">
            <i class="bi bi-star-fill"></i> Favoritos
        </a>
        <?php foreach ($grupos as $g): ?>
        <div style="display:flex;align-items:center;gap:0;position:relative">
            <a href="<?= $basePath ?>?ws=<?= $activeWs ?>&grupo=<?= $g['id'] ?>" class="fpill <?= $activeGroup == $g['id'] ? 'active' : '' ?>" style="display:flex;align-items:center;gap:8px;padding-right:8px">
                <?= htmlspecialchars($g['nome']) ?>
                <button type="button" onclick="event.preventDefault(); event.stopPropagation(); editGrupoForm(<?= $g['id'] ?>, '<?= htmlspecialchars($g['nome'], ENT_QUOTES) ?>')" title="Editar grupo" style="background:none;border:none;cursor:pointer;padding:0;color:inherit;display:flex;align-items:center;justify-content:center;width:20px;height:20px">
                    <i class="bi bi-three-dots-vertical" style="font-size:14px"></i>
                </button>
            </a>
        </div>
        <?php endforeach; ?>
        <button class="fpill" onclick="openModal('modal-new-grupo')">
            <i class="bi bi-plus"></i> Novo grupo
        </button>
    </div>

    <!-- Favorites section (only when showFav=true) -->
    <?php if ($showFav): ?>
    <div class="group-label"><i class="bi bi-star-fill"></i> Favoritos</div>
    <div class="proj-grid">
        <?php if (!empty($projetos)): ?>
            <?php foreach ($projetos as $p): ?>
                <?php include __DIR__ . '/partials/_proj_card.php'; ?>
            <?php endforeach; ?>
        <?php else: ?>
            <div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:var(--text-2)">
                <i class="bi bi-star" style="font-size:48px;margin-bottom:16px;display:block;opacity:0.5"></i>
                <p>Nenhum projeto marcado como favorito</p>
            </div>
        <?php endif; ?>
    </div>
    <?php else: ?>
        <!-- Regular view: Favorites section (if any) -->
        <?php if (!empty($favoritos) && empty($_GET['grupo'])): ?>
        <div class="group-label"><i class="bi bi-star-fill"></i> Favoritos</div>
        <div class="proj-grid">
            <?php foreach ($favoritos as $p): ?>
                <?php include __DIR__ . '/partials/_proj_card.php'; ?>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>

        <!-- All projects or group filtered -->
        <div class="group-label"><i class="bi bi-collection"></i>
            <?php
            $groupNameLabel = 'Todos os projetos';
            if ($activeGroup && $activeGroup !== 'all') {
                foreach ($grupos as $g) {
                    if ($g['id'] == $activeGroup) {
                        $groupNameLabel = $g['nome'];
                        break;
                    }
                }
            }
            ?>
            <?= htmlspecialchars($groupNameLabel) ?>
        </div>
        <div class="proj-grid">
            <?php foreach ($projetos as $p): ?>
                <?php include __DIR__ . '/partials/_proj_card.php'; ?>
            <?php endforeach; ?>
            <!-- New project card -->
            <div class="proj-card new-proj-card" onclick="openModal('modal-new-projeto')">
                <i class="bi bi-plus-lg proj-card__novo-icon"></i>
                <span class="proj-card__novo-label">Novo projeto</span>
            </div>
        </div>
    <?php endif; ?>
</div>

<!-- Modal: Novo Workspace -->
<div class="modal-overlay hidden" id="modal-new-workspace">
    <div class="modal-box">
        <span class="modal-close" onclick="closeModal('modal-new-workspace')">&times;</span>
        <div class="modal-title">Nova &#225;rea de trabalho</div>
        <form id="form-new-ws" onsubmit="createWorkspace(event)">
            <div style="margin-bottom:12px">
                <label>Nome</label>
                <input type="text" name="nome" placeholder="Ex: Pessoal, Trabalho..." required style="width:100%;padding:8px 12px;border:1px solid #e5e7eb;border-radius:var(--radius-md);font-size:14px;">
            </div>
            <div style="margin-bottom:16px">
                <label>Ícone (emoji)</label>
                <input type="hidden" id="ws-emoji-select" name="icone" value="💼">
                <div id="ws-emoji-container" style="overflow:hidden;transition:max-height 0.3s ease;max-height:60px">
                    <div id="ws-emoji-list" style="display:grid;grid-template-columns:repeat(6, 1fr);gap:8px;margin-top:8px">
                        <button type="button" onclick="selectWorkspaceEmoji('💼', event)" style="padding:8px;border-radius:var(--radius-md);border:2px solid var(--primary);background:var(--primary);cursor:pointer;font-size:20px;color:white">💼</button>
                        <button type="button" onclick="selectWorkspaceEmoji('📚', event)" style="padding:8px;border-radius:var(--radius-md);border:2px solid var(--border);background:var(--surface);cursor:pointer;font-size:20px">📚</button>
                        <button type="button" onclick="selectWorkspaceEmoji('🎯', event)" style="padding:8px;border-radius:var(--radius-md);border:2px solid var(--border);background:var(--surface);cursor:pointer;font-size:20px">🎯</button>
                        <button type="button" onclick="selectWorkspaceEmoji('🚀', event)" style="padding:8px;border-radius:var(--radius-md);border:2px solid var(--border);background:var(--surface);cursor:pointer;font-size:20px">🚀</button>
                        <button type="button" onclick="selectWorkspaceEmoji('💡', event)" style="padding:8px;border-radius:var(--radius-md);border:2px solid var(--border);background:var(--surface);cursor:pointer;font-size:20px">💡</button>
                        <button type="button" onclick="selectWorkspaceEmoji('🎨', event)" style="padding:8px;border-radius:var(--radius-md);border:2px solid var(--border);background:var(--surface);cursor:pointer;font-size:20px">🎨</button>
                        <button type="button" onclick="selectWorkspaceEmoji('📊', event)" style="padding:8px;border-radius:var(--radius-md);border:2px solid var(--border);background:var(--surface);cursor:pointer;font-size:20px">📊</button>
                        <button type="button" onclick="selectWorkspaceEmoji('📱', event)" style="padding:8px;border-radius:var(--radius-md);border:2px solid var(--border);background:var(--surface);cursor:pointer;font-size:20px">📱</button>
                        <button type="button" onclick="selectWorkspaceEmoji('🏢', event)" style="padding:8px;border-radius:var(--radius-md);border:2px solid var(--border);background:var(--surface);cursor:pointer;font-size:20px">🏢</button>
                        <button type="button" onclick="selectWorkspaceEmoji('⚙️', event)" style="padding:8px;border-radius:var(--radius-md);border:2px solid var(--border);background:var(--surface);cursor:pointer;font-size:20px">⚙️</button>
                        <button type="button" onclick="selectWorkspaceEmoji('📝', event)" style="padding:8px;border-radius:var(--radius-md);border:2px solid var(--border);background:var(--surface);cursor:pointer;font-size:20px">📝</button>
                        <button type="button" onclick="selectWorkspaceEmoji('🔧', event)" style="padding:8px;border-radius:var(--radius-md);border:2px solid var(--border);background:var(--surface);cursor:pointer;font-size:20px">🔧</button>
                        <button type="button" onclick="selectWorkspaceEmoji('⌚', event)" style="padding:8px;border-radius:var(--radius-md);border:2px solid var(--border);background:var(--surface);cursor:pointer;font-size:20px">⌚</button>
                        <button type="button" onclick="selectWorkspaceEmoji('☕', event)" style="padding:8px;border-radius:var(--radius-md);border:2px solid var(--border);background:var(--surface);cursor:pointer;font-size:20px">☕</button>
                        <button type="button" onclick="selectWorkspaceEmoji('⛵', event)" style="padding:8px;border-radius:var(--radius-md);border:2px solid var(--border);background:var(--surface);cursor:pointer;font-size:20px">⛵</button>
                        <button type="button" onclick="selectWorkspaceEmoji('⛹', event)" style="padding:8px;border-radius:var(--radius-md);border:2px solid var(--border);background:var(--surface);cursor:pointer;font-size:20px">⛹</button>
                        <button type="button" onclick="selectWorkspaceEmoji('🚲', event)" style="padding:8px;border-radius:var(--radius-md);border:2px solid var(--border);background:var(--surface);cursor:pointer;font-size:20px">🚲</button>
                        <button type="button" onclick="selectWorkspaceEmoji('🛫', event)" style="padding:8px;border-radius:var(--radius-md);border:2px solid var(--border);background:var(--surface);cursor:pointer;font-size:20px">🛫</button>
                        <button type="button" onclick="selectWorkspaceEmoji('🛹', event)" style="padding:8px;border-radius:var(--radius-md);border:2px solid var(--border);background:var(--surface);cursor:pointer;font-size:20px">🛹</button>
                        <button type="button" onclick="selectWorkspaceEmoji('🛸', event)" style="padding:8px;border-radius:var(--radius-md);border:2px solid var(--border);background:var(--surface);cursor:pointer;font-size:20px">🛸</button>
                        <button type="button" onclick="selectWorkspaceEmoji('🛵', event)" style="padding:8px;border-radius:var(--radius-md);border:2px solid var(--border);background:var(--surface);cursor:pointer;font-size:20px">🛵</button>
                        <button type="button" onclick="selectWorkspaceEmoji('🤖', event)" style="padding:8px;border-radius:var(--radius-md);border:2px solid var(--border);background:var(--surface);cursor:pointer;font-size:20px">🤖</button>
                    </div>
                </div>
                <button type="button" id="ws-emoji-toggle" onclick="toggleEmojiList(event)" style="width:100%;padding:8px;margin-top:8px;border:1px solid var(--border);background:var(--surface);border-radius:var(--radius-md);cursor:pointer;font-size:12px;color:var(--text);font-family:var(--font-sans);">Ver mais ícones</button>
            </div>
            <div style="margin-bottom:16px">
                <label>Cor</label>
                <input type="color" id="ws-color-select" name="cor" value="#F5F5F5" style="width:80px;height:35px;border:1px solid var(--border);cursor:pointer;border-radius:var(--radius-md);">
            </div>
            <button type="submit" class="btn-primary" style="width:100%">Criar</button>
        </form>
    </div>
</div>

<!-- Modal: Novo Grupo -->
<div class="modal-overlay hidden" id="modal-new-grupo">
    <div class="modal-box">
        <span class="modal-close" onclick="closeModal('modal-new-grupo')">&times;</span>
        <div class="modal-title">Novo grupo</div>
        <form id="form-new-grupo" onsubmit="createGrupo(event)">
            <input type="hidden" name="workspace_id" value="<?= $activeWs ?>">
            <div style="margin-bottom:12px">
                <label>Nome</label>
                <input type="text" name="nome" placeholder="Ex: Prioridade, Em andamento..." required style="width:100%;padding:8px 12px;border:1px solid #e5e7eb;border-radius:var(--radius-md);font-size:14px;">
            </div>
            <div style="margin-bottom:16px">
                <label>Cor</label>
                <input type="color" name="cor" value="#e5e7eb" style="width:50px;height:35px;border:none;cursor:pointer;border-radius:var(--radius-sm);">
            </div>
            <button type="submit" class="btn-primary" style="width:100%">Criar</button>
        </form>
    </div>
</div>

<!-- Modal: Editar Grupo -->
<div class="modal-overlay hidden" id="modal-edit-grupo">
    <div class="modal-box">
        <span class="modal-close" onclick="closeModal('modal-edit-grupo')">&times;</span>
        <div class="modal-title">Editar grupo</div>
        <form id="form-edit-grupo" onsubmit="updateGrupo(event)">
            <input type="hidden" id="edit-grupo-id">
            <div style="margin-bottom:12px">
                <label>Nome</label>
                <input type="text" id="edit-grupo-nome" name="nome" required style="width:100%;padding:8px 12px;border:1px solid #e5e7eb;border-radius:var(--radius-md);font-size:14px;">
            </div>
            <button type="submit" class="btn-primary" style="width:100%">Salvar</button>
        </form>
        <div style="margin-top:12px">
            <button type="button" onclick="deleteGrupo()" style="width:100%;padding:10px 16px;border-radius:var(--radius-md);border:1px solid var(--danger);background:var(--danger-light);color:var(--danger);cursor:pointer;font-family:var(--font-sans);font-size:14px;">
                <i class="bi bi-trash"></i> Excluir grupo
            </button>
        </div>
    </div>
</div>

<!-- Modal: Novo Projeto -->
<div class="modal-overlay hidden" id="modal-new-projeto">
    <div class="modal-box">
        <span class="modal-close" onclick="closeModal('modal-new-projeto')">&times;</span>
        <div class="modal-title">Novo projeto</div>
        <form id="form-new-projeto" onsubmit="createProjeto(event)">
            <input type="hidden" name="workspace_id" value="<?= $activeWs ?>">
            <input type="hidden" name="grupo_id" id="new-projeto-grupo-id" value="">
            <div style="margin-bottom:12px">
                <label>Nome</label>
                <input type="text" name="nome" placeholder="Nome do projeto" required style="width:100%;padding:8px 12px;border:1px solid #e5e7eb;border-radius:var(--radius-md);font-size:14px;">
            </div>
            <?php if (!empty($grupos)): ?>
            <div style="margin-bottom:16px">
                <label>Grupo (opcional)</label>
                <div id="new-projeto-grupo-list" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
                    <button type="button" onclick="selectGrupo(-1)" style="padding:4px 12px;border-radius:99px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:12px;color:var(--text);">Sem grupo</button>
                    <?php foreach ($grupos as $g): ?>
                    <button type="button" onclick="selectGrupo(<?= $g['id'] ?>)" style="padding:4px 12px;border-radius:99px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:12px;color:var(--text);"><?= htmlspecialchars($g['nome']) ?></button>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php endif; ?>
            <button type="submit" class="btn-primary" style="width:100%">Criar</button>
        </form>
    </div>
</div>

<!-- Modal: Editar Projeto -->
<div class="modal-overlay hidden" id="modal-edit-projeto">
    <div class="modal-box">
        <span class="modal-close" onclick="closeModal('modal-edit-projeto')">&times;</span>
        <div class="modal-title">Editar projeto</div>
        <form id="form-edit-projeto" onsubmit="updateProjetoSubmit(event)">
            <input type="hidden" id="edit-projeto-id">
            <input type="hidden" id="edit-projeto-grupo-id" name="grupo_id">
            <div style="margin-bottom:12px">
                <label>Nome</label>
                <input type="text" id="edit-projeto-nome" name="nome" required style="width:100%;padding:8px 12px;border:1px solid #e5e7eb;border-radius:var(--radius-md);font-size:14px;">
            </div>
            <div style="margin-bottom:16px">
                <label>
                    <input type="checkbox" id="edit-projeto-favorito" name="favorito" style="margin-right:8px">
                    <i class="bi bi-star-fill" style="color:#d97706"></i> Adicionar aos favoritos
                </label>
            </div>
            <?php if (!empty($grupos)): ?>
            <div style="margin-bottom:16px">
                <label>Grupo</label>
                <div id="edit-projeto-grupo-list" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
                    <button type="button" onclick="event.preventDefault(); selectEditGrupo(-1)" style="padding:4px 12px;border-radius:99px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:12px;color:var(--text);">Sem grupo</button>
                    <?php foreach ($grupos as $g): ?>
                    <button type="button" onclick="event.preventDefault(); selectEditGrupo(<?= $g['id'] ?>)" style="padding:4px 12px;border-radius:99px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:12px;color:var(--text);"><?= htmlspecialchars($g['nome']) ?></button>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php endif; ?>
            <button type="submit" class="btn-primary" style="width:100%">Salvar</button>
        </form>
        <div style="margin-top:12px">
            <button type="button" onclick="deleteProjeto()" style="width:100%;padding:10px 16px;border-radius:var(--radius-md);border:1px solid var(--danger);background:var(--danger-light);color:var(--danger);cursor:pointer;font-family:var(--font-sans);font-size:14px;">
                <i class="bi bi-trash"></i> Excluir projeto
            </button>
        </div>
    </div>
</div>

<script>
const WS_ID = <?= $activeWs ?>;
const GRUPOS = <?= json_encode($grupos, JSON_UNESCAPED_UNICODE) ?>;
</script>
