// Konfigurasi Default
const CONFIG = {
    botToken: localStorage.getItem('telegram_bot_token') || '',
    chatId: localStorage.getItem('telegram_chat_id') || '',
    storageMode: localStorage.getItem('storage_mode') || 'local',
    lastSync: localStorage.getItem('last_sync') || null
};

// Inisialisasi
document.addEventListener('DOMContentLoaded', function() {
    loadStats();
    loadWebsites();
    updateLastSync();
    
    // Load config ke form
    if (CONFIG.botToken) {
        document.getElementById('botToken').value = CONFIG.botToken;
        document.getElementById('chatId').value = CONFIG.chatId;
        document.getElementById('storageMode').value = CONFIG.storageMode;
    }
});

// ============== LOCALSTORAGE FUNCTIONS ==============

function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`Data saved to localStorage: ${key}`);
        return true;
    } catch (e) {
        console.error('Error saving to localStorage:', e);
        return false;
    }
}

function getFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Error reading from localStorage:', e);
        return null;
    }
}

function getAllWebsites() {
    const websites = getFromLocalStorage('websites') || [];
    const templates = getFromLocalStorage('templates') || getDefaultTemplates();
    
    // Gabungkan dengan template default jika ada website dari template
    websites.forEach(website => {
        if (website.templateId && !website.content) {
            const template = templates.find(t => t.id === website.templateId);
            if (template) {
                website.content = template.content;
                website.styles = template.styles;
                website.scripts = template.scripts;
            }
        }
    });
    
    return websites;
}

function saveWebsite(website) {
    const websites = getAllWebsites();
    
    // Cek apakah website sudah ada
    const index = websites.findIndex(w => w.id === website.id);
    
    if (index >= 0) {
        // Update existing
        websites[index] = {
            ...websites[index],
            ...website,
            updatedAt: new Date().toISOString()
        };
    } else {
        // Add new
        website.id = website.id || Date.now().toString();
        website.createdAt = new Date().toISOString();
        website.updatedAt = new Date().toISOString();
        websites.push(website);
    }
    
    // Save to localStorage
    saveToLocalStorage('websites', websites);
    
    // Sync to Telegram jika mode aktif
    if (CONFIG.storageMode !== 'local' && CONFIG.botToken) {
        syncWebsiteToTelegram(website);
    }
    
    return website;
}

function deleteWebsite(id) {
    const websites = getAllWebsites();
    const updatedWebsites = websites.filter(w => w.id !== id);
    saveToLocalStorage('websites', updatedWebsites);
    
    // Hapus dari Telegram juga
    if (CONFIG.storageMode !== 'local' && CONFIG.botToken) {
        deleteFromTelegram(id);
    }
    
    return true;
}

// ============== TELEGRAM FUNCTIONS ==============

async function syncWebsiteToTelegram(website) {
    if (!CONFIG.botToken || !CONFIG.chatId) return false;
    
    try {
        const message = formatTelegramMessage(website);
        
        const response = await fetch(`https://api.telegram.org/bot${CONFIG.botToken}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: CONFIG.chatId,
                text: message,
                parse_mode: 'HTML'
            })
        });
        
        const data = await response.json();
        
        if (data.ok) {
            // Simpan message_id ke website
            website.telegramMessageId = data.result.message_id;
            saveToLocalStorage('websites', getAllWebsites());
            
            // Update last sync
            CONFIG.lastSync = new Date().toISOString();
            localStorage.setItem('last_sync', CONFIG.lastSync);
            updateLastSync();
            
            return true;
        } else {
            console.error('Telegram error:', data);
            return false;
        }
    } catch (error) {
        console.error('Error syncing to Telegram:', error);
        return false;
    }
}

async function syncAllToTelegram() {
    const websites = getAllWebsites();
    let successCount = 0;
    
    for (const website of websites) {
        if (await syncWebsiteToTelegram(website)) {
            successCount++;
        }
    }
    
    showAlert(`Berhasil sync ${successCount} dari ${websites.length} website ke Telegram`, 'success');
    return successCount;
}

function formatTelegramMessage(website) {
    return `
<b>🌐 WEBSITE BACKUP</b>
────────────────────
<b>Nama:</b> ${website.name}
<b>URL:</b> ${website.url || 'Belum deploy'}
<b>Template:</b> ${website.template || 'Custom'}
<b>Dibuat:</b> ${new Date(website.createdAt).toLocaleString('id-ID')}

<b>📊 STATISTIK:</b>
• Halaman: ${website.pages?.length || 1}
• Produk: ${website.products?.length || 0}
• Posting: ${website.posts?.length || 0}

<b>💾 DATA:</b>
<code>${JSON.stringify(website, null, 2).substring(0, 1000)}</code>
────────────────────
#Backup #WebsiteBuilder
    `.trim();
}

// ============== WEBSITE BUILDER ==============

function createWebsite() {
    const name = document.getElementById('websiteName').value;
    const type = document.getElementById('websiteType').value;
    const url = document.getElementById('websiteUrl').value;
    const templateId = window.selectedTemplate || 'gas-industri-1';
    
    if (!name || !type) {
        showAlert('Harap isi nama dan jenis website', 'error');
        return;
    }
    
    const website = {
        name,
        type,
        url: url || name.toLowerCase().replace(/\s+/g, '-'),
        templateId,
        status: 'draft',
        pages: [],
        settings: {},
        content: getTemplateContent(templateId)
    };
    
    saveWebsite(website);
    showAlert(`Website "${name}" berhasil dibuat!`, 'success');
    closeModal('createModal');
    loadWebsites();
    
    // Redirect ke editor
    setTimeout(() => {
        window.location.href = `builder.html?id=${website.id}`;
    }, 1500);
}

function getTemplateContent(templateId) {
    const templates = {
        'gas-industri-1': `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{website_name}} - Gas Industri</title>
    <style>
        /* Template styles akan diisi */
    </style>
</head>
<body>
    <header>
        <nav>
            <div class="logo">{{website_name}}</div>
            <ul>
                <li><a href="#home">Beranda</a></li>
                <li><a href="#products">Produk</a></li>
                <li><a href="#about">Tentang</a></li>
                <li><a href="#contact">Kontak</a></li>
            </ul>
        </nav>
    </header>
    
    <main>
        <section id="home">
            <h1>Selamat Datang di {{website_name}}</h1>
            <p>Penyedia gas industri terpercaya</p>
        </section>
        
        <section id="products">
            <h2>Produk Gas Kami</h2>
            <div class="products-grid">
                <!-- Produk akan diisi -->
            </div>
        </section>
        
        <section id="contact">
            <h2>Hubungi Kami</h2>
            <form>
                <input type="text" placeholder="Nama">
                <input type="email" placeholder="Email">
                <textarea placeholder="Pesan"></textarea>
                <button type="submit">Kirim</button>
            </form>
        </section>
    </main>
    
    <footer>
        <p>&copy; {{year}} {{website_name}}. All rights reserved.</p>
    </footer>
</body>
</html>
        `,
        'gas-industri-2': `<!-- Template gas-industri-2 -->`
    };
    
    return templates[templateId] || templates['gas-industri-1'];
}

// ============== UI FUNCTIONS ==============

function loadStats() {
    const websites = getAllWebsites();
    const deployed = websites.filter(w => w.status === 'deployed').length;
    
    document.getElementById('total-websites').textContent = websites.length;
    document.getElementById('active-deploys').textContent = deployed;
    
    // Update last sync
    updateLastSync();
}

function loadWebsites() {
    const websites = getAllWebsites();
    const container = document.getElementById('websites-list');
    
    if (websites.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 50px; color: #666; grid-column: 1/-1;">
                <i class="fas fa-folder-open" style="font-size: 4rem; margin-bottom: 20px;"></i>
                <h3>Belum ada website</h3>
                <p>Klik "Buat Website Baru" untuk memulai</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = websites.map(website => `
        <div class="website-card">
            <div class="website-preview" style="background: linear-gradient(135deg, ${getRandomColor()});">
                <i class="fas fa-${getWebsiteIcon(website.type)}"></i>
            </div>
            <div class="website-info">
                <h3>${website.name}</h3>
                <div class="website-meta">
                    <span><i class="fas fa-tag"></i> ${website.type}</span>
                    <span><i class="fas fa-calendar"></i> ${formatDate(website.createdAt)}</span>
                </div>
                <div class="website-actions">
                    <button class="btn btn-sm btn-primary" onclick="editWebsite('${website.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm" onclick="previewWebsite('${website.id}')">
                        <i class="fas fa-eye"></i> Preview
                    </button>
                    <button class="btn btn-sm btn-success" onclick="deployWebsite('${website.id}')">
                        <i class="fas fa-rocket"></i> Deploy
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function getWebsiteIcon(type) {
    const icons = {
        'gas-industri': 'gas-pump',
        'toko-online': 'store',
        'portfolio': 'briefcase',
        'blog': 'blog',
        'company-profile': 'building'
    };
    return icons[type] || 'globe';
}

function getRandomColor() {
    const colors = [
        '#667eea, #764ba2',
        '#f093fb, #f5576c',
        '#4facfe, #00f2fe',
        '#43e97b, #38f9d7',
        '#fa709a, #fee140'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// ============== MODAL FUNCTIONS ==============

function showModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showConfigModal() {
    showModal('configModal');
}

function showCreateModal() {
    showModal('createModal');
}

function showDeployModal() {
    const websites = getAllWebsites();
    const select = document.getElementById('deployWebsite');
    
    select.innerHTML = websites.map(w => 
        `<option value="${w.id}">${w.name}</option>`
    ).join('');
    
    if (websites.length === 0) {
        showAlert('Buat website terlebih dahulu sebelum deploy', 'error');
        return;
    }
    
    showModal('deployModal');
}

function showTemplateOptions() {
    const type = document.getElementById('websiteType').value;
    const options = document.getElementById('templateOptions');
    
    if (type) {
        options.style.display = 'block';
    } else {
        options.style.display = 'none';
    }
}

function selectTemplate(templateId) {
    window.selectedTemplate = templateId;
    
    // Highlight selected template
    document.querySelectorAll('.template-card').forEach(card => {
        card.style.border = '2px solid transparent';
    });
    event.currentTarget.style.border = '2px solid #0088cc';
}

// ============== DEPLOY FUNCTIONS ==============

function prepareDeploy() {
    const websiteId = document.getElementById('deployWebsite').value;
    const website = getAllWebsites().find(w => w.id === websiteId);
    
    if (!website) {
        showAlert('Website tidak ditemukan', 'error');
        return;
    }
    
    // Generate ZIP file
    generateWebsiteZip(website);
}

function generateWebsiteZip(website) {
    // Buat struktur file website
    const files = {
        'index.html': generateIndexHtml(website),
        'style.css': generateCss(website),
        'script.js': generateJs(website),
        'config.json': JSON.stringify(website.config || {}, null, 2),
        'README.txt': `Website: ${website.name}\nDibuat dengan Website Builder\nTanggal: ${new Date().toLocaleString('id-ID')}`
    };
    
    // Buat ZIP menggunakan JSZip
    if (typeof JSZip !== 'undefined') {
        const zip = new JSZip();
        
        Object.entries(files).forEach(([filename, content]) => {
            zip.file(filename, content);
        });
        
        // Tambahkan folder assets jika ada
        if (website.assets) {
            website.assets.forEach(asset => {
                zip.file(`assets/${asset.name}`, asset.content);
            });
        }
        
        // Generate dan download ZIP
        zip.generateAsync({type: 'blob'})
            .then(blob => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${website.url || website.name.toLowerCase().replace(/\s+/g, '-')}.zip`;
                link.click();
                
                showAlert(`File ZIP "${website.name}" berhasil didownload!`, 'success');
                
                // Update status website
                website.status = 'ready_to_deploy';
                saveWebsite(website);
            });
    } else {
        // Fallback: buat file HTML saja
        const htmlContent = generateIndexHtml(website);
        const blob = new Blob([htmlContent], {type: 'text/html'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'index.html';
        link.click();
        
        showAlert('File HTML berhasil didownload!', 'success');
    }
}

function generateIndexHtml(website) {
    const template = website.content || getTemplateContent(website.templateId);
    
    // Replace placeholders
    return template
        .replace(/{{website_name}}/g, website.name)
        .replace(/{{year}}/g, new Date().getFullYear())
        .replace(/{{url}}/g, website.url || '')
        .replace(/{{description}}/g, website.description || '');
}

// ============== UTILITY FUNCTIONS ==============

function showAlert(message, type = 'info') {
    const alert = document.getElementById('alert');
    alert.textContent = message;
    alert.className = `alert alert-${type}`;
    alert.style.display = 'block';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, 5000);
}

function updateLastSync() {
    const lastSync = localStorage.getItem('last_sync');
    if (lastSync) {
        const date = new Date(lastSync);
        document.getElementById('last-sync').textContent = 
            date.toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'});
    }
}

function saveBotConfig() {
    const botToken = document.getElementById('botToken').value;
    const chatId = document.getElementById('chatId').value;
    const storageMode = document.getElementById('storageMode').value;
    
    if (botToken && chatId) {
        CONFIG.botToken = botToken;
        CONFIG.chatId = chatId;
        CONFIG.storageMode = storageMode;
        
        localStorage.setItem('telegram_bot_token', botToken);
        localStorage.setItem('telegram_chat_id', chatId);
        localStorage.setItem('storage_mode', storageMode);
        
        showAlert('Konfigurasi Telegram Bot berhasil disimpan!', 'success');
        closeModal('configModal');
        
        // Test connection
        testTelegramConnection();
    } else {
        showAlert('Harap isi Bot Token dan Chat ID', 'error');
    }
}

async function testTelegramConnection() {
    if (!CONFIG.botToken) return;
    
    try {
        const response = await fetch(`https://api.telegram.org/bot${CONFIG.botToken}/getMe`);
        const data = await response.json();
        
        if (data.ok) {
            showAlert(`✅ Berhasil terhubung ke bot: ${data.result.username}`, 'success');
        } else {
            showAlert('❌ Gagal terhubung ke bot. Cek token Anda.', 'error');
        }
    } catch (error) {
        showAlert('❌ Error koneksi ke Telegram API', 'error');
    }
}

function backupToTelegram() {
    if (!CONFIG.botToken || !CONFIG.chatId) {
        showConfigModal();
        showAlert('Harap konfigurasi Telegram Bot terlebih dahulu', 'error');
        return;
    }
    
    syncAllToTelegram();
}

function getDefaultTemplates() {
    return [
        {
            id: 'gas-industri-1',
            name: 'Gas Industri Pro',
            type: 'gas-industri',
            description: 'Template lengkap untuk bisnis gas industri',
            category: 'business',
            previewColor: '#667eea',
            content: '<!-- Template content -->'
        },
        {
            id: 'gas-industri-2',
            name: 'Gas Modern',
            type: 'gas-industri',
            description: 'Desain modern untuk perusahaan gas',
            category: 'business',
            previewColor: '#4facfe',
            content: '<!-- Template content -->'
        }
    ];
}

// Event listeners
window.showConfigModal = showConfigModal;
window.showCreateModal = showCreateModal;
window.showDeployModal = showDeployModal;
window.createWebsite = createWebsite;
window.saveBotConfig = saveBotConfig;
window.prepareDeploy = prepareDeploy;
window.selectTemplate = selectTemplate;
window.showTemplateOptions = showTemplateOptions;
window.syncWithTelegram = backupToTelegram;
window.closeModal = closeModal;
