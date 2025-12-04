// =========================================================
// ESTADO GLOBAL
// =========================================================
const igwState = {
    igws: [],   // {igw_id, name, state, vpc}
    vpcs: [],   // {id, name}
    search: ""
};

// =========================================================
// HELPERS UNIVERSALES
// =========================================================
async function apiRequest(endpoint, method = "GET", body = null) {
    const options = { method, headers: { "Content-Type": "application/json" } };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(endpoint, options);
    let data;
    try { data = await res.json(); }
    catch { showError("Respuesta inválida del backend"); throw "Invalid JSON"; }

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

function fillSelect(selectElement, items, getValue, getLabel) {
    selectElement.innerHTML = "";
    if (!items || items.length === 0) {
        const o = document.createElement("option");
        o.value = "";
        o.textContent = "No hay elementos disponibles";
        selectElement.appendChild(o);
        return;
    }
    for (const it of items) {
        const o = document.createElement("option");
        o.value = getValue(it);
        o.textContent = getLabel(it);
        selectElement.appendChild(o);
    }
}

// =========================================================
// ENDPOINTS
// =========================================================
const ENDPOINTS = {
    IGW_LIST: "/igw_in_existence",
    CREATE_IGW: "/create_igw",
    DELETE_IGW: "/delete_igw",
    ATTACH_IGW: "/attach_igw",
    GET_VPCS: "/vpcs_in_existence"
};

// =========================================================
// LOAD DATA
// =========================================================
async function loadData() {
    try {
        setLoading(true);

        // Load VPCs
        const vpcsRaw = await apiRequest(ENDPOINTS.GET_VPCS);
        igwState.vpcs = Object.entries(vpcsRaw).map(([id, obj]) => ({
            id,
            name: obj.name
        }));

        // Load IGWs
        const igwRaw = await apiRequest(ENDPOINTS.IGW_LIST);
        igwState.igws = Object.entries(igwRaw).map(([id, obj]) => ({
            igw_id: id,
            name: obj.name,
            state: obj.state,
            vpc: obj.igw_vpc
        }));

        renderIGWTable();
    }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
}

// =========================================================
// RENDER IGW TABLE
// =========================================================
function renderIGWTable() {
    const tb = document.getElementById("igw-tbody");
    tb.innerHTML = "";

    const search = igwState.search.toLowerCase();

    const filtered = igwState.igws.filter(i =>
        i.igw_id.toLowerCase().includes(search) ||
        i.name.toLowerCase().includes(search) ||
        i.vpc.toLowerCase().includes(search)
    );

    if (filtered.length === 0) {
        tb.innerHTML =
            `<tr><td colspan="5" class="text-center text-muted">No se encontraron IGWs</td></tr>`;
        return;
    }

    for (const igw of filtered) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${igw.igw_id}</td>
            <td>${igw.name}</td>
            <td>${igw.state}</td>
            <td>${igw.vpc}</td>
            <td>
                <button class="aws-btn aws-btn-danger aws-btn-sm"
                    onclick="deleteIGW('${igw.igw_id}')">Eliminar</button>
            </td>
        `;
        tb.appendChild(tr);
    }
}

// =========================================================
// DELETE IGW
// =========================================================
async function deleteIGW(id) {
    if (!confirm("¿Seguro de eliminar este IGW?")) return;

    try {
        setLoading(true);
        await apiRequest(ENDPOINTS.DELETE_IGW, "POST", { igw_id: id });

        igwState.igws = igwState.igws.filter(i => i.igw_id !== id);
        renderIGWTable();

    } catch (err) { console.error(err); }
    finally { setLoading(false); }
}

// =========================================================
// CREATE IGW
// =========================================================
function setupCreateIGWModal() {
    const modal = document.getElementById("create-igw-modal");

    document.getElementById("open-create-igw-btn").onclick = () =>
        modal.style.display = "flex";

    document.getElementById("close-create-igw-btn").onclick =
    document.getElementById("cancel-create-igw").onclick = () =>
        modal.style.display = "none";

    document.getElementById("create-igw-form").onsubmit = async e => {
        e.preventDefault();

        const name = document.getElementById("igw-name").value.trim();
        if (!name) return showError("El nombre no puede estar vacío");

        try {
            setLoading(true);
            const igwId = await apiRequest(ENDPOINTS.CREATE_IGW, "POST", { igw_name: name });

            igwState.igws.push({
                igw_id: igwId,
                name,
                state: "detached",
                vpc: "N/A"
            });

            renderIGWTable();
            modal.style.display = "none";

        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };
}

// =========================================================
// ATTACH IGW MODAL
// =========================================================
function setupAttachIGWModal() {
    const modal = document.getElementById("attach-igw-modal");

    document.getElementById("open-attach-igw-btn").onclick = () => {
        fillSelect(
            document.getElementById("attach-igw-select"),
            igwState.igws,
            i => i.igw_id,
            i => `${i.igw_id} (${i.name})`
        );

        fillSelect(
            document.getElementById("attach-vpc-select"),
            igwState.vpcs,
            v => v.id,
            v => `${v.id} (${v.name})`
        );

        modal.style.display = "flex";
    };

    document.getElementById("close-attach-igw-btn").onclick =
    document.getElementById("cancel-attach-igw").onclick = () =>
        modal.style.display = "none";

    document.getElementById("attach-igw-form").onsubmit = async e => {
        e.preventDefault();

        const igwId = document.getElementById("attach-igw-select").value;
        const vpcId = document.getElementById("attach-vpc-select").value;

        if (!igwId) return showError("Selecciona un IGW");
        if (!vpcId) return showError("Selecciona una VPC");

        try {
            setLoading(true);
            await apiRequest(ENDPOINTS.ATTACH_IGW, "POST", { igw_id: igwId, vpc_id: vpcId });

            const igw = igwState.igws.find(i => i.igw_id === igwId);
            igw.state = "attached";
            igw.vpc = vpcId;

            renderIGWTable();
            modal.style.display = "none";

        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };
}

// =========================================================
// SEARCH
// =========================================================
function setupSearch() {
    document.getElementById("igw-search").addEventListener("input", (e) => {
        igwState.search = e.target.value;
        renderIGWTable();
    });
}

// =========================================================
// INIT
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
    setupCreateIGWModal();
    setupAttachIGWModal();
    setupSearch();
    loadData();
});
