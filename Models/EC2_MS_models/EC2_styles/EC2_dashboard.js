/****************************************************************************************
 * EC2 DASHBOARD – JS FINAL (ADAPTADO PARA USER DATA Y CYBER-THEME)
 ****************************************************************************************/

// ======================================================================================
// AMIs E INSTANCE TYPES
// ======================================================================================

const AMI_OPTIONS = [
    { value: "ami-0fa3fe0fa7920f68e", label: "Amazon Linux 2023 (kernel 6.1, x86_64)" },
    { value: "ami-0f00d706c4a80fd93", label: "Amazon Linux 2023 (kernel 6.12, x86_64)" },
    { value: "ami-0ecb62995f68bb549", label: "Ubuntu Server 24.04 LTS (x86_64)" },
    { value: "ami-0c398cb65a93047f2", label: "Ubuntu Server 22.04 LTS (x86_64)" },
    { value: "ami-0b4bc1e90f30ca1ec", label: "Windows Server 2025 Base (x86_64)" }
];

const INSTANCE_TYPE_OPTIONS = [
    "t2.micro", "t3.micro", "t3.small", "t3.medium",
    "m5.large", "m6i.large", "c6g.large", "g6.xlarge"
];

// ======================================================================================
// ESTADO GLOBAL
// ======================================================================================

let CURRENT_INSTANCES = {};
let CURRENT_SEARCH = "";

let ALL_VPCS = {};
let ALL_SGS = {};
let ALL_SUBNETS = {};

let SELECTED_VPC = "";

// ======================================================================================
// ERROR OVERLAY
// ======================================================================================

function showErrorOverlay(title, message, details = "") {
    const overlay = document.getElementById("error-overlay");
    const msgEl = document.getElementById("error-overlay-message");
    const detEl = document.getElementById("error-overlay-details");

    // Actualizamos textos
    if(msgEl) msgEl.textContent = message;
    if(detEl) detEl.textContent = details;
    
    // Mostrar overlay (compatible con style.display y clases)
    overlay.style.display = "flex";
    overlay.classList.remove("error-overlay--hidden");
}

function hideErrorOverlay() {
    const overlay = document.getElementById("error-overlay");
    overlay.style.display = "none";
    overlay.classList.add("error-overlay--hidden");
}

// ======================================================================================
// fetchJSON
// ======================================================================================

async function fetchJSON(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: { "Content-Type": "application/json" },
            ...options
        });

        const raw = await response.text();
        let data = {};

        try { data = JSON.parse(raw); }
        catch (e) {
            showErrorOverlay(
                "Error parseando JSON",
                `Respuesta JSON inválida desde ${url}`,
                raw
            );
            throw e;
        }

        if (!response.ok || data.success === false) {
            showErrorOverlay(
                "Error desde backend",
                `La llamada a ${url} falló`,
                data.error || `HTTP ${response.status}`
            );
            throw new Error(data.error || "Error backend");
        }

        return data;
    } catch (err) {
        console.error("fetchJSON error:", err);
        throw err;
    }
}

// ======================================================================================
// DOM READY
// ======================================================================================

document.addEventListener("DOMContentLoaded", () => {
    setupEventListeners();
    populateStaticSelects();
    loadExternalResources();
    refreshInstances();
});

// ======================================================================================
// EVENTOS
// ======================================================================================

function setupEventListeners() {
    const btnRefresh = document.getElementById("btn-refresh");
    if(btnRefresh) btnRefresh.addEventListener("click", refreshInstances);

    const searchInput = document.getElementById("search-input");
    if(searchInput) searchInput.addEventListener("input", () => {
        CURRENT_SEARCH = searchInput.value.toLowerCase();
        applySearchFilter();
    });

    const createForm = document.getElementById("create-ec2-form");
    if(createForm) createForm.addEventListener("submit", (e) => {
        e.preventDefault();
        handleCreateInstance();
    });

    const btnReset = document.getElementById("btn-reset-form");
    if(btnReset) btnReset.addEventListener("click", () => {
        createForm.reset();
        resetNetworkSelectors();
        clearFormErrors();
        setCreateFeedback("");
    });

    const closeOverlayBtn = document.getElementById("error-overlay-close");
    if(closeOverlayBtn) closeOverlayBtn.addEventListener("click", hideErrorOverlay);

    const vpcSelect = document.getElementById("vpc_id");
    if(vpcSelect) vpcSelect.addEventListener("change", onVpcChange);

    document.addEventListener("click", (e) => {
        // DELETE
        if (e.target.matches(".btn-delete-instance") || e.target.closest(".btn-delete-instance")) {
            const btn = e.target.matches(".btn-delete-instance") ? e.target : e.target.closest(".btn-delete-instance");
            const id = btn.getAttribute("data-instance-id");
            handleDeleteInstance(id);
        }

        // START
        if (e.target.matches(".btn-start-instance") || e.target.closest(".btn-start-instance")) {
            const btn = e.target.matches(".btn-start-instance") ? e.target : e.target.closest(".btn-start-instance");
            const id = btn.getAttribute("data-instance-id");
            handleStartInstance(id);
        }

        // STOP
        if (e.target.matches(".btn-stop-instance") || e.target.closest(".btn-stop-instance")) {
            const btn = e.target.matches(".btn-stop-instance") ? e.target : e.target.closest(".btn-stop-instance");
            const id = btn.getAttribute("data-instance-id");
            handleStopInstance(id);
        }
    });
}

// ======================================================================================
// SELECTS FIJOS
// ======================================================================================

function populateStaticSelects() {
    const amiSel = document.getElementById("image_id");
    if(amiSel) {
        AMI_OPTIONS.forEach(a => {
            const opt = document.createElement("option");
            opt.value = a.value;
            opt.textContent = `${a.label}`;
            amiSel.appendChild(opt);
        });
    }

    const typeSel = document.getElementById("instance_type");
    if(typeSel) {
        INSTANCE_TYPE_OPTIONS.forEach(t => {
            const opt = document.createElement("option");
            opt.value = t;
            opt.textContent = t;
            typeSel.appendChild(opt);
        });
    }
}

// ======================================================================================
// CARGA DE RECURSOS EXTERNOS (VPC, KEYS, SGS, SUBNETS)
// ======================================================================================

async function loadExternalResources() {
    try {
        const [vpcsResp, keysResp, sgsResp, subnetsResp] = await Promise.all([
            fetchJSON("/get_available_vpcs"),
            fetchJSON("/get_available_keys"),
            fetchJSON("/get_available_sgs"),
            fetchJSON("/get_available_subnets")
        ]);

        ALL_VPCS = vpcsResp.data || {};
        ALL_SGS = sgsResp.data || {};
        ALL_SUBNETS = subnetsResp.data || {};

        populateVpcs(ALL_VPCS);
        populateKeys(keysResp.data);

    } catch (e) {
        console.error("Error cargando recursos:", e);
    }
}

// ======================================================================================
// CARGA DE VPC
// ======================================================================================

function populateVpcs(data) {
    const sel = document.getElementById("vpc_id");
    if(!sel) return;
    sel.innerHTML = '<option value="">-- Select Network --</option>';

    Object.entries(data).forEach(([vpcId, info]) => {
        const opt = document.createElement("option");
        opt.value = vpcId;
        const name = info.name || "No name";
        const cidr = info.cidr_block || "";
        opt.textContent = `${name} (${vpcId}) | ${cidr}`;
        sel.appendChild(opt);
    });
}

// ======================================================================================
// KEYS
// ======================================================================================

function populateKeys(data) {
    const sel = document.getElementById("key_name");
    if(!sel) return;
    sel.innerHTML = '<option value="">-- Select Keypair --</option>';

    Object.entries(data).forEach(([keyId, info]) => {
        const opt = document.createElement("option");
        opt.value = info.Key_name; // AWS requiere el nombre
        opt.textContent = `${info.Key_name}`;
        sel.appendChild(opt);
    });
}

// ======================================================================================
// FILTRO VPC → SG Y SUBNETS
// ======================================================================================

function onVpcChange() {
    SELECTED_VPC = document.getElementById("vpc_id").value;
    clearFieldError("vpc_id");

    populateSubnetsForVpc(SELECTED_VPC);
    populateSGsForVpc(SELECTED_VPC);
}

function populateSGsForVpc(vpcId) {
    const sel = document.getElementById("security_group_id");
    sel.innerHTML = '<option value="">-- Select Security Group --</option>';
    sel.disabled = true;

    if (!vpcId) return;

    const filtered = {};
    Object.entries(ALL_SGS).forEach(([sgId, info]) => {
        if (info.VPC_it_belongs === vpcId) {
            filtered[sgId] = info;
        }
    });

    Object.entries(filtered).forEach(([sgId, info]) => {
        const opt = document.createElement("option");
        opt.value = sgId;
        opt.textContent = `${info.Group_Name} (${sgId})`;
        sel.appendChild(opt);
    });

    sel.disabled = false;
}

function populateSubnetsForVpc(vpcId) {
    const sel = document.getElementById("subnet_id");
    
    // Resetear el select
    sel.innerHTML = '<option value="">-- Select Subnet --</option>';
    sel.disabled = true;

    if (!vpcId) return;

    // Obtener la lista de subnets para esa VPC
    const list = ALL_SUBNETS[vpcId] || [];

    list.forEach((sub) => {
        const opt = document.createElement("option");
        opt.value = sub.subnet_id; // El valor que se envía a Python sigue siendo el ID

        // LÓGICA DE VISUALIZACIÓN:
        // 1. Extraemos el nombre real
        let displayName = sub.name;

        // 2. Si el nombre está vacío o es "No name", usamos el ID para que sea útil
        if (!displayName || displayName === "No name") {
            displayName = sub.subnet_id;
        }

        // 3. Formato Final: "Nombre (IP) | AZ"
        // Ejemplo: "proyecto-subnet-public2 (10.0.16.0/20) | us-east-1b"
        // Usamos 'sub.availability_zone' porque así viene en tu JSON
        opt.textContent = `${displayName} (${sub.cidr_block}) | ${sub.availability_zone}`;

        sel.appendChild(opt);
    });

    sel.disabled = false;
}

function resetNetworkSelectors() {
    document.getElementById("vpc_id").value = "";
    
    const sgSel = document.getElementById("security_group_id");
    sgSel.innerHTML = '<option value="">-- Waiting for VPC --</option>';
    sgSel.disabled = true;

    const subSel = document.getElementById("subnet_id");
    subSel.innerHTML = '<option value="">-- Waiting for VPC --</option>';
    subSel.disabled = true;

    SELECTED_VPC = "";
}

// ======================================================================================
// LISTADO DE INSTANCIAS
// ======================================================================================

async function refreshInstances() {
    const tbody = document.getElementById("ec2-table-body");
    if (!tbody.children.length) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 2rem;">SYNCING DATALINK...</td></tr>`;
    }

    try {
        const resp = await fetchJSON("/EC2_in_existance");
        
        if (resp.data) {
            CURRENT_INSTANCES = resp.data;
        } else if (resp && typeof resp === 'object' && !resp.error && !resp.success) {
            CURRENT_INSTANCES = resp;
        } else {
            CURRENT_INSTANCES = {};
        }
        
        renderInstancesTable();
        updateSummary(); 

    } catch (e) {
        console.error("Error crítico refrescando EC2:", e);
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color: var(--accent-danger);">CONNECTION ERROR</td></tr>`;
    }
}

function renderInstancesTable() {
    const tbody = document.getElementById("ec2-table-body");
    tbody.innerHTML = "";

    const ids = Object.keys(CURRENT_INSTANCES);
    if (ids.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 2rem;">NO ACTIVE ASSETS FOUND</td></tr>`;
        return;
    }

    ids.forEach((id) => {
        const inst = CURRENT_INSTANCES[id];
        const name = inst.Instance_name || "-";
        
        // Manejo robusto del estado
        let rawState = inst.State || inst.state;
        if (typeof rawState === 'object' && rawState.Name) rawState = rawState.Name;
        const state = String(rawState || 'unknown').toLowerCase();
        
        const privateIp = inst.Ip_address || "-";
        const publicIp = inst.Public_IpAdd || "-";
        const type = inst.Instance_type || "-";
        const vpc = inst.VPC || "-";
        const subnet = inst.Subnet || "-";

        const isRunning = state === "running";

        // Clases de estado para el color del texto
        let stateClass = "";
        if(state === "running") stateClass = "status-running";
        else if(state === "stopped") stateClass = "status-stopped";
        else stateClass = "status-pending";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="font-family: monospace; color: var(--accent-primary-start);">${id}</td>
            <td style="font-weight: 500;">${name}</td>
            <td class="${stateClass}" style="text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px;">${state}</td>
            <td style="font-family: monospace;">${privateIp}</td>
            <td style="font-family: monospace;">${publicIp}</td>
            <td>${type}</td>
            <td>${vpc}</td>
            <td>${subnet}</td>
            <td style="display: flex; gap: 0.5rem;">
                ${isRunning ? `
                    <button class="btn btn-danger btn-stop-instance" data-instance-id="${id}" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">
                        STOP
                    </button>
                ` : `
                    <button class="btn btn-primary btn-start-instance" data-instance-id="${id}" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">
                        START
                    </button>
                `}
                <button class="btn btn-secondary btn-delete-instance" data-instance-id="${id}" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">
                    TERM
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    applySearchFilter();
}

function applySearchFilter() {
    const filterText = CURRENT_SEARCH;
    const rows = document.querySelectorAll("#ec2-table-body tr");

    rows.forEach(r => {
        const rowText = r.textContent.toLowerCase();
        const matchesText = !filterText || rowText.includes(filterText);
        r.style.display = matchesText ? "" : "none";
    });
}

function updateSummary() {
    const ids = Object.keys(CURRENT_INSTANCES);
    let running = 0;
    let stopped = 0;
    
    ids.forEach(id => {
        const inst = CURRENT_INSTANCES[id];
        let rawState = inst.State || inst.state;
        if (typeof rawState === 'object' && rawState !== null && rawState.Name) rawState = rawState.Name;
        const state = String(rawState || '').toLowerCase().trim();
        
        if (state === 'running') running++;
        else if (state === 'stopped') stopped++;
    });
    
    const totalEl = document.getElementById("summary-total");
    const runEl = document.getElementById("summary-running");
    const stopEl = document.getElementById("summary-stopped");

    if (totalEl) totalEl.textContent = ids.length;
    if (runEl) runEl.textContent = running;
    if (stopEl) stopEl.textContent = stopped;
}

// ======================================================================================
// VALIDACIONES Y CREACIÓN (CON USER DATA)
// ======================================================================================

function clearFormErrors() {
    document.querySelectorAll(".form-field__error").forEach(e => e.textContent = "");
    // Limpia la clase de error de cualquier input que la tenga
    document.querySelectorAll(".form-field__control--invalid").forEach(c =>
        c.classList.remove("form-field__control--invalid")
    );
}

function clearFieldError(id) {
    const el = document.getElementById(id);
    if(el) el.classList.remove("form-field__control--invalid");
    
    const err = document.querySelector(`[data-error-for="${id}"]`);
    if (err) err.textContent = "";
}

function setFieldError(id, msg) {
    const el = document.getElementById(id);
    if(el) el.classList.add("form-field__control--invalid");
    
    const err = document.querySelector(`[data-error-for="${id}"]`);
    if (err) err.textContent = msg;
}

function setCreateFeedback(msg, type = "info") {
    const div = document.getElementById("create-ec2-feedback");
    if(!div) return;
    div.textContent = msg;
    // Ajustar colores según el tema
    if(type === 'error') div.style.color = 'var(--accent-danger)';
    else if(type === 'success') div.style.color = 'var(--accent-success)';
    else div.style.color = 'var(--text-muted)';
}

function validateCreateForm() {
    clearFormErrors();

    const vpc = document.getElementById("vpc_id").value.trim();
    const subnet = document.getElementById("subnet_id").value.trim();
    const sg = document.getElementById("security_group_id").value.trim();
    const keyName = document.getElementById("key_name").value.trim();
    const image = document.getElementById("image_id").value.trim();
    const type = document.getElementById("instance_type").value.trim();
    const max = document.getElementById("max_count").value.trim();
    const instName = document.getElementById("instance_name").value.trim();
    
    // CAPTURA DEL NUEVO CAMPO USER DATA
    const userData = document.getElementById("user_data").value; 

    let ok = true;

    if (!image) { setFieldError("image_id", "Required"); ok = false; }
    if (!type) { setFieldError("instance_type", "Required"); ok = false; }
    if (!vpc) { setFieldError("vpc_id", "Required"); ok = false; }
    if (!subnet) { setFieldError("subnet_id", "Required"); ok = false; }
    if (!sg) { setFieldError("security_group_id", "Required"); ok = false; }
    if (!keyName) { setFieldError("key_name", "Required"); ok = false; }
    if (!instName) { setFieldError("instance_name", "Required"); ok = false; }

    const n = parseInt(max, 10);
    if (!Number.isInteger(n) || n < 1 || n > 20) {
        setFieldError("max_count", "1 - 20");
        ok = false;
    }

    if (!ok) {
        setCreateFeedback("Please correct fields marked in red.", "error");
        return null;
    }

    return {
        image_id: image,
        instance_type: type,
        max_count: n,
        key_name: keyName,
        security_group_id: sg,
        subnet_id: subnet,
        instance_name: instName,
        vpc_id: vpc,
        user_data: userData // SE AÑADE AL PAYLOAD
    };
}

async function handleCreateInstance() {
    const payload = validateCreateForm();
    if (!payload) return;

    setCreateFeedback("Initiating Launch Sequence...", "info");

    try {
        await fetchJSON("/Create_EC2", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        setCreateFeedback("Resource Deployed Successfully.", "success");
        refreshInstances();
        document.getElementById("create-ec2-form").reset();
        resetNetworkSelectors();

    } catch (e) {
        console.error("Error creando EC2:", e);
        setCreateFeedback("Deployment Failed. Check logs.", "error");
    }
}

// ======================================================================================
// ELIMINAR / START / STOP
// ======================================================================================

async function handleDeleteInstance(id) {
    if (!confirm(`CONFIRM TERMINATION: ${id}?`)) return;
    try {
        await fetchJSON("/Delete_ec2", { method: "POST", body: JSON.stringify({ ec2_id: id }) });
        refreshInstances();
    } catch (e) {
        showErrorOverlay("Error", "Termination failed", e.toString());
    }
}

async function handleStartInstance(id) {
    try {
        await fetchJSON("/Start_ec2", { method: "POST", body: JSON.stringify({ instance_id: id }) });
        refreshInstances();
    } catch (e) {
        showErrorOverlay("Error", "Start failed", e.toString());
    }
}

async function handleStopInstance(id) {
    try {
        await fetchJSON("/Stop_ec2", { method: "POST", body: JSON.stringify({ instance_id: id }) });
        refreshInstances();
    } catch (e) {
        showErrorOverlay("Error", "Stop failed", e.toString());
    }
}