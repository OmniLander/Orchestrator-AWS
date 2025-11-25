// ========================================================
// HELPERS GENERALES
// ========================================================

/**
 * Pequeño wrapper para fetch con manejo básico de errores.
 */
async function fetchJSON(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText} (${url})`);
    }
    return response.json();
}

/**
 * Mapea estados de recursos a colores de Bootstrap.
 */
function getStatusColor(state) {
    if (!state) return "secondary";
    const normalized = String(state).toLowerCase();
    const map = {
        available: "success",
        active: "success",
        pending: "warning",
        creating: "warning",
        deleting: "danger",
        deleted: "danger",
        failed: "danger"
    };
    return map[normalized] || "secondary";
}

/**
 * Manejo de errores centralizado.
 */
function logError(context, error) {
    console.error(`[VPC Dashboard] Error en ${context}:`, error);
}

// ========================================================
// VPCs
// ========================================================

async function fetchVPCs() {
    const tbody = document.getElementById("vpc-table-body");
    const counter = document.getElementById("vpc-count");
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center text-muted">
                Cargando VPCs...
            </td>
        </tr>
    `;

    try {
        const result = await fetchJSON("/VPC_in_existance");
        tbody.innerHTML = "";

        if (result.success && result.data) {
            const vpcs = result.data;
            const vpcEntries = Object.entries(vpcs);
            if (counter) counter.innerText = vpcEntries.length;

            if (vpcEntries.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-muted">
                            No se encontraron VPCs en esta cuenta / región.
                        </td>
                    </tr>
                `;
                return;
            }

            for (const [id, info] of vpcEntries) {
                const statusColor = getStatusColor(info.state);
                const name = info.name || "N/A";
                const cidr = info.cidr_block || "N/A";

                const row = document.createElement("tr");
                row.innerHTML = `
                    <td class="fw-bold">${name}</td>
                    <td><code class="text-primary">${id}</code></td>
                    <td>${cidr}</td>
                    <td>
                        <span class="badge bg-${statusColor} status-badge">
                            ${info.state || "unknown"}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteVPC('${id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            }
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger">
                        No se pudieron obtener las VPCs (respuesta inválida del backend).
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        logError("fetchVPCs", error);
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                    Error al cargar VPCs. Revisa la consola del navegador.
                </td>
            </tr>
        `;
    }
}

/**
 * Antes de borrar una VPC, validamos si tiene subnets asociadas.
 */
async function deleteVPC(vpcId) {
    if (!vpcId) return;

    try {
        // 1. Verificar subnets asociadas a la VPC
        const subnetResult = await fetchJSON("/Subnets_in_existance");
        const allSubnetsByVpc = (subnetResult && subnetResult.data) || {};
        const subnetsForVpc = allSubnetsByVpc[vpcId] || [];

        if (Array.isArray(subnetsForVpc) && subnetsForVpc.length > 0) {
            alert(
                `No puedes eliminar esta VPC (${vpcId}) porque tiene ` +
                `${subnetsForVpc.length} subnet(s) asociada(s).\n` +
                `Primero elimina o migra las subnets.`
            );
            return;
        }

        // 2. Confirmar con el usuario
        const confirmMsg =
            `¿Seguro que deseas eliminar la VPC ${vpcId}?\n` +
            `Esta acción es irreversible.`;
        if (!confirm(confirmMsg)) return;

        // 3. Enviar petición de borrado
        const deleteResult = await fetchJSON("/Delete_VPC", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vpc_id: vpcId })
        });

        if (deleteResult.success) {
            alert("VPC eliminada correctamente.");
            fetchAllData();
        } else {
            alert("Error al eliminar la VPC: " + (deleteResult.Error || "Fallo desconocido"));
        }
    } catch (error) {
        logError("deleteVPC", error);
        alert("Error al intentar eliminar la VPC. Revisa la consola para más detalles.");
    }
}

// ========================================================
// SUBNETS
// ========================================================

async function fetchSubnets() {
    const tbody = document.getElementById("subnet-table-body");
    const counter = document.getElementById("subnet-count");
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center text-muted">
                Cargando Subnets...
            </td>
        </tr>
    `;

    try {
        const result = await fetchJSON("/Subnets_in_existance");
        tbody.innerHTML = "";

        let totalSubnets = 0;

        if (result.success && result.data) {
            const data = result.data; // { "vpc-id": [ {subnet_info}, ... ] }

            const vpcEntries = Object.entries(data);
            if (vpcEntries.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-muted">
                            No se encontraron subnets.
                        </td>
                    </tr>
                `;
            }

            for (const [vpcId, subnets] of vpcEntries) {
                (subnets || []).forEach(sub => {
                    totalSubnets++;
                    const stateColor = getStatusColor(sub.state);

                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td><small>${vpcId}</small></td>
                        <td>${sub.name || "N/A"}</td>
                        <td><code>${sub.subnet_id || "N/A"}</code></td>
                        <td>${sub.zone || "N/A"}</td>
                        <td>${sub.block || "N/A"}</td>
                        <td>
                            <span class="badge bg-${stateColor}">
                                ${sub.state || "unknown"}
                            </span>
                        </td>
                        <td>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteSubnet('${sub.subnet_id}')">
            <i class="fas fa-trash"></i>
        </button>
    </td>
                    `;
                    tbody.appendChild(row);
                });
            }
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-danger">
                        No se pudieron obtener las subnets (respuesta inválida del backend).
                    </td>
                </tr>
            `;
        }

        if (counter) counter.innerText = totalSubnets;
    } catch (error) {
        logError("fetchSubnets", error);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">
                    Error al cargar Subnets. Revisa la consola del navegador.
                </td>
            </tr>
        `;
    }
}

// ========================================================
// ACLs
// ========================================================

async function fetchACLs() {
    const tbody = document.getElementById("acl-table-body");
    const counter = document.getElementById("acl-count");
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center text-muted">
                Cargando ACLs...
            </td>
        </tr>
    `;

    try {
        const result = await fetchJSON("/ACL_in_existance");
        tbody.innerHTML = "";

        let totalACLs = 0;

        if (result.success && result.data) {
            // Estructura esperada:
            // { acl_per_vpc: {}, rules: {}, assotiations: {} }
            const data = result.data;
            const rules = data.rules || {};
            const aclPerVpc = data.acl_per_vpc || {};

            const vpcEntries = Object.entries(aclPerVpc);
            if (vpcEntries.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-muted">
                            No se encontraron ACLs.
                        </td>
                    </tr>
                `;
            }

            for (const [vpcId, aclsList] of vpcEntries) {
                (aclsList || []).forEach(acl => {
                    totalACLs++;

                    const aclRules = Object.values(rules).filter(r => r.acl_id === acl.acl_id);
                    const ingressCount = aclRules.filter(r => r.type === "Ingress").length;
                    const egressCount = aclRules.filter(r => r.type === "Egress").length;

                    const nameCell =
                        acl.name && acl.name !== "N/A"
                            ? acl.name
                            : '<span class="text-muted">Sin Nombre</span>';

                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td class="fw-bold">${nameCell}</td>
                        <td><code class="text-info">${acl.acl_id}</code></td>
                        <td><small>${vpcId}</small></td>
                        <td>
                            <span class="badge bg-success" title="Ingress Rules">
                                <i class="fas fa-arrow-down"></i> ${ingressCount}
                            </span>
                            <span class="badge bg-warning text-dark ms-1" title="Egress Rules">
                                <i class="fas fa-arrow-up"></i> ${egressCount}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteACL('${acl.acl_id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            }
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger">
                        No se pudieron obtener las ACLs (respuesta inválida del backend).
                    </td>
                </tr>
            `;
        }

        if (counter) counter.innerText = totalACLs;
    } catch (error) {
        logError("fetchACLs", error);
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                    Error al cargar ACLs. Revisa la consola del navegador.
                </td>
            </tr>
        `;
    }
}

async function deleteACL(aclId) {
    if (!aclId) return;

    const confirmMsg =
        `¿Estás seguro de eliminar la ACL ${aclId}?\n` +
        `Puede afectar el tráfico de una o varias subnets.`;
    if (!confirm(confirmMsg)) return;

    try {
        const result = await fetchJSON("/Delete_acl", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ acl_id: aclId })
        });

        // Nota: backend devuelve "Success" con mayúscula
        if (result.Success) {
            alert("ACL eliminada correctamente.");
            fetchAllData();
        } else {
            alert("Error al eliminar ACL: " + (result.Error || "Fallo desconocido"));
        }
    } catch (error) {
        logError("deleteACL", error);
        alert("Error al intentar eliminar la ACL. Revisa la consola para más detalles.");
    }
}
// ========================================================
// FUNCIONES DE CREACIÓN (NUEVAS)
// ========================================================

async function createVPC() {
    const name = document.getElementById("new-vpc-name").value;
    const cidr = document.getElementById("new-vpc-cidr").value;

    if (!name || !cidr) {
        alert("Por favor completa todos los campos (Name y CIDR).");
        return;
    }

    try {
        const result = await fetchJSON("/Create_VPC", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vpc_name: name, block: cidr })
        });

        if (result.success) {
            alert("VPC creada exitosamente.");
            // Cerrar modal
            const modalEl = document.getElementById('createVPCModal');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            modalInstance.hide();
            // Limpiar form
            document.getElementById("form-create-vpc").reset();
            // Recargar datos
            fetchAllData();
        } else {
            alert("Error al crear VPC: " + (result.Error || "Desconocido"));
        }
    } catch (error) {
        logError("createVPC", error);
        alert("Fallo al conectar con el servidor.");
    }
}

async function createSubnet() {
    const vpcId = document.getElementById("new-subnet-vpcid").value;
    const name = document.getElementById("new-subnet-name").value;
    const cidr = document.getElementById("new-subnet-cidr").value;

    if (!vpcId || !cidr) {
        alert("VPC ID y CIDR son obligatorios.");
        return;
    }

    try {
        const result = await fetchJSON("/Create_subnet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                vpc_id: vpcId, 
                cidr_block: cidr, 
                subnet_name: name 
            })
        });

        if (result.success) {
            alert("Subnet creada exitosamente.");
            const modalEl = document.getElementById('createSubnetModal');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            modalInstance.hide();
            document.getElementById("form-create-subnet").reset();
            fetchAllData();
        } else {
            alert("Error al crear Subnet: " + (result.Error || "Desconocido"));
        }
    } catch (error) {
        logError("createSubnet", error);
        alert("Fallo al conectar con el servidor.");
    }
}
async function deleteSubnet(subnetId) {
    if (!subnetId) return;

    if (!confirm(`¿Estás seguro de eliminar la subnet ${subnetId}? Esta acción es irreversible.`)) {
        return;
    }

    try {
        const result = await fetchJSON("/Delete_subnet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subnet_id: subnetId })
        });

        if (result.success) {
            alert("Subnet eliminada correctamente.");
            fetchAllData();
        } else {
            alert("Error: " + (result.Error || "No se pudo eliminar"));
        }
    } catch (error) {
        logError("deleteSubnet", error);
        alert("Error de conexión al eliminar subnet.");
    }
}
async function createACL() {
    const vpcId = document.getElementById("new-acl-vpcid").value;
    const name = document.getElementById("new-acl-name").value;

    if (!vpcId) {
        alert("Debes especificar una VPC ID.");
        return;
    }

    try {
        // Nota: Endpoint backend es /Create_acl
        const result = await fetchJSON("/Create_acl", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                vpc_id: vpcId, 
                acl_name: name 
            })
        });

        // Nota: Backend retorna "Success" con S mayúscula en Create_acl
        if (result.Success) {
            alert("ACL creada exitosamente.");
            const modalEl = document.getElementById('createACLModal');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            modalInstance.hide();
            document.getElementById("form-create-acl").reset();
            fetchAllData();
        } else {
            alert("Error al crear ACL: " + (result.Error || "Desconocido"));
        }
    } catch (error) {
        logError("createACL", error);
        alert("Fallo al conectar con el servidor.");
    }
}

// ========================================================
// ORQUESTADOR DE REFRESCO
// ========================================================

function fetchAllData() {
    fetchVPCs();
    fetchSubnets();
    fetchACLs();
}

document.addEventListener("DOMContentLoaded", function () {
    fetchAllData();
});
