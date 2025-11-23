// ========================================================
// VARIABLES GLOBALES
// ========================================================
let currentInstances = {};
let instanceToDelete = null;

// Modales Bootstrap 5
let deleteModal = null;
let createModal = null;

// ========================================================
// INICIALIZACIÓN
// ========================================================
document.addEventListener("DOMContentLoaded", () => {
    deleteModal = new bootstrap.Modal(document.getElementById("deleteInstanceModal"));
    createModal = new bootstrap.Modal(document.getElementById("createInstanceModal"));

    loadExternalResources();
    refreshInstances();
});

// ========================================================
// CARGAR RECURSOS EXTERNOS - VERSIÓN CORREGIDA
// ========================================================
async function loadExternalResources() {
    try {
        const [keysResponse, sgsResponse, subnetsResponse] = await Promise.all([
            fetchJSON("/get_available_keys"),
            fetchJSON("/get_available_sgs"),
            fetchJSON("/get_available_subnets")
        ]);

        // Extraer data correctamente según la estructura de respuesta
        const keys = keysResponse.Data || keysResponse.data || keysResponse;
        const sgs = sgsResponse.Data || sgsResponse.data || sgsResponse;
        const subnets = subnetsResponse.data || subnetsResponse.Data || subnetsResponse;

        populateSelect("keySelect", keys);
        populateSelect("sgSelect", sgs);
        populateSelect("subnetSelect", subnets);

    } catch (error) {
        console.error("Error loading external resources:", error);
        showAlert("Error al cargar Keys, SGs o Subnets", "danger");
    }
}

// Helper para JSON fetch - VERSIÓN MEJORADA
async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    
    // Verificar si la respuesta indica error
    if (data.Error || (data.success === false)) {
        throw new Error(data.Error || "Error en la operación");
    }
    
    return data;
}

// ========================================================
// LLENAR SELECT - VERSIÓN CON AGRUPACIÓN POR VPC PARA SUBNETS Y SGs
// ========================================================
function populateSelect(selectId, data) {
    const select = document.getElementById(selectId);
    select.innerHTML = `<option value="">Seleccionar...</option>`;

    // Caso especial para subnets - Agrupar por VPC
    if (selectId === "subnetSelect") {
        Object.keys(data).forEach(vpcId => {
            const vpcSubnets = data[vpcId];
            
            if (Array.isArray(vpcSubnets) && vpcSubnets.length > 0) {
                const optgroup = document.createElement("optgroup");
                optgroup.label = `VPC: ${vpcId}`;
                
                vpcSubnets.forEach(subnet => {
                    const opt = document.createElement("option");
                    opt.value = subnet.subnet_id;
                    opt.textContent = `${subnet.name || 'Sin nombre'} | ${subnet.zone} | ${subnet.block} | ${subnet.state}`;
                    optgroup.appendChild(opt);
                });
                
                select.appendChild(optgroup);
            }
        });
    }
    // Para security groups - AGRUPAR POR VPC
    else if (selectId === "sgSelect") {
        // Primero agrupar los SGs por VPC
        const sgsByVpc = {};
        
        Object.keys(data).forEach(sgId => {
            const sg = data[sgId];
            if (sg && sg.VPC_it_belongs) {
                const vpcId = sg.VPC_it_belongs;
                if (!sgsByVpc[vpcId]) {
                    sgsByVpc[vpcId] = [];
                }
                sgsByVpc[vpcId].push({
                    sgId: sgId,
                    sgData: sg
                });
            }
        });
        
        // Crear optgroups por VPC
        Object.keys(sgsByVpc).forEach(vpcId => {
            const vpcSgs = sgsByVpc[vpcId];
            
            const optgroup = document.createElement("optgroup");
            optgroup.label = `VPC: ${vpcId}`;
            
            vpcSgs.forEach(sg => {
                const opt = document.createElement("option");
                opt.value = sg.sgId;
                opt.textContent = `${sg.sgData.Group_Name} - ${sg.sgData.Group_description?.substring(0, 40)}...`;
                opt.title = `${sg.sgData.Group_Name}\n${sg.sgData.Group_description}`; // Tooltip
                opt.dataset.vpcId = vpcId; // Guardar VPC para referencia
                optgroup.appendChild(opt);
            });
            
            select.appendChild(optgroup);
        });
    }
    // Para keys - usar Key_name como value
    else if (selectId === "keySelect") {
        Object.keys(data).forEach(keyId => {
            const item = data[keyId];
            if (item && item.Key_name) {
                const opt = document.createElement("option");
                opt.value = item.Key_name;
                opt.textContent = `${item.Key_name} (${item.key_type || 'rsa'})`;
                select.appendChild(opt);
            }
        });
    }
}

// ========================================================
// REFRESCAR INSTANCIAS
// ========================================================
async function refreshInstances() {
    showLoading(true);

    try {
        const result = await fetchJSON("/EC2_in_existance");

        if (!result.success) throw new Error(result.Error);

        currentInstances = result.data;
        displayInstances(currentInstances);
        updateStatistics(currentInstances);

    } catch (error) {
        console.error("Error refreshing instances:", error);
        showAlert("Error al obtener instancias: " + error.message, "danger");

    } finally {
        showLoading(false);
    }
}

// ========================================================
// MOSTRAR INSTANCIAS EN TABLA
// ========================================================
function displayInstances(instances) {
    const container = document.getElementById("instancesContainer");

    if (!instances || Object.keys(instances).length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-server fa-3x text-muted mb-3"></i>
                <p class="text-muted">No hay instancias EC2</p>
            </div>
        `;
        return;
    }

    let html = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>ID</th>
                        <th>Estado</th>
                        <th>Tipo</th>
                        <th>IP</th>
                        <th>VPC</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    for (const instanceId in instances) {
        const inst = instances[instanceId];
        const badge = getStateClass(inst.State);

        html += `
            <tr>
                <td><strong>${inst.Instance_name}</strong></td>
                <td><code>${instanceId}</code></td>
                <td><span class="badge ${badge}">${inst.State}</span></td>
                <td>${inst.Instance_type}</td>
                <td>${inst.Ip_address}</td>
                <td>${inst.VPC}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger"
                        onclick="openDeleteModal('${instanceId}', '${inst.Instance_name}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

// ========================================================
// ACTUALIZAR STATISTICS
// ========================================================
function updateStatistics(instances) {
    const total = Object.keys(instances).length;
    let running = 0, stopped = 0, other = 0;

    Object.values(instances).forEach(i => {
        if (i.State === "running") running++;
        else if (i.State === "stopped") stopped++;
        else other++;
    });

    document.getElementById("total-instances").textContent = total;
    document.getElementById("running-instances").textContent = running;
    document.getElementById("stopped-instances").textContent = stopped;
    document.getElementById("other-instances").textContent = other;
}

function getStateClass(state) {
    switch (state) {
        case "running": return "bg-success";
        case "stopped": return "bg-danger";
        case "pending": return "bg-warning";
        default: return "bg-secondary";
    }
}

// ========================================================
// CREAR INSTANCIA
// ========================================================
async function createInstance() {
    const form = document.getElementById("createInstanceForm");
    const formData = new FormData(form);

    const data = Object.fromEntries(formData.entries());

    try {
        const result = await fetchJSON("/Create_EC2", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (!result.success) throw new Error(result.Error);

        showAlert("Instancia lanzada exitosamente", "success");
        createModal.hide();
        form.reset();
        refreshInstances();

    } catch (error) {
        console.error("Error creating instance:", error);
        showAlert("Error creando instancia: " + error.message, "danger");
    }
}

// ========================================================
// BORRAR INSTANCIA
// ========================================================
function openDeleteModal(id, name) {
    instanceToDelete = id;
    document.getElementById("deleteInstanceName").textContent = name;
    deleteModal.show();
}

async function confirmDelete() {
    if (!instanceToDelete) return;

    try {
        const result = await fetchJSON("/Delete_ec2", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ec2_id: instanceToDelete })
        });

        if (!result.success) throw new Error(result.Error);

        showAlert("Instancia eliminada", "success");
        deleteModal.hide();
        refreshInstances();

    } catch (error) {
        console.error("Error deleting instance:", error);
        showAlert("Error eliminando instancia: " + error.message, "danger");
    }
}

// ========================================================
// UTILIDADES
// ========================================================
function showLoading(show) {
    const spinner = document.getElementById("loadingSpinner");
    spinner.style.display = show ? "block" : "none";
}

function showAlert(message, type) {
    const container = document.querySelector(".container");

    const alert = document.createElement("div");
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button class="btn-close" data-bs-dismiss="alert"></button>
    `;

    // Limpia alertas anteriores
    document.querySelectorAll(".alert").forEach(a => a.remove());

    container.prepend(alert);

    setTimeout(() => alert.remove(), 5000);
}
