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

        if (flowState.currentFlow && flowState.dirty) {
            renderFlowList();
            syncFlowSelector();
            syncFlowName();
            syncFlowInspector();
            scheduleFlowRender();
        } else if (!flowState.currentFlow) {
            if (flowState.flows.length > 0) {
                const first = flowState.flows[0];
                setCurrentFlow(first, false);
                fitFlowView();
            } else {
                const starter = createStarterGraph('Novo fluxo');
                setCurrentFlow({
                    id: null,
                    name: starter.name,
                    project_id: flowState.projectId,
                    nodes: starter.nodes,
                    edges: starter.edges,
                    created_at: null,
                    updated_at: null,
                }, false);
                fitFlowView();
            }
        } else if (flowState.currentFlowId) {
            const found = flowState.flows.find(flow => Number(flow.id) === Number(flowState.currentFlowId));
            if (found) {
                setCurrentFlow(found, false);
                fitFlowView();
            } else if (flowState.flows.length > 0) {
                setCurrentFlow(flowState.flows[0], false);
                fitFlowView();
            }
        }

        renderFlowList();
        syncFlowSelector();
        syncFlowInspector();
        scheduleFlowRender();
    } catch (err) {
        showToast('Falha ao carregar fluxos: ' + err.message, 'error');
    } finally {
        flowState.loading = false;
    }
}

async function loadFlowById(flowId) {
    if (!flowId) {
        return;
    }

    if (!confirmFlowDiscardIfDirty()) {
        syncFlowSelector();
        return;
    }

    const cached = flowState.flows.find(flow => Number(flow.id) === Number(flowId));
    if (cached) {
        setCurrentFlow(cached, false);
        renderFlowList();
        syncFlowSelector();
        fitFlowView();
        scheduleFlowRender();
        return;
    }

    try {
        const data = await api(`/api/projeto/${flowState.projectId}/fluxos/${flowId}`, { method: 'GET' });
        if (!data.flow) {
            throw new Error('Fluxo nao encontrado');
        }
        setCurrentFlow(data.flow, false);
        renderFlowList();
        syncFlowSelector();
        fitFlowView();
        scheduleFlowRender();
    } catch (err) {
        showToast(err.message || 'Falha ao carregar fluxo', 'error');
    }
}

function setCurrentFlow(flow, preserveDirty = false) {
    const normalized = cloneGraph(flow);
    flowState.currentFlowId = normalized.id || null;
    flowState.currentFlow = normalized;
    flowState.nodes = Array.isArray(normalized.nodes) ? cloneGraph(normalized.nodes) : [];
    flowState.edges = Array.isArray(normalized.edges) ? cloneGraph(normalized.edges) : [];
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

function renderFlowList() {
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
    const select = document.getElementById('flow-select');
    if (!select) {
        return;
    }
    select.value = flowState.currentFlowId ? String(flowState.currentFlowId) : '';
}

function syncFlowName() {
    const input = document.getElementById('flow-name');
    if (!input) {
        return;
    }
    input.value = flowState.currentFlow ? String(flowState.currentFlow.name || '') : '';
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
    if (!confirmFlowDiscardIfDirty()) {
        return;
    }

    const starter = createStarterGraph('Novo fluxo');
    setCurrentFlow({
        id: null,
        name: starter.name,
        project_id: flowState.projectId,
        nodes: starter.nodes,
        edges: starter.edges,
        created_at: null,
        updated_at: null,
    }, false);
    renderFlowList();
    syncFlowSelector();
    fitFlowView();
    scheduleFlowRender();
}

function deleteCurrentFlow() {
    if (!flowState.currentFlowId) {
        showToast('Este fluxo ainda nao foi salvo.', 'info');
        return;
    }

    if (!confirm('Excluir este fluxo?')) {
        return;
    }

    api(`/api/projeto/${flowState.projectId}/fluxos/${flowState.currentFlowId}/delete`, { method: 'POST' })
        .then(data => {
            if (data.error) {
                showToast(data.error, 'error');
                return;
            }

            flowState.currentFlowId = null;
            flowState.currentFlow = null;
            flowState.nodes = [];
            flowState.edges = [];
            flowState.selectedNodeId = null;
            flowState.selectedEdgeId = null;
            markFlowDirty(false);
            loadFlowWorkspace(true);
            showToast('Fluxo excluido', 'success');
        })
        .catch(err => showToast(err.message || 'Falha ao excluir fluxo', 'error'));
}

async function saveCurrentFlow() {
    if (!flowState.currentFlow) {
        return;
    }

    const isCreate = !flowState.currentFlowId;
    const name = document.getElementById('flow-name')?.value.trim() || flowState.currentFlow.name || 'Fluxo sem titulo';
    const graph = buildPayloadGraph(name);
    const validationError = validateLocalFlowGraph(graph);
    if (validationError) {
        showToast(validationError, 'error');
        return;
    }

    try {
        const endpoint = flowState.currentFlowId
            ? `/api/projeto/${flowState.projectId}/fluxos/${flowState.currentFlowId}`
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
            setCurrentFlow(data.flow, false);
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
        newFlow();
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
    flowState.currentFlow = {
        id: flowState.currentFlowId,
        name: copy.name || 'Fluxo sem titulo',
        project_id: flowState.projectId,
        nodes: cloneGraph(copy.nodes || []),
        edges: cloneGraph(copy.edges || []),
        created_at: flowState.currentFlow?.created_at || null,
        updated_at: flowState.currentFlow?.updated_at || null,
    };
    flowState.nodes = cloneGraph(copy.nodes || []);
    flowState.edges = cloneGraph(copy.edges || []);
    flowState.selectedNodeId = null;
    flowState.secondarySelectedNodeId = null;
    flowState.selectedEdgeId = null;
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
    flowState.dirty = Boolean(value);
    updateDirtyPill();
}

function confirmFlowDiscardIfDirty() {
    if (!flowState.dirty) {
        return true;
    }
    return confirm('Existem alteracoes nao salvas neste fluxo. Deseja descartar e continuar?');
}

function ensureFlowGraph() {
    if (!flowState.currentFlow) {
        newFlow();
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
