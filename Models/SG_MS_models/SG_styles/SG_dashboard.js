// ========================================================
// SECURITY GROUP DASHBOARD – FUNCIONES DE MANEJO SGs AWS
// ========================================================

// Función genérica para peticiones JSON
async function fetchJSON(url, method = "GET", body = null) {
    const options = { method, headers: { "Content-Type": "application/json" } };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    return await res.json();
}

// ========================================================
// 1. Obtener Security Groups Existentes
// ========================================================
async function fetchExistingSGs() {
    const out = document.getElementById("existing-sgs-output");
    out.textContent = "Loading...";
    try {
        const data = await fetchJSON("/SG_controller_bp/SG_in_existance");
        out.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
        out.textContent = "Error: " + err.message;
    }
}

// ========================================================
// 2. Obtener Reglas Existentes
// ========================================================
async function fetchExistingSGRs() {
    const out = document.getElementById("existing-sgrs-output");
    out.textContent = "Loading...";
    try {
        const data = await fetchJSON("/SG_controller_bp/SGR_in_existance");
        out.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
        out.textContent = "Error: " + err.message;
    }
}

// ========================================================
// 3. Crear Security Group
// ========================================================
async function createSG() {
    const form = document.getElementById("create-sg-form");
    const out = document.getElementById("create-sg-output");

    const data = {
        vpc_id: form.vpc_id.value,
        groupName: form.groupName.value,
        description: form.description.value
    };

    out.textContent = "Processing...";

    try {
        const result = await fetchJSON("/SG_controller_bp/Create_SG", "POST", data);
        out.textContent = JSON.stringify(result, null, 2);
    } catch (err) {
        out.textContent = "Error: " + err.message;
    }
}

// ========================================================
// 4. Crear Ingress Rule
// ========================================================
async function createIngressRule() {
    const form = document.getElementById("create-ingress-form");
    const out = document.getElementById("create-ingress-output");

    let permissions;
    try {
        permissions = JSON.parse(form.permissions.value);
    } catch {
        alert("Invalid JSON in permissions");
        return;
    }

    const data = {
        group_id: form.group_id.value,
        permissions
    };

    out.textContent = "Processing...";

    try {
        const result = await fetchJSON("/SG_controller_bp/Create_ingress_rule", "POST", data);
        out.textContent = JSON.stringify(result, null, 2);
    } catch (err) {
        out.textContent = "Error: " + err.message;
    }
}

// ========================================================
// 5. Crear Egress Rule
// ========================================================
async function createEgressRule() {
    const form = document.getElementById("create-egress-form");
    const out = document.getElementById("create-egress-output");

    let permissions;
    try {
        permissions = JSON.parse(form.permissions.value);
    } catch {
        alert("Invalid JSON in permissions");
        return;
    }

    const data = {
        group_id: form.group_id.value,
        permissions
    };

    out.textContent = "Processing...";

    try {
        const result = await fetchJSON("/SG_controller_bp/Create_egress_rule", "POST", data);
        out.textContent = JSON.stringify(result, null, 2);
    } catch (err) {
        out.textContent = "Error: " + err.message;
    }
}

// ========================================================
// 6. Revocar regla Ingress
// ========================================================
async function revokeIngressRule() {
    const form = document.getElementById("revoke-ingress-form");
    const out = document.getElementById("revoke-ingress-output");

    const data = {
        group_id: form.group_id.value,
        rule_id: form.rule_id.value.split(",").map(r => r.trim())
    };

    out.textContent = "Processing...";

    try {
        const result = await fetchJSON("/SG_controller_bp/Revoke_ingress_rule", "POST", data);
        out.textContent = JSON.stringify(result, null, 2);
    } catch (err) {
        out.textContent = "Error: " + err.message;
    }
}

// ========================================================
// 7. Revocar regla Egress
// ========================================================
async function revokeEgressRule() {
    const form = document.getElementById("revoke-egress-form");
    const out = document.getElementById("revoke-egress-output");

    const data = {
        group_id: form.group_id.value,
        rule_id: form.rule_id.value.split(",").map(r => r.trim())
    };

    out.textContent = "Processing...";

    try {
        const result = await fetchJSON("/SG_controller_bp/Revoke_egress_rule", "POST", data);
        out.textContent = JSON.stringify(result, null, 2);
    } catch (err) {
        out.textContent = "Error: " + err.message;
    }
}

// ========================================================
// 8. Eliminar SG
// ========================================================
async function deleteSG() {
    const form = document.getElementById("delete-sg-form");
    const out = document.getElementById("delete-sg-output");

    const data = { group_id: form.group_id.value };

    out.textContent = "Processing...";

    try {
        const result = await fetchJSON("/SG_controller_bp/Delete_sg", "POST", data);
        out.textContent = JSON.stringify(result, null, 2);
    } catch (err) {
        out.textContent = "Error: " + err.message;
    }
}
