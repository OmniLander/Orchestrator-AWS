// =========================
// ESTADO GLOBAL
// =========================
const vpcState = {
    items: [],
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

    document.getElementById("close-error-btn").onclick = () => {
        document.getElementById("error-overlay").style.display = "none";
    };
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
        showError("CIDR inválido. Ejemplo válido: 10.0.0.0/16");
        return false;
    }
    return true;
}

function validateName(name) {
    if (!name.trim()) {
        showError("El nombre no puede estar vacío");
        return false;
    }
    return true;
}

// =========================
// BACKEND ENDPOINTS
// =========================
const ENDPOINTS = {
    GET_VPCS: "/vpcs_in_existence",
    CREATE_VPC: "/create_vpc",
    DELETE_VPC: "/delete_vpc"
};

// =========================
// CARGA DE DATOS
// =========================
async function loadData() {
    try {
        setLoading(true);

        const data = await apiRequest(ENDPOINTS.GET_VPCS);
        // backend regresa un diccionario por ID, lo convertimos a lista
        vpcState.items = Object.entries(data).map(([id, obj]) => ({
            id,
            name: obj.name,
            cidr: obj.cidr_block,
            state: obj.state
        }));

        renderTable();
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
}

// =========================
// RENDERIZACIÓN
// =========================
function renderTable() {
    const tbody = document.getElementById("vpc-tbody");
    tbody.innerHTML = "";

    const search = vpcState.search.toLowerCase();

    const filtered = vpcState.items.filter(vpc =>
        vpc.id.toLowerCase().includes(search) ||
        vpc.name.toLowerCase().includes(search) ||
        vpc.cidr.toLowerCase().includes(search)
    );

    if (filtered.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 5;
        td.className = "text-center text-muted";
        td.textContent = "No se encontraron VPCs.";
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    for (const vpc of filtered) {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${vpc.id}</td>
            <td>${vpc.name}</td>
            <td>${vpc.cidr}</td>
            <td>${vpc.state}</td>
            <td>
                <button class="aws-btn aws-btn-danger aws-btn-sm" onclick="deleteVPC('${vpc.id}')">
                    Eliminar
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    }
}

// =========================
// DELETE VPC
// =========================
async function deleteVPC(id) {
    if (!confirm("¿Seguro que deseas eliminar esta VPC?")) return;

    try {
        setLoading(true);
        await apiRequest(ENDPOINTS.DELETE_VPC, "POST", { vpc_id: id });

        vpcState.items = vpcState.items.filter(v => v.id !== id);
        renderTable();

    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
}

// =========================
// MODAL CREAR VPC
// =========================
function setupCreateModal() {
    const modal = document.getElementById("create-vpc-modal");

    document.getElementById("open-create-vpc-btn").onclick = () => {
        modal.style.display = "flex";
    };

    document.getElementById("close-create-vpc-btn").onclick =
    document.getElementById("cancel-create-vpc").onclick = () => {
        modal.style.display = "none";
    };

    document.getElementById("create-vpc-form").onsubmit = async (e) => {
        e.preventDefault();

        const name = document.getElementById("vpc-name").value;
        const cidr = document.getElementById("vpc-cidr").value;

        if (!validateName(name)) return;
        if (!validateCIDR(cidr)) return;

        try {
            setLoading(true);
            const newVpc = await apiRequest(ENDPOINTS.CREATE_VPC, "POST", {
                vpc_name: name,
                block: cidr
            });

            vpcState.items.push({
                id: newVpc.vpc_id,
                name,
                cidr,
                state: newVpc.vpc_state || "unknown"
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
// BÚSQUEDA INSTANTÁNEA
// =========================
function setupSearch() {
    document.getElementById("vpc-search").addEventListener("input", (e) => {
        vpcState.search = e.target.value;
        renderTable();
    });
}

// =========================
// INICIALIZACIÓN
// =========================
document.addEventListener("DOMContentLoaded", () => {
    setupCreateModal();
    setupSearch();
    loadData();
});
