// =========================================================
// ESTADO GLOBAL
// =========================================================
const aclState = {
    acls: [],          // lista de ACLs
    rules: [],         // reglas (flattened)
    associations: [],  // asociaciones ACL–Subnet
    vpcs: [],          // lista de VPCs para selects
    search: "",
    selectedACL: null  // ACL sobre la que se abrirá el modal de reglas
};

// =========================================================
// HELPERS UNIVERSALES
// =========================================================
async function apiRequest(endpoint, method = "GET", body = null) {
    const options = { method, headers: { "Content-Type": "application/json" } };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(endpoint, options);
    let data;

    try {
        data = await res.json();
    } catch {
        showError("El backend devolvió una respuesta no válida.");
        throw new Error("Invalid JSON");
    }

    if (!data.success) {
        showError(data.error || "Error desconocido");
        throw new Error(data.error);
    }

    return data.data;
}

function showError(msg) {
    const overlay = document.getElementById("error-overlay");
    document.getElementById("error-message").textContent = msg;
    overlay.style.display = "flex";
    document.getElementById("close-error-btn").onclick = () => (overlay.style.display = "none");
}

function setLoading(state) {
    document.getElementById("loading-overlay").style.display = state ? "flex" : "none";
}

function fillSelect(select, items, getValue, getLabel) {
    select.innerHTML = "";
    if (items.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "No hay elementos disponibles";
        select.appendChild(opt);
        return;
    }
    for (const item of items) {
        const opt = document.createElement("option");
        opt.value = getValue(item);
        opt.textContent = getLabel(item);
        select.appendChild(opt);
    }
}

// =========================================================
// VALIDACIONES
// =========================================================
function validateCIDR(cidr) {
    const regex = /^([0-9]{1,3}\.){3}[0-9]{1,3}\/([0-9]|[12][0-9]|3[0-2])$/;
    if (!regex.test(cidr)) {
        showError("CIDR inválido. Ejemplo válido: 0.0.0.0/0 o 10.0.0.0/16");
        return false;
    }
    return true;
}

function validateRuleNumber(num) {
    if (!num || num < 1 || num > 32766) {
        showError("El número de regla debe estar entre 1 y 32766");
        return false;
    }
    return true;
}

function validatePorts(from, to, protocol) {
    if (protocol === "icmp" || protocol === "all") return true;

    if ((from && !to) || (!from && to)) {
        showError("Si defines un puerto, debes definir ambos (from y to).");
        return false;
    }

    if (from && to) {
        if (from < 0 || from > 65535 || to < 0 || to > 65535) {
            showError("Los puertos deben estar entre 0 y 65535.");
            return false;
        }
        if (parseInt(to) < parseInt(from)) {
            showError("El puerto 'to' no puede ser menor que 'from'.");
            return false;
        }
    }
    return true;
}

// =========================================================
// ENDPOINTS
// =========================================================
const ENDPOINTS = {
    ACL_LIST: "/acl_in_existence",
    CREATE_ACL: "/create_acl",
    DELETE_ACL: "/delete_acl",
    CREATE_RULE: "/update_acl",
    DELETE_RULE: "/delete_acl_entry",
    GET_VPCS: "/vpcs_in_existence"
};

// =========================================================
// LOAD DATA
// =========================================================
async function loadData() {
    try {
        setLoading(true);

        // Cargar VPCs para selects
        const vpcsRaw = await apiRequest(ENDPOINTS.GET_VPCS);
        aclState.vpcs = Object.entries(vpcsRaw).map(([id, obj]) => ({
            id,
            name: obj.name
        }));

        // Cargar ACLs
        const aclRaw = await apiRequest(ENDPOINTS.ACL_LIST);

        // Extraer ACLs agrupadas por VPC
        aclState.acls = [];
        Object.entries(aclRaw.acl_per_vpc).forEach(([vpcId, aclList]) => {
            aclList.forEach(acl => {
                aclState.acls.push({
                    acl_id: acl.acl_id,
                    name: acl.name,
                    vpc_id: vpcId
                });
            });
        });

        // Asociaciones
        aclState.associations = Object.values(aclRaw.assotiations);

        // Reglas
        aclState.rules = Object.values(aclRaw.rules);

        renderACLTable();
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
}

// =========================================================
// RENDER ACL TABLE
// =========================================================
function renderACLTable() {
    const tbody = document.getElementById("acl-tbody");
    tbody.innerHTML = "";

    const search = aclState.search.toLowerCase();

    const filtered = aclState.acls.filter(a =>
        a.acl_id.toLowerCase().includes(search) ||
        a.name.toLowerCase().includes(search) ||
        a.vpc_id.toLowerCase().includes(search)
    );

    if (filtered.length === 0) {
        const tr = `<tr><td colspan="5" class="text-center text-muted">No se encontraron ACL</td></tr>`;
        tbody.innerHTML = tr;
        return;
    }

    for (const acl of filtered) {
        const ruleCount = aclState.rules.filter(r => r.acl_id === acl.acl_id).length;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${acl.acl_id}</td>
            <td>${acl.name}</td>
            <td>${acl.vpc_id}</td>
            <td>${ruleCount}</td>
            <td>
                <button class="aws-btn aws-btn-secondary aws-btn-sm" onclick="openRulesModal('${acl.acl_id}')">Reglas</button>
                <button class="aws-btn aws-btn-danger aws-btn-sm" onclick="deleteACL('${acl.acl_id}')">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    }
}

// =========================================================
// DELETE ACL
// =========================================================
async function deleteACL(aclId) {
    if (!confirm("¿Seguro que deseas eliminar esta ACL?")) return;

    try {
        setLoading(true);
        await apiRequest(ENDPOINTS.DELETE_ACL, "POST", { acl_id: aclId });

        aclState.acls = aclState.acls.filter(a => a.acl_id !== aclId);
        aclState.rules = aclState.rules.filter(r => r.acl_id !== aclId);

        renderACLTable();
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
}

// =========================================================
// MODAL: CREAR ACL
// =========================================================
function setupCreateACLModal() {
    const modal = document.getElementById("create-acl-modal");

    document.getElementById("open-create-acl-btn").onclick = () => {
        fillSelect(
            document.getElementById("acl-vpc-select"),
            aclState.vpcs,
            v => v.id,
            v => `${v.id} (${v.name})`
        );
        modal.style.display = "flex";
    };

    document.getElementById("close-create-acl-btn").onclick =
    document.getElementById("cancel-create-acl").onclick = () =>
        (modal.style.display = "none");

    document.getElementById("create-acl-form").onsubmit = async e => {
        e.preventDefault();

        const name = document.getElementById("acl-name").value;
        const vpcId = document.getElementById("acl-vpc-select").value;

        if (!name.trim()) return showError("El nombre no puede estar vacío.");
        if (!vpcId) return showError("Debes seleccionar una VPC.");

        try {
            setLoading(true);

            const newAclId = await apiRequest(ENDPOINTS.CREATE_ACL, "POST", {
                acl_name: name,
                vpc_id: vpcId
            });

            aclState.acls.push({
                acl_id: newAclId,
                name,
                vpc_id: vpcId
            });

            renderACLTable();
            modal.style.display = "none";
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
}

// =========================================================
// MODAL: REGLAS
// =========================================================
function openRulesModal(aclId) {
    aclState.selectedACL = aclId;

    const modal = document.getElementById("rules-modal");
    modal.style.display = "flex";

    renderRulesTable(aclId);
}

function renderRulesTable(aclId) {
    const tbody = document.getElementById("rules-tbody");
    tbody.innerHTML = "";

    const rules = aclState.rules.filter(r => r.acl_id === aclId);

    if (rules.length === 0) {
        tbody.innerHTML =
            `<tr><td colspan="7" class="text-center text-muted">No hay reglas</td></tr>`;
        return;
    }

    rules.forEach(rule => {
        const range = rule.port_range === "N/A" || !rule.port_range
            ? "-"
            : `${rule.port_range.From}-${rule.port_range.To}`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${rule.rule_number}</td>
            <td>${rule.type}</td>
            <td>${rule.action}</td>
            <td>${rule.protocol}</td>
            <td>${rule.cidr_block || rule.ipv6_cidr}</td>
            <td>${range}</td>
            <td>
                <button class="aws-btn aws-btn-danger aws-btn-sm"
                    onclick="deleteRule('${rule.acl_id}', ${rule.rule_number}, '${rule.type === "Egress"}')">
                    Eliminar
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function deleteRule(aclId, ruleNumber, egressStr) {
    const egress = egressStr === "true";

    if (!confirm("¿Eliminar esta regla?")) return;

    try {
        setLoading(true);

        await apiRequest(ENDPOINTS.DELETE_RULE, "POST", {
            acl_id: aclId,
            rule_number: ruleNumber,
            egress
        });

        aclState.rules = aclState.rules.filter(r => !(r.acl_id === aclId && r.rule_number == ruleNumber));

        renderRulesTable(aclId);
        renderACLTable();
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
}

// =========================================================
// CREAR / UPDATE REGLA
// =========================================================
function setupRuleForm() {
    const modal = document.getElementById("rules-modal");

    document.getElementById("close-rules-modal-btn").onclick =
    document.getElementById("cancel-rule").onclick = () =>
        (modal.style.display = "none");

    document.getElementById("rule-form").onsubmit = async e => {
        e.preventDefault();

        const aclId = aclState.selectedACL;
        const ruleNumber = parseInt(document.getElementById("rule-number").value);
        const type = document.getElementById("rule-type").value;
        const action = document.getElementById("rule-action").value;
        const protocol = document.getElementById("rule-protocol").value;
        const cidr = document.getElementById("rule-cidr").value;
        const portFrom = document.getElementById("rule-port-from").value;
        const portTo = document.getElementById("rule-port-to").value;

        if (!validateRuleNumber(ruleNumber)) return;
        if (!validateCIDR(cidr)) return;
        if (!validatePorts(portFrom, portTo, protocol)) return;

        const payload = {
            acl_id: aclId,
            rule_number: ruleNumber,
            protocol: protocol === "all" ? "-1" : protocol,
            action: action,
            egress: type === "egress",
            cidr_block: cidr
        };

        if ((protocol === "tcp" || protocol === "udp") && portFrom && portTo) {
            payload.port_from = portFrom;
            payload.port_to = portTo;
        }

        try {
            setLoading(true);

            await apiRequest(ENDPOINTS.CREATE_RULE, "POST", payload);

            // Recargar reglas evitando pisar datos inconsistentes
            await loadData();

            openRulesModal(aclId);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
}

// =========================================================
// SEARCH
// =========================================================
function setupSearch() {
    document.getElementById("acl-search").addEventListener("input", e => {
        aclState.search = e.target.value;
        renderACLTable();
    });
}

// =========================================================
// INIT
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
    setupCreateACLModal();
    setupRuleForm();
    setupSearch();
    loadData();
});
