<nav class="ws-rail" aria-label="Workspaces">
    <?php foreach ($workspaces as $ws): ?>
    <a href="?ws=<?= $ws['id'] ?>"
       class="ws-dot <?= $ws['id'] == $activeWs ? 'active' : '' ?>"
       title="<?= htmlspecialchars($ws['nome']) ?>"
       style="<?= $ws['id'] == $activeWs ? 'background:'.$ws['cor'] : '' ?>">
        <span><?= htmlspecialchars($ws['icone']) ?></span>
    </a>
    <?php endforeach; ?>
    <button class="ws-dot add-btn" onclick="openModal('modal-new-workspace')" title="Nova &#225;rea de trabalho">+</button>
</nav>
