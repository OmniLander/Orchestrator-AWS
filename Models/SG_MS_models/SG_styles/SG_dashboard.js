// ========================================================
// AWS SG – Security Groups Console
// JS NO MODULAR – TODA LA LÓGICA EN UN SOLO ARCHIVO
// ========================================================

let sgMap = {};          // GroupId -> datos de SG
let sgrMap = {};         // GroupId -> [ reglas ]
let selectedGroupId = null;

// ========================================================
// UTILIDADES GENERALES
// ========================================================

function $(id) {
    return document.getElementById(id);
}

function setText(el, text) {
    if (!el) return;
    el.textContent = text || "";
}

// Mostrar / ocultar overlay global de errores
function showErrorOverlay(message, details) {
    const overlay = $("error-overlay");
    const msgEl = $("error-overlay-message");
    const detailsEl = $("error-overlay-details");

    if (!overlay || !msgEl || !detailsEl) return;

    setText(msgEl, message || "Se ha producido un error inesperado.");
    setText(detailsEl, details || "");
    overlay.classList.remove("hidden");
}

function hideErrorOverlay() {
    const overlay = $("error-overlay");
    if (!overlay) return;
    overlay.classList.add("hidden");
}

// Limpia errores de un formulario
function clearFieldError(fieldId) {
    const errorEl = document.querySelector(`.field-error[data-for="${fieldId}"]`);
    if (errorEl) {
        errorEl.textContent = "";
    }
}

// Muestra error de validación en un campo
function setFieldError(fieldId, message) {
    const errorEl = document.querySelector(`.field-error[data-for="${fieldId}"]`);
    if (errorEl) {
        errorEl.textContent = message || "";
    }
}

// Validación simple de CIDR IPv4 (no ultra estricta, pero razonable)
function isValidIPv4Cidr(cidr) {
    if (!cidr) return false;
    const parts = cidr.split("/");
    if (parts.length !== 2) return false;
    const ip = parts[0];
    const prefix = Number(parts[1]);
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;

    const octets = ip.split(".");
    if (octets.length !== 4) return false;
    for (const o of octets) {
        const n = Number(o);
        if (!Number.isInteger(n) || n < 0 || n > 255) return false;
    }
    return true;
}

// Wrapper de fetch que siempre intenta parsear JSON y manejar errores HTTP
async function fetchJSON(url, options = {}) {
    try {
        const resp = await fetch(url, {
            headers: {
                "Content-Type": "application/json"
            },
            ...options
        });

        const text = await resp.text();
        let data = null;
        try {
            data = text ? JSON.parse(text) : {};
        } catch (e) {
            showErrorOverlay(
                "No se pudo interpretar la respuesta del backend como JSON.",
                `URL: ${url}\nStatus: ${resp.status}\nRaw body:\n${text}`
            );
            throw e;
        }

        if (!resp.ok) {
            const msg = (data && (data.error || data.message)) ||
                `El backend devolvió HTTP ${resp.status}`;
            showErrorOverlay(
                "Error reportado por el backend",
                `URL: ${url}\nStatus: ${resp.status}\nMensaje: ${msg}\nCuerpo:\n${text}`
            );
            throw new Error(msg);
        }

        return data;
    } catch (err) {
        // Errores de red o problemas genéricos
        showErrorOverlay(
            "Error de red o de comunicación con el backend.",
            `URL: ${url}\nDetalle técnico: ${err && err.stack ? err.stack : String(err)}`
        );
        throw err;
    }
}

// Interpreta el contrato { success, data / error } de tu backend.
// Además maneja el caso donde data contiene un {success: false, error: ...}
// proveniente de boto3. :contentReference[oaicite:5]{index=5} :contentReference[oaicite:6]{index=6}
function unwrapBackendResponse(raw, url) {
    if (!raw) {
        throw new Error("Respuesta vacía del backend.");
    }

    // Caso error directo: { error: "..."} sin success
    if (raw.success === undefined && raw.error) {
        throw new Error(raw.error || "Error desconocido desde el backend.");
    }

    // Caso explícito success false
    if (raw.success === false) {
        throw new Error(raw.error || "Operación rechazada por el backend.");
    }

    // Caso success true con data
    let payload = raw.data !== undefined ? raw.data : raw;

    // Algunos helpers de boto3 devuelven {success: False, error: ...}
    if (payload && typeof payload === "object" && payload.success === false) {
        const msg = payload.error || "Error reportado por la API de AWS.";
        throw new Error(msg);
    }

    return payload;
}

// ========================================================
// RENDER DE TABLAS
// ========================================================

function renderSecurityGroupsTable() {
    const tbody = $("sg-table-body");
    if (!tbody) return;

    tbody.innerHTML = "";

    const values = Object.entries(sgMap);
    if (values.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 4;
        td.className = "aws-table-empty";
        td.textContent = "No se encontraron Security Groups.";
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    for (const [sgId, sg] of values) {
        const tr = document.createElement("tr");
        tr.dataset.sgId = sgId;

        const tdId = document.createElement("td");
        tdId.textContent = sgId;

        const tdName = document.createElement("td");
        tdName.textContent = sg.Group_Name || sg.GroupName || "-";

        const tdVpc = document.createElement("td");
        tdVpc.textContent = sg.VPC_it_belongs || sg.VpcId || "-";

        const tdDesc = document.createElement("td");
        tdDesc.textContent = sg.Group_description || sg.Description || "-";

        tr.appendChild(tdId);
        tr.appendChild(tdName);
        tr.appendChild(tdVpc);
        tr.appendChild(tdDesc);

        tr.addEventListener("click", () => {
            onSelectSecurityGroup(sgId);
        });

        tbody.appendChild(tr);
    }

    // Resaltar seleccionado (si aplica)
    highlightSelectedRow();
}

function highlightSelectedRow() {
    const tbody = $("sg-table-body");
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll("tr"));
    rows.forEach((row) => {
        if (row.dataset.sgId === selectedGroupId) {
            row.classList.add("selected");
        } else {
            row.classList.remove("selected");
        }
    });
}

function renderSelectedSGSummary() {
    const summary = $("sg-summary");
    const deleteBtn = $("delete-sg-btn");
    const ruleGroupInput = $("rule-group-id");

    if (!summary || !deleteBtn) return;

    if (!selectedGroupId || !sgMap[selectedGroupId]) {
        summary.innerHTML =
            '<p class="aws-muted">Selecciona un Security Group en la tabla para ver detalles.</p>';
        deleteBtn.disabled = true;
        return;
    }

    const sg = sgMap[selectedGroupId];
    deleteBtn.disabled = false;

    if (ruleGroupInput) {
        ruleGroupInput.value = selectedGroupId;
    }

    const name = sg.Group_Name || sg.GroupName || "-";
    const vpc = sg.VPC_it_belongs || sg.VpcId || "-";
    const desc = sg.Group_description || sg.Description || "-";

    summary.innerHTML = `
        <p><strong>Group ID:</strong> ${selectedGroupId}</p>
        <p><strong>Nombre:</strong> ${name}</p>
        <p><strong>VPC:</strong> ${vpc}</p>
        <p><strong>Descripción:</strong> ${desc}</p>
    `;
}

function renderRulesTable() {
    const tbody = $("rules-table-body");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!selectedGroupId) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 6;
        td.className = "aws-table-empty";
        td.textContent = "No hay Security Group seleccionado.";
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    const allRules = sgrMap[selectedGroupId] || [];
    const directionFilter = $("rules-direction-filter")
        ? $("rules-direction-filter").value
        : "ingress";

    const filteredByDirection = allRules.filter(
        (r) =>
            (directionFilter === "ingress" && r.direction === "Ingress") ||
            (directionFilter === "egress" && r.direction === "Egress")
    );

    if (filteredByDirection.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 6;
        td.className = "aws-table-empty";
        td.textContent = "No se encontraron reglas para este filtro.";
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    for (const rule of filteredByDirection) {
        const tr = document.createElement("tr");
        tr.dataset.ruleId = rule.rule_id;
        tr.dataset.direction = rule.direction;

        const tdId = document.createElement("td");
        tdId.textContent = rule.rule_id;

        const tdDir = document.createElement("td");
        tdDir.textContent = rule.direction;

        const tdProto = document.createElement("td");
        tdProto.textContent = rule.protocol;

        const fromPort =
            rule.from_port === null || rule.from_port === undefined
                ? "-"
                : rule.from_port;
        const toPort =
            rule.to_port === null || rule.to_port === undefined
                ? "-"
                : rule.to_port;
        const tdPorts = document.createElement("td");
        tdPorts.textContent = `${fromPort} - ${toPort}`;

        const cidr = rule.cidr || "-";
        const refGroup = rule.referenced_group || "-";
        const tdCidr = document.createElement("td");
        tdCidr.textContent =
            cidr !== "N/A" ? cidr : refGroup !== "N/A" ? refGroup : "-";

        const tdActions = document.createElement("td");
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "aws-btn-danger";
        delBtn.textContent = "Eliminar";
        delBtn.addEventListener("click", () => {
            onDeleteRule(rule);
        });
        tdActions.appendChild(delBtn);

        tr.appendChild(tdId);
        tr.appendChild(tdDir);
        tr.appendChild(tdProto);
        tr.appendChild(tdPorts);
        tr.appendChild(tdCidr);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
    }

    applyRulesTableFilter();
}

// Búsqueda instantánea sobre SG
function applySGTableFilter() {
    const filterInput = $("sg-search");
    const tbody = $("sg-table-body");
    if (!filterInput || !tbody) return;

    const filter = filterInput.value.toLowerCase();
    const rows = Array.from(tbody.querySelectorAll("tr"));

    rows.forEach((row) => {
        // fila vacía de "no data"
        if (!row.dataset.sgId) {
            row.style.display = filter ? "none" : "";
            return;
        }

        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(filter) ? "" : "none";
    });
}

// Búsqueda instantánea sobre reglas (sobre la tabla ya filtrada por dirección)
function applyRulesTableFilter() {
    const input = $("rules-search");
    const tbody = $("rules-table-body");
    if (!input || !tbody) return;

    const filter = input.value.toLowerCase();
    const rows = Array.from(tbody.querySelectorAll("tr"));

    rows.forEach((row) => {
        if (!row.dataset.ruleId) {
            row.style.display = filter ? "none" : "";
            return;
        }
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(filter) ? "" : "none";
    });
}

// ========================================================
// EVENTOS DE SELECCIÓN Y ACCIONES
// ========================================================

function onSelectSecurityGroup(sgId) {
    selectedGroupId = sgId;
    highlightSelectedRow();
    renderSelectedSGSummary();
    renderRulesTable();
}

// Eliminar SG seleccionado
async function onDeleteSelectedSG() {
    if (!selectedGroupId) return;

    const confirmMsg =
        "¿Seguro que deseas eliminar este Security Group?\n" +
        "Asegúrate de que no esté asociado a recursos activos.";
    if (!window.confirm(confirmMsg)) {
        return;
    }

    try {
        const raw = await fetchJSON("/Delete_sg", {
            method: "POST",
            body: JSON.stringify({ group_id: selectedGroupId })
        });
        unwrapBackendResponse(raw, "/Delete_sg");

        // eliminar del mapa local
        delete sgMap[selectedGroupId];
        delete sgrMap[selectedGroupId];
        selectedGroupId = null;

        renderSecurityGroupsTable();
        renderSelectedSGSummary();
        renderRulesTable();
    } catch (err) {
        // el overlay ya se mostró en fetchJSON/unwrapBackendResponse
        console.error("Error eliminando SG:", err);
    }
}

// Eliminar regla específica
async function onDeleteRule(rule) {
    if (!selectedGroupId || !rule || !rule.rule_id) return;

    const isIngress = rule.direction === "Ingress";
    const url = isIngress ? "/Revoke_ingress_rule" : "/Revoke_egress_rule";

    const confirmMsg =
        `¿Eliminar la regla ${rule.rule_id} (${rule.direction}) del SG ${selectedGroupId}?`;
    if (!window.confirm(confirmMsg)) {
        return;
    }

    try {
        const raw = await fetchJSON(url, {
            method: "POST",
            body: JSON.stringify({
                group_id: selectedGroupId,
                rule_id: [rule.rule_id]
            })
        });
        unwrapBackendResponse(raw, url);

        // Re-cargar reglas desde backend para mantener consistencia
        await loadSecurityGroupRules();
        renderRulesTable();
    } catch (err) {
        console.error("Error eliminando regla:", err);
    }
}

// ========================================================
// CARGA DE DATOS DESDE BACKEND
// ========================================================

// Carga SGs existentes
async function loadSecurityGroups() {
    const tbody = $("sg-table-body");
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="aws-table-empty">
                    Cargando Security Groups…
                </td>
            </tr>`;
    }

    try {
        const raw = await fetchJSON("/SG_in_existance");
        const payload = unwrapBackendResponse(raw, "/SG_in_existance");

        // payload debe ser un diccionario { sg_id: { ... } }
        sgMap = payload && typeof payload === "object" ? payload : {};

        renderSecurityGroupsTable();
    } catch (err) {
        console.error("Error cargando SGs:", err);
    }
}

// Carga reglas (SecurityGroupRules)
async function loadSecurityGroupRules() {
    try {
        const raw = await fetchJSON("/SGR_in_existance");
        const payload = unwrapBackendResponse(raw, "/SGR_in_existance");

        // payload es { sg_id: [ {rule_id, direction, protocol, ...}, ...] }
        sgrMap = payload && typeof payload === "object" ? payload : {};
    } catch (err) {
        console.error("Error cargando reglas:", err);
    }
}

// Carga inicial conjunta
async function loadInitialData() {
    await Promise.all([loadSecurityGroups(), loadSecurityGroupRules()]);
    renderSelectedSGSummary();
    renderRulesTable();
}

// ========================================================
// FORM: CREACIÓN DE SECURITY GROUP
// ========================================================

function validateCreateSGForm() {
    let valid = true;

    const vpcId = $("sg-vpc-id");
    const name = $("sg-name");
    const desc = $("sg-description");

    if (!vpcId.value.trim()) {
        setFieldError("sg-vpc-id", "El VPC ID es obligatorio.");
        valid = false;
    } else {
        clearFieldError("sg-vpc-id");
    }

    if (!name.value.trim()) {
        setFieldError("sg-name", "El nombre es obligatorio.");
        valid = false;
    } else {
        clearFieldError("sg-name");
    }

    if (!desc.value.trim()) {
        setFieldError("sg-description", "La descripción es obligatoria.");
        valid = false;
    } else {
        clearFieldError("sg-description");
    }

    return valid;
}

async function onSubmitCreateSGForm(event) {
    event.preventDefault();

    const feedback = $("create-sg-feedback");
    if (feedback) {
        feedback.textContent = "";
        feedback.style.color = "";
    }

    if (!validateCreateSGForm()) {
        if (feedback) {
            feedback.textContent = "Revisa los campos obligatorios.";
            feedback.style.color = "#d13212";
        }
        return;
    }

    const vpcId = $("sg-vpc-id").value.trim();
    const name = $("sg-name").value.trim();
    const desc = $("sg-description").value.trim();

    try {
        const raw = await fetchJSON("/Create_SG", {
            method: "POST",
            body: JSON.stringify({
                vpc_id: vpcId,
                groupName: name,
                description: desc
            })
        });
        const payload = unwrapBackendResponse(raw, "/Create_SG");

        // La función create_sg retorna un GroupId en éxito. :contentReference[oaicite:7]{index=7}
        if (typeof payload === "string") {
            // refrescar SGs
            await loadSecurityGroups();
            // marcar el nuevo SG como seleccionado
            selectedGroupId = payload;
            highlightSelectedRow();
            renderSelectedSGSummary();
            renderRulesTable();
        }

        if (feedback) {
            feedback.textContent = "Security Group creado correctamente.";
            feedback.style.color = "#0073bb";
        }

        // limpiar formulario
        $("sg-vpc-id").value = "";
        $("sg-name").value = "";
        $("sg-description").value = "";
    } catch (err) {
        console.error("Error creando SG:", err);
        if (feedback) {
            feedback.textContent =
                "No se pudo crear el Security Group. Revisa el overlay de error.";
            feedback.style.color = "#d13212";
        }
    }
}

// ========================================================
// FORM: CREACIÓN DE REGLAS
// ========================================================

function adjustPortsForProtocol() {
    const protoSelect = $("rule-protocol");
    const fromPortInput = $("rule-from-port");
    const toPortInput = $("rule-to-port");

    if (!protoSelect || !fromPortInput || !toPortInput) return;

    const proto = protoSelect.value;

    if (proto === "icmp" || proto === "all") {
        // Deshabilitamos puertos para icmp y all
        fromPortInput.value = "";
        toPortInput.value = "";
        fromPortInput.disabled = true;
        toPortInput.disabled = true;
        clearFieldError("rule-from-port");
        clearFieldError("rule-to-port");
    } else {
        fromPortInput.disabled = false;
        toPortInput.disabled = false;
    }
}

function validateCreateRuleForm() {
    let valid = true;

    const groupId = $("rule-group-id").value.trim();
    const proto = $("rule-protocol").value;
    const fromPortInput = $("rule-from-port");
    const toPortInput = $("rule-to-port");
    const cidr = $("rule-cidr").value.trim();

    if (!groupId) {
        setFieldError("rule-group-id", "El Security Group ID es obligatorio.");
        valid = false;
    } else {
        clearFieldError("rule-group-id");
    }

    if (!cidr) {
        setFieldError("rule-cidr", "El CIDR es obligatorio.");
        valid = false;
    } else if (!isValidIPv4Cidr(cidr)) {
        setFieldError("rule-cidr", "El CIDR no tiene un formato IPv4 válido.");
        valid = false;
    } else {
        clearFieldError("rule-cidr");
    }

    if (proto === "tcp" || proto === "udp") {
        const fromPort = Number(fromPortInput.value);
        const toPort = Number(toPortInput.value);

        if (!Number.isInteger(fromPort)) {
            setFieldError(
                "rule-from-port",
                "From port debe ser un número entero entre 0 y 65535."
            );
            valid = false;
        } else if (fromPort < 0 || fromPort > 65535) {
            setFieldError(
                "rule-from-port",
                "From port fuera de rango (0–65535)."
            );
            valid = false;
        } else {
            clearFieldError("rule-from-port");
        }

        if (!Number.isInteger(toPort)) {
            setFieldError(
                "rule-to-port",
                "To port debe ser un número entero entre 0 y 65535."
            );
            valid = false;
        } else if (toPort < 0 || toPort > 65535) {
            setFieldError("rule-to-port", "To port fuera de rango (0–65535).");
            valid = false;
        } else if (valid && toPort < fromPort) {
            setFieldError(
                "rule-to-port",
                "To port no puede ser menor que From port."
            );
            valid = false;
        } else if (valid) {
            clearFieldError("rule-to-port");
        }
    } else {
        // icmp / all: no validamos puertos
        clearFieldError("rule-from-port");
        clearFieldError("rule-to-port");
    }

    return valid;
}

async function onSubmitCreateRuleForm(event) {
    event.preventDefault();

    const feedback = $("create-rule-feedback");
    if (feedback) {
        feedback.textContent = "";
        feedback.style.color = "";
    }

    if (!validateCreateRuleForm()) {
        if (feedback) {
            feedback.textContent = "Revisa los campos marcados en rojo.";
            feedback.style.color = "#d13212";
        }
        return;
    }

    const groupId = $("rule-group-id").value.trim();
    const direction = $("rule-direction").value;
    const proto = $("rule-protocol").value;
    const cidr = $("rule-cidr").value.trim();
    const desc = $("rule-description").value.trim();

    const fromPortInput = $("rule-from-port");
    const toPortInput = $("rule-to-port");

    // Mapa de protocolos al formato de AWS
    const protocolMap = {
        tcp: "tcp",
        udp: "udp",
        icmp: "icmp",
        all: "-1" // all
    };
    const awsProto = protocolMap[proto];

    const permissions = {
        IpProtocol: awsProto,
        IpRanges: [
            {
                CidrIp: cidr,
                Description: desc || "Regla creada desde panel SG"
            }
        ]
    };

    if (proto === "tcp" || proto === "udp") {
        permissions.FromPort = Number(fromPortInput.value);
        permissions.ToPort = Number(toPortInput.value);
    } else if (proto === "icmp") {
        // ICMP: usamos -1,-1 para indicar "cualquier tipo/código"
        permissions.FromPort = -1;
        permissions.ToPort = -1;
    } // para all/-1 no mandamos puertos

    const url =
        direction === "ingress" ? "/Create_ingress_rule" : "/Create_egress_rule";

    try {
        const raw = await fetchJSON(url, {
            method: "POST",
            body: JSON.stringify({
                group_id: groupId,
                permissions: permissions
            })
        });
        unwrapBackendResponse(raw, url);

        if (feedback) {
            feedback.textContent = "Regla creada correctamente.";
            feedback.style.color = "#0073bb";
        }

        // Si acabamos de crear una regla para el SG seleccionado, recargamos reglas
        if (selectedGroupId === groupId) {
            await loadSecurityGroupRules();
            renderRulesTable();
        }

        // Limpiar solo los campos de regla, no el SG ID
        fromPortInput.value = "";
        toPortInput.value = "";
        $("rule-cidr").value = "";
        $("rule-description").value = "";
    } catch (err) {
        console.error("Error creando regla:", err);
        if (feedback) {
            feedback.textContent =
                "No se pudo crear la regla. Revisa el overlay de error.";
            feedback.style.color = "#d13212";
        }
    }
}

// ========================================================
// INICIALIZACIÓN
// ========================================================

document.addEventListener("DOMContentLoaded", () => {
    // Overlay
    const closeOverlay = $("error-overlay-close");
    if (closeOverlay) {
        closeOverlay.addEventListener("click", hideErrorOverlay);
    }

    // Búsqueda en tablas
    const sgSearch = $("sg-search");
    if (sgSearch) {
        sgSearch.addEventListener("input", applySGTableFilter);
    }

    const rulesSearch = $("rules-search");
    if (rulesSearch) {
        rulesSearch.addEventListener("input", applyRulesTableFilter);
    }

    const dirFilter = $("rules-direction-filter");
    if (dirFilter) {
        dirFilter.addEventListener("change", () => {
            renderRulesTable();
        });
    }

    // Botones
    const refreshBtn = $("refresh-sg-btn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadInitialData);
    }

    const deleteSgBtn = $("delete-sg-btn");
    if (deleteSgBtn) {
        deleteSgBtn.addEventListener("click", onDeleteSelectedSG);
    }

    const focusCreateBtn = $("focus-create-sg-btn");
    if (focusCreateBtn) {
        focusCreateBtn.addEventListener("click", () => {
            const section = $("create-sg-section");
            if (section) {
                section.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        });
    }

    // Formularios
    const createSgForm = $("create-sg-form");
    if (createSgForm) {
        createSgForm.addEventListener("submit", onSubmitCreateSGForm);
    }

    const createRuleForm = $("create-rule-form");
    if (createRuleForm) {
        createRuleForm.addEventListener("submit", onSubmitCreateRuleForm);
    }

    const protoSelect = $("rule-protocol");
    if (protoSelect) {
        protoSelect.addEventListener("change", adjustPortsForProtocol);
        adjustPortsForProtocol();
    }

    // Carga inicial
    loadInitialData();
});
