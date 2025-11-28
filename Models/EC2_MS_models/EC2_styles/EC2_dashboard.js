/****************************************************************************************
 * EC2 DASHBOARD – JS FINAL COMPLETO (AWS-STYLE)
 * Incluye:
 *  - KeyName FIX (se envía info.Key_name y no el KeyPairId)
 *  - Filtro por VPC → carga SGs y Subnets dependientes
 *  - Error Overlay global
 *  - Creación y eliminación de EC2
 *  - Búsqueda instantánea
 *  - Validación completa
 *  - Configuración AWS Console-like
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
    const titleEl = document.getElementById("error-overlay-title");
    const msgEl = document.getElementById("error-overlay-message");
    const detEl = document.getElementById("error-overlay-details");

    titleEl.textContent = title;
    msgEl.textContent = message;
    detEl.textContent = details;

    overlay.classList.remove("error-overlay--hidden");
}

function hideErrorOverlay() {
    document.getElementById("error-overlay")
        .classList.add("error-overlay--hidden");
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
    document.getElementById("btn-refresh").addEventListener("click", refreshInstances);
    document.getElementById("search-input").addEventListener("input", () => {
        CURRENT_SEARCH = document.getElementById("search-input").value.toLowerCase();
        applySearchFilter();
    });

    document.getElementById("create-ec2-form").addEventListener("submit", (e) => {
        e.preventDefault();
        handleCreateInstance();
    });

    document.getElementById("btn-reset-form").addEventListener("click", () => {
        document.getElementById("create-ec2-form").reset();
        resetNetworkSelectors();
        clearFormErrors();
        setCreateFeedback("");
    });

    document.getElementById("error-overlay-close").addEventListener("click", hideErrorOverlay);

    document.getElementById("vpc_id").addEventListener("change", onVpcChange);

document.addEventListener("click", (e) => {

    // DELETE
    if (e.target.matches(".btn-delete-instance")) {
        const id = e.target.getAttribute("data-instance-id");
        handleDeleteInstance(id);
    }

    // START
    if (e.target.matches(".btn-start-instance")) {
        const id = e.target.getAttribute("data-instance-id");
        handleStartInstance(id);
    }

    // STOP
    if (e.target.matches(".btn-stop-instance")) {
        const id = e.target.getAttribute("data-instance-id");
        handleStopInstance(id);
    }
});

}

// ======================================================================================
// SELECTS FIJOS
// ======================================================================================

function populateStaticSelects() {
    const amiSel = document.getElementById("image_id");
    AMI_OPTIONS.forEach(a => {
        const opt = document.createElement("option");
        opt.value = a.value;
        opt.textContent = `${a.label} (${a.value})`;
        amiSel.appendChild(opt);
    });

    const typeSel = document.getElementById("instance_type");
    INSTANCE_TYPE_OPTIONS.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        typeSel.appendChild(opt);
    });
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
    sel.innerHTML = '<option value="">Selecciona una VPC</option>';

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
// KEYS (AQUÍ ESTÁ EL FIX CRÍTICO: usar Key_name como VALUE)
// ======================================================================================

function populateKeys(data) {
    const sel = document.getElementById("key_name");
    sel.innerHTML = '<option value="">Selecciona un KeyPair</option>';

    Object.entries(data).forEach(([keyId, info]) => {
        const opt = document.createElement("option");

        // FIX: AWS requiere KeyName, NO KeyPairId
        opt.value = info.Key_name;

        opt.textContent = `${info.Key_name} (${keyId})`;
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
    sel.innerHTML = '<option value="">Selecciona un Security Group</option>';
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
    sel.innerHTML = '<option value="">Selecciona una Subnet</option>';
    sel.disabled = true;

    if (!vpcId) return;

    const list = ALL_SUBNETS[vpcId] || [];
    list.forEach((sub) => {
        const opt = document.createElement("option");
        opt.value = sub.subnet_id;

        opt.textContent =
            `${sub.name} | ${sub.subnet_id} | ${sub.zone || ""} | ${sub.block || ""}`;

        sel.appendChild(opt);
    });

    sel.disabled = false;
}

function resetNetworkSelectors() {
    document.getElementById("vpc_id").value = "";
    document.getElementById("security_group_id").innerHTML =
        '<option value="">Selecciona un Security Group</option>';
    document.getElementById("security_group_id").disabled = true;

    document.getElementById("subnet_id").innerHTML =
        '<option value="">Selecciona una Subnet</option>';
    document.getElementById("subnet_id").disabled = true;

    SELECTED_VPC = "";
}

// ======================================================================================
// LISTADO DE INSTANCIAS
// ======================================================================================

async function refreshInstances() {
    const tbody = document.getElementById("ec2-table-body");
    tbody.innerHTML = `
        <tr><td colspan="7" class="table__loading">Cargando instancias...</td></tr>
    `;

    try {
        const resp = await fetchJSON("/EC2_in_existance");
        CURRENT_INSTANCES = resp.data || {};

        renderInstancesTable();
        updateSummary();
    } catch (e) {
        console.error("Error refrescando EC2:", e);
    }
}

function renderInstancesTable() {
    const tbody = document.getElementById("ec2-table-body");
    tbody.innerHTML = "";

    const ids = Object.keys(CURRENT_INSTANCES);
    if (ids.length === 0) {
        tbody.innerHTML =
            `<tr><td colspan="7" class="table__empty">No se encontraron instancias.</td></tr>`;
        return;
    }

    ids.forEach((id) => {
        const inst = CURRENT_INSTANCES[id];
        const name = inst.Instance_name || "No name";
        const state = inst.State || "-";
        const ip = inst.Ip_address || "N/A";
        const type = inst.Instance_type || "-";
        const vpc = inst.VPC || "-";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="table__cell--mono">${id}</td>
            <td>${name}</td>
            <td><span class="badge badge--state-${state.toLowerCase()}">${state}</span></td>
            <td>${ip}</td>
            <td>${type}</td>
            <td>${vpc}</td>
<td class="table__actions">

    ${state.toLowerCase() === "running"
        ? `
            <button class="btn btn--warning btn-stop-instance" data-instance-id="${id}">
                Stop
            </button>
        `
        : `
            <button class="btn btn--primary btn-start-instance" data-instance-id="${id}">
                Start
            </button>
        `
    }

    <button class="btn btn--danger btn-delete-instance" data-instance-id="${id}">
        Terminar
    </button>

</td>

        `;
        tbody.appendChild(tr);
    });

    applySearchFilter();
}

function applySearchFilter() {
    const filter = CURRENT_SEARCH;
    const rows = document.querySelectorAll("#ec2-table-body tr");

    rows.forEach(r => {
        if (filter === "") { r.style.display = ""; return; }
        r.style.display = r.textContent.toLowerCase().includes(filter) ? "" : "none";
    });
}

function updateSummary() {
    const ids = Object.keys(CURRENT_INSTANCES);
    const running = ids.filter(id =>
        (CURRENT_INSTANCES[id].State || "").toLowerCase() === "running"
    ).length;

    const stopped = ids.filter(id =>
        ["stopped", "stopping"].includes(
            (CURRENT_INSTANCES[id].State || "").toLowerCase()
        )
    ).length;

    document.getElementById("summary-total").textContent = ids.length;
    document.getElementById("summary-running").textContent = running;
    document.getElementById("summary-stopped").textContent = stopped;
}

// ======================================================================================
// VALIDACIONES DEL FORM Y CREACIÓN DE EC2
// ======================================================================================

function clearFormErrors() {
    document.querySelectorAll(".form-field__error").forEach(e => e.textContent = "");
    document.querySelectorAll(".form-field__control").forEach(c =>
        c.classList.remove("form-field__control--invalid")
    );
}

function clearFieldError(id) {
    document.getElementById(id).classList.remove("form-field__control--invalid");
    const err = document.querySelector(`[data-error-for="${id}"]`);
    if (err) err.textContent = "";
}

function setFieldError(id, msg) {
    document.getElementById(id).classList.add("form-field__control--invalid");
    const err = document.querySelector(`[data-error-for="${id}"]`);
    if (err) err.textContent = msg;
}

function setCreateFeedback(msg, type = "info") {
    const div = document.getElementById("create-ec2-feedback");
    div.textContent = msg;
    div.className = `form-feedback form-feedback--${type}`;
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

    let ok = true;

    if (!image) { setFieldError("image_id", "Selecciona AMI"); ok = false; }
    if (!type) { setFieldError("instance_type", "Selecciona tipo"); ok = false; }
    if (!vpc) { setFieldError("vpc_id", "Selecciona VPC"); ok = false; }
    if (!subnet) { setFieldError("subnet_id", "Selecciona Subnet"); ok = false; }
    if (!sg) { setFieldError("security_group_id", "Selecciona Security Group"); ok = false; }
    if (!keyName) { setFieldError("key_name", "Selecciona KeyPair"); ok = false; }
    if (!instName) { setFieldError("instance_name", "Indica nombre"); ok = false; }

    const n = parseInt(max, 10);
    if (!Number.isInteger(n) || n < 1 || n > 20) {
        setFieldError("max_count", "Debe ser número entre 1 y 20");
        ok = false;
    }

    if (!ok) {
        setCreateFeedback("Corrige los errores antes de continuar.", "error");
        return null;
    }

    return {
        image_id: image,
        instance_type: type,
        max_count: n,
        key_name: keyName,      // ← FIX: ahora sí es KeyName válido
        security_group_id: sg,
        subnet_id: subnet,
        instance_name: instName,
        vpc_id: vpc
    };
}

async function handleCreateInstance() {
    const payload = validateCreateForm();
    if (!payload) return;

    setCreateFeedback("Creando instancia...", "info");

    try {
        await fetchJSON("/Create_EC2", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        setCreateFeedback("Instancia creada exitosamente.", "success");
        refreshInstances();
        document.getElementById("create-ec2-form").reset();
        resetNetworkSelectors();

    } catch (e) {
        console.error("Error creando EC2:", e);
        setCreateFeedback("Error creando instancia. Revisa el overlay.", "error");
    }
}

// ======================================================================================
// ELIMINAR INSTANCIA
// ======================================================================================

async function handleDeleteInstance(id) {
    if (!confirm(`¿Terminar la instancia ${id}?`)) return;

    try {
        await fetchJSON("/Delete_ec2", {
            method: "POST",
            body: JSON.stringify({ ec2_id: id })
        });

        refreshInstances();

    } catch (e) {
        console.error("Error eliminando EC2:", e);
    }
}

// ======================================================================================
// START / STOP INSTANCE (AWS STYLE)
// ======================================================================================

async function handleStartInstance(id) {
    try {
        await fetchJSON("/Start_ec2", {
            method: "POST",
            body: JSON.stringify({ instance_id: id })
        });

        refreshInstances();
    } catch (e) {
        console.error("Error starting EC2:", e);
    }
}

async function handleStopInstance(id) {
    try {
        await fetchJSON("/Stop_ec2", {
            method: "POST",
            body: JSON.stringify({ instance_id: id })
        });

        refreshInstances();
    } catch (e) {
        console.error("Error stopping EC2:", e);
    }
}
