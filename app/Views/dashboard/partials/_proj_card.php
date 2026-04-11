<div class="proj-card <?= $p['favorito'] ? 'fav-card' : '' ?>" data-group="<?= $p['grupo_id'] ?? 'none' ?>" data-id="<?= $p['id'] ?>">
    <!-- Cover -->
    <a href="/projeto/<?= $p['id'] ?>" style="text-decoration:none;color:inherit">
        <div class="proj-cover" style="background:linear-gradient(135deg, <?= $wsSelected['cor'] ?>22 0%, <?= $wsSelected['cor'] ?>44 100%)">
            <i class="bi bi-folder2-open folder-icon" style="color:<?= $wsSelected['cor'] ?>"></i>
        </div>
    </a>

    <!-- Fav badge -->
    <?php if ($p['favorito']): ?>
    <span class="fav-badge"><i class="bi bi-star-fill" style="color:#d97706"></i></span>
    <?php endif; ?>

    <!-- Actions menu -->
    <div class="card-menu">
        <button type="button" class="btn btn-icon btn-ghost" onclick="toggleFavorite(<?= $p['id'] ?>)" title="Marcar como favorito">
            <i class="bi <?= $p['favorito'] ? 'bi-star-fill' : 'bi-star' ?>" style="color:<?= $p['favorito'] ? '#d97706' : 'inherit' ?>"></i>
        </button>
        <button type="button" class="btn btn-icon btn-ghost" onclick="event.stopPropagation();openModal('modal-edit-projeto');fillEditForm(<?= $p['id'] ?>, '<?= htmlspecialchars($p['nome'], ENT_QUOTES) ?>')">
            <i class="bi bi-three-dots-vertical"></i>
        </button>
    </div>

    <!-- Body -->
    <a href="/projeto/<?= $p['id'] ?>" style="text-decoration:none;color:inherit">
        <div class="proj-body">
            <div class="proj-name" title="<?= htmlspecialchars($p['nome']) ?>"><?= htmlspecialchars($p['nome']) ?></div>
            <div class="proj-meta">
                <span><i class="bi bi-clock"></i> <?= date('d/m/Y', strtotime($p['criado_em'])) ?></span>
                <span><i class="bi bi-file-earmark"></i> <?= $p['fonte_count'] ?? 0 ?> fonte(s)</span>
            </div>
            <?php if (!empty($p['grupo_nome']) && $p['grupo_nome'] !== 'Sem grupo'): ?>
            <span class="grupo-badge"><i class="bi bi-hash"></i> <?= htmlspecialchars($p['grupo_nome']) ?></span>
            <?php endif; ?>
        </div>
    </a>
</div>
