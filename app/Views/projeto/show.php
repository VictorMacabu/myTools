<?php $basePath = '/'; ?>
<div class="proj-shell">
    <!-- Topbar -->
    <div class="proj-topbar">
        <a href="/?ws=<?= $projeto['workspace_id'] ?>" class="topbar-back " title="Voltar">
            <i class="bi bi-arrow-left"></i>
        </a>
        <span class="topbar-title"><?= htmlspecialchars($projeto['nome']) ?></span>
        <span class="topbar-ws-chip"><?= htmlspecialchars($projeto['workspace_icone']) ?> <?= htmlspecialchars($projeto['workspace_nome']) ?></span>
    </div>

    <div class="proj-tabs" role="tablist" aria-label="Abas do projeto">
        <button type="button" id="tab-btn-tarefas" class="proj-tab-btn active" role="tab" aria-selected="true" onclick="setProjectTab('tarefas')">Tarefas</button>
        <button type="button" id="tab-btn-chat" class="proj-tab-btn" role="tab" aria-selected="false" onclick="setProjectTab('chat')">Chat &amp; Fontes</button>
        <button type="button" id="tab-btn-fluxos" class="proj-tab-btn" role="tab" aria-selected="false" onclick="setProjectTab('fluxos')">Fluxos</button>
    </div>

    <section id="project-tab-tarefas" class="project-tab-panel project-tab-panel--tasks">
        <?php include __DIR__ . '/partials/_tarefas.php'; ?>
    </section>

    <section id="project-tab-chat" class="project-tab-panel project-tab-panel--chat" hidden>
    <!-- Tripartite layout -->
    <div class="proj-body-wrap">
        <!-- LEFT: Fontes -->
        <div class="panel panel-left">
            <div class="panel-header">
                Fontes
                <button type="button" class="btn-dots btn-sm" onclick="openModal('modal-add-fonte')" title="Adicionar fonte"><i class="bi bi-plus"></i></button>
            </div>
            <div class="panel-scroll" id="fontes-list">
                <?php if (empty($fontes)): ?>
                <div style="text-align:center;color:var(--text-3);font-size:12px;padding:24px 8px;">
                    <i class="bi bi-inbox" style="font-size:24px;opacity:.5"></i>
                    <p style="margin:8px 0 0">Nenhuma fonte adicionada</p>
                </div>
                <?php endif; ?>
                <?php foreach ($fontes as $f): ?>
                <?php $sizeMb = number_format(((float)($f['tamanho_kb'] ?? 0)) / 1024, 2, '.', ''); ?>
                <div class="fonte-item" data-id="<?= $f['id'] ?>" data-tipo="<?= $f['tipo'] ?>" onclick="toggleFonte(this, <?= $f['id'] ?>)">
                    <div class="fonte-check"></div>
                    <div class="fonte-main">
                        <i class="bi <?= \App\Models\TipoArquivo::icon($f['tipo']) ?> fonte-icon"></i>
                        <div class="fonte-info">
                            <div class="fonte-nome" title="<?= htmlspecialchars($f['nome']) ?>"><?= htmlspecialchars($f['nome']) ?></div>
                            <div class="fonte-meta">
                                <span class="fonte-tipo"><?= htmlspecialchars($f['tipo']) ?></span>
                                <span class="fonte-size"><?= $sizeMb ?> MB</span>
                            </div>
                        </div>
                    </div>
                    <div class="fonte-actions">
                        <button type="button" class="fonte-action" onclick="downloadFonte(event, <?= $f['id'] ?>, '<?= htmlspecialchars($f['nome'], ENT_QUOTES) ?>')" title="Download">
                            <i class="bi bi-download"></i>
                        </button>
                        <button type="button" class="fonte-action danger" onclick="event.stopPropagation();deleteFonte(<?= $f['id'] ?>)" title="Remover">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
        </div>

        <!-- CENTER: Chat -->
        <div class="panel panel-main">
            <div class="panel-header">Chat</div>
            <div class="chat-messages" id="chat-messages">
                <div class="chat-empty" id="chat-placeholder">
                    <i class="bi bi-chat-dots"></i>
                    <p>Selecione fontes para iniciar o chat</p>
                </div>
            </div>
            <div class="chat-input-area" id="chat-input-area">
                <div class="chat-counter" id="chat-counter">
                    <span class="dot off" id="counter-dot"></span>
                    <span id="counter-text">0 fontes selecionadas</span>
                </div>
                <div id="chat-disabled-msg" class="chat-inactive-msg">
                    <i class="bi bi-lock"></i> Selecione ao menos uma fonte para habilitar o chat
                </div>
                <div id="chat-form" class="hidden">
                    <div style="display:flex;gap:8px">
                        <textarea id="chat-input" placeholder="Sua mensagem..." rows="2" style="flex:1;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-md);font-size:14px;font-family:var(--font-sans);resize:none;"></textarea>
                        <button class="btn btn-primary" onclick="sendChatMessage()" style="align-self:flex-end;padding:8px 16px">
                            <i class="bi bi-send"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- RIGHT: Ferramentas -->
        <div class="panel panel-right">
            <div class="panel-header">Ferramentas</div>
            <div class="panel-scroll">
                <div class="tool-section-label">Mídia</div>

                <button type="button" class="btn btn-secondary" onclick="openAudioCutter()">
                    <i class="bi bi-scissors"></i> Cortar &aacute;udio
                </button>

                <button type="button" class="btn btn-secondary" onclick="openTranscricao()">
                    <i class="bi bi-mic"></i> Transcrever &aacute;udio
                </button>

                <div class="tool-section-label">Visualizar</div>

                <button type="button" class="btn btn-secondary" onclick="openMediaViewer()">
                    <i class="bi bi-play-btn"></i> Player de &aacute;udio/vídeo
                </button>

                <button type="button" class="btn btn-secondary" onclick="openImageViewer()">
                    <i class="bi bi-image"></i> Visualizar imagem
                </button>

                <div class="tool-section-label">Documento</div>

                <button type="button" class="btn btn-secondary" onclick="openTextEditor()">
                    <i class="bi bi-pencil-square"></i> Editor de texto
                </button>
            </div>
        </div>
    </div>
    </section>

    <section id="project-tab-fluxos" class="project-tab-panel project-tab-panel--flows" hidden>
        <?php include __DIR__ . '/partials/_fluxos.php'; ?>
    </section>
</div>

<?php include __DIR__ . '/partials/_tarefas_modal.php'; ?>

<!-- Modal: Adicionar Fonte -->
<div class="modal-overlay hidden" id="modal-add-fonte">
    <div class="modal-box">
        <span class="modal-close" onclick="closeModal('modal-add-fonte')">&times;</span>
        <div class="modal-title">Adicionar fonte</div>
        <form id="form-upload-fonte" onsubmit="uploadFonte(event)">
            <div style="border:2px dashed var(--border-strong);border-radius:var(--radius-lg);padding:32px;text-align:center;">
                <i class="bi bi-cloud-arrow-up" style="font-size:32px;color:var(--text-3)"></i>
                <p style="color:var(--text-3);margin:8px 0">Arraste arquivos ou clique para selecionar</p>
                <input type="file" name="arquivo" id="file-select" multiple
                       style="display:none" accept="audio/*,video/*,image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.srt,.vtt"
                       onchange="handleFileSelect(this)">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('file-select').click()">
                    <i class="bi bi-paperclip"></i> Selecionar arquivos
                </button>
            </div>
            <div id="upload-progress" style="margin-top:12px"></div>
        </form>
    </div>
</div>

<!-- Modal: Cortar áudio -->
<div class="modal-overlay hidden" id="modal-cortar-audio">
    <div class="modal-box audio-cutter-modal">
        <span class="modal-close" onclick="closeModal('modal-cortar-audio')">&times;</span>
        <div class="modal-title">Cortar &aacute;udio</div>
        <form id="form-cortar-audio" onsubmit="return false;">
            <div class="audio-cutter-field">
                <label>Selecione o &aacute;udio</label>
                <select id="cortar-audio-select" class="audio-cutter-select">
                    <option value="">Carregando...</option>
                </select>
            </div>
            <div id="cortar-audio-info" class="hidden audio-cutter-info">
                <span>Dura&ccedil;&atilde;o: <strong id="cortar-duracao">--:--</strong></span>
                <span>Sele&ccedil;&atilde;o: <strong id="cortar-selecao">--:--</strong></span>
            </div>

            <div class="hidden audio-cutter-controls" id="cortar-audio-controls">
                <audio id="cortar-audio-player" class="audio-cutter-player" controls preload="metadata"></audio>

                <div class="audio-cutter-selection">
                    <div class="audio-cutter-selection-header">
                        <span>In&iacute;cio: <strong id="start-label">0:00</strong></span>
                        <span>Fim: <strong id="end-label">0:00</strong></span>
                    </div>
                    <div class="audio-cutter-range-wrap">
                        <div id="cortar-start-tip" class="audio-cutter-tip start">0:00</div>
                        <div id="cortar-end-tip" class="audio-cutter-tip end">0:00</div>
                        <div class="audio-cutter-range-track"></div>
                        <div id="cortar-range-fill" class="audio-cutter-range-fill"></div>
                        <input type="range" id="cortar-start" min="0" max="0" value="0" step="0.1"
                               class="audio-cutter-range" oninput="updateCutterLabels('start')">
                        <input type="range" id="cortar-end" min="0" max="0" value="0" step="0.1"
                               class="audio-cutter-range" oninput="updateCutterLabels('end')">
                    </div>
                </div>

                <button type="button" class="btn btn-secondary" onclick="reproduzirTrechoSelecionado()" style="width:100%;margin-bottom:12px;">
                    <i class="bi bi-play-fill"></i> Reproduzir trecho selecionado
                </button>

                <div class="audio-cutter-field">
                    <label>Nome do novo trecho</label>
                    <input type="text" id="cortar-nome" class="audio-cutter-input" placeholder="Ex: trecho_intro">
                </div>

                <div class="audio-cutter-actions">
                    <button id="cortar-btn-remove" type="button" class="btn btn-danger" onclick="cortarAudio('remove')">
                        <i class="bi bi-eraser"></i> Apagar trecho selecionado
                    </button>
                    <button id="cortar-btn-extract" type="button" class="btn btn-primary" onclick="cortarAudio('extract')">
                        <i class="bi bi-scissors"></i> Salvar trecho em Fontes
                    </button>
                </div>
            </div>
        </form>
    </div>
</div>

<!-- Modal: Media Viewer -->
<div class="modal-overlay hidden" id="modal-media-viewer">
    <div class="modal-box" style="width:640px">
        <span class="modal-close" onclick="closeModal('modal-media-viewer')">&times;</span>
        <div class="modal-title">Player de m&iacute;dia</div>
        <select id="media-select" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius-md);font-size:14px;margin-bottom:12px;">
            <option value="">Selecionar arquivo...</option>
        </select>
        <div id="media-container"></div>
    </div>
</div>

<!-- Modal: Image Viewer -->
<div class="modal-overlay hidden" id="modal-image-viewer">
    <div class="modal-box" style="width:640px">
        <span class="modal-close" onclick="closeModal('modal-image-viewer')">&times;</span>
        <div class="modal-title">Visualizar imagem</div>
        <select id="image-select" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius-md);font-size:14px;margin-bottom:12px;">
            <option value="">Selecionar imagem...</option>
        </select>
        <div id="image-container" style="max-height:70vh;overflow:auto;text-align:center"></div>
    </div>
</div>

<!-- Modal: Text Editor -->
<div class="modal-overlay hidden" id="modal-text-editor">
    <div class="modal-box" style="width:640px">
        <span class="modal-close" onclick="closeModal('modal-text-editor')">&times;</span>
        <div class="modal-title">Editor de texto</div>
        <select id="text-select" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius-md);font-size:14px;margin-bottom:12px;">
            <option value="">Selecionar documento de texto...</option>
        </select>
        <textarea id="text-editor-area" rows="20" style="width:100%;padding:12px;border:1px solid var(--border);border-radius:var(--radius-md);font-size:14px;font-family:var(--font-mono);resize:vertical;"></textarea>
        <button class="btn btn-primary" onclick="salvarTexto()" style="width:100%;margin-top:12px">Salvar</button>
    </div>
</div>

<!-- Modal: Transcrever -->
<div class="modal-overlay hidden" id="modal-transcrever">
    <div class="modal-box">
        <span class="modal-close" onclick="closeModal('modal-transcrever')">&times;</span>
        <div class="modal-title">Transcrever &aacute;udio</div>
        <div id="transcrever-arquivo-atual" class="transcription-file-name hidden" aria-live="polite"></div>
        <p style="color:var(--text-3);font-size:13px;margin-bottom:12px">
            Selecione um &aacute;udio da lista de fontes para transcrever
        </p>
        <select id="transcrever-select" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius-md);font-size:14px;margin-bottom:12px;">
            <option value="">Selecionar &aacute;udio...</option>
        </select>
        <div id="transcrever-status" class="transcription-status hidden" aria-live="polite">
            <div id="transcrever-status-msg" class="transcription-status-msg"></div>
        </div>
        <button id="transcrever-btn" class="btn btn-primary" onclick="transcreverAudio(event)" style="width:100%">
            <i class="bi bi-mic"></i> Transcrever
        </button>
        <button id="transcrever-cancel-btn" class="btn btn-secondary hidden" onclick="cancelarTranscricao()" style="width:100%;margin-top:8px">
            <i class="bi bi-x-circle"></i> Cancelar transcri&ccedil;&atilde;o
        </button>
    </div>
</div>

<script>
const PROJETO_ID = <?= $projeto['id'] ?>;
const FONTES = <?= json_encode($fontes, JSON_UNESCAPED_UNICODE) ?>;
</script>
