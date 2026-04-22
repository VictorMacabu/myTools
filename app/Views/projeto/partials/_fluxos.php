<div class="flows-shell">
    <div class="flows-toolbar">
        <div>
            <div class="flows-kicker">Fluxos</div>
            <h2 class="flows-title">Editor visual por projeto</h2>
            <p class="flows-subtitle">Crie diagramas manualmente, gere com IA e mantenha tudo isolado pelo projeto atual.</p>
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

    <div class="flows-layout">
        <section class="flow-canvas-panel">
            <div class="flow-panel-header">
                <div>
                    <strong>Canvas</strong>
                    <span id="flow-dirty-pill" class="flow-dirty-pill hidden">Alterações nao salvas</span>
                </div>
                <div class="flow-panel-header-actions">
                    <button type="button" class="btn btn-sm btn-secondary" onclick="toggleConnectMode()">
                        <i class="bi bi-bezier2"></i> <span id="flow-connect-label">Conectar nodes</span>
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
                <div class="flow-side-title">Fluxo atual</div>
                <label class="flow-field">
                    <span>Selecionar fluxo</span>
                    <select id="flow-select" class="flow-input"></select>
                </label>
                <label class="flow-field">
                    <span>Nome</span>
                    <input type="text" id="flow-name" class="flow-input" maxlength="255" placeholder="Nome do fluxo">
                </label>
                <div class="flow-list" id="flow-list"></div>
                <div class="flow-side-actions">
                    <button type="button" class="btn btn-danger btn-sm" onclick="deleteCurrentFlow()">
                        <i class="bi bi-trash"></i> Excluir fluxo
                    </button>
                </div>
            </section>

            <section class="flow-side-section">
                <div class="flow-side-title">Nodes</div>
                <div class="flow-node-palette">
                    <button type="button" class="btn btn-sm btn-secondary" onclick="addFlowNode('start')">Início</button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="addFlowNode('process')">Processo</button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="addFlowNode('decision')">Decisão</button>
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
                            <option value="start">início</option>
                            <option value="process">processo</option>
                            <option value="decision">decisão</option>
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
                    <div class="flow-inspector-title">Conexão existente</div>
                    <div id="flow-connection-description" class="flow-connection-description"></div>
                    <div class="flow-side-actions">
                        <button type="button" class="btn btn-sm btn-primary" onclick="editSelectedConnection()">Editar conexão</button>
                        <button type="button" class="btn btn-sm btn-danger" onclick="removeSelectedConnection()">Remover conexão</button>
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
