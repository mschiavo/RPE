const BASE_URL = "https://rpe-app-49320-default-rtdb.europe-west1.firebasedatabase.app/";

document.addEventListener("DOMContentLoaded", async () => {
    showLoader(true);
    const [atlete, rpe_data] = await Promise.all([
        fetchData("atlete"),
        fetchData("rpe_data")
    ]);
    showLoader(false);
    renderStatistiche(atlete, rpe_data);
});

async function fetchData(path) {
    const res = await fetch(`${BASE_URL}/${path}.json`);
    const data = await res.json();
    return Object.entries(data || {}).map(([id, val]) => ({ ...val, id }));
}

function renderStatistiche(atlete, rpe_data) {
    const container = document.getElementById("tabelle");
    const oggi = new Date();
    const settimanaFa = new Date(oggi); settimanaFa.setDate(oggi.getDate() - 7);
    const meseFa = new Date(oggi); meseFa.setDate(oggi.getDate() - 30);
    const parseData = d => new Date(d + "T00:00:00");

    const ultimeDate = [...new Set(rpe_data.map(r => r.data))].sort().reverse();
    const ultimaData = ultimeDate[0];
    const datiUltimo = rpe_data.filter(r => r.data === ultimaData);
    const datiSettimana = rpe_data.filter(r => parseData(r.data) >= settimanaFa);
    const datiMese = rpe_data.filter(r => parseData(r.data) >= meseFa);

    container.appendChild(creaTabella(datiUltimo, "Voti dell'ultimo allenamento", atlete));
    container.appendChild(creaTabellaMedia(datiSettimana, "Media ultima settimana", atlete));
    container.appendChild(creaTabellaMedia(datiMese, "Media ultimo mese", atlete));
    container.appendChild(creaTabellaPerAtleta(rpe_data, "Tutti i voti per atleta", atlete));
    container.appendChild(creaTabellaPerRuolo(rpe_data, "Media per ruolo", atlete));
}

function creaTabella(dati, titolo, atlete) {
    const table = document.createElement("table");
    table.innerHTML = `<caption>${titolo}</caption>
    <thead><tr><th>Atleta</th><th>RPE</th><th>Durata</th><th>Data</th></tr></thead>`;
    const tbody = document.createElement("tbody");

    dati.forEach(r => {
        const a = atlete.find(a => a.id == r.atleta_id);
        const nome = a ? `${a.nome} ${a.cognome}` : r.atleta_id;
        tbody.innerHTML += `<tr><td>${nome}</td><td>${r.rpe_id}</td><td>${r.durata}</td><td>${r.data}</td></tr>`;
    });

    table.appendChild(tbody);
    return table;
}

function creaTabellaMedia(dati, titolo, atlete) {
    const grouped = {};
    dati.forEach(r => {
        if (!grouped[r.atleta_id]) grouped[r.atleta_id] = [];
        grouped[r.atleta_id].push(r);
    });

    const table = document.createElement("table");
    table.innerHTML = `<caption>${titolo}</caption>
    <thead><tr><th>Atleta</th><th>RPE medio</th><th>Durata media</th></tr></thead>`;
    const tbody = document.createElement("tbody");

    Object.entries(grouped).forEach(([id, arr]) => {
        const a = atlete.find(a => a.id == id);
        const nome = a ? `${a.nome} ${a.cognome}` : id;
        const rpeMedia = media(arr.map(r => +r.rpe_id));
        const durataMedia = media(arr.map(r => +r.durata));
        tbody.innerHTML += `<tr><td>${nome}</td><td>${rpeMedia.toFixed(2)}</td><td>${durataMedia.toFixed(1)}</td></tr>`;
    });

    table.appendChild(tbody);
    return table;
}

function creaTabellaPerAtleta(dati, titolo, atlete) {
    const grouped = {};
    dati.forEach(r => {
        if (!grouped[r.atleta_id]) grouped[r.atleta_id] = [];
        grouped[r.atleta_id].push(r);
    });

    const table = document.createElement("table");
    table.innerHTML = `<caption>${titolo}</caption>
    <thead><tr><th>Atleta</th><th>RPE medio</th><th></th></tr></thead>`;
    const tbody = document.createElement("tbody");

    Object.entries(grouped).forEach(([id, arr], i) => {
        const atleta = atlete.find(a => a.id === id);
        if (!atleta) return;
        const mediaRpe = media(arr.map(r => +r.rpe_id)).toFixed(2);
        const atletaLabel = `#${atleta.numero_maglia} - ${atleta.nome} ${atleta.cognome}`;
        const subId = `sub-${id}-${i}`;

        // Riga principale
        tbody.innerHTML += `
      <tr class="expandable" data-target="${subId}">
        <td>${atletaLabel}</td>
        <td>${mediaRpe}</td>
        <td style="text-align: right;">▶️</td>
      </tr>
      <tr id="${subId}" class="subrow hidden">
        <td colspan="3">
          <ul class="dettagli-atleta">
            ${arr.map(r => `<li>${r.data}: RPE ${r.rpe_id}</li>`).join("")}
          </ul>
        </td>
      </tr>
    `;
    });

    table.appendChild(tbody);

    // Gestione toggle espansione
    setTimeout(() => {
        table.querySelectorAll(".expandable").forEach(row => {
            row.addEventListener("click", () => {
                const targetId = row.dataset.target;
                const subrow = document.getElementById(targetId);
                const open = !subrow.classList.contains("hidden");
                subrow.classList.toggle("hidden", open);
                row.querySelector("td:last-child").textContent = open ? "▶️" : "🔽";
            });
        });
    }, 100);

    return table;
}


function creaTabellaPerRuolo(dati, titolo, atlete) {
    const grouped = {};

    dati.forEach(r => {
        const a = atlete.find(a => a.id == r.atleta_id);
        const ruolo = a ? a.ruolo : "Sconosciuto";
        if (!grouped[ruolo]) grouped[ruolo] = [];
        grouped[ruolo].push(r);
    });

    const table = document.createElement("table");
    table.innerHTML = `<caption>${titolo}</caption>
    <thead><tr><th>Ruolo</th><th>RPE medio</th><th>Durata media</th></tr></thead>`;
    const tbody = document.createElement("tbody");

    Object.entries(grouped).forEach(([ruolo, arr]) => {
        const rpeMedia = media(arr.map(r => +r.rpe_id));
        const durataMedia = media(arr.map(r => +r.durata));
        tbody.innerHTML += `<tr><td>${ruolo}</td><td>${rpeMedia.toFixed(2)}</td><td>${durataMedia.toFixed(1)}</td></tr>`;
    });

    table.appendChild(tbody);
    return table;
}

function media(arr) {
    return arr.length ? arr.reduce((a, b) => a + b) / arr.length : 0;
}

function showLoader(show) {
    const loader = document.getElementById("overlay-loader");
    if (!loader) return;
    loader.classList.toggle("hidden", !show);
}
