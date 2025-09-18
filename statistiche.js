const BASE_URL = "https://rpe-app-49320-default-rtdb.europe-west1.firebasedatabase.app/";
const parseDate = d => new Date(d + "T00:00:00");

document.addEventListener("DOMContentLoaded", async () => {
    showLoader(true);
    const [atlete, rpe_data, rpeList] = await Promise.all([
        fetchData("atlete"),
        fetchData("rpe_data"),
        fetchData("rpe")
    ]);
    showLoader(false);
    renderStatistiche(atlete, rpe_data, rpeList);
});

async function fetchData(path) {
    const res = await fetch(`${BASE_URL}/${path}.json`);
    const data = await res.json();
    return Object.entries(data || {}).map(([id, val]) => ({...val, id}));
}

function renderStatistiche(atlete, rpe_data, rpeList) {
    const container = document.getElementById("tabelle");
    const oggi = new Date();
    const settimanaFa = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() - 6); // inclusi oggi + 6 giorni precedenti
    const meseFa = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() - 29); // inclusi oggi + 29 giorni precedenti
    // const parseDate = d => new Date(d + "T00:00:00");

    const ultimaData = rpe_data
        .map(r => r.data)
        .filter(Boolean)
        .sort((a, b) => parseDate(b) - parseDate(a))[0];
    const datiUltimo = rpe_data.filter(r => r.data === ultimaData);
    const datiSettimana = rpe_data.filter(r => parseDate(r.data) >= settimanaFa);
    const datiMese = rpe_data.filter(r => parseDate(r.data) >= meseFa);

    console.log("Settimana dal:", settimanaFa.toISOString().split("T")[0]);

    const datiUltimiVoti = elaboraUltimiVoti(atlete, rpe_data);
    container.appendChild(creaTabellaUltimiVoti(datiUltimiVoti, "Ultimi Voti Inseriti", rpeList));
    container.appendChild(creaTabella(datiUltimo, "Voti ultimo allenamento", atlete));
    container.appendChild(creaTabellaMedia(datiSettimana, "Media ultima settimana", atlete));
    container.appendChild(creaTabellaMedia(datiMese, "Media ultimo mese", atlete));
    container.appendChild(creaTabellaPerAtleta(rpe_data, "Tutti i voti per atleta", atlete));
    container.appendChild(creaTabellaPerRuolo(rpe_data, "Media per ruolo", atlete));

    // --- NUOVA LOGICA PER RENDERE LE TABELLE COLLASSABILI ---
    // Aggiungiamo questo blocco alla fine della funzione
    container.querySelectorAll(".expandable-caption").forEach(caption => {
        caption.style.cursor = 'pointer'; // Rende visivamente chiaro che è cliccabile
        caption.addEventListener('click', () => {
            const targetId = caption.dataset.target;
            const tbody = document.getElementById(targetId);
            const arrow = caption.querySelector('.toggle-arrow');

            if (tbody && arrow) {
                const isHidden = tbody.classList.toggle('hidden');
                arrow.textContent = isHidden ? '▶️' : '🔽';
            }
        });
    });

}

function creaTabella(dati, titolo, atlete) {
    const table = document.createElement("table");
    const tbodyId = `tbody-${titolo.replace(/\s+/g, '-').toLowerCase()}`; // Crea un ID univoco dal titolo

    table.innerHTML = `<caption class="expandable-caption" data-target="${tbodyId}">
    ${titolo}<span class="toggle-arrow">🔽</span></caption>
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
    const tbodyId = `tbody-${titolo.replace(/\s+/g, '-').toLowerCase()}`; // Crea un ID univoco dal titolo

    table.innerHTML = `<caption class="expandable-caption" data-target="${tbodyId}">
            ${titolo}
            <span class="toggle-arrow">🔽</span>
        </caption>
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
    const tbodyId = `tbody-${titolo.replace(/\s+/g, '-').toLowerCase()}`; // Crea un ID univoco dal titolo

    table.innerHTML = `<caption class="expandable-caption" data-target="${tbodyId}">
            ${titolo}
            <span class="toggle-arrow">🔽</span>
        </caption>
    <thead><tr><th>Atleta</th><th>RPE medio</th><th></th></tr></thead>`;
    const tbody = document.createElement("tbody");

    Object.entries(grouped).forEach(([id, arr], i) => {
        const atleta = atlete.find(a => a.id === id);
        if (!atleta) return;
        const mediaRpe = media(arr.map(r => +r.rpe_id)).toFixed(2);
        const atletaLabel = `#${atleta.numero_maglia} - ${atleta.nome} ${atleta.cognome}`;
        const subId = `sub-${id}-${i}`;

        // ordina e prendi i più recenti
        const ultimiVoti = arr
            .slice()
            .sort((a, b) => parseDate(b.data) - parseDate(a.data))
            .slice(0, 10);

        tbody.innerHTML += `
          <tr class="expandable" data-target="${subId}">
            <td>${atletaLabel}</td>
            <td>${mediaRpe}</td>
            <td style="text-align: right;">▶️</td>
          </tr>
          <tr id="${subId}" class="subrow hidden">
            <td colspan="3">
              <ul class="dettagli-atleta">
                ${ultimiVoti.map(r => `
                  <li>
                    <span>${r.data}: RPE ${r.rpe_id}</span>
                    <button class="delete-btn" data-rpe-id="${r.id}" title="Elimina questo voto">🗑️</button>
                  </li>
                `).join("")}
              </ul>
            </td>
          </tr>
        `;
    });

    table.appendChild(tbody);

    // Gestione toggle espansione e CANCELLAZIONE
    setTimeout(() => {
        // Listener per espandere/collassare le righe
        table.querySelectorAll(".expandable").forEach(row => {
            row.addEventListener("click", () => {
                const targetId = row.dataset.target;
                const subrow = document.getElementById(targetId);
                const open = !subrow.classList.contains("hidden");
                subrow.classList.toggle("hidden", open);
                row.querySelector("td:last-child").textContent = open ? "▶️" : "🔽";
            });
        });

        // Listener per i pulsanti di cancellazione
        table.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener('click', (event) => {
                // Impedisce che il click sul bottone attivi anche l'espansione della riga
                event.stopPropagation();
                const rpeDbId = btn.dataset.rpeId;
                eliminaVoto(rpeDbId);
            });
        });
    }, 100);

    return table;
}

/**
 * Elimina una specifica registrazione RPE dal database.
 * @param {string} rpeDbId - L'ID univoco del record RPE da eliminare.
 */
async function eliminaVoto(rpeDbId) {
    if (!rpeDbId) return;

    // Chiediamo conferma per evitare cancellazioni accidentali
    const confermato = confirm("Sei sicuro di voler eliminare definitivamente questo voto?");
    if (!confermato) {
        return;
    }

    showLoader(true);
    try {
        const res = await fetch(`${BASE_URL}/rpe_data/${rpeDbId}.json`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            throw new Error("La richiesta di eliminazione è fallita.");
        }

        alert("Voto eliminato con successo!");
        location.reload(); // Ricarichiamo la pagina per vedere i dati aggiornati

    } catch (error) {
        console.error("Errore durante l'eliminazione del voto:", error);
        alert("Si è verificato un errore durante l'eliminazione.");
    } finally {
        showLoader(false);
    }
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
    const tbodyId = `tbody-${titolo.replace(/\s+/g, '-').toLowerCase()}`; // Crea un ID univoco dal titolo

    table.innerHTML = `<caption class="expandable-caption" data-target="${tbodyId}">
            ${titolo}
            <span class="toggle-arrow">🔽</span>
        </caption>
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

/**
 * Trova l'ultimo inserimento RPE per ogni atleta basandosi sul timestamp.
 */
function elaboraUltimiVoti(atlete, rpeData) {
    const ultimiVotiMap = new Map();

    for (const rpeEntry of rpeData) {
        // Se l'entry non ha un timestamp (dati vecchi), la saltiamo
        if (!rpeEntry.timestamp_inserimento) continue;

        // Se non ho ancora un voto per questa atleta, o se quello che ho trovato è più vecchio, lo aggiorno.
        if (!ultimiVotiMap.has(rpeEntry.atleta_id) || rpeEntry.timestamp_inserimento > ultimiVotiMap.get(rpeEntry.atleta_id).timestamp_inserimento) {
            ultimiVotiMap.set(rpeEntry.atleta_id, rpeEntry);
        }
    }

    // Combino i dati delle atlete con il loro ultimo voto trovato
    return atlete.map(atleta => {
        const ultimoVoto = ultimiVotiMap.get(atleta.id);
        return {
            nomeCompleto: `${atleta.nome} ${atleta.cognome}`,
            rpe_id: ultimoVoto ? ultimoVoto.rpe_id : null,
            data_allenamento: ultimoVoto ? ultimoVoto.data : "N/D",
            timestamp_inserimento: ultimoVoto ? ultimoVoto.timestamp_inserimento : null
        };
    });
}


// /**
//  * Crea e restituisce l'elemento <table> per la visualizzazione degli ultimi voti inseriti.
//  */
// function creaTabellaUltimiVoti(datiTabella, titolo, rpeList) {
//     const table = document.createElement("table");
//     const tbodyId = `tbody-ultimi-voti`; // ID univoco per il corpo della tabella
//
//     table.innerHTML = `
//         <caption class="expandable-caption">
//             ${titolo}
//         </caption>
//         <thead>
//             <tr>
//                 <th>Atleta</th>
//                 <th>Ultimo Voto (RPE)</th>
//                 <th>Data Allenamento</th>
//                 <th>Data Inserimento Voto</th>
//             </tr>
//         </thead>`;
//     const tbody = document.createElement("tbody");
//     tbody.id = tbodyId; // Assegniamo l'ID
//
//     // Ordino per nome per una visualizzazione più pulita
//     datiTabella.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto));
//
//     datiTabella.forEach(item => {
//         const rpeInfo = item.rpe_id ? rpeList.find(r => r.id === item.rpe_id) : null;
//         const rpeValore = rpeInfo ? rpeInfo.valore : "N/D";
//         const dataInserimento = item.timestamp_inserimento
//             ? new Date(item.timestamp_inserimento).toLocaleString('it-IT')
//             : "N/D";
//
//         const riga = document.createElement('tr');
//         const cellaAzione = document.createElement('td');
//         if (item.rpe_db_id) {
//             const deleteBtn = document.createElement('button');
//             deleteBtn.innerHTML = '🗑️';
//             deleteBtn.className = 'delete-btn';
//             deleteBtn.title = 'Elimina questo voto';
//             deleteBtn.addEventListener('click', () => eliminaVoto(item.rpe_db_id));
//             cellaAzione.appendChild(deleteBtn);
//         }
//
//         riga.innerHTML = `
//             <td>${item.nomeCompleto}</td>
//             <td>${rpeValore}</td>
//             <td>${item.data_allenamento}</td>
//             <td>${dataInserimento}</td>
//         `;
//         riga.appendChild(cellaAzione);
//         tbody.appendChild(riga);
//     });
//
//     table.appendChild(tbody);
//     return table;
// }

function creaTabellaUltimiVoti(datiTabella, titolo, rpeList) {
    const table = document.createElement("table");
    const tbodyId = `tbody-ultimi-voti`; // ID univoco per il corpo della tabella

    table.innerHTML = `
        <caption class="expandable-caption" data-target="${tbodyId}">
            ${titolo}
            <span class="toggle-arrow">🔽</span>
        </caption>
        <thead>
            <tr>
                <th>Atleta</th>
                <th>Ultimo Voto (RPE)</th>
                <th>Data Allenamento</th>
                <th>Data Inserimento Voto</th>
                <th></th>
            </tr>
        </thead>`;

    const tbody = document.createElement("tbody");
    tbody.id = tbodyId; // Assegniamo l'ID

    // ... il resto della logica della funzione per popolare il tbody rimane IDENTICO ...
    datiTabella.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto));

    datiTabella.forEach(item => {
        const rpeInfo = item.rpe_id ? rpeList.find(r => r.id === item.rpe_id) : null;
        const rpeValore = rpeInfo ? rpeInfo.valore : "N/D";
        const dataInserimento = item.timestamp_inserimento
            ? new Date(item.timestamp_inserimento).toLocaleString('it-IT')
            : "N/D";

        const riga = document.createElement('tr');
        const cellaAzione = document.createElement('td');
        if (item.rpe_db_id) {
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.className = 'delete-btn';
            deleteBtn.title = 'Elimina questo voto';
            deleteBtn.addEventListener('click', () => eliminaVoto(item.rpe_db_id));
            cellaAzione.appendChild(deleteBtn);
        }

        riga.innerHTML = `
            <td>${item.nomeCompleto}</td>
            <td>${rpeValore}</td>
            <td>${item.data_allenamento}</td>
            <td>${dataInserimento}</td>
        `;
        riga.appendChild(cellaAzione);
        tbody.appendChild(riga);
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
