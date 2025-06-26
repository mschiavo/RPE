const BASE_URL = "https://rpe-app-49320-default-rtdb.europe-west1.firebasedatabase.app/";

let atlete = [];
let rpeList = [];

document.addEventListener("DOMContentLoaded", async () => {
    showLoader(true);
    atlete = await fetchData("atlete");
    rpeList = await fetchData("rpe");
    renderAtlete();
    showLoader(false);
});

async function fetchData(path) {
    const res = await fetch(`${BASE_URL}/${path}.json`);
    const data = await res.json();
    return Object.entries(data || {}).map(([id, val]) => ({ ...val, id }));
}

function renderAtlete() {
    const container = document.getElementById("atleteContainer");
    container.innerHTML = "";
    atlete.forEach(a => {
        const div = document.createElement("div");
        div.innerHTML = `
      <h3>(${a.numero_maglia}) - ${a.nome} ${a.cognome}</h3>
      <select id="rpe-${a.id}">
        ${rpeList.map(r => `<option value="${r.id}">${r.valore} – ${r.descrizione}</option>`).join("")}
      </select>
      <input id="durata-${a.id}" type="number" placeholder="Durata (opzionale)" />
    `;
        container.appendChild(div);
    });
}

async function salvaDati() {
    const data = document.getElementById("dataAllenamento").value;
    const durataGen = document.getElementById("durataGenerale").value;
    if (!data || !durataGen) return alert("Compila tutti i campi!");

    showLoader(true);

    const allenamenti = await fetchData("allenamenti");
    let allenamento = allenamenti.find(a => a.data === data);
    let allenamento_id;

    if (allenamento) {
        allenamento_id = allenamento.id;
        alert("Allenamento già presente! I dati verranno aggiornati.");
    } else {
        allenamento_id = Date.now().toString();
        await pushData("allenamenti", {
            id: allenamento_id,
            data,
            durata: durataGen
        });
    }

    for (let a of atlete) {
        const durataSpecifica = document.getElementById(`durata-${a.id}`).value;
        const rpe_id = document.getElementById(`rpe-${a.id}`).value;

        await pushData("rpe_data", {
            atleta_id: a.id,
            allenamento_id,
            rpe_id,
            data,
            durata: durataSpecifica || durataGen
        });
    }

    showLoader(false);
    alert("Dati salvati!");
}

async function pushData(path, obj) {
    await fetch(`${BASE_URL}/${path}.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(obj)
    });
}

function showLoader(v) {
    document.getElementById("loader").style.display = v ? "block" : "none";
}
