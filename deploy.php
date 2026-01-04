<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Generate website files
    $websiteName = $data['name'] ?? 'MyWebsite';
    $websiteContent = $data['content'] ?? '';
    $websiteCss = $data['css'] ?? '';
    $websiteJs = $data['js'] ?? '';
    
    // Create ZIP file
    $zip = new ZipArchive();
    $zipFileName = tempnam(sys_get_temp_dir(), 'website_') . '.zip';
    
    if ($zip->open($zipFileName, ZipArchive::CREATE) === TRUE) {
        // Add index.html
        $htmlContent = generateHtml($websiteName, $websiteContent, $websiteCss, $websiteJs);
        $zip->addFromString('index.html', $htmlContent);
        
        // Add style.css
        $zip->addFromString('style.css', $websiteCss);
        
        // Add script.js
        $zip->addFromString('script.js', $websiteJs);
        
        // Add config file
        $config = [
            'name' => $websiteName,
            'generated' => date('Y-m-d H:i:s'),
            'builder' => 'Telegram Website Builder'
        ];
        $zip->addFromString('config.json', json_encode($config, JSON_PRETTY_PRINT));
        
        $zip->close();
        
        // Return download link
        $publicUrl = saveToHosting($zipFileName, $websiteName);
        
        echo json_encode([
            'success' => true,
            'downloadUrl' => $publicUrl,
            'message' => 'Website berhasil dibuat!'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Gagal membuat file ZIP'
        ]);
    }
}

function generateHtml($name, $content, $css, $js) {
    return "
<!DOCTYPE html>
<html lang='id'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>$name</title>
    <style>$css</style>
</head>
<body>
    $content
    <script>$js</script>
</body>
</html>
    ";
}

function saveToHosting($file, $name) {
    // Simpan ke folder public
    $publicDir = __DIR__ . '/websites/' . sanitizeFileName($name);
    
    if (!file_exists($publicDir)) {
        mkdir($publicDir, 0777, true);
    }
    
    // Ekstrak ZIP
    $zip = new ZipArchive();
    if ($zip->open($file) === TRUE) {
        $zip->extractTo($publicDir);
        $zip->close();
    }
    
    // Return public URL
    $baseUrl = (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'];
    return $baseUrl . '/websites/' . sanitizeFileName($name) . '/index.html';
}

function sanitizeFileName($name) {
    return preg_replace('/[^a-zA-Z0-9_-]/', '', str_replace(' ', '-', strtolower($name)));
}
?>
