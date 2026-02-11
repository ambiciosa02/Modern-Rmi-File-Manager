// Global variables
let files = [];
let selectedFiles = new Set();
let viewMode = 'grid';
let currentContextFile = null;
let currentFolder = ''; // Track current folder path
let breadcrumbs = []; // Track breadcrumb navigation

// Authentication constants
const USERS_KEY = 'fileManagerUsers';
const CURRENT_USER_KEY = 'currentUser';
const LOGIN_KEY = 'isLoggedIn';
const DEFAULT_USER = {
    id: 1,
    username: 'user@gmail.com',
    password: '123',
    email: 'user@gmail.com',
    name: 'Demo User',
    role: 'admin',
    created: new Date().toISOString(),
    lastLogin: null
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const isLoggedIn = localStorage.getItem(LOGIN_KEY) === 'true';
    const currentUser = getCurrentUser();
    
    if (!isLoggedIn || !currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    // Update UI with current user info
    updateUserUI(currentUser);
    
    // Initialize users if not exists
    initializeUsers();
    
    // Load files and other initialization
    loadFiles(currentFolder);
    setupEventListeners();
    loadViewPreferences();
    updateStorageInfo();
    setupFolderNavigation();
    setupSidebarNavigation();
    
    // Set Home as active
    setActiveNavItem('Home');
});

// ========================
// Authentication Functions
// ========================

function initializeUsers() {
    const users = JSON.parse(localStorage.getItem(USERS_KEY));
    if (!users || users.length === 0) {
        localStorage.setItem(USERS_KEY, JSON.stringify([DEFAULT_USER]));
    }
}

function getCurrentUser() {
    const user = localStorage.getItem(CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
}

function getAllUsers() {
    const users = localStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : [];
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function updateUserUI(user) {
    // Update sidebar user info
    const sidebarUsername = document.getElementById('sidebar-username');
    const sidebarUserrole = document.getElementById('sidebar-userrole');
    
    if (sidebarUsername) {
        sidebarUsername.textContent = user.name || user.username;
    }
    
    if (sidebarUserrole) {
        sidebarUserrole.textContent = user.role === 'admin' ? 'Administrator' : 'User';
    }
    
    // Update user info in settings modal
    document.getElementById('current-username').textContent = user.username;
    document.getElementById('current-email').textContent = user.email;
    document.getElementById('current-role').textContent = user.role;
    document.getElementById('account-created').textContent = 
        new Date(user.created).toLocaleDateString();
}

// ========================
// File Management Functions
// ========================

// Load files from server for current folder
async function loadFiles(folder = '') {
    showLoading(true);
    try {
        const url = folder ? `/api/files?folder=${encodeURIComponent(folder)}` : '/api/files';
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('API Response for folder:', folder, data); // Debug log
        
        if (response.ok && Array.isArray(data)) {
            files = data.map(file => {
                const name = file.name || file.filename || 'unknown';
                const size = file.size || 0;
                const lastModified = file.lastModified || file.modified || Date.now();
                const isDirectory = file.isDirectory || file.directory || false;
                const path = file.path || name;
                
                return {
                    id: path + '_' + lastModified,
                    name: name,
                    size: size,
                    modified: lastModified,
                    type: isDirectory ? 'folder' : getFileType(name),
                    icon: isDirectory ? 'fas fa-folder' : getFileIcon(name),
                    color: isDirectory ? 'folder' : getFileColor(name),
                    isDirectory: isDirectory,
                    path: path
                };
            });
            
            currentFolder = folder;
            updateBreadcrumbs();
            renderFiles();
            updateStorageInfo();
        } else {
            showToast('Failed to load files: ' + (data.error || 'Unknown error'), 'error');
            files = [];
            renderFiles();
        }
    } catch (error) {
        console.error('Error loading files:', error);
        showToast('Error loading files: ' + error.message, 'error');
        files = [];
        renderFiles();
    } finally {
        showLoading(false);
    }
}

// Setup folder navigation
function setupFolderNavigation() {
    const breadcrumbElement = document.getElementById('breadcrumb');
    
    // Function to update breadcrumb display
    const updateBreadcrumbs = () => {
        breadcrumbElement.innerHTML = '';
        
        // Add Home link
        const homeLink = document.createElement('a');
        homeLink.href = '#';
        homeLink.textContent = 'Home';
        homeLink.onclick = (e) => {
            e.preventDefault();
            navigateToFolder('');
        };
        breadcrumbElement.appendChild(homeLink);
        
        // Add folder links
        if (currentFolder) {
            const parts = currentFolder.split('/');
            let pathSoFar = '';
            
            parts.forEach((part, index) => {
                const separator = document.createElement('span');
                separator.className = 'separator';
                separator.textContent = '/';
                breadcrumbElement.appendChild(separator);
                
                const folderLink = document.createElement('a');
                folderLink.href = '#';
                folderLink.textContent = part;
                pathSoFar = pathSoFar ? pathSoFar + '/' + part : part;
                
                const currentPath = pathSoFar;
                folderLink.onclick = (e) => {
                    e.preventDefault();
                    navigateToFolder(currentPath);
                };
                
                breadcrumbElement.appendChild(folderLink);
            });
        }
    };
    
    // Initial update
    updateBreadcrumbs();
    
    // Expose function for external use
    window.updateBreadcrumbs = updateBreadcrumbs;
}

// Navigate to a folder
function navigateToFolder(folderPath) {
    setActiveNavItem('Home');
    loadFiles(folderPath);
}

// Update breadcrumbs
function updateBreadcrumbs() {
    const breadcrumbElement = document.getElementById('breadcrumb');
    breadcrumbElement.innerHTML = '';
    
    // Add Home link
    const homeLink = document.createElement('a');
    homeLink.href = '#';
    homeLink.textContent = 'Home';
    homeLink.onclick = (e) => {
        e.preventDefault();
        navigateToFolder('');
    };
    breadcrumbElement.appendChild(homeLink);
    
    // Add folder links if in a subfolder
    if (currentFolder) {
        const parts = currentFolder.split('/');
        let pathSoFar = '';
        
        parts.forEach((part, index) => {
            // Add separator
            const separator = document.createElement('span');
            separator.className = 'separator';
            separator.textContent = '/';
            breadcrumbElement.appendChild(separator);
            
            // Add folder link
            const folderLink = document.createElement('a');
            folderLink.href = '#';
            folderLink.textContent = part;
            pathSoFar = pathSoFar ? pathSoFar + '/' + part : part;
            
            const currentPath = pathSoFar;
            folderLink.onclick = (e) => {
                e.preventDefault();
                navigateToFolder(currentPath);
            };
            
            breadcrumbElement.appendChild(folderLink);
        });
    }
}

// Get file type based on extension
function getFileType(filename) {
    const ext = filename.toLowerCase().split('.').pop();
    
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico', 'tiff'];
    const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v'];
    const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma'];
    const docExts = ['doc', 'docx', 'txt', 'rtf', 'odt', 'md'];
    const pdfExts = ['pdf'];
    const codeExts = ['js', 'java', 'py', 'html', 'css', 'cpp', 'c', 'json', 'xml', 'php', 'rb', 'go', 'rs', 'ts'];
    const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'];
    const excelExts = ['xls', 'xlsx', 'csv', 'ods'];
    const pptExts = ['ppt', 'pptx', 'odp'];
    
    if (imageExts.includes(ext)) return 'image';
    if (videoExts.includes(ext)) return 'video';
    if (audioExts.includes(ext)) return 'audio';
    if (pdfExts.includes(ext)) return 'pdf';
    if (codeExts.includes(ext)) return 'code';
    if (archiveExts.includes(ext)) return 'archive';
    if (excelExts.includes(ext)) return 'excel';
    if (pptExts.includes(ext)) return 'ppt';
    if (docExts.includes(ext)) return 'document';
    return 'other';
}

// Get file icon based on type
function getFileIcon(filename) {
    const type = getFileType(filename);
    switch (type) {
        case 'image': return 'fas fa-image';
        case 'video': return 'fas fa-video';
        case 'audio': return 'fas fa-music';
        case 'pdf': return 'fas fa-file-pdf';
        case 'code': return 'fas fa-code';
        case 'archive': return 'fas fa-file-archive';
        case 'document': return 'fas fa-file-word';
        case 'excel': return 'fas fa-file-excel';
        case 'ppt': return 'fas fa-file-powerpoint';
        default: return 'fas fa-file';
    }
}

// Get file color class based on type
function getFileColor(filename) {
    const type = getFileType(filename);
    return type;
}

// Show/hide loading overlay
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = show ? 'flex' : 'none';
}

// Format file size
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Format date properly
function formatDate(timestamp) {
    if (!timestamp || timestamp === 0) {
        return 'Unknown date';
    }
    
    try {
        const time = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
        const date = time < 10000000000 ? new Date(time * 1000) : new Date(time);
        
        if (isNaN(date.getTime())) {
            return 'Invalid date';
        }
        
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        
        if (diffMinutes < 60) {
            if (diffMinutes < 1) return 'Just now';
            if (diffMinutes === 1) return '1 minute ago';
            return diffMinutes + ' minutes ago';
        }
        
        if (diffDays === 0) {
            return 'Today at ' + date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            });
        }
        
        if (diffDays === 1) return 'Yesterday';
        
        if (diffDays < 7) {
            return date.toLocaleDateString('en-US', { 
                weekday: 'long',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        }
        
        const currentYear = now.getFullYear();
        const fileYear = date.getFullYear();
        
        if (fileYear === currentYear) {
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } else {
            return date.toLocaleDateString('en-US', { 
                year: 'numeric',
                month: 'short', 
                day: 'numeric'
            });
        }
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Date error';
    }
}

// Format date for list view (shorter format)
function formatDateShort(timestamp) {
    if (!timestamp || timestamp === 0) {
        return 'Unknown';
    }
    
    try {
        const time = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
        const date = time < 10000000000 ? new Date(time * 1000) : new Date(time);
        
        if (isNaN(date.getTime())) {
            return 'Invalid date';
        }
        
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        
        if (diffMinutes < 60) {
            if (diffMinutes < 1) return 'Just now';
            return diffMinutes + 'm ago';
        }
        
        if (diffDays === 0) {
            return 'Today';
        }
        
        if (diffDays === 1) return 'Yesterday';
        
        if (diffDays < 7) return diffDays + 'd ago';
        
        const currentYear = now.getFullYear();
        const fileYear = date.getFullYear();
        
        if (fileYear === currentYear) {
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric'
            });
        } else {
            return date.toLocaleDateString('en-US', { 
                year: '2-digit',
                month: 'short', 
                day: 'numeric'
            });
        }
    } catch (error) {
        return 'Date error';
    }
}

// Render files based on view mode
function renderFiles() {
    const container = document.getElementById('file-container');
    container.className = viewMode === 'grid' ? 'file-grid' : 'file-list';
    container.innerHTML = '';
    
    if (files.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>No files found</h3>
                <p>${currentFolder ? 'This folder is empty' : 'Upload some files to get started'}</p>
            </div>
        `;
        return;
    }
    
    // Sort files: folders first, then files, both by modified date (newest first)
    const sortedFiles = [...files].sort((a, b) => {
        // First sort by type (folders first)
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        
        // Then sort by date (newest first)
        return b.modified - a.modified;
    });
    
    sortedFiles.forEach(file => {
        const isSelected = selectedFiles.has(file.id);
        const fileElement = document.createElement('div');
        fileElement.className = `file-item ${isSelected ? 'selected' : ''}`;
        fileElement.dataset.id = file.id;
        fileElement.dataset.modified = formatDate(file.modified);
        
        // Handle folder double-click navigation
        if (file.isDirectory) {
            fileElement.ondblclick = (e) => {
                e.preventDefault();
                if (file.name === '..') {
                    // Navigate to parent folder
                    const parentPath = currentFolder.includes('/') 
                        ? currentFolder.substring(0, currentFolder.lastIndexOf('/'))
                        : '';
                    navigateToFolder(parentPath);
                } else {
                    // Navigate into folder
                    const newPath = currentFolder ? `${currentFolder}/${file.name}` : file.name;
                    navigateToFolder(newPath);
                }
            };
        }
        
        fileElement.onclick = (e) => handleFileClick(e, file.id);
        fileElement.oncontextmenu = (e) => showContextMenu(e, file.id);
        
        // Special handling for parent folder
        const isParentFolder = file.name === '..';
        
        if (viewMode === 'grid') {
            fileElement.innerHTML = `
                <div class="file-icon ${isParentFolder ? 'folder' : file.color}">
                    <i class="${isParentFolder ? 'fas fa-level-up-alt' : file.icon}"></i>
                </div>
                <div class="file-name">${file.name}</div>
                <div class="file-info-grid">
                    ${isParentFolder ? 'Parent Folder' : (file.isDirectory ? 'Folder' : formatDateShort(file.modified) + ' • ' + formatFileSize(file.size))}
                </div>
                ${!isParentFolder ? `
                <div class="file-actions">
                    <button class="file-action-btn" onclick="event.stopPropagation(); downloadFile('${file.id}')" ${file.isDirectory ? 'style="display:none"' : ''}>
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="file-action-btn" onclick="event.stopPropagation(); deleteFile('${file.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>` : ''}
            `;
        } else {
            fileElement.innerHTML = `
                <div class="file-info">
                    <div class="file-icon ${isParentFolder ? 'folder' : file.color}">
                        <i class="${isParentFolder ? 'fas fa-level-up-alt' : file.icon}"></i>
                    </div>
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${file.isDirectory ? '—' : formatFileSize(file.size)}</div>
                    <div class="file-modified">${isParentFolder ? 'Parent Folder' : formatDate(file.modified)}</div>
                    ${!isParentFolder ? `
                    <div class="file-actions">
                        <button class="file-action-btn" onclick="event.stopPropagation(); downloadFile('${file.id}')" ${file.isDirectory ? 'style="display:none"' : ''}>
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="file-action-btn" onclick="event.stopPropagation(); deleteFile('${file.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>` : ''}
                </div>
            `;
        }
        
        container.appendChild(fileElement);
    });
}

// Handle file click (selection)
function handleFileClick(event, fileId) {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    
    if (event.ctrlKey || event.metaKey) {
        // Ctrl+Click for multi-select
        if (selectedFiles.has(fileId)) {
            selectedFiles.delete(fileId);
        } else {
            selectedFiles.add(fileId);
        }
    } else if (event.shiftKey && selectedFiles.size > 0) {
        // Shift+Click for range select
        const fileIds = files.map(f => f.id);
        const lastSelected = Array.from(selectedFiles).pop();
        const lastIndex = fileIds.indexOf(lastSelected);
        const currentIndex = fileIds.indexOf(fileId);
        
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        
        for (let i = start; i <= end; i++) {
            selectedFiles.add(fileIds[i]);
        }
    } else {
        // Regular click
        if (!event.target.closest('.file-action-btn')) {
            if (selectedFiles.has(fileId) && selectedFiles.size === 1) {
                selectedFiles.clear();
            } else {
                selectedFiles.clear();
                selectedFiles.add(fileId);
            }
        }
    }
    
    updateSelectionUI();
    renderFiles();
}

// Update selection UI
function updateSelectionUI() {
    const count = selectedFiles.size;
    const selectionInfo = document.getElementById('selection-info');
    const selectedCount = document.getElementById('selected-count');
    const downloadBtn = document.getElementById('download-btn');
    const deleteBtn = document.getElementById('delete-btn');
    
    if (count > 0) {
        selectionInfo.style.display = 'flex';
        selectedCount.textContent = `${count} ${count === 1 ? 'file' : 'files'} selected`;
        downloadBtn.disabled = false;
        deleteBtn.disabled = false;
    } else {
        selectionInfo.style.display = 'none';
        downloadBtn.disabled = true;
        deleteBtn.disabled = true;
    }
}

// Clear selection
function clearSelection() {
    selectedFiles.clear();
    updateSelectionUI();
    renderFiles();
}

// Set view mode
function setViewMode(mode) {
    viewMode = mode;
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.view-btn').classList.add('active');
    renderFiles();
    saveViewPreferences();
}

// Search files
function searchFiles() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const filteredFiles = files.filter(file => 
        file.name.toLowerCase().includes(searchTerm)
    );
    
    const container = document.getElementById('file-container');
    container.innerHTML = '';
    
    if (filteredFiles.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No files found</h3>
                <p>No files match your search criteria</p>
            </div>
        `;
        return;
    }
    
    // Re-render with filtered files
    const originalFiles = files;
    files = filteredFiles;
    renderFiles();
    files = originalFiles;
}

// Show context menu
function showContextMenu(event, fileId) {
    event.preventDefault();
    currentContextFile = fileId;
    
    const contextMenu = document.getElementById('context-menu');
    contextMenu.style.display = 'block';
    contextMenu.style.left = event.pageX + 'px';
    contextMenu.style.top = event.pageY + 'px';
    
    // Hide context menu when clicking elsewhere
    setTimeout(() => {
        document.addEventListener('click', hideContextMenu);
    }, 0);
}

// Hide context menu
function hideContextMenu() {
    const contextMenu = document.getElementById('context-menu');
    contextMenu.style.display = 'none';
    document.removeEventListener('click', hideContextMenu);
}

// Trigger file upload
function triggerFileUpload() {
    document.getElementById('file-input').click();
}

// Handle file select
async function handleFileSelect(fileList) {
    const dropZone = document.getElementById('drop-zone');
    const progressOverlay = document.getElementById('progress-overlay');
    
    dropZone.classList.remove('active');
    progressOverlay.classList.add('active');
    
    let uploadedCount = 0;
    const totalFiles = fileList.length;
    
    for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const formData = new FormData();
        formData.append('file', file);
        
        // Add current folder to upload
        if (currentFolder) {
            formData.append('folder', currentFolder);
        }
        
        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok) {
                uploadedCount++;
                updateProgress(uploadedCount, totalFiles);
            } else {
                showToast(`Failed to upload ${file.name}: ${result.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            showToast(`Error uploading ${file.name}: ${error.message}`, 'error');
        }
    }
    
    setTimeout(() => {
        progressOverlay.classList.remove('active');
        if (uploadedCount > 0) {
            showToast(`Successfully uploaded ${uploadedCount} files`, 'success');
            loadFiles(currentFolder); // Refresh file list
        }
    }, 500);
}

// Update progress
function updateProgress(current, total) {
    const percentage = Math.round((current / total) * 100);
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    progressFill.style.width = percentage + '%';
    progressText.textContent = `${percentage}% • ${current} of ${total} files`;
}

// Download file
async function downloadFile(fileId) {
    const file = files.find(f => f.id === fileId);
    if (!file || file.isDirectory) return;
    
    try {
        let url = `/download/${encodeURIComponent(file.name)}`;
        if (currentFolder) {
            url += `?folder=${encodeURIComponent(currentFolder)}`;
        }
        
        const response = await fetch(url);
        if (response.ok) {
            const blob = await response.blob();
            const urlObj = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = urlObj;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(urlObj);
            showToast(`Downloaded ${file.name}`, 'success');
        } else {
            showToast(`Failed to download ${file.name}`, 'error');
        }
    } catch (error) {
        console.error('Error downloading file:', error);
        showToast('Error downloading file: ' + error.message, 'error');
    }
}

// Download selected files
async function downloadSelected() {
    if (selectedFiles.size === 0) return;
    
    const selectedFilesArray = Array.from(selectedFiles).map(id => files.find(f => f.id === id)).filter(f => f && !f.isDirectory);
    
    if (selectedFilesArray.length === 0) {
        showToast('No files selected for download', 'warning');
        return;
    }
    
    showToast(`Downloading ${selectedFilesArray.length} files...`, 'info');
    
    for (const file of selectedFilesArray) {
        await downloadFile(file.id);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between downloads
    }
}

// Delete file or folder
async function deleteFile(fileId) {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    
    const itemType = file.isDirectory ? 'folder' : 'file';
    const message = file.isDirectory 
        ? `Are you sure you want to delete the folder "${file.name}" and all its contents?`
        : `Are you sure you want to delete "${file.name}"?`;
    
    if (confirm(message)) {
        try {
            let url;
            if (file.isDirectory) {
                url = `/api/delete-folder?path=${encodeURIComponent(file.path || file.name)}`;
            } else {
                url = `/delete/${encodeURIComponent(file.name)}`;
                if (currentFolder) {
                    url += `?folder=${encodeURIComponent(currentFolder)}`;
                }
            }
            
            const response = await fetch(url);
            const result = await response.json();
            
            if (response.ok) {
                selectedFiles.delete(fileId);
                showToast(`Deleted ${itemType} "${file.name}"`, 'success');
                loadFiles(currentFolder); // Refresh file list
            } else {
                showToast(`Failed to delete ${itemType}: ${result.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            showToast('Error deleting item: ' + error.message, 'error');
        }
    }
}

// Delete selected items
async function deleteSelected() {
    if (selectedFiles.size === 0) return;
    
    const selectedItems = Array.from(selectedFiles).map(id => files.find(f => f.id === id)).filter(f => f);
    const fileCount = selectedItems.filter(f => !f.isDirectory).length;
    const folderCount = selectedItems.filter(f => f.isDirectory).length;
    
    let message = `Are you sure you want to delete ${selectedItems.length} items?`;
    if (folderCount > 0) {
        message += ` This includes ${folderCount} folder${folderCount > 1 ? 's' : ''} and all their contents.`;
    }
    
    if (confirm(message)) {
        showToast(`Deleting ${selectedItems.length} items...`, 'info');
        
        let deletedCount = 0;
        for (const file of selectedItems) {
            try {
                let url;
                if (file.isDirectory) {
                    url = `/api/delete-folder?path=${encodeURIComponent(file.path || file.name)}`;
                } else {
                    url = `/delete/${encodeURIComponent(file.name)}`;
                    if (currentFolder) {
                        url += `?folder=${encodeURIComponent(currentFolder)}`;
                    }
                }
                
                const response = await fetch(url);
                if (response.ok) {
                    deletedCount++;
                }
            } catch (error) {
                console.error('Error deleting item:', error);
            }
        }
        
        selectedFiles.clear();
        updateSelectionUI();
        showToast(`Successfully deleted ${deletedCount} items`, 'success');
        loadFiles(currentFolder);
    }
}

// Show new folder modal
function showNewFolderModal() {
    showModal('new-folder-modal');
    document.getElementById('folder-name').value = '';
    document.getElementById('folder-name').focus();
}

// Create new folder
async function createNewFolder() {
    const folderName = document.getElementById('folder-name').value.trim();
    if (!folderName) {
        showToast('Please enter a folder name', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/folders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `name=${encodeURIComponent(folderName)}&parent=${encodeURIComponent(currentFolder)}`
        });
        
        const result = await response.json();
        
        if (response.ok) {
            hideModal('new-folder-modal');
            showToast(`Created folder "${folderName}"`, 'success');
            loadFiles(currentFolder); // Refresh file list
        } else {
            showToast(`Failed to create folder: ${result.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('Error creating folder:', error);
        showToast('Error creating folder: ' + error.message, 'error');
    }
}

// Show rename modal
function renameFile() {
    if (selectedFiles.size === 1) {
        const fileId = currentContextFile || Array.from(selectedFiles)[0];
        const file = files.find(f => f.id === fileId);
        if (file) {
            showModal('rename-modal');
            document.getElementById('rename-input').value = file.name;
            document.getElementById('rename-input').focus();
            document.getElementById('rename-input').select();
        }
    }
}

// Confirm rename (placeholder - would need server implementation)
function confirmRename() {
    const newName = document.getElementById('rename-input').value.trim();
    if (!newName) {
        showToast('Please enter a new name', 'error');
        return;
    }
    
    showToast('Rename feature would require server implementation', 'info');
    hideModal('rename-modal');
}

// Share file
function shareFile() {
    showModal('share-modal');
}

// Copy share link
function copyShareLink() {
    const shareLink = document.getElementById('share-link');
    shareLink.select();
    shareLink.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(shareLink.value).then(() => {
        showToast('Link copied to clipboard', 'success');
    });
}

// Show modal
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

// Hide modal
function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Show toast notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info-circle';
    switch (type) {
        case 'success': icon = 'check-circle'; break;
        case 'error': icon = 'exclamation-circle'; break;
        case 'warning': icon = 'exclamation-triangle'; break;
    }
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideLeft 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Update storage info
async function updateStorageInfo() {
    try {
        const url = currentFolder ? `/api/storage?folder=${encodeURIComponent(currentFolder)}` : '/api/storage';
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            
            const totalSize = data.totalSize || 0;
            const usedSpace = data.usedSpace || 0;
            const totalSpace = data.totalSpace || (10 * 1024 * 1024 * 1024); // Default 10GB
            
            const percentage = Math.min(Math.round((usedSpace / totalSpace) * 100), 100);
            
            document.getElementById('storage-percentage').textContent = percentage + '%';
            document.getElementById('storage-fill').style.width = percentage + '%';
            document.getElementById('storage-used').textContent = formatFileSize(usedSpace) + ' of ' + formatFileSize(totalSpace);
        }
    } catch (error) {
        console.error('Error updating storage info:', error);
    }
}

// ========================
// Sidebar Functions
// ========================

function setupSidebarNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            handleNavItemClick(this);
        });
    });
}

function handleNavItemClick(navItem) {
    // Remove active class from all nav items
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to clicked item
    navItem.classList.add('active');
    
    // Get the nav item text
    const navText = navItem.querySelector('span').textContent.trim();
    
    // Handle different navigation items
    switch(navText) {
        case 'Home':
            navigateToFolder('');
            break;
            
        case 'My Files':
            navigateToFolder('');
            showToast('Showing all files', 'info');
            break;
            
        
            
        case 'Recent':
            showRecentFiles();
            break;
            
            
       
            
        case 'User Management':
            showUserManagementModal();
            break;
            
        case 'Logout':
            logoutUser();
            break;
            
        default:
            // Default to home
            navigateToFolder('');
    }
    
    // Close sidebar on mobile
    if (window.innerWidth <= 1024) {
        toggleSidebar();
    }
}

function setActiveNavItem(itemName) {
    // Remove active class from all nav items
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Find and activate the target item
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
        const text = item.querySelector('span').textContent.trim();
        if (text === itemName) {
            item.classList.add('active');
        }
    });
}


function showRecentFiles() {
    setActiveNavItem('Recent');
    
    // Show loading
    showLoading(true);
    
    // Simulate loading recent files
    setTimeout(() => {
        showLoading(false);
        
        // Sort files by modification date (newest first)
        const sortedFiles = [...files].sort((a, b) => b.modified - a.modified);
        
        // Show only the 20 most recent files
        const recentFiles = sortedFiles.slice(0, 20);
        
        const container = document.getElementById('file-container');
        container.className = 'file-grid';
        container.innerHTML = '';
        
        if (recentFiles.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clock-rotate-left"></i>
                    <h3>No recent files</h3>
                    <p>Files you've recently opened will appear here</p>
                </div>
            `;
        } else {
            // Update breadcrumb
            document.getElementById('breadcrumb').innerHTML = `
                <a href="#" onclick="navigateToFolder(''); return false;">Home</a>
                <span class="separator">/</span>
                <span>Recent Files</span>
            `;
            
            // Render recent files
            const originalFiles = files;
            files = recentFiles;
            renderFiles();
            files = originalFiles;
        }
        
        showToast(`Showing ${recentFiles.length} recent files`, 'success');
    }, 500);
}





// Toggle sidebar on mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

// ========================
// User Management Functions
// ========================

function createNewUser(userData) {
    const users = getAllUsers();
    
    // Check if user already exists
    const userExists = users.some(u => 
        u.username === userData.username || u.email === userData.email
    );
    
    if (userExists) {
        return { success: false, message: 'User with this email/username already exists' };
    }
    
    // Create new user
    const newUser = {
        id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
        ...userData,
        created: new Date().toISOString(),
        lastLogin: null,
        role: userData.role || 'user',
        permissions: userData.permissions || ['read', 'upload', 'download']
    };
    
    users.push(newUser);
    saveUsers(users);
    
    return { success: true, user: newUser };
}

function updateUser(userId, updates) {
    const users = getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
        return { success: false, message: 'User not found' };
    }
    
    // Check if email/username already taken by another user
    if (updates.email || updates.username) {
        const duplicate = users.find((u, index) => 
            index !== userIndex && 
            (u.email === (updates.email || users[userIndex].email) || 
             u.username === (updates.username || users[userIndex].username))
        );
        
        if (duplicate) {
            return { success: false, message: 'Email or username already taken' };
        }
    }
    
    users[userIndex] = { ...users[userIndex], ...updates };
    saveUsers(users);
    
    // Update current user if it's the same user
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === userId) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(users[userIndex]));
        updateUserUI(users[userIndex]);
    }
    
    return { success: true, user: users[userIndex] };
}

function deleteUser(userId) {
    const users = getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
        return { success: false, message: 'User not found' };
    }
    
    // Cannot delete yourself
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === userId) {
        return { success: false, message: 'Cannot delete your own account' };
    }
    
    // Cannot delete the default admin (id: 1)
    if (users[userIndex].id === 1) {
        return { success: false, message: 'Cannot delete the default admin account' };
    }
    
    const deletedUser = users.splice(userIndex, 1)[0];
    saveUsers(users);
    
    return { success: true, user: deletedUser };
}

function changePassword(userId, currentPassword, newPassword) {
    const users = getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
        return { success: false, message: 'User not found' };
    }
    
    // Verify current password
    if (users[userIndex].password !== currentPassword) {
        return { success: false, message: 'Current password is incorrect' };
    }
    
    // Update password
    users[userIndex].password = newPassword;
    saveUsers(users);
    
    // Update current user if it's the same user
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === userId) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(users[userIndex]));
    }
    
    return { success: true };
}

// Logout
function logoutUser() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem(CURRENT_USER_KEY);
        localStorage.setItem(LOGIN_KEY, 'false');
        window.location.href = 'login.html';
    }
}

// Show user management modal
function showUserManagementModal() {
    showModal('user-management-modal');
    loadUsersList();
}

function loadUsersList() {
    const usersList = document.getElementById('users-list');
    const currentUser = getCurrentUser();
    const users = getAllUsers();
    
    usersList.innerHTML = '';
    
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'user-item';
        userElement.innerHTML = `
            <div class="user-info">
                <div class="user-name">${user.name || user.username}</div>
                <div class="user-details">
                    <span class="user-email">${user.email}</span>
                    <span class="user-role ${user.role}">${user.role}</span>
                    ${user.id === currentUser.id ? '<span class="current-user">Current</span>' : ''}
                </div>
            </div>
            <div class="user-actions">
                ${user.id !== currentUser.id ? `
                    <button class="btn btn-danger" onclick="deleteUserConfirmation(${user.id})" title="Delete User">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                ` : `
                    <button class="btn btn-secondary" onclick="showChangePasswordModal()" title="Change Password">
                        <i class="fas fa-key"></i> Change Password
                    </button>
                `}
            </div>
        `;
        usersList.appendChild(userElement);
    });
    
    // If no other users exist, show message
    if (users.length <= 1) {
        usersList.innerHTML += `
            <div class="empty-state" style="margin-top: 20px; text-align: center; color: var(--text-muted); padding: 20px;">
                <i class="fas fa-users" style="font-size: 32px; opacity: 0.5; margin-bottom: 10px;"></i>
                <p>No other users found. Create new users to manage them here.</p>
            </div>
        `;
    }
}



// Add this new function to update user from form
function updateUserFromForm() {
    const userId = parseInt(document.getElementById('edit-user-form').dataset.userId);
    const name = document.getElementById('edit-user-name').value.trim();
    const username = document.getElementById('edit-user-username').value.trim();
    const email = document.getElementById('edit-user-email').value.trim();
    const role = document.getElementById('edit-user-role').value;
    
    if (!name || !username || !email) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    const result = updateUser(userId, {
        name,
        username,
        email,
        role,
        permissions: role === 'admin' 
            ? ['read', 'upload', 'download', 'delete', 'manage_users']
            : ['read', 'upload', 'download']
    });
    
    if (result.success) {
        showToast('User updated successfully', 'success');
        hideModal('edit-user-modal');
        loadUsersList();
    } else {
        showToast(result.message, 'error');
    }
}

// Add this function for changing password for other users
function showChangePasswordForUser() {
    const userId = parseInt(document.getElementById('edit-user-form').dataset.userId);
    const users = getAllUsers();
    const user = users.find(u => u.id === userId);
    
    if (user) {
        const newPassword = prompt(`Enter new password for ${user.name || user.username}:`, '');
        if (newPassword && newPassword.length >= 3) {
            const result = updateUser(userId, { password: newPassword });
            if (result.success) {
                showToast('Password updated successfully', 'success');
            } else {
                showToast(result.message, 'error');
            }
        } else if (newPassword !== null) {
            showToast('Password must be at least 3 characters', 'error');
        }
    }
}

function showCreateUserModal() {
    showModal('create-user-modal');
    document.getElementById('new-user-form').reset();
}

function createNewUserFromForm() {
    const name = document.getElementById('new-user-name').value.trim();
    const username = document.getElementById('new-user-username').value.trim();
    const email = document.getElementById('new-user-email').value.trim();
    const password = document.getElementById('new-user-password').value;
    const role = document.getElementById('new-user-role').value;
    
    if (!name || !username || !email || !password) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    const result = createNewUser({
        name,
        username,
        email,
        password,
        role,
        permissions: role === 'admin' 
            ? ['read', 'upload', 'download', 'delete', 'manage_users']
            : ['read', 'upload', 'download']
    });
    
    if (result.success) {
        showToast('User created successfully', 'success');
        hideModal('create-user-modal');
        loadUsersList();
    } else {
        showToast(result.message, 'error');
    }
}

function showChangePasswordModal() {
    showModal('change-password-modal');
    document.getElementById('change-password-form').reset();
}

function changePasswordFromForm() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (newPassword !== confirmPassword) {
        showToast('New passwords do not match', 'error');
        return;
    }
    
    const currentUser = getCurrentUser();
    const result = changePassword(currentUser.id, currentPassword, newPassword);
    
    if (result.success) {
        showToast('Password changed successfully', 'success');
        hideModal('change-password-modal');
    } else {
        showToast(result.message, 'error');
    }
}

function deleteUserConfirmation(userId) {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        const result = deleteUser(userId);
        if (result.success) {
            showToast('User deleted successfully', 'success');
            loadUsersList();
        } else {
            showToast(result.message, 'error');
        }
    }
}

// Edit user (placeholder)
function editUser(userId) {
    showToast('Edit user feature would be implemented here', 'info');
}

// ========================
// Event Listeners Setup
// ========================

function setupEventListeners() {
    // Drag and drop
    const dropZone = document.getElementById('drop-zone');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        document.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        document.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropZone.classList.add('active');
    }
    
    function unhighlight() {
        dropZone.classList.remove('active');
    }
    
    dropZone.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFileSelect(files);
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);
    
    function handleKeyDown(e) {
        // Ctrl+A to select all
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.preventDefault();
            files.forEach(file => selectedFiles.add(file.id));
            updateSelectionUI();
            renderFiles();
        }
        
        // Delete key
        if (e.key === 'Delete') {
            e.preventDefault();
            deleteSelected();
        }
        
        // F2 to rename
        if (e.key === 'F2') {
            e.preventDefault();
            renameFile();
        }
        
        // Escape to clear selection
        if (e.key === 'Escape') {
            clearSelection();
        }
        
        // Backspace to go to parent folder
        if (e.key === 'Backspace' && currentFolder) {
            e.preventDefault();
            const parentPath = currentFolder.includes('/') 
                ? currentFolder.substring(0, currentFolder.lastIndexOf('/'))
                : '';
            navigateToFolder(parentPath);
        }
    }
    
    // Close modals on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideModal('new-folder-modal');
            hideModal('rename-modal');
            hideModal('share-modal');
            hideModal('user-management-modal');
            hideModal('create-user-modal');
            hideModal('change-password-modal');
            hideContextMenu();
        }
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024) {
            const sidebar = document.getElementById('sidebar');
            const toggleBtn = document.querySelector('.sidebar-toggle');
            if (sidebar.classList.contains('active') && 
                !sidebar.contains(e.target) && 
                !toggleBtn.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });
    
    // Handle Enter key on folder navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && selectedFiles.size === 1) {
            const fileId = Array.from(selectedFiles)[0];
            const file = files.find(f => f.id === fileId);
            if (file && file.isDirectory && file.name !== '..') {
                e.preventDefault();
                const newPath = currentFolder ? `${currentFolder}/${file.name}` : file.name;
                navigateToFolder(newPath);
            }
        }
    });
}

// Load view preferences from localStorage
function loadViewPreferences() {
    const savedViewMode = localStorage.getItem('fileManagerViewMode');
    if (savedViewMode) {
        viewMode = savedViewMode;
        document.querySelectorAll('.view-btn').forEach(btn => {
            if (btn.innerHTML.includes(viewMode)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
}

// Save view preferences to localStorage
function saveViewPreferences() {
    localStorage.setItem('fileManagerViewMode', viewMode);
}

// Add at the end of loadFiles() function or in initialization
document.addEventListener('DOMContentLoaded', function() {
    // Hide error message if it's empty
    const errorElement = document.querySelector('.error-message');
    if (errorElement) {
        const errorText = errorElement.querySelector('span');
        if (!errorText || errorText.textContent.trim() === '') {
            errorElement.style.display = 'none';
        }
    }
});