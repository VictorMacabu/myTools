<div class="flows-shell">
    <div class="flows-toolbar">
        <div>
            <div class="flows-kicker">Fluxos</div>
            <h2 class="flows-title">Editor de diagramas</h2>
            <p class="flows-subtitle">Crie diagramas manualmente, importe arquivos ou gere com ajuda da IA.</p>
        </div>
        <div class="flows-toolbar-actions">
            <button type="button" class="btn btn-secondary" onclick="newFlow()">
                <i class="bi bi-plus-lg"></i> Novo fluxo
            </button>
            <button type="button" class="btn btn-primary" onclick="saveCurrentFlow()">
                <i class="bi bi-save"></i> Salvar
            </button>
        </div>
    </div>

    <div class="flow-tabs-bar">
        <div id="flow-tabs" class="flow-tabs" aria-label="Fluxos abertos"></div>
    </div>

    <div class="flows-layout">
        <section class="flow-canvas-panel">
            <div class="flow-panel-header">
                <div class="flow-panel-header-title">
                    <strong>Canvas</strong>
                    <span id="flow-current-title" class="flow-current-title">Fluxo sem titulo</span>
                    <span id="flow-dirty-pill" class="flow-dirty-pill hidden">Alteracoes nao salvas</span>
                </div>
                <div class="flow-panel-header-actions">
                    <button type="button" class="btn btn-sm btn-secondary" onclick="openFlowSettingsModal()">
                        <i class="bi bi-pencil-square"></i> Editar fluxo
                    </button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="toggleConnectMode()">
                        <i class="bi bi-bezier2"></i> <span id="flow-connect-label">Conectar nodes</span>
                    </button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="openExportModal()">
                        <i class="bi bi-download"></i> Exportar
                    </button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="deleteSelectedFlowElement()">
                        <i class="bi bi-trash"></i> Excluir selecionado
                    </button>
                </div>
            </div>

            <div class="flow-canvas-wrap">
                <div class="flow-canvas" id="flow-canvas">
                    <div class="flow-canvas-controls" aria-label="Controles do canvas">
                        <button type="button" class="flow-canvas-control-btn" title="Zoom in" aria-label="Zoom in" onclick="zoomFlowCanvasIn()">
                            <i class="bi bi-plus-lg"></i>
                        </button>
                        <button type="button" class="flow-canvas-control-btn" title="Zoom out" aria-label="Zoom out" onclick="zoomFlowCanvasOut()">
                            <i class="bi bi-dash-lg"></i>
                        </button>
                        <button type="button" class="flow-canvas-control-btn" title="Fit view" aria-label="Fit view" onclick="fitFlowView()">
                            <i class="bi bi-aspect-ratio"></i>
                        </button>
                        <button type="button" id="flow-interactivity-btn" class="flow-canvas-control-btn" title="Ativar interatividade" aria-label="Toggle interactivity" aria-pressed="false" onclick="toggleCanvasInteractivity()">
                            <i class="bi bi-unlock"></i>
                        </button>
                    </div>
                    <svg id="flow-edge-svg" class="flow-edge-svg" aria-hidden="true"></svg>
                    <div id="flow-node-layer" class="flow-node-layer" aria-label="Nodes do fluxo"></div>
                    <div id="flow-canvas-empty" class="flow-canvas-empty hidden">
                        <i class="bi bi-diagram-3"></i>
                        <strong>Fluxo vazio</strong>
                        <span>Crie nodes manualmente ou gere uma sugestao com IA.</span>
                    </div>
                </div>
            </div>
        </section>

        <aside class="flows-sidebar">
            <section class="flow-side-section">
                <div class="flow-side-title">Fluxos do projeto</div>
                <div class="flow-list" id="flow-library-list"></div>
            </section>

            <section class="flow-side-section">
                <div class="flow-side-title">Nodes</div>
                <div class="flow-node-palette">
                    <button type="button" class="btn btn-sm btn-secondary" onclick="addFlowNode('start')">Inicio</button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="addFlowNode('process')">Processo</button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="addFlowNode('decision')">Decisao</button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="addFlowNode('end')">Fim</button>
                </div>

                <div id="flow-selection-empty" class="flow-selection-empty">
                    Clique em um node ou edge para editar suas propriedades.
                </div>

                <div id="flow-node-inspector" class="flow-inspector hidden">
                    <div class="flow-inspector-title">Node selecionado</div>
                    <label class="flow-field">
                        <span>Texto</span>
                        <input type="text" id="flow-node-label" class="flow-input" maxlength="120">
                    </label>
                    <label class="flow-field">
                        <span>Tipo</span>
                        <select id="flow-node-type" class="flow-input">
                            <option value="start">inicio</option>
                            <option value="process">processo</option>
                            <option value="decision">decisao</option>
                            <option value="end">fim</option>
                        </select>
                    </label>
                    <div class="flow-inspector-grid">
                        <label class="flow-field">
                            <span>X</span>
                            <input type="number" id="flow-node-x" class="flow-input" min="0" step="1">
                        </label>
                        <label class="flow-field">
                            <span>Y</span>
                            <input type="number" id="flow-node-y" class="flow-input" min="0" step="1">
                        </label>
                    </div>
                    <div class="flow-side-actions">
                        <button type="button" class="btn btn-sm btn-primary" onclick="applyNodeChanges()">Aplicar node</button>
                        <button type="button" class="btn btn-sm btn-danger" onclick="deleteSelectedFlowElement()">Excluir node</button>
                    </div>
                </div>

                <div id="flow-connection-inspector" class="flow-inspector hidden">
                    <div class="flow-inspector-title">Conexao existente</div>
                    <div id="flow-connection-description" class="flow-connection-description"></div>
                    <div class="flow-side-actions">
                        <button type="button" class="btn btn-sm btn-primary" onclick="editSelectedConnection()">Editar conexao</button>
                        <button type="button" class="btn btn-sm btn-danger" onclick="removeSelectedConnection()">Remover conexao</button>
                    </div>
                </div>

                <div id="flow-edge-inspector" class="flow-inspector hidden">
                    <div class="flow-inspector-title">Edge selecionada</div>
                    <label class="flow-field">
                        <span>Label opcional</span>
                        <input type="text" id="flow-edge-label" class="flow-input" maxlength="120" placeholder="Ex: sim / nao">
                    </label>
                    <div class="flow-side-actions">
                        <button type="button" class="btn btn-sm btn-primary" onclick="applyEdgeChanges()">Aplicar edge</button>
                        <button type="button" class="btn btn-sm btn-danger" onclick="deleteSelectedFlowElement()">Excluir edge</button>
                    </div>
                </div>
            </section>

            <section class="flow-side-section">
                <div class="flow-side-title">Gerar com IA</div>
                <label class="flow-field">
                    <span>Descricao</span>
                    <textarea id="flow-ai-prompt" class="flow-input flow-textarea" rows="5" placeholder="Ex: crie um fluxo de login com validacao de erro"></textarea>
                </label>
                <label class="flow-field">
                    <span>Modo</span>
                    <select id="flow-ai-mode" class="flow-input">
                        <option value="replace">Substituir canvas</option>
                        <option value="merge">Mesclar com atual</option>
                    </select>
                </label>
                <button type="button" id="flow-ai-generate-btn" class="btn btn-primary" onclick="generateFlowFromAI()">
                    <i class="bi bi-stars"></i> Gerar com IA
                </button>
                <div id="flow-ai-status" class="flow-ai-status hidden"></div>
                <div id="flow-ai-log" class="flow-ai-log"></div>
            </section>
        </aside>
    </div>
</div>

<div class="modal-overlay hidden" id="modal-flow-new">
    <div class="modal-box flow-modal-box">
        <span class="modal-close" onclick="closeModal('modal-flow-new')">&times;</span>
        <div class="modal-title">Novo fluxo</div>
        <p class="flow-modal-help">Crie um fluxo em branco ou importe um diagrama existente em JSON ou Mermaid.</p>

        <div class="flow-modal-grid">
            <section class="flow-modal-card">
                <div class="flow-modal-card-title">Criar em branco</div>
                <p class="flow-modal-card-text">Abre um novo fluxo vazio para edicao manual.</p>
                <button type="button" class="btn btn-primary" onclick="createBlankFlowFromModal()">Criar fluxo vazio</button>
            </section>

            <section class="flow-modal-card">
                <div class="flow-modal-card-title">Importar arquivo</div>
                <p class="flow-modal-card-text">Aceita arquivos <code>.json</code>, <code>.mmd</code> ou <code>.mermaid</code>.</p>
                <input type="file" id="flow-import-file" class="flow-file-input" accept=".json,.mmd,.mermaid,application/json,text/plain" onchange="importFlowFromFile(this)">
            </section>

            <section class="flow-modal-card flow-modal-card--full">
                <div class="flow-modal-card-title">Importar JSON</div>
                <label class="flow-field">
                    <span>Nome do fluxo</span>
                    <input type="text" id="flow-import-name" class="flow-input" placeholder="Nome do fluxo importado">
                </label>
                <label class="flow-field">
                    <span>Conteudo JSON</span>
                    <textarea id="flow-import-json" class="flow-input flow-textarea" rows="8" placeholder='{"nodes": [], "edges": []}'></textarea>
                </label>
                <button type="button" class="btn btn-secondary" onclick="importFlowFromText('json')">Importar JSON</button>
            </section>

            <section class="flow-modal-card flow-modal-card--full">
                <div class="flow-modal-card-title">Importar Mermaid</div>
                <label class="flow-field">
                    <span>Conteudo Mermaid</span>
                    <textarea id="flow-import-mermaid" class="flow-input flow-textarea" rows="8" placeholder="flowchart TD&#10;n1[Inicio] --> n2[Processo]"></textarea>
                </label>
                <button type="button" class="btn btn-secondary" onclick="importFlowFromText('mermaid')">Importar Mermaid</button>
            </section>
        </div>

        <div id="flow-import-error" class="flow-modal-error hidden"></div>
    </div>
</div>

<div class="modal-overlay hidden" id="modal-flow-settings">
    <div class="modal-box flow-modal-box">
        <span class="modal-close" onclick="closeModal('modal-flow-settings')">&times;</span>
        <div class="modal-title">Editar fluxo</div>
        <p class="flow-modal-help">Altere o nome do fluxo ativo e mantenha a aba sincronizada.</p>

        <label class="flow-field">
            <span>Nome</span>
            <input type="text" id="flow-edit-name" class="flow-input" maxlength="255" placeholder="Nome do fluxo">
        </label>

        <div class="flow-modal-actions">
            <button type="button" class="btn btn-primary" onclick="saveFlowSettings()">Salvar alteracoes</button>
            <button type="button" class="btn btn-danger" onclick="deleteCurrentFlow()">Excluir fluxo</button>
        </div>
    </div>
</div>

<div class="modal-overlay hidden" id="modal-flow-export">
    <div class="modal-box flow-modal-box">
        <span class="modal-close" onclick="closeModal('modal-flow-export')">&times;</span>
        <div class="modal-title">Exportar fluxo</div>
        <p class="flow-modal-help">Escolha o formato de exportacao do fluxo ativo.</p>

        <div class="flow-modal-actions flow-modal-actions--stack">
            <button type="button" class="btn btn-secondary" onclick="exportFlowToPNG()">
                <i class="bi bi-file-earmark-image"></i> Exportar PNG
            </button>
            <button type="button" class="btn btn-secondary" onclick="exportFlowToJSON()">
                <i class="bi bi-braces"></i> Exportar JSON
            </button>
            <button type="button" class="btn btn-secondary" onclick="exportFlowToMermaid()">
                <i class="bi bi-diagram-3"></i> Exportar Mermaid
            </button>
        </div>
    </div>
</div>
