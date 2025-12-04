// ===============================================
// ESTADO GLOBAL
// ===============================================
const rtState = {
    routeTables: [],   // {route_table_id, vpc_id, is_main, associated_subnets[], tags{}, routes[], name}
    vpcs: [],          // {id, name}
    igws: [],          // {id, name, state, vpc}
    subnets: [],       // {subnet_id, name, vpc_id, cidr_block, az}
    search: "",
    selectedRtId: null
};

// ===============================================
// HELPERS UNIVERSALES
// ===============================================
async function apiRequest(endpoint, method = "GET", body = null) {
    const options = { method, headers: { "Content-Type": "application/json" } };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(endpoint, options);
    let data;
    try {
        data = await res.json();
    } catch (e) {
        showError("Respuesta no válida del backend.");
        throw new Error("Invalid JSON");
    }

    if (!data.success) {
        showError(data.error || "Error desconocido");
        throw new Error(data.error || "Backend error");
    }

    return data.data;
}

function showError(msg) {
    const overlay = document.getElementById("error-overlay");
    const msgEl = document.getElementById("error-message");
    const closeBtn = document.getElementById("close-error-btn");

    if (!overlay || !msgEl || !closeBtn) {
        alert(msg);
        return;
    }

    msgEl.textContent = msg;
    overlay.style.display = "flex";
    closeBtn.onclick = () => {
        overlay.style.display = "none";
    };
}

function setLoading(isLoading) {
    const overlay = document.getElementById("loading-overlay");
    if (!overlay) return;
    overlay.style.display = isLoading ? "flex" : "none";
}

function fillSelect(selectElement, items, getValue, getLabel) {
    if (!selectElement) return;
    selectElement.innerHTML = "";

    if (!items || items.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "No hay elementos disponibles";
        selectElement.appendChild(opt);
        return;
    }

    for (const item of items) {
        const opt = document.createElement("option");
        opt.value = getValue(item);
        opt.textContent = getLabel(item);
        selectElement.appendChild(opt);
    }
}

// ===============================================
// ENDPOINTS
// ===============================================
const ENDPOINTS = {
    GET_RTS: "/route_table_in_existence",
    CREATE_RT: "/create_route_table",
    CREATE_ROUTE: "/create_route",
    ASSOCIATE_RT: "/associate_rt",
    GET_VPCS: "/vpcs_in_existence",
    GET_SUBNETS: "/subnets_in_existence",
    GET_IGWS: "/igw_in_existence"
};

// ===============================================
// VALIDACIONES AVANZADAS
// ===============================================
function validateRtAndIgwSameVpc(rtId, igwId) {
    const rt = rtState.routeTables.find(r => r.route_table_id === rtId);
    const igw = rtState.igws.find(i => i.id === igwId);

    if (!rt) {
        showError("Route Table seleccionada no existe.");
        return false;
    }
    if (!igw) {
        showError("Internet Gateway seleccionado no existe.");
        return false;
    }

    if (igw.vpc !== "N/A" && igw.vpc && igw.vpc !== rt.vpc_id) {
        showError("La VPC del IGW no coincide con la VPC de la Route Table.");
        return false;
    }
    return true;
}

function validateNoDuplicateDefaultRoute(rtId) {
    const rt = rtState.routeTables.find(r => r.route_table_id === rtId);
    if (!rt) return false;

    const hasDefault = rt.routes.some(route => route.destination === "0.0.0.0/0");
    if (hasDefault) {
        showError("Esta Route Table ya tiene una ruta 0.0.0.0/0 definida.");
        return false;
    }
    return true;
}

function validateRtSubnetSameVpc(rtId, subnetId) {
    const rt = rtState.routeTables.find(r => r.route_table_id === rtId);
    const subnet = rtState.subnets.find(s => s.subnet_id === subnetId);

    if (!rt) {
        showError("Route Table seleccionada no existe.");
        return false;
    }
    if (!subnet) {
        showError("Subnet seleccionada no existe.");
        return false;
    }

    if (rt.vpc_id !== subnet.vpc_id) {
        showError("La subnet pertenece a una VPC distinta de la Route Table.");
        return false;
    }

    if (rt.associated_subnets.includes(subnetId)) {
        showError("La subnet ya está asociada a esta Route Table.");
        return false;
    }

    return true;
}

// ===============================================
// LOAD DATA
// ===============================================
async function loadData() {
    try {
        setLoading(true);

        // Cargar en paralelo
        const [vpcsRaw, igwsRaw, subnetsRaw, rtsRaw] = await Promise.all([
            apiRequest(ENDPOINTS.GET_VPCS),
            apiRequest(ENDPOINTS.GET_IGWS),
            apiRequest(ENDPOINTS.GET_SUBNETS),
            apiRequest(ENDPOINTS.GET_RTS)
        ]);

        // VPCs: dict -> lista
        rtState.vpcs = Object.entries(vpcsRaw).map(([id, obj]) => ({
            id,
            name: obj.name || id
        }));

        // IGWs: dict -> lista
        rtState.igws = Object.entries(igwsRaw).map(([id, obj]) => ({
            id,
            name: obj.name || id,
            state: obj.state,
            vpc: obj.igw_vpc
        }));

        // Subnets: {vpc_id: [subnets]} -> lista
        rtState.subnets = [];
        Object.entries(subnetsRaw).forEach(([vpcId, list]) => {
            list.forEach(s => {
                rtState.subnets.push({
                    subnet_id: s.subnet_id,
                    name: s.name || s.subnet_id,
                    vpc_id: vpcId,
                    cidr_block: s.cidr_block,
                    az: s.availability_zone
                });
            });
        });

        // Route Tables: ya viene como lista
        rtState.routeTables = (rtsRaw || []).map(rt => ({
            route_table_id: rt.route_table_id,
            vpc_id: rt.vpc_id,
            is_main: !!rt.is_main,
            associated_subnets: rt.associated_subnets || [],
            tags: rt.tags || {},
            routes: rt.routes || [],
            name: (rt.tags && rt.tags.Name) || rt.route_table_id
        }));

        renderRouteTableTable();
    } catch (err) {
        console.error("Error en loadData:", err);
    } finally {
        setLoading(false);
    }
}

// ===============================================
// RENDER TABLE
// ===============================================
function renderRouteTableTable() {
    const tbody = document.getElementById("rt-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const search = (rtState.search || "").toLowerCase();

    const filtered = rtState.routeTables.filter(rt => {
        const id = (rt.route_table_id || "").toLowerCase();
        const vpc = (rt.vpc_id || "").toLowerCase();
        const name = (rt.name || "").toLowerCase();
        const subnets = (rt.associated_subnets || []).join(",").toLowerCase();
        const routesText = (rt.routes || [])
            .map(r => `${r.destination || ""} ${r.target || ""}`)
            .join(" ")
            .toLowerCase();

        return (
            id.includes(search) ||
            vpc.includes(search) ||
            name.includes(search) ||
            subnets.includes(search) ||
            routesText.includes(search)
        );
    });

    if (filtered.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 7;
        td.className = "text-center text-muted";
        td.textContent = "No se encontraron Route Tables.";
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    for (const rt of filtered) {
        const tr = document.createElement("tr");

        const subnetsText = rt.associated_subnets.length
            ? rt.associated_subnets.join(", ")
            : "-";

        const routesText = rt.routes.length
            ? rt.routes
                  .map(r => `${r.destination || "local"} → ${r.target || "local"}`)
                  .slice(0, 3)
                  .join(" | ") + (rt.routes.length > 3 ? " ..." : "")
            : "sin rutas";

        tr.innerHTML = `
            <td>${rt.route_table_id}</td>
            <td>${rt.name}</td>
            <td>${rt.vpc_id}</td>
            <td>${rt.is_main ? "Sí" : "No"}</td>
            <td>${subnetsText}</td>
            <td>${routesText}</td>
            <td>
                <button class="aws-btn aws-btn-secondary aws-btn-sm"
                    onclick="openCreateRouteModal('${rt.route_table_id}')">
                    Crear route
                </button>
                <button class="aws-btn aws-btn-secondary aws-btn-sm"
                    style="margin-left: 0.25rem"
                    onclick="openAssociateRtModal('${rt.route_table_id}')">
                    Asociar subnet
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    }
}

// ===============================================
// MODAL: CREAR ROUTE TABLE
// ===============================================
function setupCreateRtModal() {
    const modal = document.getElementById("create-rt-modal");
    const openBtn = document.getElementById("open-create-rt-btn");
    const closeBtn = document.getElementById("close-create-rt-btn");
    const cancelBtn = document.getElementById("cancel-create-rt");
    const form = document.getElementById("create-rt-form");
    const vpcSelect = document.getElementById("rt-vpc-select");

    if (!modal || !openBtn || !closeBtn || !cancelBtn || !form || !vpcSelect) return;

    openBtn.onclick = () => {
        fillSelect(
            vpcSelect,
            rtState.vpcs,
            v => v.id,
            v => `${v.id} (${v.name})`
        );
        modal.style.display = "flex";
    };

    const closeModal = () => {
        modal.style.display = "none";
        form.reset();
    };

    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;

    form.onsubmit = async (e) => {
        e.preventDefault();

        const vpcId = vpcSelect.value;
        if (!vpcId) {
            showError("Debes seleccionar una VPC.");
            return;
        }

        try {
            setLoading(true);
            await apiRequest(ENDPOINTS.CREATE_RT, "POST", { vpc_id: vpcId });

            await loadData();
            closeModal();
        } catch (err) {
            console.error("Error al crear Route Table:", err);
        } finally {
            setLoading(false);
        }
    };
}

// ===============================================
// MODAL: CREAR ROUTE (0.0.0.0/0 → IGW)
// ===============================================
function openCreateRouteModal(preselectedRtId = null) {
    const modal = document.getElementById("create-route-modal");
    const rtSelect = document.getElementById("route-rt-select");
    const igwSelect = document.getElementById("route-igw-select");

    if (!modal || !rtSelect || !igwSelect) return;

    fillSelect(
        rtSelect,
        rtState.routeTables,
        r => r.route_table_id,
        r => `${r.route_table_id} (VPC: ${r.vpc_id})`
    );

    fillSelect(
        igwSelect,
        rtState.igws,
        i => i.id,
        i => `${i.id} (${i.name})`
    );

    if (preselectedRtId) {
        rtSelect.value = preselectedRtId;
    }

    modal.style.display = "flex";
}

function setupCreateRouteModal() {
    const modal = document.getElementById("create-route-modal");
    const closeBtn = document.getElementById("close-create-route-btn");
    const cancelBtn = document.getElementById("cancel-create-route");
    const form = document.getElementById("create-route-form");
    const rtSelect = document.getElementById("route-rt-select");
    const igwSelect = document.getElementById("route-igw-select");

    if (!modal || !closeBtn || !cancelBtn || !form) return;

    // Botón global (toolbar)
    const openBtn = document.getElementById("open-create-route-btn");
    if (openBtn) {
        openBtn.onclick = () => openCreateRouteModal(null);
    }

    const closeModal = () => {
        modal.style.display = "none";
        form.reset();
    };
    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;

    form.onsubmit = async (e) => {
        e.preventDefault();

        const rtId = rtSelect.value;
        const igwId = igwSelect.value;

        if (!rtId) {
            showError("Debes seleccionar una Route Table.");
            return;
        }
        if (!igwId) {
            showError("Debes seleccionar un Internet Gateway.");
            return;
        }

        if (!validateRtAndIgwSameVpc(rtId, igwId)) return;
        if (!validateNoDuplicateDefaultRoute(rtId)) return;

        try {
            setLoading(true);
            await apiRequest(ENDPOINTS.CREATE_ROUTE, "POST", {
                gate_id: igwId,
                rt_id: rtId
            });

            await loadData();
            closeModal();
        } catch (err) {
            console.error("Error al crear route:", err);
        } finally {
            setLoading(false);
        }
    };
}

// ===============================================
// MODAL: ASOCIAR RT A SUBNET
// ===============================================
function openAssociateRtModal(preselectedRtId = null) {
    const modal = document.getElementById("associate-rt-modal");
    const rtSelect = document.getElementById("associate-rt-select");
    const subnetSelect = document.getElementById("associate-subnet-select");

    if (!modal || !rtSelect || !subnetSelect) return;

    fillSelect(
        rtSelect,
        rtState.routeTables,
        r => r.route_table_id,
        r => `${r.route_table_id} (VPC: ${r.vpc_id})`
    );

    fillSelect(
        subnetSelect,
        rtState.subnets,
        s => s.subnet_id,
        s => `${s.subnet_id} (VPC: ${s.vpc_id}, ${s.cidr_block})`
    );

    if (preselectedRtId) {
        rtSelect.value = preselectedRtId;
    }

    modal.style.display = "flex";
}

function setupAssociateRtModal() {
    const modal = document.getElementById("associate-rt-modal");
    const closeBtn = document.getElementById("close-associate-rt-btn");
    const cancelBtn = document.getElementById("cancel-associate-rt");
    const form = document.getElementById("associate-rt-form");
    const rtSelect = document.getElementById("associate-rt-select");
    const subnetSelect = document.getElementById("associate-subnet-select");

    if (!modal || !closeBtn || !cancelBtn || !form) return;

    const openBtn = document.getElementById("open-associate-rt-btn");
    if (openBtn) {
        openBtn.onclick = () => openAssociateRtModal(null);
    }

    const closeModal = () => {
        modal.style.display = "none";
        form.reset();
    };

    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;

    form.onsubmit = async (e) => {
        e.preventDefault();

        const rtId = rtSelect.value;
        const subnetId = subnetSelect.value;

        if (!rtId) {
            showError("Debes seleccionar una Route Table.");
            return;
        }
        if (!subnetId) {
            showError("Debes seleccionar una Subnet.");
            return;
        }

        if (!validateRtSubnetSameVpc(rtId, subnetId)) return;

        try {
            setLoading(true);
            await apiRequest(ENDPOINTS.ASSOCIATE_RT, "POST", {
                rt_id: rtId,
                subnet_id: subnetId
            });

            await loadData();
            closeModal();
        } catch (err) {
            console.error("Error al asociar Route Table:", err);
        } finally {
            setLoading(false);
        }
    };
}

// ===============================================
// SEARCH
// ===============================================
function setupSearch() {
    const input = document.getElementById("rt-search");
    if (!input) return;
    input.addEventListener("input", (e) => {
        rtState.search = e.target.value;
        renderRouteTableTable();
    });
}

// ===============================================
// INIT
// ===============================================
document.addEventListener("DOMContentLoaded", () => {
    setupCreateRtModal();
    setupCreateRouteModal();
    setupAssociateRtModal();
    setupSearch();
    loadData();
});
