function showNotification(message, type = 'info') {
    document.querySelectorAll('.upload-notification').forEach((node) => node.remove());

    const notification = document.createElement('div');
    notification.className = 'upload-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: var(--radius-md);
        color: white;
        font-weight: 500;
        z-index: 1000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 320px;
        box-shadow: var(--shadow-lg);
    `;

    const colors = {
        success: 'var(--success-600)',
        error: 'var(--danger-600)',
        warning: 'var(--warning-600)',
        info: 'var(--primary-600)',
    };

    notification.style.background = colors[type] || colors.info;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);

    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

function validateUploadPath(pathValue) {
    const normalized = pathValue.replace(/\\/g, '/').trim();
    if (!normalized) {
        return true;
    }
    if (normalized.startsWith('/') || normalized.includes('..')) {
        return false;
    }
    return true;
}

function validateForm() {
    const pathInput = document.getElementById('upload_path');
    const fileInput = document.getElementById('file_to_upload');

    if (!validateUploadPath(pathInput.value)) {
        showNotification('Destination path must be relative and cannot contain ..', 'error');
        pathInput.focus();
        return false;
    }

    if (!fileInput.files || fileInput.files.length === 0) {
        showNotification('Please select at least one file to upload', 'error');
        return false;
    }

    return true;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function displayFiles(files) {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    if (!files.length) return;

    const filesContainer = document.createElement('div');
    filesContainer.style.cssText = 'border: 1px solid var(--gray-200); border-radius: var(--radius-md); padding: 1rem; background: var(--gray-50);';

    const header = document.createElement('h5');
    header.textContent = `Selected files (${files.length})`;
    header.style.cssText = 'margin: 0 0 1rem 0; color: var(--gray-700);';
    filesContainer.appendChild(header);

    Array.from(files).forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--gray-200);';
        if (index === files.length - 1) {
            fileItem.style.borderBottom = 'none';
        }

        const fileName = document.createElement('span');
        fileName.textContent = file.name;
        fileName.style.cssText = 'color: var(--gray-700);';

        const fileSize = document.createElement('span');
        fileSize.textContent = formatFileSize(file.size);
        fileSize.style.cssText = 'color: var(--gray-500); font-size: 0.875rem;';

        fileItem.appendChild(fileName);
        fileItem.appendChild(fileSize);
        filesContainer.appendChild(fileItem);
    });

    fileList.appendChild(filesContainer);
}

document.addEventListener('DOMContentLoaded', function() {
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fileInput = document.getElementById('file_to_upload');
    const uploadForm = document.getElementById('uploadForm');
    const uploadBtn = document.getElementById('uploadBtn');

    if (!fileUploadArea || !fileInput || !uploadForm) {
        return;
    }

    fileUploadArea.addEventListener('click', () => fileInput.click());

    fileUploadArea.addEventListener('dragover', (event) => {
        event.preventDefault();
        fileUploadArea.classList.add('dragover');
    });

    fileUploadArea.addEventListener('dragleave', (event) => {
        event.preventDefault();
        fileUploadArea.classList.remove('dragover');
    });

    fileUploadArea.addEventListener('drop', (event) => {
        event.preventDefault();
        fileUploadArea.classList.remove('dragover');
        fileInput.files = event.dataTransfer.files;
        displayFiles(fileInput.files);
    });

    fileInput.addEventListener('change', function() {
        displayFiles(this.files);
    });

    uploadForm.addEventListener('submit', function(event) {
        if (!validateForm()) {
            event.preventDefault();
            return false;
        }
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';
    });
});
