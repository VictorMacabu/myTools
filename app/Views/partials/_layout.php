<?php $basePath = '/'; ?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $pageTitle ?? 'Projetos & Ferramentas' ?></title>
    <link rel="stylesheet" href="/css/reset.css">
    <link rel="stylesheet" href="/css/style.css">
    <script src="/js/app.js" defer></script>
    <script src="/js/project-tabs.js" defer></script>
    <script src="/js/flows.js" defer></script>
</head>
<body>

<?php if (isset($workspaces) && isset($activeWs)): ?>
    <?php include __DIR__ . '/_workspace_rail.php'; ?>
<?php endif; ?>

<main id="main-content">
    <?php include $contentPath; ?>
</main>

<?php if (isset($extraScripts)): include $extraScripts; endif; ?>
</body>
</html>
