/* global PROJETO_ID, api, showToast, escapeHtml */

const FLOW_NODE_WIDTH = 190;
const FLOW_NODE_HEIGHT = 88;
const FLOW_NODE_HALF_W = FLOW_NODE_WIDTH / 2;
const FLOW_NODE_HALF_H = FLOW_NODE_HEIGHT / 2;
const FLOW_NODE_SIZES = {
    start: { width: 112, height: 112 },
    process: { width: 190, height: 88 },
    decision: { width: 210, height: 126 },
    end: { width: 112, height: 112 },
};

const FLOW_MIN_ZOOM = 0.45;
const FLOW_MAX_ZOOM = 1.8;
const FLOW_ZOOM_STEP = 1.15;

const FLOW_NODE_TYPES = {
    start: { label: 'start', colorClass: 'is-start' },
    process: { label: 'process', colorClass: 'is-process' },
    decision: { label: 'decision', colorClass: 'is-decision' },
    end: { label: 'end', colorClass: 'is-end' },
};

const FLOW_DEFAULT_COLORS = {
    start: 'Início',
    process: 'Processo',
    decision: 'Decisão',
    end: 'Fim',
};

const flowState = {
    projectId: typeof PROJETO_ID !== 'undefined' ? Number(PROJETO_ID) : 0,
    flows: [],
    openFlows: [],
    activeFlowTabId: null,
    currentFlowId: null,
    currentFlow: null,
    nodes: [],
    edges: [],
    selectedNodeId: null,
    secondarySelectedNodeId: null,
    selectedEdgeId: null,
    connectMode: false,
    connectSourceId: null,
    loading: false,
    dirty: false,
    renderFrame: 0,
    dragging: null,
    panning: null,
    zoom: 1,
    panX: 0,
    panY: 0,
    interactivityLocked: false,
    canvasSize: { width: 1, height: 1 },
    aiBusy: false,
};

function initFlowEditor() {
    const canvas = document.getElementById('flow-canvas');
    if (!canvas || !flowState.projectId) {
        return;
    }

    bindFlowUiEvents();
    bindFlowKeyboardShortcuts();
    scheduleFlowRender();
}

function bindFlowUiEvents() {
    const select = document.getElementById('flow-select');
    const nameInput = document.getElementById('flow-name');
    const canvas = document.getElementById('flow-canvas');

    if (select && select.dataset.bound !== '1') {
        select.dataset.bound = '1';
        select.addEventListener('change', function() {
            const flowId = this.value ? Number(this.value) : null;
            if (flowId) {
                loadFlowById(flowId);
            }
        });
    }

    if (nameInput && nameInput.dataset.bound !== '1') {
        nameInput.dataset.bound = '1';
        nameInput.addEventListener('input', function() {
            if (!flowState.currentFlow) {
                return;
            }
            flowState.currentFlow.name = this.value;
            markFlowDirty(true);
            renderFlowList();
        });
    }

    if (canvas && canvas.dataset.bound !== '1') {
        canvas.dataset.bound = '1';
        canvas.addEventListener('pointerdown', handleCanvasPointerDown);
        canvas.addEventListener('click', handleCanvasClick);
    }

    window.addEventListener('resize', scheduleFlowRender);
    if (typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(() => scheduleFlowRender());
        resizeObserver.observe(canvas);
    }
}

function makeFlowTabId(flowId = null) {
    return flowId ? `flow:${flowId}` : `draft:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
}

function cloneFlowGraph(flow) {
    return JSON.parse(JSON.stringify(flow ?? null));
}

function createOpenFlowTab(graph, meta = {}) {
    const copy = cloneFlowGraph(graph);
    const flowId = meta.flowId ?? (copy && copy.id ? Number(copy.id) : null);
    const tab = {
        tabId: meta.tabId || makeFlowTabId(flowId),
        flowId,
        name: meta.name ?? copy?.name ?? 'Fluxo sem titulo',
        project_id: meta.project_id ?? copy?.project_id ?? flowState.projectId,
        nodes: Array.isArray(copy?.nodes) ? cloneFlowGraph(copy.nodes) : [],
        edges: Array.isArray(copy?.edges) ? cloneFlowGraph(copy.edges) : [],
        created_at: meta.created_at ?? copy?.created_at ?? null,
        updated_at: meta.updated_at ?? copy?.updated_at ?? null,
        dirty: Boolean(meta.dirty),
        isNew: Boolean(meta.isNew ?? !flowId),
    };
    return tab;
}

function getActiveFlowTab() {
    return flowState.openFlows.find(tab => tab.tabId === flowState.activeFlowTabId) || null;
}

function syncActiveTabAliases() {
    const active = getActiveFlowTab();
    if (!active) {
        flowState.currentFlow = null;
        flowState.currentFlowId = null;
        flowState.nodes = [];
        flowState.edges = [];
        return;
    }

    flowState.currentFlow = active;
    flowState.currentFlowId = active.flowId || null;
    flowState.nodes = active.nodes;
    flowState.edges = active.edges;
    flowState.dirty = Boolean(active.dirty);
}

function activateFlowTab(tabId, preserveDirty = false) {
    const tab = flowState.openFlows.find(item => item.tabId === tabId);
    if (!tab) {
        return false;
    }

    if (flowState.activeFlowTabId === tabId) {
        syncActiveTabAliases();
        renderFlowTabs();
        syncFlowName();
        syncFlowInspector();
        scheduleFlowRender();
        return true;
    }

    if (!preserveDirty && flowState.currentFlow) {
        flowState.currentFlow.dirty = flowState.dirty;
    }

    flowState.activeFlowTabId = tabId;
    syncActiveTabAliases();
    markFlowDirty(tab.dirty);
    renderFlowTabs();
    syncFlowName();
    syncFlowInspector();
    scheduleFlowRender();
    return true;
}

function ensureFallbackOpenTab() {
    if (flowState.openFlows.length > 0) {
        return;
    }

    const starter = createStarterGraph('Novo fluxo');
    const tab = createOpenFlowTab({
        name: starter.name,
        project_id: flowState.projectId,
        nodes: starter.nodes,
        edges: starter.edges,
    }, { isNew: true, dirty: false });
    flowState.openFlows.push(tab);
    flowState.activeFlowTabId = tab.tabId;
    syncActiveTabAliases();
}

function findOpenFlowTabByFlowId(flowId) {
    return flowState.openFlows.find(tab => tab.flowId && Number(tab.flowId) === Number(flowId)) || null;
}

function findOpenFlowTabById(tabId) {
    return flowState.openFlows.find(tab => tab.tabId === tabId) || null;
}

function createBlankFlowTab() {
    const starter = createStarterGraph('Novo fluxo');
    const tab = createOpenFlowTab({
        name: starter.name,
        project_id: flowState.projectId,
        nodes: starter.nodes,
        edges: starter.edges,
    }, {
        isNew: true,
        dirty: true,
    });

    flowState.openFlows.push(tab);
    flowState.activeFlowTabId = tab.tabId;
    syncActiveTabAliases();
    markFlowDirty(true);
    renderFlowTabs();
    syncFlowName();
    syncFlowInspector();
    fitFlowView();
    scheduleFlowRender();
    return tab;
}

function openFlowById(flowId) {
    const id = Number(flowId);
    if (!Number.isFinite(id) || id <= 0) {
        return;
    }

    const openTab = findOpenFlowTabByFlowId(id);
    if (openTab) {
        activateFlowTab(openTab.tabId, true);
        fitFlowView();
        return;
    }

    const cached = flowState.flows.find(flow => Number(flow.id) === id);
    if (!cached) {
        api(`/api/projeto/${flowState.projectId}/fluxos/${id}`, { method: 'GET' })
            .then(data => {
                if (!data.flow) {
                    throw new Error('Fluxo nao encontrado');
                }
                refreshSavedFlowCache(data.flow);
                setCurrentFlow(data.flow, false);
                renderFlowList();
                fitFlowView();
                scheduleFlowRender();
            })
            .catch(err => showToast(err.message || 'Falha ao carregar fluxo', 'error'));
        return;
    }

    setCurrentFlow(cached, false);
    renderFlowList();
    fitFlowView();
}

function closeFlowTab(tabId, force = false) {
    const tab = findOpenFlowTabById(tabId);
    if (!tab) {
        return;
    }

    if (!force && tab.dirty && !confirm(`Fechar "${tab.name}" sem salvar?`)) {
        return;
    }

    const index = flowState.openFlows.findIndex(item => item.tabId === tabId);
    flowState.openFlows.splice(index, 1);

    if (flowState.activeFlowTabId === tabId) {
        const next = flowState.openFlows[index] || flowState.openFlows[index - 1] || flowState.openFlows[0] || null;
        flowState.activeFlowTabId = next ? next.tabId : null;
    }

    if (flowState.openFlows.length === 0) {
        ensureFallbackOpenTab();
    } else if (!getActiveFlowTab()) {
        const firstTab = flowState.openFlows[0];
        if (firstTab) {
            flowState.activeFlowTabId = firstTab.tabId;
        }
    }

    syncActiveTabAliases();
    markFlowDirty(Boolean(getActiveFlowTab()?.dirty));
    renderFlowList();
    syncFlowName();
    syncFlowInspector();
    fitFlowView();
    scheduleFlowRender();
}

function markActiveTabDirty(value) {
    const active = getActiveFlowTab();
    if (!active) {
        return;
    }
    active.dirty = Boolean(value);
    flowState.dirty = active.dirty;
    updateDirtyPill();
}

function bindFlowKeyboardShortcuts() {
    document.addEventListener('keydown', event => {
        const tab = document.getElementById('project-tab-fluxos');
        if (!tab || tab.hidden) {
            return;
        }

        const target = event.target;
        const tag = (target && target.tagName ? target.tagName : '').toUpperCase();
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
            return;
        }

        if (event.key === 'Delete' || event.key === 'Backspace') {
            deleteSelectedFlowElement();
        }
    });
}

async function loadFlowWorkspace(force = false) {
    if (!flowState.projectId || flowState.loading) {
        return;
    }

    flowState.loading = true;
    try {
        const data = await api(`/api/projeto/${flowState.projectId}/fluxos`, { method: 'GET' });
        flowState.flows = Array.isArray(data.flows) ? data.flows : [];
        if (flowState.openFlows.length === 0) {
            if (flowState.flows.length > 0) {
                setCurrentFlow(flowState.flows[0], false);
                fitFlowView();
            } else {
                ensureFallbackOpenTab();
                fitFlowView();
            }
        } else if (!getActiveFlowTab()) {
            const firstTab = flowState.openFlows[0];
            if (firstTab) {
                activateFlowTab(firstTab.tabId, true);
            }
        }

        renderFlowList();
        syncFlowInspector();
        scheduleFlowRender();
    } catch (err) {
        showToast('Falha ao carregar fluxos: ' + err.message, 'error');
    } finally {
        flowState.loading = false;
    }
}

async function loadFlowById(flowId) {
    openFlowById(flowId);
}

function setCurrentFlow(flow, preserveDirty = false) {
    const normalized = cloneFlowGraph(flow);
    const flowId = normalized?.id ?? normalized?.flowId ?? null;
    const existing = flowId ? findOpenFlowTabByFlowId(flowId) : (normalized?.tabId ? findOpenFlowTabById(normalized.tabId) : null);

    if (existing) {
        existing.name = normalized?.name || existing.name || 'Fluxo sem titulo';
        existing.project_id = normalized?.project_id || flowState.projectId;
        existing.nodes = Array.isArray(normalized?.nodes) ? normalized.nodes : existing.nodes;
        existing.edges = Array.isArray(normalized?.edges) ? normalized.edges : existing.edges;
        existing.created_at = normalized?.created_at ?? existing.created_at ?? null;
        existing.updated_at = normalized?.updated_at ?? existing.updated_at ?? null;
        existing.flowId = flowId ? Number(flowId) : existing.flowId || null;
        existing.isNew = !existing.flowId;
        if (!preserveDirty) {
            existing.dirty = false;
        } else if (normalized && Object.prototype.hasOwnProperty.call(normalized, 'dirty')) {
            existing.dirty = Boolean(normalized.dirty);
        }
        flowState.activeFlowTabId = existing.tabId;
    } else {
        const tab = createOpenFlowTab(normalized, {
            flowId,
            name: normalized?.name,
            project_id: normalized?.project_id || flowState.projectId,
            created_at: normalized?.created_at,
            updated_at: normalized?.updated_at,
            dirty: Boolean(normalized?.dirty),
            isNew: !flowId,
            tabId: normalized?.tabId || makeFlowTabId(flowId),
        });
        if (!preserveDirty) {
            tab.dirty = false;
        }
        flowState.openFlows.push(tab);
        flowState.activeFlowTabId = tab.tabId;
    }

    syncActiveTabAliases();
    flowState.selectedNodeId = null;
    flowState.secondarySelectedNodeId = null;
    flowState.selectedEdgeId = null;
    flowState.connectSourceId = null;
    flowState.connectMode = false;
    if (!preserveDirty) {
        markFlowDirty(false);
    }
    syncFlowName();
    syncFlowInspector();
    updateConnectModeUi();
    renderFlowTabs();
}

function refreshSavedFlowCache(savedFlow) {
    if (!savedFlow || !savedFlow.id) {
        return;
    }

    const nextFlow = cloneFlowGraph(savedFlow);
    const index = flowState.flows.findIndex(flow => Number(flow.id) === Number(nextFlow.id));
    if (index >= 0) {
        flowState.flows[index] = nextFlow;
    } else {
        flowState.flows.unshift(nextFlow);
    }
}

function commitSavedFlowToActiveTab(savedFlow) {
    if (!savedFlow) {
        return null;
    }

    const active = getActiveFlowTab();
    if (!active) {
        return setCurrentFlow(savedFlow, false);
    }

    const normalized = cloneFlowGraph(savedFlow);
    active.tabId = active.tabId || makeFlowTabId(normalized.id || null);
    active.flowId = normalized.id ? Number(normalized.id) : null;
    active.name = normalized.name || active.name || 'Fluxo sem titulo';
    active.project_id = normalized.project_id || flowState.projectId;
    active.nodes = Array.isArray(normalized.nodes) ? cloneFlowGraph(normalized.nodes) : [];
    active.edges = Array.isArray(normalized.edges) ? cloneFlowGraph(normalized.edges) : [];
    active.created_at = normalized.created_at ?? active.created_at ?? null;
    active.updated_at = normalized.updated_at ?? active.updated_at ?? null;
    active.isNew = !active.flowId;
    active.dirty = false;

    syncActiveTabAliases();
    refreshSavedFlowCache(active);
    renderFlowTabs();
    syncFlowName();
    syncFlowInspector();
    scheduleFlowRender();
    return active;
}

function openImportedFlowTab(graph, meta = {}) {
    const tab = createOpenFlowTab(graph, {
        name: meta.name || graph?.name || 'Fluxo importado',
        project_id: flowState.projectId,
        dirty: true,
        isNew: true,
    });
    flowState.openFlows.push(tab);
    flowState.activeFlowTabId = tab.tabId;
    syncActiveTabAliases();
    markFlowDirty(true);
    renderFlowTabs();
    syncFlowName();
    syncFlowInspector();
    fitFlowView();
    scheduleFlowRender();
    return tab;
}

function createStarterGraph(name = 'Novo fluxo') {
    return {
        name: name && String(name).trim() ? String(name).trim() : 'Novo fluxo',
        nodes: [
            { id: 'start_1', label: 'Início', type: 'start', x: 100, y: 120 },
            { id: 'process_1', label: 'Processo', type: 'process', x: 360, y: 120 },
            { id: 'end_1', label: 'Fim', type: 'end', x: 620, y: 120 },
        ],
        edges: [
            { id: 'edge_1', from: 'start_1', to: 'process_1' },
            { id: 'edge_2', from: 'process_1', to: 'end_1' },
        ],
    };
}

function openNewFlowModal() {
    const jsonInput = document.getElementById('flow-import-json');
    const mermaidInput = document.getElementById('flow-import-mermaid');
    const fileInput = document.getElementById('flow-import-file');
    const nameInput = document.getElementById('flow-import-name');
    const errorBox = document.getElementById('flow-import-error');

    if (jsonInput) jsonInput.value = '';
    if (mermaidInput) mermaidInput.value = '';
    if (fileInput) fileInput.value = '';
    if (nameInput) nameInput.value = '';
    if (errorBox) {
        errorBox.textContent = '';
        errorBox.classList.add('hidden');
    }

    openModal('modal-flow-new');
}

function createBlankFlowFromModal() {
    closeModal('modal-flow-new');
    createBlankFlowTab();
}

function openFlowSettingsModal() {
    const active = getActiveFlowTab();
    if (!active) {
        showToast('Nenhum fluxo ativo.', 'error');
        return;
    }

    const input = document.getElementById('flow-edit-name');
    const title = document.getElementById('flow-current-title');
    if (input) {
        input.value = String(active.name || '');
    }
    if (title) {
        title.textContent = String(active.name || 'Fluxo sem titulo');
    }

    openModal('modal-flow-settings');
}

function saveFlowSettings() {
    const active = getActiveFlowTab();
    if (!active) {
        showToast('Nenhum fluxo ativo.', 'error');
        return;
    }

    const nameInput = document.getElementById('flow-edit-name');
    const nextName = nameInput ? nameInput.value.trim() : '';
    if (!nextName) {
        showToast('Informe um nome para o fluxo.', 'error');
        return;
    }

    active.name = nextName;
    syncActiveTabAliases();
    markFlowDirty(true);
    syncFlowName();
    renderFlowTabs();
    renderFlowLibrary();
    closeModal('modal-flow-settings');
}

function openExportModal() {
    const active = getActiveFlowTab();
    if (!active || (!active.nodes.length && !active.edges.length)) {
        showToast('Nao ha fluxo para exportar.', 'error');
        return;
    }

    openModal('modal-flow-export');
}

function getActiveFlowExportGraph() {
    const active = getActiveFlowTab();
    if (!active) {
        return null;
    }

    return buildPayloadGraph(active.name || 'Fluxo sem titulo');
}

function downloadTextFile(filename, content, mimeType = 'text/plain;charset=utf-8') {
    const blob = new Blob([content], { type: mimeType });
    downloadBlob(filename, blob);
}

function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function closeImportError() {
    const errorBox = document.getElementById('flow-import-error');
    if (!errorBox) {
        return;
    }
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
}

function showImportError(message) {
    const errorBox = document.getElementById('flow-import-error');
    if (!errorBox) {
        showToast(message, 'error');
        return;
    }
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
}

function stripCodeFences(text) {
    let value = String(text || '').trim();
    if (!value) {
        return '';
    }

    value = value.replace(/^```(?:json|mermaid)?\s*/i, '');
    value = value.replace(/```$/i, '');
    return value.trim();
}

function normalizeFlowNodeType(type, fallback = 'process') {
    const normalized = String(type || fallback || 'process').toLowerCase();
    if (['start', 'process', 'decision', 'end'].includes(normalized)) {
        return normalized;
    }
    return fallback;
}

function parseJSONFlowImport(text) {
    const raw = stripCodeFences(text);
    if (!raw) {
        throw new Error('Informe um JSON para importar.');
    }

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (err) {
        throw new Error('JSON invalido: ' + err.message);
    }

    const graph = parsed && typeof parsed === 'object' ? parsed : {};
    return normalizeImportedFlow(graph, 'json');
}

function parseMermaidNodeToken(token) {
    const raw = String(token || '').trim();
    if (!raw) {
        return null;
    }

    const nodePatterns = [
        { regex: /^([A-Za-z0-9_:-]+)\s*\(\(\s*(.*?)\s*\)\)$/, type: 'circle' },
        { regex: /^([A-Za-z0-9_:-]+)\s*\{\s*(.*?)\s*\}$/, type: 'decision' },
        { regex: /^([A-Za-z0-9_:-]+)\s*\[\s*(.*?)\s*\]$/, type: 'process' },
        { regex: /^([A-Za-z0-9_:-]+)\s*\(\s*(.*?)\s*\)$/, type: 'process' },
    ];

    for (const entry of nodePatterns) {
        const match = raw.match(entry.regex);
        if (match) {
            return {
                id: match[1],
                label: match[2] ? String(match[2]).trim() : match[1],
                typeHint: entry.type,
            };
        }
    }

    return {
        id: raw.replace(/[^A-Za-z0-9_:-]/g, '_'),
        label: raw,
        typeHint: 'process',
    };
}

function parseMermaidEdgeStatement(statement) {
    const raw = String(statement || '').trim();
    if (!raw) {
        return null;
    }

    const arrowMatch = raw.match(/(.*?)\s*(-->|-\.\->|==>|---)\s*(.*)$/);
    if (!arrowMatch) {
        return null;
    }

    let left = arrowMatch[1].trim();
    let right = arrowMatch[3].trim();
    let label = '';

    const leftLabelMatch = left.match(/^(.*)\|\s*([^|]+?)\s*\|$/);
    if (leftLabelMatch) {
        left = leftLabelMatch[1].trim();
        label = leftLabelMatch[2].trim();
    }

    const rightLabelMatch = right.match(/^\|\s*([^|]+?)\s*\|\s*(.*)$/);
    if (rightLabelMatch) {
        label = rightLabelMatch[1].trim();
        right = rightLabelMatch[2].trim();
    }

    return {
        sourceToken: left,
        targetToken: right,
        label,
    };
}

function parseMermaidFlowImport(text) {
    const raw = stripCodeFences(text);
    if (!raw) {
        throw new Error('Informe um Mermaid para importar.');
    }

    const statements = raw
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('```'));

    const typeHints = new Map();
    const nodeIndex = new Map();
    const orderedNodeIds = [];
    const edgeRows = [];

    statements.forEach(statement => {
        if (/^(flowchart|graph)\b/i.test(statement)) {
            return;
        }
        if (/^subgraph\b/i.test(statement) || /^end\b/i.test(statement)) {
            return;
        }
        if (/^%%/.test(statement)) {
            const hintMatch = statement.match(/^%%\s*flow-type\s*:\s*([A-Za-z0-9_:-]+)\s*:\s*(start|process|decision|end)\s*$/i);
            if (hintMatch) {
                typeHints.set(hintMatch[1], normalizeFlowNodeType(hintMatch[2]));
            }
            return;
        }

        const edge = parseMermaidEdgeStatement(statement);
        if (edge) {
            const source = parseMermaidNodeToken(edge.sourceToken);
            const target = parseMermaidNodeToken(edge.targetToken);
            if (source && !nodeIndex.has(source.id)) {
                nodeIndex.set(source.id, {
                    id: source.id,
                    label: source.label,
                    typeHint: source.typeHint,
                });
                orderedNodeIds.push(source.id);
            }
            if (target && !nodeIndex.has(target.id)) {
                nodeIndex.set(target.id, {
                    id: target.id,
                    label: target.label,
                    typeHint: target.typeHint,
                });
                orderedNodeIds.push(target.id);
            }
            edgeRows.push({
                sourceId: source ? source.id : '',
                targetId: target ? target.id : '',
                label: edge.label || '',
            });
            return;
        }

        const node = parseMermaidNodeToken(statement);
        if (node && !nodeIndex.has(node.id)) {
            nodeIndex.set(node.id, {
                id: node.id,
                label: node.label,
                typeHint: node.typeHint,
            });
            orderedNodeIds.push(node.id);
        }
    });

    if (nodeIndex.size === 0) {
        throw new Error('Nao foi possivel identificar nodes no Mermaid informado.');
    }

    const graph = {
        name: 'Fluxo importado',
        nodes: [],
        edges: [],
    };

    const usedNodeIds = new Set();
    const rawToFinalId = new Map();

    orderedNodeIds.forEach((rawId, index) => {
        const node = nodeIndex.get(rawId);
        if (!node) {
            return;
        }
        const safeId = makeUniqueIdForCollection(rawId || `node_${index + 1}`, usedNodeIds);
        usedNodeIds.add(safeId);
        rawToFinalId.set(rawId, safeId);
        graph.nodes.push({
            id: safeId,
            label: node.label || safeId,
            type: normalizeFlowNodeType(typeHints.get(rawId) || node.typeHint || 'process', 'process'),
            x: 100 + (graph.nodes.length % 4) * 220,
            y: 120 + Math.floor(graph.nodes.length / 4) * 150,
        });
    });

    const firstNode = graph.nodes[0];
    const lastNode = graph.nodes[graph.nodes.length - 1];
    const hasStart = graph.nodes.some(node => node.type === 'start');
    const hasEnd = graph.nodes.some(node => node.type === 'end');

    if (!hasStart && firstNode) {
        firstNode.type = 'start';
        if (!/in[ií]cio|start/i.test(firstNode.label || '')) {
            firstNode.label = 'Início';
        }
    }
    if (!hasEnd && lastNode) {
        lastNode.type = 'end';
        if (!/fim|end/i.test(lastNode.label || '')) {
            lastNode.label = 'Fim';
        }
    }

    const usedEdgeIds = new Set();
    edgeRows.forEach((edge, index) => {
        const from = rawToFinalId.get(edge.sourceId);
        const to = rawToFinalId.get(edge.targetId);
        if (!from || !to || from === to) {
            return;
        }
        graph.edges.push({
            id: makeUniqueIdForCollection(`edge_${index + 1}`, usedEdgeIds),
            from,
            to,
            label: edge.label || '',
        });
    });

    if (!graph.edges.length && graph.nodes.length > 1) {
        for (let index = 0; index < graph.nodes.length - 1; index += 1) {
            graph.edges.push({
                id: makeUniqueIdForCollection(`edge_${index + 1}`, usedEdgeIds),
                from: graph.nodes[index].id,
                to: graph.nodes[index + 1].id,
                label: '',
            });
        }
    }

    return normalizeImportedFlow(graph, 'mermaid');
}

function normalizeImportedFlow(graph, source = 'json') {
    if (!graph || typeof graph !== 'object') {
        throw new Error('Fluxo importado invalido.');
    }

    const rawNodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const rawEdges = Array.isArray(graph.edges) ? graph.edges : [];
    if (!rawNodes.length) {
        throw new Error('O fluxo importado precisa ter ao menos um node.');
    }

    const normalized = {
        name: String(graph.name || 'Fluxo importado').trim() || 'Fluxo importado',
        nodes: [],
        edges: [],
    };

    const usedNodeIds = new Set();
    const rawToFinalId = new Map();

    rawNodes.forEach((rawNode, index) => {
        const rawId = String(rawNode?.id ?? rawNode?.node_id ?? rawNode?.key ?? rawNode?.name ?? `node_${index + 1}`).trim();
        const finalId = makeUniqueIdForCollection(rawId || `node_${index + 1}`, usedNodeIds);
        usedNodeIds.add(finalId);
        if (!rawToFinalId.has(rawId)) {
            rawToFinalId.set(rawId, finalId);
        }

        const label = String(rawNode?.label ?? rawNode?.text ?? rawNode?.title ?? rawNode?.name ?? rawId).trim() || finalId;
        const type = normalizeFlowNodeType(rawNode?.type ?? rawNode?.kind ?? rawNode?.shape ?? 'process', 'process');
        const x = Number(rawNode?.x ?? rawNode?.position?.x ?? rawNode?.left ?? 0);
        const y = Number(rawNode?.y ?? rawNode?.position?.y ?? rawNode?.top ?? 0);

        normalized.nodes.push({
            id: finalId,
            label,
            type,
            x: Number.isFinite(x) ? Math.max(0, Math.round(x)) : 0,
            y: Number.isFinite(y) ? Math.max(0, Math.round(y)) : 0,
        });
    });

    const hasStart = normalized.nodes.some(node => node.type === 'start');
    const hasEnd = normalized.nodes.some(node => node.type === 'end');
    if (!hasStart) {
        normalized.nodes[0].type = 'start';
        if (!/in[ií]cio|start/i.test(normalized.nodes[0].label || '')) {
            normalized.nodes[0].label = 'Início';
        }
    }
    if (!hasEnd) {
        if (normalized.nodes.length === 1) {
            const baseX = normalized.nodes[0].x + 240;
            const baseY = normalized.nodes[0].y;
            const endId = makeUniqueIdForCollection('end_1', usedNodeIds);
            usedNodeIds.add(endId);
            normalized.nodes.push({
                id: endId,
                label: 'Fim',
                type: 'end',
                x: Number.isFinite(baseX) ? Math.max(0, Math.round(baseX)) : 240,
                y: Number.isFinite(baseY) ? Math.max(0, Math.round(baseY)) : 0,
            });
        } else {
            const last = normalized.nodes[normalized.nodes.length - 1];
            last.type = 'end';
            if (!/fim|end/i.test(last.label || '')) {
                last.label = 'Fim';
            }
        }
    }

    const usedEdgeIds = new Set();
    rawEdges.forEach((rawEdge, index) => {
        const sourceId = String(rawEdge?.from ?? rawEdge?.source ?? rawEdge?.source_node_id ?? rawEdge?.sourceId ?? '').trim();
        const targetId = String(rawEdge?.to ?? rawEdge?.target ?? rawEdge?.target_node_id ?? rawEdge?.targetId ?? '').trim();
        const from = rawToFinalId.get(sourceId) || rawToFinalId.get(String(sourceId));
        const to = rawToFinalId.get(targetId) || rawToFinalId.get(String(targetId));
        if (!from || !to || from === to) {
            return;
        }

        const edgeIdRaw = String(rawEdge?.id ?? rawEdge?.edge_id ?? `edge_${index + 1}`).trim();
        const edgeId = makeUniqueIdForCollection(edgeIdRaw || `edge_${index + 1}`, usedEdgeIds);
        usedEdgeIds.add(edgeId);
        normalized.edges.push({
            id: edgeId,
            from,
            to,
            label: String(rawEdge?.label ?? rawEdge?.text ?? '').trim(),
        });
    });

    if (!normalized.edges.length && normalized.nodes.length > 1) {
        normalized.edges.push({
            id: makeUniqueIdForCollection('edge_1', usedEdgeIds),
            from: normalized.nodes[0].id,
            to: normalized.nodes[1].id,
            label: '',
        });
    }

    if (source === 'mermaid') {
        const startNode = normalized.nodes.find(node => node.type === 'start');
        const endNode = normalized.nodes.find(node => node.type === 'end');
        if (startNode && endNode && startNode.id === endNode.id && normalized.nodes.length > 1) {
            normalized.nodes[normalized.nodes.length - 1].type = 'end';
        }
    }

    return normalized;
}

function buildMermaidExport(graph) {
    const nodeIdMap = new Map();
    const lines = ['flowchart TD'];

    graph.nodes.forEach((node, index) => {
        const mermaidId = `n${index + 1}`;
        nodeIdMap.set(String(node.id), mermaidId);
        lines.push(`%% flow-type:${mermaidId}:${normalizeFlowNodeType(node.type)}`);

        const label = String(node.label || mermaidId).replace(/[\[\]\{\}\(\)]/g, '');
        if (node.type === 'decision') {
            lines.push(`${mermaidId}{${label}}`);
        } else if (node.type === 'start' || node.type === 'end') {
            lines.push(`${mermaidId}((${label}))`);
        } else {
            lines.push(`${mermaidId}[${label}]`);
        }
    });

    graph.edges.forEach(edge => {
        const from = nodeIdMap.get(String(edge.from));
        const to = nodeIdMap.get(String(edge.to));
        if (!from || !to) {
            return;
        }
        const label = String(edge.label || '').trim();
        if (label) {
            lines.push(`${from} -->|${label.replace(/\|/g, '')}| ${to}`);
        } else {
            lines.push(`${from} --> ${to}`);
        }
    });

    return lines.join('\n');
}

function exportFlowToJSON() {
    const graph = getActiveFlowExportGraph();
    if (!graph) {
        showToast('Nao ha fluxo para exportar.', 'error');
        return;
    }

    const filename = `${sanitizeFileName(graph.name || 'fluxo')}.json`;
    downloadTextFile(filename, JSON.stringify(graph, null, 2), 'application/json;charset=utf-8');
    closeModal('modal-flow-export');
}

function exportFlowToMermaid() {
    const graph = getActiveFlowExportGraph();
    if (!graph) {
        showToast('Nao ha fluxo para exportar.', 'error');
        return;
    }

    const filename = `${sanitizeFileName(graph.name || 'fluxo')}.mmd`;
    downloadTextFile(filename, buildMermaidExport(graph), 'text/plain;charset=utf-8');
    closeModal('modal-flow-export');
}

async function exportFlowToPNG() {
    const graph = getActiveFlowExportGraph();
    if (!graph || !graph.nodes.length) {
        showToast('Nao ha fluxo para exportar.', 'error');
        return;
    }

    const bounds = getFlowBounds();
    if (!bounds) {
        showToast('Nao ha fluxo para exportar.', 'error');
        return;
    }

    const padding = 90;
    const scale = 2;
    const width = Math.max(Math.ceil((bounds.maxX - bounds.minX) + padding * 2), 640);
    const height = Math.max(Math.ceil((bounds.maxY - bounds.minY) + padding * 2), 420);
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        showToast('Nao foi possivel gerar a imagem.', 'error');
        return;
    }

    ctx.scale(scale, scale);
    ctx.fillStyle = '#fbfdff';
    ctx.fillRect(0, 0, width, height);
    drawExportGrid(ctx, width, height);

    const offsetX = padding - bounds.minX;
    const offsetY = padding - bounds.minY;

    graph.edges.forEach(edge => {
        const source = graph.nodes.find(node => String(node.id) === String(edge.from));
        const target = graph.nodes.find(node => String(node.id) === String(edge.to));
        if (!source || !target) {
            return;
        }

        const start = getNodeCenter(source);
        const end = getNodeCenter(target);
        const sx = start.x + offsetX;
        const sy = start.y + offsetY;
        const tx = end.x + offsetX;
        const ty = end.y + offsetY;

        ctx.strokeStyle = 'rgba(16, 94, 163, 0.75)';
        ctx.fillStyle = 'rgba(16, 94, 163, 0.75)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        const angle = Math.atan2(ty - sy, tx - sx);
        const arrowSize = 9;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - arrowSize * Math.cos(angle - Math.PI / 7), ty - arrowSize * Math.sin(angle - Math.PI / 7));
        ctx.lineTo(tx - arrowSize * Math.cos(angle + Math.PI / 7), ty - arrowSize * Math.sin(angle + Math.PI / 7));
        ctx.closePath();
        ctx.fill();

        if (edge.label) {
            ctx.save();
            ctx.font = '600 12px DM Sans, sans-serif';
            ctx.fillStyle = '#4b5563';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(edge.label), (sx + tx) / 2, ((sy + ty) / 2) - 10);
            ctx.restore();
        }
    });

    graph.nodes.forEach(node => {
        const size = getNodeSize(node.type);
        const x = Number(node.x || 0) + offsetX;
        const y = Number(node.y || 0) + offsetY;
        drawExportNode(ctx, node, x, y, size.width, size.height);
    });

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
        showToast('Nao foi possivel gerar a imagem.', 'error');
        return;
    }

    downloadBlob(`${sanitizeFileName(graph.name || 'fluxo')}.png`, blob);
    closeModal('modal-flow-export');
}

function drawExportGrid(ctx, width, height) {
    ctx.save();
    ctx.strokeStyle = 'rgba(16, 94, 163, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = 0; y <= height; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    ctx.restore();
}

function drawExportNode(ctx, node, x, y, width, height) {
    const palette = {
        start: ['#ecfdf5', '#d1fae5', '#059669'],
        process: ['#eff6ff', '#dbeafe', '#2563eb'],
        decision: ['#fff7ed', '#ffedd5', '#f97316'],
        end: ['#fef2f2', '#fee2e2', '#dc2626'],
    };
    const [bgTop, bgBottom, border] = palette[node.type] || palette.process;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;

    if (node.type === 'decision') {
        ctx.fillStyle = bgTop;
        ctx.strokeStyle = border;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + width / 2, y);
        ctx.lineTo(x + width, y + height / 2);
        ctx.lineTo(x + width / 2, y + height);
        ctx.lineTo(x, y + height / 2);
        ctx.closePath();
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.stroke();
    } else if (node.type === 'start' || node.type === 'end') {
        const radius = Math.min(width, height) / 2;
        const cx = x + width / 2;
        const cy = y + height / 2;
        const gradient = ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, bgTop);
        gradient.addColorStop(1, bgBottom);
        ctx.fillStyle = gradient;
        ctx.strokeStyle = border;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.stroke();
    } else {
        const gradient = ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, bgTop);
        gradient.addColorStop(1, bgBottom);
        ctx.fillStyle = gradient;
        ctx.strokeStyle = border;
        ctx.lineWidth = 2;
        roundedRect(ctx, x, y, width, height, 16);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.stroke();
    }

    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 12px DM Sans, sans-serif';
    const typeLabel = String(node.type || '').toUpperCase();
    ctx.fillText(typeLabel, x + width / 2, y + Math.max(16, height * 0.28));
    ctx.font = '700 15px DM Sans, sans-serif';
    wrapCanvasText(ctx, String(node.label || ''), x + 16, y + height * 0.58, width - 32, 18);
    ctx.restore();
}

function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    if (!words.length) {
        return;
    }

    const lines = [];
    let current = words[0];
    for (let index = 1; index < words.length; index += 1) {
        const word = words[index];
        const candidate = `${current} ${word}`;
        if (ctx.measureText(candidate).width <= maxWidth) {
            current = candidate;
        } else {
            lines.push(current);
            current = word;
        }
    }
    lines.push(current);

    const totalHeight = (lines.length - 1) * lineHeight;
    lines.forEach((line, index) => {
        ctx.fillText(line, x + maxWidth / 2, y - totalHeight / 2 + (index * lineHeight));
    });
}

function sanitizeFileName(value) {
    return String(value || 'fluxo')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase() || 'fluxo';
}

async function importFlowFromText(format) {
    closeImportError();
    const activeName = document.getElementById('flow-import-name')?.value.trim() || 'Fluxo importado';
    const jsonInput = document.getElementById('flow-import-json');
    const mermaidInput = document.getElementById('flow-import-mermaid');

    try {
        let graph;
        if (format === 'mermaid') {
            graph = parseMermaidFlowImport(mermaidInput ? mermaidInput.value : '');
        } else {
            graph = parseJSONFlowImport(jsonInput ? jsonInput.value : '');
        }
        graph.name = activeName || graph.name;
        closeModal('modal-flow-new');
        openImportedFlowTab(graph, { name: graph.name });
    } catch (err) {
        showImportError(err.message || 'Falha ao importar fluxo.');
    }
}

async function importFlowFromFile(input) {
    closeImportError();
    const file = input && input.files ? input.files[0] : null;
    if (!file) {
        return;
    }

    try {
        const text = await file.text();
        const lower = file.name.toLowerCase();
        const graph = lower.endsWith('.mmd') || lower.endsWith('.mermaid')
            ? parseMermaidFlowImport(text)
            : parseJSONFlowImport(text);
        closeModal('modal-flow-new');
        openImportedFlowTab(graph, { name: graph.name || sanitizeFileName(file.name) });
    } catch (err) {
        showImportError(err.message || 'Falha ao importar arquivo.');
    } finally {
        if (input) {
            input.value = '';
        }
    }
}

function renderFlowList() {
    renderFlowTabs();
    renderFlowLibrary();
    return;
    const list = document.getElementById('flow-list');
    const select = document.getElementById('flow-select');
    if (!list || !select) {
        return;
    }

    const flows = flowState.flows.slice();
    const currentId = flowState.currentFlowId ? Number(flowState.currentFlowId) : null;
    const options = ['<option value="">Novo fluxo</option>'];
    const cards = [];

    flows.forEach(flow => {
        const id = Number(flow.id);
        const isActive = currentId === id;
        const nodeCount = Array.isArray(flow.nodes) ? flow.nodes.length : 0;
        const edgeCount = Array.isArray(flow.edges) ? flow.edges.length : 0;
        const updated = flow.updated_at ? new Date(String(flow.updated_at).replace(' ', 'T')) : null;
        const updatedLabel = updated && !Number.isNaN(updated.getTime())
            ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(updated)
            : 'sem data';

        options.push(`<option value="${id}" ${isActive ? 'selected' : ''}>${escapeHtml(flow.name || `Fluxo ${id}`)}</option>`);
        cards.push(`
            <button type="button" class="flow-card ${isActive ? 'active' : ''}" data-flow-id="${id}" onclick="loadFlowById(${id})">
                <strong>${escapeHtml(flow.name || `Fluxo ${id}`)}</strong>
                <span>${nodeCount} nodes · ${edgeCount} edges</span>
                <small>Atualizado em ${escapeHtml(updatedLabel)}</small>
            </button>
        `);
    });

    select.innerHTML = options.join('');
    list.innerHTML = flows.length > 0 ? cards.join('') : `
        <div class="flow-empty-list">
            <i class="bi bi-inbox"></i>
            <span>Nenhum fluxo salvo neste projeto ainda.</span>
        </div>
    `;

    syncFlowSelector();
}

function syncFlowSelector() {
    renderFlowTabs();
    return;
    const select = document.getElementById('flow-select');
    if (!select) {
        return;
    }
    select.value = flowState.currentFlowId ? String(flowState.currentFlowId) : '';
}

function syncFlowName() {
    const input = document.getElementById('flow-edit-name');
    if (input) {
        input.value = flowState.currentFlow ? String(flowState.currentFlow.name || '') : '';
    }

    const title = document.getElementById('flow-current-title');
    if (title) {
        title.textContent = flowState.currentFlow ? String(flowState.currentFlow.name || 'Fluxo sem titulo') : 'Fluxo sem titulo';
    }
}

function renderFlowTabs() {
    const tabs = document.getElementById('flow-tabs');
    if (!tabs) {
        return;
    }

    if (flowState.openFlows.length === 0) {
        tabs.innerHTML = `
            <button type="button" class="flow-tab-add" onclick="openNewFlowModal()" title="Novo fluxo">
                <i class="bi bi-plus-lg"></i>
            </button>
        `;
        return;
    }

    tabs.innerHTML = flowState.openFlows.map(tab => {
        const active = tab.tabId === flowState.activeFlowTabId;
        const dirty = tab.dirty ? '<span class="flow-tab-dirty">•</span>' : '';
        const closeBtn = flowState.openFlows.length > 1 ? `
            <button type="button" class="flow-tab-close" title="Fechar aba" onclick="event.stopPropagation(); closeFlowTab('${tab.tabId}')">
                <i class="bi bi-x"></i>
            </button>
        ` : '';
        return `
            <div class="flow-tab ${active ? 'active' : ''}" role="button" tabindex="0" onclick="activateFlowTab('${tab.tabId}')">
                <span class="flow-tab-name">${escapeHtml(tab.name || 'Fluxo sem titulo')}</span>
                ${dirty}
                ${closeBtn}
            </div>
        `;
    }).join('') + `
        <button type="button" class="flow-tab-add" onclick="openNewFlowModal()" title="Novo fluxo">
            <i class="bi bi-plus-lg"></i>
        </button>
    `;
}

function renderFlowLibrary() {
    const list = document.getElementById('flow-library-list');
    if (!list) {
        return;
    }

    const openFlowIds = new Set(flowState.openFlows.filter(tab => tab.flowId).map(tab => Number(tab.flowId)));
    const flows = flowState.flows.slice();

    if (flows.length === 0) {
        list.innerHTML = `
            <div class="flow-empty-list">
                <i class="bi bi-inbox"></i>
                <span>Nenhum fluxo salvo neste projeto ainda.</span>
            </div>
        `;
        return;
    }

    list.innerHTML = flows.map(flow => {
        const id = Number(flow.id);
        const opened = openFlowIds.has(id);
        const nodeCount = Array.isArray(flow.nodes) ? flow.nodes.length : 0;
        const edgeCount = Array.isArray(flow.edges) ? flow.edges.length : 0;
        const updated = flow.updated_at ? new Date(String(flow.updated_at).replace(' ', 'T')) : null;
        const updatedLabel = updated && !Number.isNaN(updated.getTime())
            ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(updated)
            : 'sem data';

        return `
            <button type="button" class="flow-card ${opened ? 'active' : ''}" onclick="openFlowById(${id})">
                <strong>${escapeHtml(flow.name || `Fluxo ${id}`)}</strong>
                <span>${nodeCount} nodes · ${edgeCount} edges</span>
                <small>${opened ? 'Aberto' : 'Atualizado em ' + escapeHtml(updatedLabel)}</small>
            </button>
        `;
    }).join('');
}

function syncFlowInspector() {
    const empty = document.getElementById('flow-selection-empty');
    const nodeInspector = document.getElementById('flow-node-inspector');
    const connectionInspector = document.getElementById('flow-connection-inspector');
    const edgeInspector = document.getElementById('flow-edge-inspector');
    const node = getSelectedNode();
    const edge = getSelectedEdge();
    const pairEdge = getSelectedConnectionEdge();
    const pairEdgeSelected = Boolean(pairEdge && edge && String(pairEdge.id) === String(edge.id));

    if (pairEdgeSelected) {
        if (empty) empty.classList.add('hidden');
        if (nodeInspector) nodeInspector.classList.add('hidden');
        if (connectionInspector) connectionInspector.classList.add('hidden');
        if (edgeInspector) edgeInspector.classList.remove('hidden');
        fillEdgeInspector(edge);
        return;
    }

    if (pairEdge) {
        if (empty) empty.classList.add('hidden');
        if (nodeInspector) nodeInspector.classList.remove('hidden');
        if (connectionInspector) connectionInspector.classList.remove('hidden');
        if (edgeInspector) edgeInspector.classList.add('hidden');
        fillNodeInspector(node);
        fillConnectionInspector(pairEdge);
        return;
    }

    if (node) {
        if (empty) empty.classList.add('hidden');
        if (nodeInspector) nodeInspector.classList.remove('hidden');
        if (connectionInspector) connectionInspector.classList.add('hidden');
        if (edgeInspector) edgeInspector.classList.add('hidden');
        fillNodeInspector(node);
        return;
    }

    if (edge) {
        if (empty) empty.classList.add('hidden');
        if (nodeInspector) nodeInspector.classList.add('hidden');
        if (connectionInspector) connectionInspector.classList.add('hidden');
        if (edgeInspector) edgeInspector.classList.remove('hidden');
        fillEdgeInspector(edge);
        return;
    }

    if (empty) empty.classList.remove('hidden');
    if (nodeInspector) nodeInspector.classList.add('hidden');
    if (connectionInspector) connectionInspector.classList.add('hidden');
    if (edgeInspector) edgeInspector.classList.add('hidden');
}

function fillNodeInspector(node) {
    const label = document.getElementById('flow-node-label');
    const type = document.getElementById('flow-node-type');
    const x = document.getElementById('flow-node-x');
    const y = document.getElementById('flow-node-y');

    if (label) label.value = node.label || '';
    if (type) type.value = node.type || 'process';
    if (x) x.value = node.x ?? 0;
    if (y) y.value = node.y ?? 0;
}

function fillEdgeInspector(edge) {
    const label = document.getElementById('flow-edge-label');
    if (label) label.value = edge.label || '';
}

function fillConnectionInspector(edge) {
    const label = document.getElementById('flow-connection-description');
    if (!label) {
        return;
    }

    const source = getNodeById(edge.from);
    const target = getNodeById(edge.to);
    const sourceLabel = source ? String(source.label || source.id) : String(edge.from);
    const targetLabel = target ? String(target.label || target.id) : String(edge.to);
    label.textContent = `${sourceLabel} → ${targetLabel}`;
}

function getSelectedNode() {
    if (!flowState.selectedNodeId) {
        return null;
    }
    return flowState.nodes.find(node => String(node.id) === String(flowState.selectedNodeId)) || null;
}

function getSecondarySelectedNode() {
    if (!flowState.secondarySelectedNodeId) {
        return null;
    }
    return flowState.nodes.find(node => String(node.id) === String(flowState.secondarySelectedNodeId)) || null;
}

function getSelectedEdge() {
    if (!flowState.selectedEdgeId) {
        return null;
    }
    return flowState.edges.find(edge => String(edge.id) === String(flowState.selectedEdgeId)) || null;
}

function getSelectedConnectionEdge() {
    const primary = getSelectedNode();
    const secondary = getSecondarySelectedNode();
    if (!primary || !secondary) {
        return null;
    }

    return flowState.edges.find(edge => {
        const direct = String(edge.from) === String(primary.id) && String(edge.to) === String(secondary.id);
        const reverse = String(edge.from) === String(secondary.id) && String(edge.to) === String(primary.id);
        return direct || reverse;
    }) || null;
}

function getEdgeBetweenNodes(sourceId, targetId) {
    return flowState.edges.find(edge => {
        const direct = String(edge.from) === String(sourceId) && String(edge.to) === String(targetId);
        const reverse = String(edge.from) === String(targetId) && String(edge.to) === String(sourceId);
        return direct || reverse;
    }) || null;
}

function getNodeById(nodeId) {
    return flowState.nodes.find(node => String(node.id) === String(nodeId)) || null;
}

function getNodeCenter(node) {
    const size = getNodeSize(node.type);
    return {
        x: Number(node.x || 0) + (size.width / 2),
        y: Number(node.y || 0) + (size.height / 2),
    };
}

function scheduleFlowRender() {
    if (flowState.renderFrame) {
        return;
    }
    flowState.renderFrame = requestAnimationFrame(() => {
        flowState.renderFrame = 0;
        renderFlowCanvas();
    });
}

function renderFlowCanvas() {
    const canvas = document.getElementById('flow-canvas');
    const svg = document.getElementById('flow-edge-svg');
    const nodeLayer = document.getElementById('flow-node-layer');
    const empty = document.getElementById('flow-canvas-empty');
    if (!canvas || !svg || !nodeLayer) {
        return;
    }

    const width = Math.max(canvas.clientWidth, 1);
    const height = Math.max(canvas.clientHeight, 1);
    flowState.canvasSize = { width, height };
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));

    if (!svg.querySelector('defs')) {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `
            <marker id="flow-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"></path>
            </marker>
        `;
        svg.appendChild(defs);
    }

    Array.from(svg.querySelectorAll('g.edge-group')).forEach(group => group.remove());
    nodeLayer.innerHTML = '';

    if (empty) {
        empty.classList.toggle('hidden', flowState.nodes.length > 0);
    }

    drawEdges(svg);
    drawNodes(nodeLayer);
    applyCanvasTransform();
    updateConnectModeUi();
    updateDirtyPill();
    updateCanvasControlsUi();
    syncFlowSelector();
}

function drawEdges(svg) {
    flowState.edges.forEach(edge => {
        const source = getNodeById(edge.from);
        const target = getNodeById(edge.to);
        if (!source || !target) {
            return;
        }

        const start = getNodeCenter(source);
        const end = getNodeCenter(target);
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', `edge-group${String(flowState.selectedEdgeId) === String(edge.id) ? ' selected' : ''}`);
        group.setAttribute('data-edge-id', String(edge.id));

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(start.x));
        line.setAttribute('y1', String(start.y));
        line.setAttribute('x2', String(end.x));
        line.setAttribute('y2', String(end.y));
        line.setAttribute('marker-end', 'url(#flow-arrow)');

        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(midX));
        text.setAttribute('y', String(midY - 8));
        text.setAttribute('text-anchor', 'middle');
        text.textContent = edge.label || '';

        line.addEventListener('click', event => {
            event.stopPropagation();
            selectFlowEdge(edge.id);
        });

        group.appendChild(line);
        if (edge.label) {
            group.appendChild(text);
        }
        svg.appendChild(group);
    });
}

function drawNodes(layer) {
    flowState.nodes.forEach(node => {
        const typeConfig = FLOW_NODE_TYPES[node.type] || FLOW_NODE_TYPES.process;
        const size = getNodeSize(node.type);
        const shapeClass = getNodeShapeClass(node.type);
        const nodeEl = document.createElement('div');
        const isPrimarySelected = String(flowState.selectedNodeId) === String(node.id);
        const isSecondarySelected = String(flowState.secondarySelectedNodeId) === String(node.id);
        nodeEl.className = `flow-node ${shapeClass} ${typeConfig.colorClass}${isPrimarySelected ? ' selected' : ''}${isSecondarySelected ? ' selected-secondary' : ''}${String(flowState.connectSourceId) === String(node.id) ? ' connect-source' : ''}`;
        nodeEl.style.left = Number(node.x || 0) + 'px';
        nodeEl.style.top = Number(node.y || 0) + 'px';
        nodeEl.style.width = size.width + 'px';
        nodeEl.style.height = size.height + 'px';
        nodeEl.dataset.nodeId = String(node.id);

        nodeEl.innerHTML = buildNodeMarkup(node, typeConfig);

        nodeEl.addEventListener('click', event => {
            event.stopPropagation();
            handleNodeClick(node.id, event);
        });

        nodeEl.addEventListener('dblclick', event => {
            event.stopPropagation();
            editNodeText(node.id);
        });

        nodeEl.addEventListener('pointerdown', event => {
            event.stopPropagation();
            handleNodePointerDown(event, node.id);
        });

        layer.appendChild(nodeEl);
    });
}

function handleNodeClick(nodeId, event = null) {
    if (flowState.connectMode) {
        if (!flowState.connectSourceId) {
            flowState.connectSourceId = nodeId;
            showFlowAiStatus('Origem da conexão selecionada.', 'info');
            scheduleFlowRender();
            return;
        }

        if (String(flowState.connectSourceId) === String(nodeId)) {
            flowState.connectSourceId = null;
            scheduleFlowRender();
            return;
        }

        const existingEdge = getEdgeBetweenNodes(flowState.connectSourceId, nodeId);
        if (existingEdge) {
            flowState.selectedNodeId = flowState.connectSourceId;
            flowState.secondarySelectedNodeId = nodeId;
            flowState.selectedEdgeId = existingEdge.id;
            flowState.connectSourceId = null;
            syncFlowInspector();
            scheduleFlowRender();
            return;
        }

        createFlowEdge(flowState.connectSourceId, nodeId);
        flowState.connectSourceId = null;
        scheduleFlowRender();
        return;
    }

    const additive = Boolean(event && (event.ctrlKey || event.metaKey || event.shiftKey));
    selectFlowNode(nodeId, additive);
    syncFlowInspector();
    scheduleFlowRender();
}

function selectFlowNode(nodeId, additive = false) {
    if (!additive) {
        flowState.selectedNodeId = nodeId;
        flowState.secondarySelectedNodeId = null;
        flowState.selectedEdgeId = null;
        return;
    }

    if (String(flowState.selectedNodeId) === String(nodeId)) {
        if (flowState.secondarySelectedNodeId) {
            flowState.secondarySelectedNodeId = null;
        }
        return;
    }

    if (String(flowState.secondarySelectedNodeId) === String(nodeId)) {
        flowState.secondarySelectedNodeId = null;
        return;
    }

    if (!flowState.selectedNodeId) {
        flowState.selectedNodeId = nodeId;
        flowState.selectedEdgeId = null;
        return;
    }

    flowState.secondarySelectedNodeId = nodeId;
    flowState.selectedEdgeId = null;
}

function editNodeText(nodeId) {
    const node = getNodeById(nodeId);
    if (!node) {
        return;
    }

    const nextValue = window.prompt('Editar texto do node', node.label || '');
    if (nextValue === null) {
        return;
    }

    const label = nextValue.trim();
    if (!label) {
        showToast('O node precisa ter um texto.', 'error');
        return;
    }

    node.label = label;
    flowState.selectedNodeId = node.id;
    flowState.secondarySelectedNodeId = null;
    flowState.selectedEdgeId = null;
    markFlowDirty(true);
    syncFlowInspector();
    renderFlowList();
    scheduleFlowRender();
}

function handleNodePointerDown(event, nodeId) {
    if (flowState.connectMode) {
        return;
    }

    const node = getNodeById(nodeId);
    if (!node) {
        return;
    }

    flowState.dragging = {
        nodeId,
        startX: event.clientX,
        startY: event.clientY,
        originX: Number(node.x || 0),
        originY: Number(node.y || 0),
        moved: false,
    };

    flowState.selectedNodeId = nodeId;
    flowState.secondarySelectedNodeId = null;
    flowState.selectedEdgeId = null;
    syncFlowInspector();

    window.addEventListener('pointermove', handleNodePointerMove);
    window.addEventListener('pointerup', handleNodePointerUp);
}

function handleNodePointerMove(event) {
    if (!flowState.dragging) {
        return;
    }

    const node = getNodeById(flowState.dragging.nodeId);
    if (!node) {
        return;
    }

    const dx = event.clientX - flowState.dragging.startX;
    const dy = event.clientY - flowState.dragging.startY;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        flowState.dragging.moved = true;
    }

    node.x = Math.max(0, Math.round(flowState.dragging.originX + dx));
    node.y = Math.max(0, Math.round(flowState.dragging.originY + dy));
    markFlowDirty(true);
    syncNodeInspectorPosition(node);
    scheduleFlowRender();
}

function handleNodePointerUp() {
    if (flowState.dragging && flowState.dragging.moved) {
        markFlowDirty(true);
    }
    flowState.dragging = null;
    window.removeEventListener('pointermove', handleNodePointerMove);
    window.removeEventListener('pointerup', handleNodePointerUp);
}

function handleCanvasPointerDown(event) {
    if (event.target !== event.currentTarget) {
        return;
    }

    if (flowState.interactivityLocked) {
        startCanvasPan(event);
        return;
    }

    clearFlowSelection();
}

function handleCanvasClick(event) {
    if (event.target === event.currentTarget && flowState.connectMode && flowState.connectSourceId) {
        flowState.connectSourceId = null;
        scheduleFlowRender();
    }
}

function startCanvasPan(event) {
    const canvas = document.getElementById('flow-canvas');
    if (!canvas) {
        return;
    }

    flowState.panning = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: flowState.panX,
        originY: flowState.panY,
        moved: false,
    };

    canvas.classList.add('is-panning');
    canvas.setPointerCapture?.(event.pointerId);

    window.addEventListener('pointermove', handleCanvasPointerMove);
    window.addEventListener('pointerup', handleCanvasPointerUp);
    window.addEventListener('pointercancel', handleCanvasPointerUp);
    event.preventDefault();
}

function handleCanvasPointerMove(event) {
    if (!flowState.panning || (event.pointerId !== undefined && flowState.panning.pointerId !== event.pointerId)) {
        return;
    }

    const dx = event.clientX - flowState.panning.startX;
    const dy = event.clientY - flowState.panning.startY;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        flowState.panning.moved = true;
    }

    flowState.panX = Math.round(flowState.panning.originX + dx);
    flowState.panY = Math.round(flowState.panning.originY + dy);
    applyCanvasTransform();
}

function handleCanvasPointerUp(event) {
    if (!flowState.panning || (event.pointerId !== undefined && flowState.panning.pointerId !== event.pointerId)) {
        return;
    }

    const canvas = document.getElementById('flow-canvas');
    if (canvas) {
        canvas.classList.remove('is-panning');
        canvas.releasePointerCapture?.(flowState.panning.pointerId);
    }

    flowState.panning = null;
    window.removeEventListener('pointermove', handleCanvasPointerMove);
    window.removeEventListener('pointerup', handleCanvasPointerUp);
    window.removeEventListener('pointercancel', handleCanvasPointerUp);
}

function clearFlowSelection() {
    flowState.selectedNodeId = null;
    flowState.secondarySelectedNodeId = null;
    flowState.selectedEdgeId = null;
    syncFlowInspector();
    scheduleFlowRender();
}

function selectFlowEdge(edgeId) {
    flowState.selectedEdgeId = edgeId;
    flowState.selectedNodeId = null;
    flowState.secondarySelectedNodeId = null;
    syncFlowInspector();
    scheduleFlowRender();
}

function toggleConnectMode() {
    flowState.connectMode = !flowState.connectMode;
    if (!flowState.connectMode) {
        flowState.connectSourceId = null;
    } else {
        flowState.selectedNodeId = null;
        flowState.secondarySelectedNodeId = null;
        flowState.selectedEdgeId = null;
    }
    updateConnectModeUi();
    scheduleFlowRender();
}

function toggleCanvasInteractivity() {
    flowState.interactivityLocked = !flowState.interactivityLocked;
    updateCanvasControlsUi();
    showFlowAiStatus(
        flowState.interactivityLocked
            ? 'Interatividade ativada. Arraste o canvas para navegar.'
            : 'Interatividade desativada. O canvas volta ao modo de edicao.',
        'info'
    );
    scheduleFlowRender();
}

function zoomFlowCanvasIn() {
    adjustCanvasZoom(FLOW_ZOOM_STEP);
}

function zoomFlowCanvasOut() {
    adjustCanvasZoom(1 / FLOW_ZOOM_STEP);
}

function adjustCanvasZoom(factor) {
    const canvas = document.getElementById('flow-canvas');
    if (!canvas) {
        return;
    }

    const nextZoom = clamp(flowState.zoom * factor, FLOW_MIN_ZOOM, FLOW_MAX_ZOOM);
    if (Math.abs(nextZoom - flowState.zoom) < 0.0001) {
        return;
    }

    const anchorX = canvas.clientWidth / 2;
    const anchorY = canvas.clientHeight / 2;
    const currentContentX = (anchorX - flowState.panX) / flowState.zoom;
    const currentContentY = (anchorY - flowState.panY) / flowState.zoom;

    flowState.zoom = nextZoom;
    flowState.panX = Math.round(anchorX - (currentContentX * nextZoom));
    flowState.panY = Math.round(anchorY - (currentContentY * nextZoom));
    applyCanvasTransform();
}

function fitFlowView() {
    const canvas = document.getElementById('flow-canvas');
    if (!canvas) {
        return;
    }

    const bounds = getFlowBounds();
    if (!bounds) {
        resetCanvasView();
        return;
    }

    const width = Math.max(canvas.clientWidth, 1);
    const height = Math.max(canvas.clientHeight, 1);
    const padding = 72;
    const contentWidth = Math.max(bounds.maxX - bounds.minX, 1);
    const contentHeight = Math.max(bounds.maxY - bounds.minY, 1);
    const zoom = clamp(
        Math.min(
            (width - padding * 2) / contentWidth,
            (height - padding * 2) / contentHeight,
            1
        ),
        FLOW_MIN_ZOOM,
        FLOW_MAX_ZOOM
    );

    flowState.zoom = zoom;
    flowState.panX = Math.round((width - contentWidth * zoom) / 2 - (bounds.minX * zoom));
    flowState.panY = Math.round((height - contentHeight * zoom) / 2 - (bounds.minY * zoom));
    applyCanvasTransform();
}

function resetCanvasView() {
    flowState.zoom = 1;
    flowState.panX = 0;
    flowState.panY = 0;
    applyCanvasTransform();
}

function applyCanvasTransform() {
    const canvas = document.getElementById('flow-canvas');
    const svg = document.getElementById('flow-edge-svg');
    const nodeLayer = document.getElementById('flow-node-layer');
    if (!canvas || !svg || !nodeLayer) {
        return;
    }

    const transform = `translate(${flowState.panX}px, ${flowState.panY}px) scale(${flowState.zoom})`;
    svg.style.transformOrigin = '0 0';
    nodeLayer.style.transformOrigin = '0 0';
    svg.style.transform = transform;
    nodeLayer.style.transform = transform;
    canvas.classList.toggle('is-pannable', flowState.interactivityLocked);
    updateCanvasControlsUi();
}

function updateCanvasControlsUi() {
    const btn = document.getElementById('flow-interactivity-btn');
    if (!btn) {
        return;
    }

    btn.classList.toggle('active', flowState.interactivityLocked);
    btn.setAttribute('aria-pressed', flowState.interactivityLocked ? 'true' : 'false');
    btn.title = flowState.interactivityLocked ? 'Desativar interatividade' : 'Ativar interatividade';

    const icon = btn.querySelector('i');
    if (icon) {
        icon.className = flowState.interactivityLocked ? 'bi bi-lock-fill' : 'bi bi-unlock';
    }
}

function getFlowBounds() {
    if (!flowState.nodes.length) {
        return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    flowState.nodes.forEach(node => {
        const size = getNodeSize(node.type);
        const x = Number(node.x || 0);
        const y = Number(node.y || 0);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + size.width);
        maxY = Math.max(maxY, y + size.height);
    });

    return { minX, minY, maxX, maxY };
}

function getNodeSize(type) {
    return FLOW_NODE_SIZES[type] || FLOW_NODE_SIZES.process;
}

function getNodeShapeClass(type) {
    if (type === 'start' || type === 'end') {
        return 'flow-node--circle';
    }
    if (type === 'decision') {
        return 'flow-node--diamond';
    }
    return 'flow-node--rect';
}

function buildNodeMarkup(node, typeConfig) {
    const label = escapeHtml(node.label || '');
    const typeLabel = escapeHtml(typeConfig.label);
    const id = escapeHtml(String(node.id));

    if (node.type === 'start' || node.type === 'end') {
        return `
            <div class="flow-node-top flow-node-top--center">
                <span class="flow-node-type">${typeLabel}</span>
                <span class="flow-node-label">${label}</span>
            </div>
            <span class="flow-node-id">${id}</span>
        `;
    }

    if (node.type === 'decision') {
        return `
            <div class="flow-node-top flow-node-top--center">
                <span class="flow-node-type">${typeLabel}</span>
                <div class="flow-node-label">${label}</div>
            </div>
            <span class="flow-node-id">${id}</span>
        `;
    }

    return `
        <div class="flow-node-top">
            <span class="flow-node-type">${typeLabel}</span>
            <span class="flow-node-id">${id}</span>
        </div>
        <div class="flow-node-label">${label}</div>
    `;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function updateConnectModeUi() {
    const label = document.getElementById('flow-connect-label');
    if (label) {
        label.textContent = flowState.connectMode ? 'Saindo do modo conectar' : 'Conectar nodes';
    }
}

function addFlowNode(type) {
    const normalizedType = FLOW_NODE_TYPES[type] ? type : 'process';
    ensureFlowGraph();

    const nodeId = makeUniqueNodeId(normalizedType);
    const node = {
        id: nodeId,
        label: FLOW_DEFAULT_COLORS[normalizedType] || 'Processo',
        type: normalizedType,
        x: 120 + (flowState.nodes.length % 4) * 220,
        y: 120 + Math.floor(flowState.nodes.length / 4) * 140,
    };

    flowState.nodes.push(node);
    flowState.selectedNodeId = node.id;
    flowState.secondarySelectedNodeId = null;
    flowState.selectedEdgeId = null;
    markFlowDirty(true);
    syncFlowInspector();
    scheduleFlowRender();
}

function createFlowEdge(sourceId, targetId) {
    const source = getNodeById(sourceId);
    const target = getNodeById(targetId);
    if (!source || !target) {
        showToast('Nao foi possivel criar a conexao.', 'error');
        return;
    }

    if (String(sourceId) === String(targetId)) {
        showToast('Nao e permitido conectar um node a ele mesmo.', 'error');
        return;
    }

    const duplicate = flowState.edges.some(edge => String(edge.from) === String(sourceId) && String(edge.to) === String(targetId));
    if (duplicate) {
        showToast('Essa conexao ja existe.', 'error');
        return;
    }

    const edge = {
        id: makeUniqueEdgeId(),
        from: String(sourceId),
        to: String(targetId),
        label: '',
    };

    flowState.edges.push(edge);
    flowState.selectedEdgeId = edge.id;
    flowState.selectedNodeId = null;
    flowState.secondarySelectedNodeId = null;
    markFlowDirty(true);
    syncFlowInspector();
    scheduleFlowRender();
}

function applyNodeChanges() {
    const node = getSelectedNode();
    if (!node) {
        return;
    }

    const label = document.getElementById('flow-node-label')?.value.trim() || '';
    const type = document.getElementById('flow-node-type')?.value || node.type;
    const x = Number(document.getElementById('flow-node-x')?.value || node.x || 0);
    const y = Number(document.getElementById('flow-node-y')?.value || node.y || 0);

    if (!label) {
        showToast('O node precisa ter um texto.', 'error');
        return;
    }
    if (!FLOW_NODE_TYPES[type]) {
        showToast('Tipo de node invalido.', 'error');
        return;
    }

    node.label = label;
    node.type = type;
    node.x = Math.max(0, Math.round(x));
    node.y = Math.max(0, Math.round(y));

    markFlowDirty(true);
    renderFlowList();
    syncFlowInspector();
    scheduleFlowRender();
}

function applyEdgeChanges() {
    const edge = getSelectedEdge();
    if (!edge) {
        return;
    }

    const label = document.getElementById('flow-edge-label')?.value.trim() || '';
    edge.label = label;
    markFlowDirty(true);
    renderFlowList();
    syncFlowInspector();
    scheduleFlowRender();
}

function editSelectedConnection() {
    const edge = getSelectedConnectionEdge();
    if (!edge) {
        showToast('Nao existe conexao entre os nodes selecionados.', 'error');
        return;
    }

    flowState.selectedEdgeId = edge.id;
    syncFlowInspector();
    scheduleFlowRender();

    const label = document.getElementById('flow-edge-label');
    if (label) {
        label.focus();
        label.select?.();
    }
}

function removeSelectedConnection() {
    const edge = getSelectedConnectionEdge();
    if (!edge) {
        showToast('Nao existe conexao entre os nodes selecionados.', 'error');
        return;
    }

    deleteSelectedFlowElement();
}

function deleteSelectedFlowElement() {
    const node = getSelectedNode();
    const edge = getSelectedEdge();
    const secondaryNode = getSecondarySelectedNode();

    if (edge) {
        flowState.edges = flowState.edges.filter(item => String(item.id) !== String(edge.id));
        flowState.selectedEdgeId = null;
        markFlowDirty(true);
        syncFlowInspector();
        scheduleFlowRender();
        return;
    }

    if (node && secondaryNode) {
        const before = flowState.edges.length;
        flowState.edges = flowState.edges.filter(item => {
            const direct = String(item.from) === String(node.id) && String(item.to) === String(secondaryNode.id);
            const reverse = String(item.from) === String(secondaryNode.id) && String(item.to) === String(node.id);
            return !direct && !reverse;
        });

        if (flowState.edges.length === before) {
            showToast('Nao existe conexao entre os dois nodes selecionados.', 'error');
            return;
        }

        flowState.secondarySelectedNodeId = null;
        flowState.selectedEdgeId = null;
        markFlowDirty(true);
        syncFlowInspector();
        renderFlowList();
        scheduleFlowRender();
        return;
    }

    if (!node) {
        return;
    }

    const sameTypeCount = flowState.nodes.filter(item => item.type === node.type).length;
    if ((node.type === 'start' || node.type === 'end') && sameTypeCount <= 1) {
        showToast('Mantenha ao menos um node start e um node end no fluxo.', 'error');
        return;
    }

    flowState.nodes = flowState.nodes.filter(item => String(item.id) !== String(node.id));
    flowState.edges = flowState.edges.filter(item => String(item.from) !== String(node.id) && String(item.to) !== String(node.id));
    flowState.selectedNodeId = null;
    flowState.secondarySelectedNodeId = null;
    markFlowDirty(true);
    syncFlowInspector();
    renderFlowList();
    scheduleFlowRender();
}

function newFlow() {
    openNewFlowModal();
}

function deleteCurrentFlow() {
    const active = getActiveFlowTab();
    if (!active) {
        return;
    }

    const message = active.flowId
        ? `Excluir o fluxo "${active.name || 'Fluxo sem titulo'}"?`
        : `Fechar o fluxo "${active.name || 'Fluxo sem titulo'}" sem salvar?`;

    if (!confirm(message)) {
        return;
    }

    if (!active.flowId) {
        closeFlowTab(active.tabId, true);
        showToast('Fluxo fechado', 'success');
        return;
    }

    api(`/api/projeto/${flowState.projectId}/fluxos/${active.flowId}/delete`, { method: 'POST' })
        .then(data => {
            if (data.error) {
                showToast(data.error, 'error');
                return;
            }

            const tabId = active.tabId;
            closeFlowTab(tabId, true);
            flowState.flows = flowState.flows.filter(flow => Number(flow.id) !== Number(active.flowId));
            renderFlowTabs();
            renderFlowLibrary();
            showToast('Fluxo excluido', 'success');
        })
        .catch(err => showToast(err.message || 'Falha ao excluir fluxo', 'error'));
}

async function saveCurrentFlow() {
    const active = getActiveFlowTab();
    if (!active) {
        return;
    }

    const isCreate = !active.flowId;
    const name = document.getElementById('flow-edit-name')?.value.trim()
        || active.name
        || 'Fluxo sem titulo';
    const graph = buildPayloadGraph(name);
    const validationError = validateLocalFlowGraph(graph);
    if (validationError) {
        showToast(validationError, 'error');
        return;
    }

    try {
        const endpoint = active.flowId
            ? `/api/projeto/${flowState.projectId}/fluxos/${active.flowId}`
            : `/api/projeto/${flowState.projectId}/fluxos`;

        const data = await api(endpoint, {
            method: 'POST',
            body: JSON.stringify(graph),
        });

        if (data.error) {
            showToast(data.error, 'error');
            return;
        }

        if (data.flow) {
            commitSavedFlowToActiveTab(data.flow);
            refreshSavedFlowCache(data.flow);
        }

        await loadFlowWorkspace(true);
        fitFlowView();
        markFlowDirty(false);
        showToast(isCreate ? 'Fluxo criado' : 'Fluxo salvo', 'success');
    } catch (err) {
        showToast(err.message || 'Falha ao salvar fluxo', 'error');
    }
}

function buildPayloadGraph(name) {
    return {
        name,
        nodes: flowState.nodes.map(node => ({
            id: String(node.id),
            label: String(node.label || ''),
            type: String(node.type || 'process'),
            x: Number(node.x || 0),
            y: Number(node.y || 0),
        })),
        edges: flowState.edges.map(edge => {
            const payload = {
                id: String(edge.id),
                from: String(edge.from),
                to: String(edge.to),
            };
            if (edge.label) {
                payload.label = String(edge.label);
            }
            return payload;
        }),
    };
}

function validateLocalFlowGraph(graph) {
    const ids = new Set();
    let hasStart = false;
    let hasEnd = false;

    for (const node of graph.nodes) {
        if (!node.id || ids.has(node.id)) {
            return 'O fluxo contem nodes duplicados ou sem id.';
        }
        ids.add(node.id);
        if (!FLOW_NODE_TYPES[node.type]) {
            return 'O fluxo contem um node com tipo invalido.';
        }
        if (!node.label || !String(node.label).trim()) {
            return 'Todo node precisa de texto.';
        }
        if (node.type === 'start') hasStart = true;
        if (node.type === 'end') hasEnd = true;
    }

    if (!hasStart || !hasEnd) {
        return 'O fluxo precisa conter ao menos um node start e um node end.';
    }

    const edgeSet = new Set();
    for (const edge of graph.edges) {
        if (!edge.id || edgeSet.has(edge.id)) {
            return 'O fluxo contem edges duplicadas ou sem id.';
        }
        edgeSet.add(edge.id);
        if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to) {
            return 'O fluxo contem uma edge invalida.';
        }
    }

    return '';
}

async function generateFlowFromAI() {
    if (!flowState.currentFlow) {
        createBlankFlowTab();
    }

    const promptEl = document.getElementById('flow-ai-prompt');
    const modeEl = document.getElementById('flow-ai-mode');
    const btn = document.getElementById('flow-ai-generate-btn');
    const prompt = promptEl ? promptEl.value.trim() : '';
    const mode = modeEl ? modeEl.value : 'replace';

    if (!prompt) {
        showToast('Descreva o fluxo para gerar com IA.', 'error');
        return;
    }

    if (btn) btn.disabled = true;
    flowState.aiBusy = true;
    showFlowAiStatus('Gerando fluxo via IA...', 'info');
    appendFlowAiLog('user', prompt);

    try {
        const payload = {
            prompt,
            mode,
            current_graph: buildPayloadGraph(flowState.currentFlow?.name || 'Fluxo atual'),
        };

        const data = await api(`/api/projeto/${flowState.projectId}/fluxos/generate`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        if (data.error) {
            throw new Error(data.error);
        }

        if (!data.graph) {
            throw new Error('A IA nao retornou um fluxo utilizavel.');
        }

        if (mode === 'merge') {
            mergeGeneratedGraph(data.graph);
        } else {
            applyGeneratedGraph(data.graph);
        }

        markFlowDirty(true);
        appendFlowAiLog('assistant', `Fluxo ${data.graph.name || 'gerado'} pronto para revisao.`);
        showFlowAiStatus('Fluxo gerado e aplicado no canvas.', 'success');
        scheduleFlowRender();
        syncFlowInspector();
    } catch (err) {
        showFlowAiStatus('Falha ao gerar fluxo: ' + err.message, 'error');
        appendFlowAiLog('assistant', 'Erro: ' + err.message);
        showToast(err.message || 'Falha ao gerar fluxo', 'error');
    } finally {
        if (btn) btn.disabled = false;
        flowState.aiBusy = false;
    }
}

function applyGeneratedGraph(graph) {
    const copy = cloneGraph(graph);
    const active = getActiveFlowTab();
    if (!active) {
        return;
    }

    active.name = copy.name || active.name || 'Fluxo sem titulo';
    active.nodes = cloneGraph(copy.nodes || []);
    active.edges = cloneGraph(copy.edges || []);
    active.dirty = true;
    active.isNew = !active.flowId;
    flowState.currentFlow = active;
    flowState.nodes = active.nodes;
    flowState.edges = active.edges;
    flowState.selectedNodeId = null;
    flowState.secondarySelectedNodeId = null;
    flowState.selectedEdgeId = null;
    markFlowDirty(true);
    syncFlowName();
    fitFlowView();
}

function mergeGeneratedGraph(graph) {
    const copy = cloneGraph(graph);
    const nodeIdMap = new Map();
    const usedNodeIds = new Set(flowState.nodes.map(node => String(node.id)));
    const usedEdgeIds = new Set(flowState.edges.map(edge => String(edge.id)));

    (copy.nodes || []).forEach((node, index) => {
        const newId = makeUniqueIdForCollection(node.id || `ai_node_${index + 1}`, usedNodeIds);
        usedNodeIds.add(newId);
        nodeIdMap.set(String(node.id), newId);
        flowState.nodes.push({
            id: newId,
            label: node.label || FLOW_DEFAULT_COLORS[node.type] || 'Processo',
            type: FLOW_NODE_TYPES[node.type] ? node.type : 'process',
            x: Number(node.x || 0),
            y: Number(node.y || 0),
        });
    });

    (copy.edges || []).forEach((edge, index) => {
        const from = nodeIdMap.get(String(edge.from));
        const to = nodeIdMap.get(String(edge.to));
        if (!from || !to || from === to) {
            return;
        }
        const newId = makeUniqueIdForCollection(edge.id || `ai_edge_${index + 1}`, usedEdgeIds);
        usedEdgeIds.add(newId);
        flowState.edges.push({
            id: newId,
            from,
            to,
            label: edge.label || '',
        });
    });

    if (copy.name && !flowState.currentFlow?.name) {
        flowState.currentFlow.name = copy.name;
    }

    markFlowDirty(true);
    renderFlowTabs();
}

function appendFlowAiLog(role, message) {
    const log = document.getElementById('flow-ai-log');
    if (!log) {
        return;
    }

    const item = document.createElement('div');
    item.className = 'flow-ai-log-item ' + (role === 'assistant' ? 'assistant' : 'user');
    item.innerHTML = `<strong>${role === 'assistant' ? 'IA' : 'Você'}</strong><span>${escapeHtml(message)}</span>`;
    log.appendChild(item);
    log.scrollTop = log.scrollHeight;
}

function showFlowAiStatus(message, mode = 'info') {
    const status = document.getElementById('flow-ai-status');
    if (!status) {
        return;
    }
    status.classList.remove('hidden');
    status.textContent = message;
    status.className = 'flow-ai-status ' + mode;
}

function updateDirtyPill() {
    const pill = document.getElementById('flow-dirty-pill');
    if (!pill) {
        return;
    }
    pill.classList.toggle('hidden', !flowState.dirty);
}

function markFlowDirty(value) {
    markActiveTabDirty(value);
    renderFlowTabs();
}

function confirmFlowDiscardIfDirty() {
    if (!getActiveFlowTab()?.dirty) {
        return true;
    }
    return confirm('Existem alteracoes nao salvas neste fluxo. Deseja descartar e continuar?');
}

function ensureFlowGraph() {
    if (!flowState.currentFlow) {
        createBlankFlowTab();
    }
}

function cloneGraph(value) {
    return JSON.parse(JSON.stringify(value ?? null));
}

function makeUniqueNodeId(type) {
    const base = `${type}_${Date.now().toString(36)}`;
    return makeUniqueIdForCollection(base, new Set(flowState.nodes.map(node => String(node.id))));
}

function makeUniqueEdgeId() {
    const base = `edge_${Date.now().toString(36)}`;
    return makeUniqueIdForCollection(base, new Set(flowState.edges.map(edge => String(edge.id))));
}

function makeUniqueIdForCollection(base, usedSet) {
    let candidate = String(base || 'id').replace(/[^a-zA-Z0-9_-]+/g, '_');
    let suffix = 1;
    while (usedSet.has(candidate)) {
        candidate = `${base}_${suffix}`;
        suffix += 1;
    }
    return candidate;
}

function syncNodeInspectorPosition(node) {
    const x = document.getElementById('flow-node-x');
    const y = document.getElementById('flow-node-y');
    if (x) x.value = node.x;
    if (y) y.value = node.y;
}

document.addEventListener('DOMContentLoaded', initFlowEditor);

window.loadFlowWorkspace = loadFlowWorkspace;
window.loadFlowById = loadFlowById;
window.newFlow = newFlow;
window.saveCurrentFlow = saveCurrentFlow;
window.deleteCurrentFlow = deleteCurrentFlow;
window.openNewFlowModal = openNewFlowModal;
window.createBlankFlowFromModal = createBlankFlowFromModal;
window.openFlowSettingsModal = openFlowSettingsModal;
window.saveFlowSettings = saveFlowSettings;
window.openExportModal = openExportModal;
window.importFlowFromText = importFlowFromText;
window.importFlowFromFile = importFlowFromFile;
window.exportFlowToPNG = exportFlowToPNG;
window.exportFlowToJSON = exportFlowToJSON;
window.exportFlowToMermaid = exportFlowToMermaid;
window.toggleConnectMode = toggleConnectMode;
window.toggleCanvasInteractivity = toggleCanvasInteractivity;
window.zoomFlowCanvasIn = zoomFlowCanvasIn;
window.zoomFlowCanvasOut = zoomFlowCanvasOut;
window.fitFlowView = fitFlowView;
window.deleteSelectedFlowElement = deleteSelectedFlowElement;
window.editSelectedConnection = editSelectedConnection;
window.removeSelectedConnection = removeSelectedConnection;
window.addFlowNode = addFlowNode;
window.applyNodeChanges = applyNodeChanges;
window.applyEdgeChanges = applyEdgeChanges;
window.generateFlowFromAI = generateFlowFromAI;
