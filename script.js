// Smooth scrolling for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      
      // Update active nav item
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
      });
      this.classList.add('active');
    }
  });
});

// Update active nav item on scroll
const sections = document.querySelectorAll('section, header');
const navItems = document.querySelectorAll('.nav-item');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;
    if (pageYOffset >= sectionTop - 200) {
      current = section.getAttribute('id');
    }
  });

  navItems.forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('href').slice(1) === current) {
      item.classList.add('active');
    }
  });
});

// Skills animation
const skillBars = document.querySelectorAll('.skill-progress');
const skillsSection = document.querySelector('.skills');

const animateSkills = () => {
  skillBars.forEach(bar => {
    const progress = bar.getAttribute('data-progress');
    bar.style.width = progress + '%';
  });
};

// Constants
const ADMIN_PASSWORD = 'admin123'; // Change this to a secure password in production
const API_URL = 'http://localhost:3000/api';

// State
let isAdminLoggedIn = false;
let songQueue = [];
let pendingSongs = [];
let isSystemEnabled = true;

// --- Admin Login Security Improvements ---
let adminFailedAttempts = 0;
let adminLockoutTimeout = null;

// DOM Elements
const adminLoginForm = document.querySelector('.admin-login');
const adminPanel = document.querySelector('.admin-panel');
const adminPasswordInput = document.getElementById('adminPassword');
const adminLoginBtn = document.getElementById('adminLogin');
const songQueueContainer = document.getElementById('songQueue');
const searchInput = document.getElementById('searchQueue');
const filterStatus = document.getElementById('filterStatus');
const pendingCount = document.getElementById('pendingCount');
const playedCount = document.getElementById('playedCount');
const clearPlayedBtn = document.getElementById('clearPlayed');
const exportQueueBtn = document.getElementById('exportQueue');
const requestForm = document.getElementById('requestForm');

const togglePasswordBtn = document.getElementById('togglePassword');
if (togglePasswordBtn && adminPasswordInput) {
    togglePasswordBtn.addEventListener('click', function() {
        const type = adminPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        adminPasswordInput.setAttribute('type', type);
        this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
    });
}

// Initialize
async function init() {
    const isServerConnected = await checkServerConnection();
    if (!isServerConnected) {
        showNotification('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง', 'error', '✕');
        return;
    }

    await loadQueue();
    updateStats();
    renderQueue();
    setupEventListeners();
    checkAdminStatus();
}

// Event Listeners
function setupEventListeners() {
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', handleAdminLogin);
    }
    if (searchInput) {
        searchInput.addEventListener('input', renderQueue);
    }
    if (filterStatus) {
        filterStatus.addEventListener('change', renderQueue);
    }
    if (clearPlayedBtn) {
        clearPlayedBtn.addEventListener('click', clearPlayedSongs);
    }
    if (exportQueueBtn) {
        exportQueueBtn.addEventListener('click', exportQueue);
    }
    const sortBy = document.getElementById('sortBy');
    if (sortBy) {
        sortBy.addEventListener('change', renderQueue);
    }
    if (requestForm) {
        requestForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const requesterName = document.getElementById('requesterName').value;
            const songTitle = document.getElementById('songTitle').value;
            const songLink = document.getElementById('songLink') ? document.getElementById('songLink').value : '';
            await addSong(songTitle, requesterName, songLink);
            this.reset();
            showNotification('ส่งคำขอเพลงสำเร็จ!');
        });
    }

    // Add event listener for the simple song form
    const simpleSongForm = document.querySelector('form[onsubmit="submitSong(event)"]');
    if (simpleSongForm) {
        simpleSongForm.addEventListener('submit', submitSong);
    }
}

// System Status Management
async function loadSystemStatus() {
    try {
        const response = await fetch(`${API_URL}/queue`);
        const data = await response.json();
        isSystemEnabled = data.isSystemEnabled;
        updateSystemStatusUI();
    } catch (error) {
        console.error('Error loading system status:', error);
    }
}

async function toggleSystemStatus() {
    try {
        const response = await fetch(`${API_URL}/system/toggle`, {
            method: 'POST'
        });
        const data = await response.json();
        isSystemEnabled = data.isSystemEnabled;
        updateSystemStatusUI();
        showNotification(isSystemEnabled ? 'ระบบเปิดใช้งานแล้ว' : 'ระบบปิดใช้งานแล้ว');
    } catch (error) {
        console.error('Error toggling system status:', error);
    }
}

function updateSystemStatusUI() {
    const systemStatusBtn = document.getElementById('systemStatus');
    if (systemStatusBtn) {
        systemStatusBtn.textContent = isSystemEnabled ? 'ปิดระบบ' : 'เปิดระบบ';
        systemStatusBtn.className = isSystemEnabled ? 'status-btn enabled' : 'status-btn disabled';
    }
}

// Admin Authentication
function handleAdminLogin() {
    const password = adminPasswordInput.value;
    const adminError = document.getElementById('adminError');
    if (adminLockoutTimeout) {
        if (adminError) {
            adminError.textContent = 'ล็อกอินถูกปิดชั่วคราว กรุณารอ 30 วินาที';
            adminError.style.display = 'block';
        }
        return;
    }
    if (password === ADMIN_PASSWORD) {
        isAdminLoggedIn = true;
        adminFailedAttempts = 0;
        if (adminError) adminError.style.display = 'none';
        showNotification('เข้าสู่ระบบสำเร็จ');
        updateAdminUI();
        renderQueue();
    } else {
        adminFailedAttempts++;
        if (adminError) {
            adminError.textContent = 'รหัสผ่านไม่ถูกต้อง';
            adminError.style.display = 'block';
        }
        if (adminFailedAttempts >= 5) {
            if (adminError) {
                adminError.textContent = 'ล็อกอินถูกปิดชั่วคราว กรุณารอ 30 วินาที';
            }
            adminLockoutTimeout = setTimeout(() => {
                adminFailedAttempts = 0;
                adminLockoutTimeout = null;
                if (adminError) adminError.style.display = 'none';
            }, 30000);
        }
    }
    adminPasswordInput.value = '';
}

function logoutAdmin() {
    isAdminLoggedIn = false;
    showNotification('ออกจากระบบสำเร็จ');
    updateAdminUI();
    renderQueue();
}

function checkAdminStatus() {
    isAdminLoggedIn = false; // Always require login on reload
    updateAdminUI();
}

function updateAdminUI() {
    if (adminLoginForm) {
        adminLoginForm.classList.toggle('hidden', isAdminLoggedIn);
    }
    if (adminPanel) {
        adminPanel.classList.toggle('hidden', !isAdminLoggedIn);
    }
}

// Song Management
async function loadQueue() {
    try {
        console.log('Loading queue from server...'); // Debug log
        const response = await fetch(`${API_URL}/queue`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Received data from server:', data); // Debug log
        
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data received from server');
        }
        
        songQueue = Array.isArray(data.queue) ? data.queue : [];
        pendingSongs = Array.isArray(data.pending) ? data.pending : [];
        isSystemEnabled = Boolean(data.isSystemEnabled);
        
        console.log('Updated local state:', { songQueue, pendingSongs }); // Debug log
        
        updateSystemStatusUI();
        updateStats();
        renderQueue();
    } catch (error) {
        console.error('Error loading queue:', error);
        showNotification(`เกิดข้อผิดพลาดในการโหลดคิวเพลง: ${error.message}`, 'error', '✕');
        
        // Set empty arrays to prevent undefined errors
        songQueue = [];
        pendingSongs = [];
        renderQueue();
    }
}

function updateStats() {
    if (pendingCount) {
        pendingCount.textContent = pendingSongs.length;
    }
    if (playedCount) {
        playedCount.textContent = songQueue.filter(song => song.played).length;
    }
}

function renderQueue() {
    if (!songQueueContainer) {
        console.error('Song queue container not found');
        return;
    }

    console.log('Rendering queue with:', { songQueue, pendingSongs }); // Debug log

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const statusFilter = filterStatus ? filterStatus.value : 'all';
    const sortBy = document.getElementById('sortBy') ? document.getElementById('sortBy').value : 'time-desc';

    let filteredSongs = [...pendingSongs, ...songQueue].filter(song => {
        const matchesSearch = song.title.toLowerCase().includes(searchTerm) ||
                            song.requester.toLowerCase().includes(searchTerm);
        const matchesStatus = statusFilter === 'all' ||
                            (statusFilter === 'pending' && !song.played) ||
                            (statusFilter === 'played' && song.played);
        return matchesSearch && matchesStatus;
    });

    console.log('Filtered songs:', filteredSongs); // Debug log

    // Sort the filtered songs
    filteredSongs.sort((a, b) => {
        switch (sortBy) {
            case 'time-desc':
                return new Date(b.timestamp) - new Date(a.timestamp);
            case 'time-asc':
                return new Date(a.timestamp) - new Date(b.timestamp);
            case 'title-asc':
                return a.title.localeCompare(b.title, 'th');
            case 'title-desc':
                return b.title.localeCompare(a.title, 'th');
            case 'requester-asc':
                return a.requester.localeCompare(b.requester, 'th');
            case 'requester-desc':
                return b.requester.localeCompare(a.requester, 'th');
            default:
                return 0;
        }
    });

    const queueHTML = filteredSongs.map((song, index) => {
        const requestTime = new Date(song.timestamp);
        const formattedTime = requestTime.toLocaleString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
        <div class="song-item ${song.played ? 'played' : ''} ${song.status === 'rejected' ? 'rejected' : ''}">
            <div class="song-info">
                <div class="song-title">
                    <span class="song-number">${index + 1}</span>
                    ${song.title}
                </div>
                <div class="song-requester">ขอโดย: ${song.requester}</div>
                <div class="song-time">⏰ ขอเมื่อ: ${formattedTime}</div>
                ${song.link ? `<div class="song-link">🔗 <a href="${song.link}" target="_blank" rel="noopener">${song.link}</a></div>` : ''}
                <div class="song-status ${song.status === 'rejected' ? 'rejected' : ''}">
                    ${song.status === 'rejected' ? 'ถูกปฏิเสธ' : song.played ? 'เล่นแล้ว' : 'รอเล่น'}
                </div>
            </div>
            
            <div class="song-actions">
                ${!song.played && pendingSongs.includes(song) && song.status !== 'rejected' ? `
                    <button class="approve-btn" onclick="approveSong('${song.id}')">
                        <i class="fas fa-check"></i> อนุมัติ
                    </button>
                    <button class="reject-btn" onclick="rejectSong('${song.id}')">
                        <i class="fas fa-times"></i> ปฏิเสธ
                    </button>
                ` : ''}
                ${!song.played && !pendingSongs.includes(song) ? `
                    <button class="mark-played-btn" onclick="markAsPlayed('${song.id}')">
                        <i class="fas fa-play"></i> เล่นแล้ว
                    </button>
                ` : ''}
                <button class="remove-btn" onclick="removeSong('${song.id}')">
                    <i class="fas fa-trash"></i> ลบ
                </button>
            </div>
        </div>
        `;
    }).join('');

    songQueueContainer.innerHTML = `
        ${!isSystemEnabled ? '<div class="system-status-message">ระบบปิดใช้งานชั่วคราว</div>' : ''}
        ${queueHTML}
    `;

    console.log('Queue rendered with HTML:', songQueueContainer.innerHTML); // Debug log
}

async function addSong(title, requester, link = '') {
    if (!isSystemEnabled) {
        showNotification('ระบบปิดใช้งานชั่วคราว', 'error');
        return;
    }

    if (!title || !requester) {
        showNotification('กรุณากรอกชื่อเพลงและชื่อผู้ขอ', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/queue`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, requester, link })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            await loadQueue();
            updateStats();
            renderQueue();
            showNotification('ส่งคำขอเพลงสำเร็จ!', 'success', '✓');
        } else {
            throw new Error(data.message || 'Failed to add song');
        }
    } catch (error) {
        console.error('Error adding song:', error);
        showNotification('เกิดข้อผิดพลาดในการเพิ่มเพลง: ' + error.message, 'error', '✕');
    }
}

async function approveSong(songId) {
    try {
        const response = await fetch(`${API_URL}/approve/${songId}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            await loadQueue();
            updateStats();
            renderQueue();
            showNotification('อนุมัติเพลงสำเร็จ');
        } else {
            throw new Error('Failed to approve song');
        }
    } catch (error) {
        console.error('Error approving song:', error);
        showNotification('เกิดข้อผิดพลาดในการอนุมัติเพลง', 'error');
    }
}

async function rejectSong(songId) {
    try {
        const response = await fetch(`${API_URL}/reject/${songId}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            await loadQueue();
            showNotification('ปฏิเสธคำขอเพลงสำเร็จ', 'error');
        } else {
            throw new Error('Failed to reject song');
        }
    } catch (error) {
        console.error('Error rejecting song:', error);
        showNotification('เกิดข้อผิดพลาดในการปฏิเสธเพลง', 'error');
    }
}

async function markAsPlayed(songId) {
    try {
        const response = await fetch(`${API_URL}/played/${songId}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            await loadQueue();
            updateStats();
            renderQueue();
            showNotification('อัปเดตสถานะเพลงสำเร็จ');
        } else {
            throw new Error('Failed to mark song as played');
        }
    } catch (error) {
        console.error('Error marking song as played:', error);
        showNotification('เกิดข้อผิดพลาดในการอัปเดตสถานะเพลง', 'error');
    }
}

async function removeSong(songId) {
    const song = [...songQueue, ...pendingSongs].find(s => s.id === songId);
    if (!song) return;

    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'confirm-dialog';
    confirmDialog.innerHTML = `
        <div class="confirm-dialog-content">
            <h3><i class="fas fa-exclamation-triangle"></i> ยืนยันการลบเพลง</h3>
            <p>คุณต้องการลบเพลง "${song.title}" ออกจากคิวใช่หรือไม่?</p>
            <p class="song-details">
                <strong>ขอโดย:</strong> ${song.requester}<br>
                <strong>สถานะ:</strong> ${song.played ? 'เล่นแล้ว' : (song.status === 'rejected' ? 'ถูกปฏิเสธ' : 'รอเล่น')}
            </p>
            <div class="confirm-dialog-buttons">
                <button class="cancel-btn" onclick="closeConfirmDialog()">
                    <i class="fas fa-times"></i> ยกเลิก
                </button>
                <button class="confirm-btn" onclick="confirmRemoveSong('${songId}')">
                    <i class="fas fa-trash"></i> ลบ
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(confirmDialog);
    setTimeout(() => confirmDialog.classList.add('show'), 10);

    // Add keyboard support
    const handleKeyPress = (e) => {
        if (e.key === 'Escape') {
            closeConfirmDialog();
        } else if (e.key === 'Enter') {
            confirmRemoveSong(songId);
        }
    };
    document.addEventListener('keydown', handleKeyPress);
    confirmDialog.addEventListener('click', (e) => {
        if (e.target === confirmDialog) {
            closeConfirmDialog();
        }
    });
}

async function confirmRemoveSong(songId) {
    try {
        const response = await fetch(`${API_URL}/song/${songId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadQueue();
            updateStats();
            renderQueue();
            showNotification('ลบเพลงสำเร็จ');
        } else {
            throw new Error('Failed to remove song');
        }
    } catch (error) {
        console.error('Error removing song:', error);
        showNotification('เกิดข้อผิดพลาดในการลบเพลง', 'error');
    }
    closeConfirmDialog();
}

function closeConfirmDialog() {
    const dialog = document.querySelector('.confirm-dialog');
    if (dialog) {
        dialog.classList.remove('show');
        setTimeout(() => {
            dialog.remove();
        }, 300);
    }
}

async function clearPlayedSongs() {
    try {
        const playedSongs = songQueue.filter(song => song.played);
        for (const song of playedSongs) {
            await fetch(`${API_URL}/song/${song.id}`, {
                method: 'DELETE'
            });
        }
        await loadQueue();
        updateStats();
        renderQueue();
        showNotification('ล้างรายการที่เล่นแล้วสำเร็จ');
    } catch (error) {
        console.error('Error clearing played songs:', error);
        showNotification('เกิดข้อผิดพลาดในการล้างรายการ', 'error');
    }
}

function exportQueue() {
    const data = {
        queue: songQueue,
        pending: pendingSongs,
        exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `song-queue-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('ส่งออกข้อมูลสำเร็จ');
}

function importQueue(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Validate the imported data structure
            if (!data.queue || !data.pending) {
                throw new Error('รูปแบบไฟล์ไม่ถูกต้อง');
            }

            // Confirm before importing
            const confirmDialog = document.createElement('div');
            confirmDialog.className = 'confirm-dialog';
            confirmDialog.innerHTML = `
                <div class="confirm-dialog-content">
                    <h3>ยืนยันการนำเข้าข้อมูล</h3>
                    <p>การนำเข้าข้อมูลจะแทนที่ข้อมูลปัจจุบันทั้งหมด คุณต้องการดำเนินการต่อใช่หรือไม่?</p>
                    <div class="confirm-dialog-buttons">
                        <button class="confirm-btn" onclick="confirmImport(${JSON.stringify(data)})">ยืนยัน</button>
                        <button class="cancel-btn" onclick="closeConfirmDialog()">ยกเลิก</button>
                    </div>
                </div>
            `;
            document.body.appendChild(confirmDialog);
            setTimeout(() => confirmDialog.classList.add('show'), 10);

        } catch (error) {
            showNotification('เกิดข้อผิดพลาดในการนำเข้าข้อมูล: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
}

async function confirmImport(data) {
    try {
        // First, clear existing songs
        const allSongs = [...songQueue, ...pendingSongs];
        for (const song of allSongs) {
            await fetch(`${API_URL}/song/${song.id}`, {
                method: 'DELETE'
            });
        }

        // Then add the imported songs
        for (const song of data.queue) {
            await fetch(`${API_URL}/queue`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: song.title,
                    requester: song.requester,
                    link: song.link
                })
            });
        }

        // Load the updated queue
        await loadQueue();
        updateStats();
        renderQueue();
        showNotification('นำเข้าข้อมูลสำเร็จ');
    } catch (error) {
        console.error('Error importing data:', error);
        showNotification('เกิดข้อผิดพลาดในการนำเข้าข้อมูล', 'error');
    }
    closeConfirmDialog();
}

// Utility Functions
function showNotification(message, type = 'success', customIcon = null) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    let icon, iconClass;
    if (customIcon) {
        icon = customIcon;
        iconClass = `notification-icon ${type}`;
    } else {
        icon = type === 'success' ? '✓' : (type === 'error' ? '✕' : '');
        iconClass = type === 'success' ? 'notification-icon success' : 'notification-icon error';
    }
    
    notification.innerHTML = `
        <div class="notification-content">
            <span class="${iconClass}">${icon}</span>
            <span class="notification-message">${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Header Collapse Functionality
function initHeaderCollapse() {
    const header = document.querySelector('header');
    const main = document.querySelector('main');
    const collapseIndicator = document.createElement('button');
    collapseIndicator.className = 'collapse-indicator';
    collapseIndicator.innerHTML = `
        <span></span>
        <span></span>
        <span></span>
    `;
    
    // Create overlay background
    const overlay = document.createElement('div');
    overlay.className = 'overlay-bg';
    
    document.body.appendChild(collapseIndicator);
    document.body.appendChild(overlay);
    
    let isOpen = false;
    
    function openMenu() {
        isOpen = true;
        header.classList.add('show');
        overlay.classList.add('show');
        main.classList.add('blur');
    }
    
    function closeMenu() {
        isOpen = false;
        header.classList.remove('show');
        overlay.classList.remove('show');
        main.classList.remove('blur');
    }
    
    collapseIndicator.addEventListener('click', () => {
        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    overlay.addEventListener('click', closeMenu);
}

// Theme Management
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    
    // Show notification
    showNotification(
        newTheme === 'dark' ? 'เปลี่ยนเป็นโหมดกลางคืน' : 'เปลี่ยนเป็นโหมดกลางวัน',
        'success'
    );
}

function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.innerHTML = theme === 'light' 
            ? '<i class="fas fa-moon"></i>' 
            : '<i class="fas fa-sun"></i>';
    }
}

// Initialize header collapse when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initHeaderCollapse();
    init();
    initTheme();
});

// Add a function to check server connection
async function checkServerConnection() {
    try {
        const response = await fetch(`${API_URL}/queue`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        return true;
    } catch (error) {
        console.error('Server connection error:', error);
        showNotification('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', 'error');
        return false;
    }
}

// Add submitSong function
async function submitSong(e) {
    e.preventDefault();
    const songInput = document.getElementById("song");
    const song = songInput.value.trim();

    if (!song) {
        showNotification('กรุณากรอกชื่อเพลง', 'error', '✕');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/queue`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                title: song,
                requester: 'ผู้ใช้',
                link: ''
            })
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
            songInput.value = ''; // Clear the input
            await loadQueue(); // Reload the queue
            showNotification('ส่งคำขอเพลงสำเร็จ!', 'success', '✓');
        } else {
            throw new Error(data.message || 'Failed to add song');
        }
    } catch (error) {
        console.error('Error submitting song:', error);
        showNotification('เกิดข้อผิดพลาดในการส่งเพลง: ' + error.message, 'error', '✕');
    }
}