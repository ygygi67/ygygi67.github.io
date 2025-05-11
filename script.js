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
const STORAGE_KEY = 'songQueue';
const PENDING_KEY = 'pendingSongs';
const SYSTEM_STATUS_KEY = 'systemStatus';

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
function init() {
    loadQueue();
    loadPendingSongs();
    loadSystemStatus();
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
    if (requestForm) {
        requestForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const requesterName = document.getElementById('requesterName').value;
            const songTitle = document.getElementById('songTitle').value;
            const songLink = document.getElementById('songLink') ? document.getElementById('songLink').value : '';
            addSong(songTitle, requesterName, songLink);
            this.reset();
            // Show success message
            const notification = document.getElementById('notification');
            const message = document.getElementById('notificationMessage');
            if (message && notification) {
                message.textContent = 'ส่งคำขอเพลงสำเร็จ!';
                notification.className = 'notification success';
                notification.classList.remove('hidden');
                setTimeout(() => {
                    notification.classList.add('hidden');
                }, 3000);
            }
        });
    }
}

// System Status Management
function loadSystemStatus() {
    const savedStatus = localStorage.getItem(SYSTEM_STATUS_KEY);
    isSystemEnabled = savedStatus === null ? true : savedStatus === 'true';
    updateSystemStatusUI();
}

function toggleSystemStatus() {
    isSystemEnabled = !isSystemEnabled;
    localStorage.setItem(SYSTEM_STATUS_KEY, isSystemEnabled.toString());
    updateSystemStatusUI();
    showNotification(isSystemEnabled ? 'ระบบเปิดใช้งานแล้ว' : 'ระบบปิดใช้งานแล้ว');
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
function loadQueue() {
    const savedQueue = localStorage.getItem(STORAGE_KEY);
    songQueue = savedQueue ? JSON.parse(savedQueue) : [];
}

function loadPendingSongs() {
    const savedPending = localStorage.getItem(PENDING_KEY);
    pendingSongs = savedPending ? JSON.parse(savedPending) : [];
}

function saveQueue() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(songQueue));
}

function savePendingSongs() {
    localStorage.setItem(PENDING_KEY, JSON.stringify(pendingSongs));
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
    if (!songQueueContainer) return;

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const statusFilter = filterStatus ? filterStatus.value : 'all';

    const filteredSongs = [...pendingSongs, ...songQueue].filter(song => {
        const matchesSearch = song.title.toLowerCase().includes(searchTerm) ||
                            song.requester.toLowerCase().includes(searchTerm);
        const matchesStatus = statusFilter === 'all' ||
                            (statusFilter === 'pending' && !song.played) ||
                            (statusFilter === 'played' && song.played);
        return matchesSearch && matchesStatus;
    });

    songQueueContainer.innerHTML = `
        ${!isSystemEnabled ? '<div class="system-status-message">ระบบปิดใช้งานชั่วคราว</div>' : ''}
        ${filteredSongs.map(song => `
            <div class="song-item ${song.played ? 'played' : ''} ${song.status === 'rejected' ? 'rejected' : ''}">
                <div class="song-info">
                    <div class="song-title">${song.title}</div>
                    <div class="song-requester">ขอโดย: ${song.requester}</div>
                    ${song.link ? `<div class="song-link">🔗 <a href="${song.link}" target="_blank" rel="noopener">${song.link}</a></div>` : ''}
                    <div class="song-status ${song.status === 'rejected' ? 'rejected' : ''}">
                        ${song.status === 'rejected' ? 'ถูกปฏิเสธ' : song.played ? 'เล่นแล้ว' : 'รอเล่น'}
                    </div>
                </div>
                ${isAdminLoggedIn ? `
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
                ` : ''}
            </div>
        `).join('')}
    `;
}

function addSong(title, requester, link = '') {
    if (!isSystemEnabled) {
        showNotification('ระบบปิดใช้งานชั่วคราว', 'error');
        return;
    }

    const newSong = {
        id: Date.now().toString(),
        title,
        requester,
        link: link || '',
        played: false,
        timestamp: new Date().toISOString()
    };

    if (isAdminLoggedIn) {
        songQueue.push(newSong);
        saveQueue();
    } else {
        pendingSongs.push(newSong);
        savePendingSongs();
    }

    updateStats();
    renderQueue();
    showNotification(isAdminLoggedIn ? 'เพิ่มเพลงสำเร็จ' : 'ส่งคำขอเพลงสำเร็จ');
}

function approveSong(songId) {
    const songIndex = pendingSongs.findIndex(song => song.id === songId);
    if (songIndex !== -1) {
        const song = pendingSongs[songIndex];
        songQueue.push(song);
        pendingSongs.splice(songIndex, 1);
        saveQueue();
        savePendingSongs();
        updateStats();
        renderQueue();
        showNotification('อนุมัติเพลงสำเร็จ');
    }
}

function rejectSong(songId) {
    const songIndex = pendingSongs.findIndex(song => song.id === songId);
    if (songIndex !== -1) {
        const song = pendingSongs[songIndex];
        song.status = 'rejected';
        savePendingSongs();
        showNotification(`ปฏิเสธคำขอเพลง "${song.title}" แล้ว`, 'error');
        renderQueue();
    }
}

function markAsPlayed(songId) {
    const song = songQueue.find(song => song.id === songId);
    if (song) {
        song.played = true;
        saveQueue();
        updateStats();
        renderQueue();
        showNotification('อัปเดตสถานะเพลงสำเร็จ');
    }
}

function removeSong(songId) {
    const song = [...songQueue, ...pendingSongs].find(s => s.id === songId);
    if (!song) return;

    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'confirm-dialog';
    confirmDialog.innerHTML = `
        <div class="confirm-dialog-content">
            <h3>ยืนยันการลบเพลง</h3>
            <p>คุณต้องการลบเพลง "${song.title}" ออกจากคิวใช่หรือไม่?</p>
            <div class="confirm-dialog-buttons">
                <button class="confirm-btn" onclick="confirmRemoveSong('${songId}')">ยืนยัน</button>
                <button class="cancel-btn" onclick="closeConfirmDialog()">ยกเลิก</button>
            </div>
        </div>
    `;
    document.body.appendChild(confirmDialog);
    setTimeout(() => confirmDialog.classList.add('show'), 10);
}

function confirmRemoveSong(songId) {
    const song = [...songQueue, ...pendingSongs].find(s => s.id === songId);
    const queueIndex = songQueue.findIndex(s => s.id === songId);
    const pendingIndex = pendingSongs.findIndex(s => s.id === songId);

    if (queueIndex !== -1) {
        songQueue.splice(queueIndex, 1);
        saveQueue();
    }
    if (pendingIndex !== -1) {
        pendingSongs.splice(pendingIndex, 1);
        savePendingSongs();
    }

    updateStats();
    renderQueue();
    showNotification(`ลบเพลง "${song.title}" ออกจากคิวแล้ว`, 'error', '<i class="fas fa-trash"></i>');
    closeConfirmDialog();
}

function closeConfirmDialog() {
    const dialog = document.querySelector('.confirm-dialog');
    if (dialog) {
        dialog.classList.remove('show');
        setTimeout(() => dialog.remove(), 300); 
    }
}

function clearPlayedSongs() {
    songQueue = songQueue.filter(song => !song.played);
    saveQueue();
    updateStats();
    renderQueue();
    showNotification('ล้างรายการที่เล่นแล้วสำเร็จ');
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

// Initialize the application
document.addEventListener('DOMContentLoaded', init);