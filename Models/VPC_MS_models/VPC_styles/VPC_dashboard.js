// ======================================================================
//  SISTEMA GLOBAL DE ERRORES (MEJORADO)
// ======================================================================

function showError(msg) {
    const box = document.getElementById("globalErrorBox");
    
    // Si el mensaje es un objeto (a veces pasa con excepciones JS), lo convertimos a string
    const textMsg = (typeof msg === 'object') ? JSON.stringify(msg) : String(msg);

    // Creamos un HTML interno con el mensaje y un botón de cerrar
    box.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <span style="white-space: pre-wrap; word-break: break-word;">${textMsg}</span>
            <button onclick="document.getElementById('globalErrorBox').style.display='none'" 
                    style="margin-left: 15px; background: transparent; border: 1px solid white; color: white; cursor: pointer; padding: 2px 8px;">
                X
            </button>
        </div>
    `;
    
    box.style.display = "block";

    // ELIMINAMOS EL SETTIMEOUT para que el error no desaparezca solo.
    // Así te da tiempo de leer "NetworkAclEntryAlreadyExists..."
}

// Wrapper uniforme para fetch()
function safeFetch(url, options = {}) {
    return fetch(url, options)
        .then(async res => {
            let data;
            try {
                data = await res.json();
            } catch (e) {
                showError("Respuesta inválida del servidor.");
                throw new Error("Invalid JSON");
            }

            if (!res.ok || data?.success === false) {
                showError(data.error || "Error en servidor");
                throw new Error(data.error || "Backend error");
            }
            return data;
        })
        .catch(err => {
            console.error("ERROR:", err);
            showError(err.message);
            throw err;
        });
}



// ======================================================================
//  VALIDACIONES
// ======================================================================

function isValidIPv4(ip) {
    if (!ip || typeof ip !== "string") return false;

    const octets = ip.split(".");
    if (octets.length !== 4) return false;

    for (const oct of octets) {
        if (!/^\d+$/.test(oct)) return false;
        const num = Number(oct);
        if (num < 0 || num > 255) return false;
        if (oct.length > 1 && oct[0] === "0") return false;
    }
    return true;
}

function isValidCIDR(cidr) {
    if (!cidr.includes("/")) return false;
    const [ip, prefix] = cidr.split("/");
    if (!isValidIPv4(ip)) return false;
    if (!/^\d+$/.test(prefix)) return false;
    const p = Number(prefix);
    return p >= 0 && p <= 32;
}

function sanitizeCIDRInput(str) {
    return str.replace(/[^0-9./]/g, "");
}

function isValidPort(p) {
    return /^\d+$/.test(p) && Number(p) >= 0 && Number(p) <= 65535;
}

function isValidRuleNumber(n) {
    return /^\d+$/.test(n) && Number(n) > 0 && Number(n) < 32767;
}

function attachCIDRSanitizer(id) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener("input", function () {
            this.value = sanitizeCIDRInput(this.value);
        });
    }
}

attachCIDRSanitizer("vpcCIDR");
attachCIDRSanitizer("subnetCIDR");
attachCIDRSanitizer("aclRuleCIDR");



// ======================================================================
//  AUTO LOAD
// ======================================================================

window.addEventListener("DOMContentLoaded", () => {
    reloadAll();
    enableTableSearch("searchVPC", "tblVPCs");
    enableTableSearch("searchSubnet", "tblSubnets");
    enableTableSearch("searchACL", "tblACLs");
    enableTableSearch("searchRule", "tblACLRules");
});

document.getElementById("btnReload").addEventListener("click", reloadAll);

function reloadAll() {
    loadVPCs();
    loadSubnets();
    loadACLs();
    loadACLRules();
    loadVPCSelectors();
    loadACLSelector();
}



// ======================================================================
//  SELECTS PARA SUBNET / ACL / REGLAS
// ======================================================================

function loadVPCSelectors() {
    safeFetch("/VPC_in_existance")
        .then(data => {
            const list = Object.entries(data.data).map(([id, v]) => ({
                id,
                name: v.name || "-"
            }));

            const s1 = document.getElementById("subnetVPCSelect");
            const s2 = document.getElementById("aclVPCSelect");

            s1.innerHTML = `<option value="">Selecciona una VPC</option>`;
            s2.innerHTML = `<option value="">Selecciona una VPC</option>`;

            for (const v of list) {
                const opt1 = document.createElement("option");
                opt1.value = v.id;
                opt1.textContent = `${v.name} (${v.id})`;
                s1.appendChild(opt1);

                const opt2 = document.createElement("option");
                opt2.value = v.id;
                opt2.textContent = `${v.name} (${v.id})`;
                s2.appendChild(opt2);
            }
        });
}

function loadACLSelector() {
    safeFetch("/ACL_in_existance")
        .then(data => {
            const sel = document.getElementById("aclRuleSelect");
            sel.innerHTML = `<option value="">Selecciona ACL</option>`;

            const aclPerVpc = data.data.acl_per_vpc || {};

            for (const [vpcId, aclDict] of Object.entries(aclPerVpc)) {
                const aclList = Object.values(aclDict);
                for (const a of aclList) {
                    const opt = document.createElement("option");
                    opt.value = a.acl_id;
                    opt.textContent = `${a.name} (${a.acl_id}) - VPC ${vpcId}`;
                    sel.appendChild(opt);
                }
            }
        });
}



// ======================================================================
//  VPCs
// ======================================================================

function loadVPCs() {
    safeFetch("/VPC_in_existance")
        .then(data => {
            const tbl = document.getElementById("tblVPCs");
            tbl.innerHTML = "";

            const list = Object.entries(data.data).map(([id, v]) => ({
                VpcId: id,
                Name: v.name || "-",
                CidrBlock: v.cidr_block || "-",
                State: v.state || "-"
            }));

            for (const vpc of list) {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${vpc.VpcId}</td>
                    <td>${vpc.Name}</td>
                    <td>${vpc.CidrBlock}</td>
                    <td>${vpc.State}</td>
                    <td><button onclick="deleteVPC('${vpc.VpcId}')">Eliminar</button></td>
                `;
                tbl.appendChild(tr);
            }
        });
}

document.getElementById("btnCreateVPC").addEventListener("click", () => {
    const name = document.getElementById("vpcName").value.trim();
    const cidr = document.getElementById("vpcCIDR").value.trim();

    if (!name) return showError("El nombre no puede estar vacío.");
    if (!isValidCIDR(cidr)) return showError("CIDR inválido.");

    safeFetch("/Create_VPC", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vpc_name: name, block: cidr })
    }).then(() => {
        loadVPCs();
        loadVPCSelectors();
    });
});

function deleteVPC(id) {
    if (!confirm("¿Eliminar VPC?")) return;

    safeFetch("/Delete_VPC", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vpc_id: id })
    }).then(() => {
        loadVPCs();
        loadVPCSelectors();
    });
}



// ======================================================================
//  SUBNETS
// ======================================================================

function loadSubnets() {
    safeFetch("/Subnets_in_existance")
        .then(data => {
            const tbl = document.getElementById("tblSubnets");
            tbl.innerHTML = "";

            const vpcs = Object.entries(data.data);

            for (const [vpcId, subs] of vpcs) {
                for (const s of subs) {
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td>${vpcId}</td>
                        <td>${s.name || "-"}</td>
                        <td>${s.subnet_id}</td>
                        <td>${s.zone}</td>
                        <td>${s.state}</td>
                        <td>${s.block}</td>
                        <td><button onclick="deleteSubnet('${s.subnet_id}')">Eliminar</button></td>
                    `;
                    tbl.appendChild(tr);
                }
            }
        });
}

document.getElementById("btnCreateSubnet").addEventListener("click", () => {
    const vpc = document.getElementById("subnetVPCSelect").value;
    const name = document.getElementById("subnetName").value.trim();
    const cidr = document.getElementById("subnetCIDR").value.trim();

    if (!vpc) return showError("Selecciona una VPC.");
    if (!name) return showError("Nombre vacío.");
    if (!isValidCIDR(cidr)) return showError("CIDR inválido.");

    safeFetch("/Create_subnet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vpc_id: vpc, subnet_name: name, cidr_block: cidr })
    }).then(() => loadSubnets());
});

function deleteSubnet(id) {
    if (!confirm("¿Eliminar Subnet?")) return;

    safeFetch("/Delete_subnet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subnet_id: id })
    }).then(() => loadSubnets());
}



// ======================================================================
//  ACLs
// ======================================================================

function loadACLs() {
    safeFetch("/ACL_in_existance")
        .then(data => {
            const tbl = document.getElementById("tblACLs");
            tbl.innerHTML = "";

            const aclPerVpc = data.data.acl_per_vpc || {};
            const list = [];

            for (const [vpcId, aclDict] of Object.entries(aclPerVpc)) {
                const aclList = Object.values(aclDict);
                for (const acl of aclList) {
                    list.push({
                        VpcId: vpcId,
                        AclId: acl.acl_id,
                        Name: acl.name
                    });
                }
            }

            for (const a of list) {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                   
                    <td>${a.AclId}</td>
                    <td>${a.VpcId}</td>
                    <td>${a.Name}</td>
                     <td><button onclick="deleteACL('${a.AclId}')">Eliminar</button></td>
                `;
                tbl.appendChild(tr);
            }
        });
}

document.getElementById("btnCreateACL").addEventListener("click", () => {
    const vpc = document.getElementById("aclVPCSelect").value;
    const name = document.getElementById("aclName").value.trim();

    if (!vpc) return showError("Selecciona una VPC.");
    if (!name) return showError("Nombre vacío.");

    safeFetch("/Create_acl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vpc_id: vpc, acl_name: name })
    })
        .then(() => {
            loadACLs();
            loadACLSelector();
        });
});

function deleteACL(id) {
    if (!confirm("¿Eliminar ACL?")) return;

    safeFetch("/Delete_acl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acl_id: id })
    }).then(() => {
        loadACLs();
        loadACLSelector();
    });
}



// ======================================================================
//  ACL RULES
// ======================================================================

function loadACLRules() {
    safeFetch("/ACL_in_existance")
        .then(data => {
            const tbl = document.getElementById("tblACLRules");
            tbl.innerHTML = "";

            const rules = data.data.rules || {};
            const list = Object.values(rules);

            for (const r of list) {
                const tr = document.createElement("tr");
                tr.innerHTML = `

                    <td>${r.acl_id}</td>
                    <td>${r.rule_number}</td>
                    <td>${r.type}</td>
                    <td>${r.action}</td>
                    <td>${r.protocol}</td>
                    <td>${r.cidr_block || "-"}</td>
                    <td>${r.ipv6_cidr || "-"}</td>
                    <td>${JSON.stringify(r.port_range)}</td>
                                        <td>
                        <button onclick="deleteACLRule('${r.acl_id}', '${r.rule_number}', '${r.type}')">
                            Eliminar
                        </button>
                    </td>
                `;
                tbl.appendChild(tr);
            }
        });
}

function deleteACLRule(aclId, ruleNumber, type) {
    if (!confirm(`¿Eliminar regla ${ruleNumber} de ${aclId}?`)) return;

    const egressBool = (type === "Egress");

    safeFetch("/Delete_acl_entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            acl_id: aclId,
            rule_number: ruleNumber,
            egress: egressBool
        })
    }).then(() => loadACLRules());
}



// ======================================================================
//  CREAR REGLA ACL
// ======================================================================

document.getElementById("btnCreateRule").addEventListener("click", () => {
    const acl = document.getElementById("aclRuleSelect").value;
    const rule = document.getElementById("aclRuleNumber").value.trim();
    const cidr = document.getElementById("aclRuleCIDR").value.trim();
    const proto = document.getElementById("aclRuleProtocol").value;
    const action = document.getElementById("aclRuleAction").value.trim().toLowerCase();
    const egStr = document.getElementById("aclRuleEgress").value;
    const pFrom = document.getElementById("aclRulePortFrom").value.trim();
    const pTo = document.getElementById("aclRulePortTo").value.trim();

    if (!acl) return showError("Selecciona ACL.");
    if (!isValidRuleNumber(rule)) return showError("Número inválido.");
    if (!isValidCIDR(cidr)) return showError("CIDR inválido.");
    if (!["tcp", "udp", "icmp", "all"].includes(proto))return showError("Protocolo inválido.");
    if (!["allow", "deny"].includes(action)) return showError("Acción inválida.");
    if (!isValidPort(pFrom) || !isValidPort(pTo)) return showError("Puertos inválidos.");

    const egressBool = (egStr === "true");

    safeFetch("/Update_acl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            acl_id: acl,
            rule_number: rule,
            protocol: proto,
            action,
            egress: egressBool,
            cidr_block: cidr,
            port_from: pFrom,
            port_to: pTo
        })
    }).then(() => loadACLRules());
});

// =======================================================
// UNIVERSAL TABLE FILTER FUNCTION (AWS-LIKE)
// =======================================================
function enableTableSearch(inputId, tableId) {
    const input = document.getElementById(inputId);
    const table = document.getElementById(tableId);

    if (!input || !table) return;

    input.addEventListener("input", () => {
        const filter = input.value.toLowerCase();
        const rows = table.getElementsByTagName("tr");

        for (let i = 0; i < rows.length; i++) {
            const rowText = rows[i].textContent.toLowerCase();
            rows[i].style.display = rowText.includes(filter) ? "" : "none";
        }
    });
}
