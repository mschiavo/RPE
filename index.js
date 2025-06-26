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
    return Object.entries(data || {})
        .filter(([_, val]) => val !== null && typeof val === "object")
        .map(([id, val]) => ({ ...val, id }));
}

/*
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
*/

function renderAtlete() {
    const container = document.getElementById("atleteContainer");
    container.innerHTML = "";

    atlete.forEach(a => {
        const div = document.createElement("div");
        div.classList.add("card-atleta");

        const rpeButtons = rpeList.map(r => `
      <button type="button" class="rpe-btn" data-atleta="${a.id}" data-rpe="${r.id}">
        ${r.valore}
        <span class="tooltip">${r.descrizione}</span>
      </button>
    `).join("");

        div.innerHTML = `
      <h3>${a.nome} ${a.cognome}</h3>
      <div class="rpe-grid">${rpeButtons}</div>
      <input id="durata-${a.id}" type="number" placeholder="Durata (opzionale)" />
    `;

        container.appendChild(div);
    });

    // Aggiungi gestione click su pulsanti RPE
    document.querySelectorAll(".rpe-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const atletaId = btn.dataset.atleta;
            const value = btn.dataset.rpe;
            document.querySelectorAll(`.rpe-btn[data-atleta="${atletaId}"]`).forEach(b => {
                b.classList.remove("selected");
            });
            btn.classList.add("selected");
        });
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
        const nuoviRPE = atlete.map(a => {
            const durataSpecifica = document.getElementById(`durata-${a.id}`).value;
            const selectedBtn = document.querySelector(`.rpe-btn.selected[data-atleta="${a.id}"]`);
            const rpe_id = selectedBtn ? selectedBtn.dataset.rpe : null;

            return {
                atleta_id: a.id,
                rpe_id,
                durata: durataSpecifica || durataGen,
                data,
                allenamento_id
            };
        });
    }

    if (nuoviRPE.some(r => !r.rpe_id)) {
        alert("Seleziona un RPE per ogni atleta");
        showLoader(false);
        return;
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

function showLoader(show) {
    const loader = document.getElementById("overlay-loader");
    if (!loader) return;
    loader.classList.toggle("hidden", !show);
}

