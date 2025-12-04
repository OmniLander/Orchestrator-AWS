// =========================
// ESTADO GLOBAL
// =========================
const subnetState = {
    items: [],      // lista lineal de subnets
    vpcs: [],        // para dropdown
    search: ""
};

// =========================
// HELPERS UNIVERSALES
// =========================
async function apiRequest(endpoint, method = "GET", body = null) {
    const options = { method, headers: { "Content-Type": "application/json" } };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(endpoint, options);
    const data = await res.json();

    if (!data.success) {
        showError(data.error || "Error desconocido");
        throw new Error(data.error);
    }
    return data.data;
}

function showError(msg) {
    document.getElementById("error-message").textContent = msg;
    document.getElementById("error-overlay").style.display = "flex";

    document.getElementById("close-error-btn").onclick = () =>
        document.getElementById("error-overlay").style.display = "none";
}

function setLoading(state) {
    document.getElementById("loading-overlay").style.display = state ? "flex" : "none";
}

// =========================
// VALIDACIONES
// =========================
function validateCIDR(cidr) {
    const regex = /^([0-9]{1,3}\.){3}[0-9]{1,3}\/([0-9]|[12][0-9]|3[0-2])$/;
    if (!regex.test(cidr)) {
        showError("CIDR inválido. Ejemplo válido: 10.0.1.0/24");
        return false;
    }
    return true;
}

function validateName(name) {
    if (!name.trim()) {
        showError("El nombre de la Subnet no puede estar vacío");
        return false;
    }
    return true;
}

// =========================
// ENDPOINTS
// =========================
const ENDPOINTS = {
    GET_SUBNETS: "/subnets_in_existence",
    GET_VPCS: "/vpcs_in_existence",
    CREATE_SUBNET: "/create_subnet",
    DELETE_SUBNET: "/delete_subnet"
};

// =========================
// LOAD DATA
// =========================
async function loadData() {
    try {
        setLoading(true);

        // 1. Obtener subnets
        const subnetsRaw = await apiRequest(ENDPOINTS.GET_SUBNETS);

        // Convertir de:
        // { vpcId: [ {subnet}, {subnet} ] }
        subnetState.items = [];
        Object.entries(subnetsRaw).forEach(([vpcId, list]) => {
            list.forEach(sub => {
                subnetState.items.push({
                    id: sub.subnet_id,
                    name: sub.name,
                    vpc: vpcId,
                    cidr: sub.cidr_block,
                    zone: sub.availability_zone,
                    state: sub.state
                });
            });
        });

        // 2. Obtener VPCs para selects
        const vpcsRaw = await apiRequest(ENDPOINTS.GET_VPCS);
        subnetState.vpcs = Object.entries(vpcsRaw).map(([id, obj]) => ({
            id,
            name: obj.name
        }));

        renderTable();
        refreshVPCSelect();

    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
}

// =========================
// RENDER
// =========================
function renderTable() {
    const tbody = document.getElementById("subnet-tbody");
    tbody.innerHTML = "";

    const search = subnetState.search.toLowerCase();

    const filtered = subnetState.items.filter(s =>
        s.id.toLowerCase().includes(search) ||
        s.name.toLowerCase().includes(search) ||
        s.cidr.toLowerCase().includes(search) ||
        s.vpc.toLowerCase().includes(search)
    );

    if (filtered.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 7;
        td.className = "text-center text-muted";
        td.textContent = "No se encontraron subnets.";
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    for (const sn of filtered) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${sn.id}</td>
            <td>${sn.name}</td>
            <td>${sn.vpc}</td>
            <td>${sn.cidr}</td>
            <td>${sn.zone}</td>
            <td>${sn.state}</td>
            <td>
                <button class="aws-btn aws-btn-danger aws-btn-sm"
                    onclick="deleteSubnet('${sn.id}')">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    }
}

// =========================
// DELETE SUBNET
// =========================
async function deleteSubnet(id) {
    if (!confirm("¿Seguro de eliminar esta Subnet?")) return;
    try {
        setLoading(true);
        await apiRequest(ENDPOINTS.DELETE_SUBNET, "POST", { subnet_id: id });

        subnetState.items = subnetState.items.filter(s => s.id !== id);
        renderTable();

    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
}

// =========================
// CREATE MODAL
// =========================
function refreshVPCSelect() {
    const select = document.getElementById("subnet-vpc-select");
    select.innerHTML = "";

    if (subnetState.vpcs.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "No hay VPCs disponibles";
        select.appendChild(opt);
        return;
    }

    subnetState.vpcs.forEach(vpc => {
        const opt = document.createElement("option");
        opt.value = vpc.id;
        opt.textContent = `${vpc.id} (${vpc.name})`;
        select.appendChild(opt);
    });
}

function setupCreateModal() {
    const modal = document.getElementById("create-subnet-modal");

    document.getElementById("open-create-subnet-btn").onclick = () => {
        refreshVPCSelect();
        modal.style.display = "flex";
    };

    document.getElementById("close-create-subnet-btn").onclick =
    document.getElementById("cancel-create-subnet").onclick = () => {
        modal.style.display = "none";
    };

    document.getElementById("create-subnet-form").onsubmit = async (e) => {
        e.preventDefault();

        const name = document.getElementById("subnet-name").value;
        const cidr = document.getElementById("subnet-cidr").value;
        const vpcId = document.getElementById("subnet-vpc-select").value;

        if (!validateName(name)) return;
        if (!validateCIDR(cidr)) return;

        if (!vpcId) {
            showError("Debes seleccionar una VPC.");
            return;
        }

        try {
            setLoading(true);

            const created = await apiRequest(ENDPOINTS.CREATE_SUBNET, "POST", {
                subnet_name: name,
                cidr_block: cidr,
                vpc_id: vpcId
            });

            subnetState.items.push({
                id: created.subnet_id,
                name,
                vpc: vpcId,
                cidr,
                zone: "us-east-1a",
                state: created.subnet_state || "unknown"
            });

            renderTable();
            modal.style.display = "none";

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
}

// =========================
// SEARCH
// =========================
function setupSearch() {
    document.getElementById("subnet-search").addEventListener("input", (e) => {
        subnetState.search = e.target.value;
        renderTable();
    });
}

// =========================
// INIT
// =========================
document.addEventListener("DOMContentLoaded", () => {
    setupCreateModal();
    setupSearch();
    loadData();
});
