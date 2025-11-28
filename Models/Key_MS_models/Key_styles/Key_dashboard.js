// ========================================================
// Estado global
// ========================================================
let KEYS_STATE = {
    list: [],      // [{ key_id, key_name, key_type }]
    filtered: []   // misma estructura pero filtrada
};

// Referencias de elementos
let elTableBody;
let elSearch;
let elSelectAll;
let elDeleteSelectedBtn;
let elDeleteSelect;
let elCreateForm;
let elCreateName;
let elCreateFormat;
let elCreateNameError;
let elCreateFormatError;
let elResetCreate;
let elSubmitCreate;
let elDeleteForm;
let elDeleteError;
let elSubmitDelete;
let elRefreshBtn;
let elOpenCreateBtn;
let elToast;
let elErrorOverlay;
let elErrorOverlayMessage;
let elErrorOverlayDetails;
let elErrorOverlayClose;

// Endpoints backend (ajusta si cambias rutas en Flask)
const ENDPOINTS = {
    LIST: '/Keys_in_existance',
    CREATE: '/Create_key',
    DELETE: '/Delete_key'
};

// ========================================================
// Inicialización
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    bindEvents();
    loadKeys();
});

// ========================================================
// Utilidades generales
// ========================================================

function cacheDom() {
    elTableBody = document.getElementById('keys-table-body');
    elSearch = document.getElementById('key-search');
    elSelectAll = document.getElementById('select-all-keys');
    elDeleteSelectedBtn = document.getElementById('btn-delete-selected');
    elDeleteSelect = document.getElementById('delete-key-select');
    elCreateForm = document.getElementById('create-key-form');
    elCreateName = document.getElementById('key-name');
    elCreateFormat = document.getElementById('key-format');
    elCreateNameError = document.getElementById('key-name-error');
    elCreateFormatError = document.getElementById('key-format-error');
    elResetCreate = document.getElementById('btn-reset-create');
    elSubmitCreate = document.getElementById('btn-submit-create');
    elDeleteForm = document.getElementById('delete-key-form');
    elDeleteError = document.getElementById('delete-key-error');
    elSubmitDelete = document.getElementById('btn-submit-delete');
    elRefreshBtn = document.getElementById('btn-refresh');
    elOpenCreateBtn = document.getElementById('btn-open-create');
    elToast = document.getElementById('global-toast');
    elErrorOverlay = document.getElementById('global-error-overlay');
    elErrorOverlayMessage = document.getElementById('error-overlay-message');
    elErrorOverlayDetails = document.getElementById('error-overlay-details');
    elErrorOverlayClose = document.getElementById('error-overlay-close');
}

function bindEvents() {
    if (elSearch) {
        elSearch.addEventListener('input', handleSearchInput);
    }
    if (elSelectAll) {
        elSelectAll.addEventListener('change', handleSelectAllChange);
    }
    if (elCreateForm) {
        elCreateForm.addEventListener('submit', handleCreateSubmit);
    }
    if (elResetCreate) {
        elResetCreate.addEventListener('click', resetCreateForm);
    }
    if (elDeleteForm) {
        elDeleteForm.addEventListener('submit', handleDeleteSubmit);
    }
    if (elRefreshBtn) {
        elRefreshBtn.addEventListener('click', () => loadKeys(true));
    }
    if (elOpenCreateBtn) {
        elOpenCreateBtn.addEventListener('click', () => {
            // Simplemente hace foco al campo de nombre
            if (elCreateName) {
                elCreateName.focus();
            }
        });
    }
    if (elErrorOverlayClose) {
        elErrorOverlayClose.addEventListener('click', hideErrorOverlay);
    }
    if (elErrorOverlay) {
        elErrorOverlay.addEventListener('click', (evt) => {
            if (evt.target === elErrorOverlay) {
                hideErrorOverlay();
            }
        });
    }
}

// Normalización para búsquedas (minúsculas y sin acentos)
function normalizeText(value) {
    return (value || '')
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

// Toast global (info rápida)
let toastTimeout = null;
function showToast(message) {
    if (!elToast) return;
    elToast.textContent = message;
    elToast.classList.add('is-visible');

    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }
    toastTimeout = setTimeout(() => {
        elToast.classList.remove('is-visible');
    }, 3500);
}

// Overlay global de error
function showErrorOverlay(message, details) {
    if (!elErrorOverlay || !elErrorOverlayMessage || !elErrorOverlayDetails) return;

    elErrorOverlayMessage.textContent = message || 'Unexpected error';
    elErrorOverlayDetails.textContent = details || '';
    elErrorOverlay.classList.add('is-visible');
    elErrorOverlay.setAttribute('aria-hidden', 'false');
}

function hideErrorOverlay() {
    if (!elErrorOverlay) return;
    elErrorOverlay.classList.remove('is-visible');
    elErrorOverlay.setAttribute('aria-hidden', 'true');
}

// Helper para peticiones a la API con manejo de errores
async function apiRequest(url, options) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };
    const finalOptions = Object.assign({}, defaultOptions, options || {});

    try {
        const response = await fetch(url, finalOptions);

        let payload;
        try {
            payload = await response.json();
        } catch (jsonErr) {
            throw {
                message: 'Invalid JSON response from backend',
                details: `Status: ${response.status} ${response.statusText}\n${jsonErr}`
            };
        }

        if (typeof payload.success === 'undefined') {
            throw {
                message: 'Unexpected response format from backend',
                details: JSON.stringify(payload, null, 2)
            };
        }

        if (!payload.success) {
            throw {
                message: 'Backend returned an error',
                details: payload.error || 'Unknown backend error'
            };
        }

        return payload.data;
    } catch (err) {
        if (err && err.message && typeof err.details !== 'undefined') {
            // Error ya normalizado
            throw err;
        }
        throw {
            message: 'Network or client-side error',
            details: String(err)
        };
    }
}

// ========================================================
// Carga y render de Keys
// ========================================================

async function loadKeys(showToastOnSuccess) {
    if (!elTableBody) return;

    // Estado de loading
    elTableBody.innerHTML = '';
    const tr = document.createElement('tr');
    tr.className = 'aws-table__loading-row';
    const td = document.createElement('td');
    td.colSpan = 4;
    td.textContent = 'Loading key pairs...';
    tr.appendChild(td);
    elTableBody.appendChild(tr);

    try {
        const data = await apiRequest(ENDPOINTS.LIST, {
            method: 'GET'
        });

        const list = normalizeKeys(data);
        KEYS_STATE.list = list;
        KEYS_STATE.filtered = list.slice();

        renderKeysTable(KEYS_STATE.filtered);
        refreshDeleteSelect();

        if (showToastOnSuccess) {
            showToast('Key pairs reloaded successfully.');
        }
    } catch (err) {
        renderEmptyTable('Could not load key pairs.');
        refreshDeleteSelect();
        showErrorOverlay(err.message, err.details);
    } finally {
        updateDeleteButtonsState();
        if (elSelectAll) {
            elSelectAll.checked = false;
        }
    }
}

function normalizeKeys(apiData) {
    const result = [];

    if (!apiData || typeof apiData !== 'object') {
        return result;
    }

    for (const keyId in apiData) {
        if (!Object.prototype.hasOwnProperty.call(apiData, keyId)) continue;
        const meta = apiData[keyId] || {};
        result.push({
            key_id: keyId,
            key_name: meta.Key_name || 'N/A',
            key_type: meta.key_type || '-'
        });
    }

    // Orden alfabético por nombre
    result.sort((a, b) => {
        return a.key_name.localeCompare(b.key_name);
    });

    return result;
}

function renderKeysTable(list) {
    if (!elTableBody) return;

    elTableBody.innerHTML = '';

    if (!list || list.length === 0) {
        renderEmptyTable('No key pairs found.');
        return;
    }

    for (const key of list) {
        const tr = document.createElement('tr');

        // Checkbox
        const tdCheckbox = document.createElement('td');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'key-row-checkbox';
        checkbox.dataset.keyId = key.key_id;
        checkbox.dataset.keyName = key.key_name;
        checkbox.addEventListener('change', updateDeleteButtonsState);
        tdCheckbox.appendChild(checkbox);

        // Key name
        const tdName = document.createElement('td');
        tdName.textContent = key.key_name;

        // Key id
        const tdId = document.createElement('td');
        tdId.textContent = key.key_id;

        // Key type
        const tdType = document.createElement('td');
        tdType.textContent = key.key_type;

        tr.appendChild(tdCheckbox);
        tr.appendChild(tdName);
        tr.appendChild(tdId);
        tr.appendChild(tdType);

        elTableBody.appendChild(tr);
    }
}

function renderEmptyTable(message) {
    if (!elTableBody) return;
    elTableBody.innerHTML = '';
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    td.textContent = message;
    td.style.textAlign = 'center';
    td.className = 'aws-text-muted';
    tr.appendChild(td);
    elTableBody.appendChild(tr);
}

// Actualizar select de eliminación
function refreshDeleteSelect() {
    if (!elDeleteSelect) return;

    // Mantener el placeholder
    const placeholder = elDeleteSelect.querySelector('option[value=""]');
    elDeleteSelect.innerHTML = '';
    if (placeholder) {
        elDeleteSelect.appendChild(placeholder);
    } else {
        const opt = document.createElement('option');
        opt.value = '';
        opt.disabled = true;
        opt.selected = true;
        opt.textContent = 'Select a key pair...';
        elDeleteSelect.appendChild(opt);
    }

    for (const key of KEYS_STATE.list) {
        const opt = document.createElement('option');
        opt.value = key.key_id;
        opt.dataset.keyName = key.key_name;
        const shortId = key.key_id.length > 12 ? key.key_id.slice(0, 12) + '...' : key.key_id;
        opt.textContent = `${key.key_name} (${shortId})`;
        elDeleteSelect.appendChild(opt);
    }
}

// ========================================================
// Búsqueda instantánea
// ========================================================

function handleSearchInput() {
    const term = normalizeText(elSearch.value);
    if (!term) {
        KEYS_STATE.filtered = KEYS_STATE.list.slice();
        renderKeysTable(KEYS_STATE.filtered);
        updateDeleteButtonsState();
        if (elSelectAll) elSelectAll.checked = false;
        return;
    }

    KEYS_STATE.filtered = KEYS_STATE.list.filter((k) => {
        return (
            normalizeText(k.key_name).includes(term) ||
            normalizeText(k.key_id).includes(term) ||
            normalizeText(k.key_type).includes(term)
        );
    });

    renderKeysTable(KEYS_STATE.filtered);
    updateDeleteButtonsState();
    if (elSelectAll) elSelectAll.checked = false;
}

// ========================================================
// Selección masiva y eliminación
// ========================================================

function handleSelectAllChange() {
    if (!elTableBody) return;
    const checkboxes = elTableBody.querySelectorAll('.key-row-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = elSelectAll.checked;
    });
    updateDeleteButtonsState();
}

function getSelectedRows() {
    if (!elTableBody) return [];
    const checkboxes = elTableBody.querySelectorAll('.key-row-checkbox:checked');
    const selected = [];
    checkboxes.forEach(cb => {
        selected.push({
            key_id: cb.dataset.keyId,
            key_name: cb.dataset.keyName
        });
    });
    return selected;
}

function updateDeleteButtonsState() {
    const selected = getSelectedRows();
    if (elDeleteSelectedBtn) {
        elDeleteSelectedBtn.disabled = selected.length === 0;
    }
}

// ========================================================
// Validaciones de formularios
// ========================================================

function validateKeyName(value) {
    if (!value || !value.trim()) {
        return 'Key name is required.';
    }
    const trimmed = value.trim();
    const pattern = /^[A-Za-z0-9._-]+$/;
    if (!pattern.test(trimmed)) {
        return 'Only letters, numbers, dots, underscores and hyphens are allowed.';
    }
    if (trimmed.length > 255) {
        return 'Key name must be 255 characters or less.';
    }
    return '';
}

function validateKeyFormat(value) {
    if (!value) {
        return 'Key format is required.';
    }
    if (value !== 'RSA' && value !== 'PEM') {
        return 'Invalid key format.';
    }
    return '';
}

function validateDeleteSelection(value) {
    if (!value) {
        return 'You must select a key pair to delete.';
    }
    return '';
}

// ========================================================
// Creación de Key Pair
// ========================================================

async function handleCreateSubmit(event) {
    event.preventDefault();

    const nameVal = elCreateName ? elCreateName.value : '';
    const formatVal = elCreateFormat ? elCreateFormat.value : '';

    const nameError = validateKeyName(nameVal);
    const formatError = validateKeyFormat(formatVal);

    if (elCreateNameError) elCreateNameError.textContent = nameError;
    if (elCreateFormatError) elCreateFormatError.textContent = formatError;

    if (nameError || formatError) {
        return;
    }

    // Deshabilitar botón mientras se envía
    if (elSubmitCreate) {
        elSubmitCreate.disabled = true;
        elSubmitCreate.textContent = 'Creating...';
    }

    try {
        const payload = {
            key_name: nameVal.trim(),
            key_format: formatVal
        };

        const data = await apiRequest(ENDPOINTS.CREATE, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        // data debería contener Key_name y Key_id
        if (data && data.Key_id && data.Key_name) {
            KEYS_STATE.list.push({
                key_id: data.Key_id,
                key_name: data.Key_name,
                key_type: '-' // hasta que el backend envíe tipo, dejamos algo por defecto
            });
            KEYS_STATE.list.sort((a, b) => a.key_name.localeCompare(b.key_name));
            KEYS_STATE.filtered = KEYS_STATE.list.slice();

            renderKeysTable(KEYS_STATE.filtered);
            refreshDeleteSelect();
            if (elSelectAll) elSelectAll.checked = false;
        }

        showToast('Key pair created successfully.');
        resetCreateForm();
    } catch (err) {
        showErrorOverlay(err.message, err.details);
    } finally {
        if (elSubmitCreate) {
            elSubmitCreate.disabled = false;
            elSubmitCreate.textContent = 'Create key pair';
        }
    }
}

function resetCreateForm() {
    if (elCreateForm) {
        elCreateForm.reset();
    }
    if (elCreateNameError) elCreateNameError.textContent = '';
    if (elCreateFormatError) elCreateFormatError.textContent = '';
}

// ========================================================
// Eliminación de Key Pair por select
// ========================================================

async function handleDeleteSubmit(event) {
    event.preventDefault();

    const selectedId = elDeleteSelect ? elDeleteSelect.value : '';

    const error = validateDeleteSelection(selectedId);
    if (elDeleteError) {
        elDeleteError.textContent = error;
    }

    if (error) {
        return;
    }

    const option = elDeleteSelect.options[elDeleteSelect.selectedIndex];
    const keyName = option ? (option.dataset.keyName || option.textContent) : '';

    if (elSubmitDelete) {
        elSubmitDelete.disabled = true;
        elSubmitDelete.textContent = 'Deleting...';
    }

    try {
        const payload = {
            key_id: selectedId,
            key_name: keyName
        };

        await apiRequest(ENDPOINTS.DELETE, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        // Actualizar estado local eliminando el key
        KEYS_STATE.list = KEYS_STATE.list.filter(k => k.key_id !== selectedId);
        KEYS_STATE.filtered = KEYS_STATE.list.slice();
        renderKeysTable(KEYS_STATE.filtered);
        refreshDeleteSelect();
        if (elSelectAll) elSelectAll.checked = false;
        updateDeleteButtonsState();

        showToast('Key pair deleted successfully.');
        if (elDeleteForm) {
            elDeleteForm.reset();
        }
        if (elDeleteError) elDeleteError.textContent = '';
    } catch (err) {
        showErrorOverlay(err.message, err.details);
    } finally {
        if (elSubmitDelete) {
            elSubmitDelete.disabled = false;
            elSubmitDelete.textContent = 'Delete key pair';
        }
    }
}
