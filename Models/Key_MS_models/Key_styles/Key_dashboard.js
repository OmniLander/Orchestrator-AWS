// ========================================================
// KEY DASHBOARD – MANEJO DE KEYS AWS DESDE Flask Blueprint
// ========================================================

// Función genérica para peticiones JSON
async function fetchJSON(url, method = "GET", body = null) {
    const options = {
        method,
        headers: { "Content-Type": "application/json" }
    };

    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    return await res.json();
}

// ========================================================
// LISTAR KEY PAIRS
// ========================================================
document.getElementById("listKeysBtn").addEventListener("click", async () => {
    const output = document.getElementById("keysList");

    try {
        const data = await fetchJSON("/Key_controller_bp/Keys_in_existance");
        output.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
        output.textContent = "Error: " + err.message;
    }
});

// ========================================================
// CREAR KEY PAIR
// ========================================================
document.getElementById("createKeyForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const keyName = document.getElementById("keyName").value;
    const keyFormat = document.getElementById("keyFormat").value;

    const output = document.getElementById("createResponse");

    try {
        const data = await fetchJSON(
            "/Key_controller_bp/Create_key",
            "POST",
            { key_name: keyName, key_format: keyFormat }
        );
        output.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
        output.textContent = "Error: " + err.message;
    }
});

// ========================================================
// ELIMINAR KEY PAIR
// ========================================================
document.getElementById("deleteKeyForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const keyId = document.getElementById("keyId").value;
    const keyName = document.getElementById("keyNameDelete").value;

    const output = document.getElementById("deleteResponse");

    try {
        const data = await fetchJSON(
            "/Key_controller_bp/Delete_key",
            "POST",
            { key_id: keyId, key_name: keyName }
        );
        output.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
        output.textContent = "Error: " + err.message;
    }
});
