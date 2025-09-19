const BASE_URL = "https://rpe-app-49320-default-rtdb.europe-west1.firebasedatabase.app";

// Funzione di utilità per il parsing delle date (CORRETTA per YYYY/MM/DD)
const parseDate = d => {
    // Se la data è nel formato YYYY/MM/DD, l'ordine corretto è [anno, mese, giorno]
    const [year, month, day] = d.split('/');
    return new Date(`${year}-${month}-${day}T00:00:00`);
};

document.addEventListener("DOMContentLoaded", () => {
    loadAdminData();

    const form = document.getElementById('form-nuovo-allenamento');
    if (form) {
        form.addEventListener('submit', gestisciAggiuntaAllenamento);
    }
});

async function loadAdminData() {
    showLoader(true);
    try {
        const [allenamenti, rpeData, atlete] = await Promise.all([
            fetchData("allenamenti"),
            fetchData("rpe_data"),
            fetchData("atlete")
        ]);

        const processedData = processWorkoutData(allenamenti, rpeData);
        const container = document.getElementById("admin-container");
        container.innerHTML = ''; // Pulisce il contenitore
        container.appendChild(creaTabellaAllenamenti(processedData, atlete));

    } catch (error) {
        console.error("Errore nel caricamento dei dati admin:", error);
        document.getElementById("admin-container").innerHTML = `<p class="error">Impossibile caricare i dati.</p>`;
    } finally {
        showLoader(false);
    }
}

async function fetchData(path) {
    const res = await fetch(`${BASE_URL}/${path}.json`);
    const data = await res.json();
    return Object.entries(data || {}).map(([id, val]) => ({ ...val, id }));
}

/**
 * Raggruppa i voti per allenamento.
 */
function processWorkoutData(allenamenti, rpeData) {
    const votiPerAllenamento = rpeData.reduce((acc, voto) => {
        if (!voto.data) return acc;
        if (!acc[voto.data]) {
            acc[voto.data] = [];
        }
        acc[voto.data].push(voto);
        return acc;
    }, {});

    return allenamenti.map(allenamento => {
        const voti = votiPerAllenamento[allenamento.data] || [];
        return {
            ...allenamento,
            voti: voti,
            numeroVoti: voti.length
        };
    }).sort((a, b) => parseDate(b.data) - parseDate(a.data)); // Ordina dal più recente
}

/**
 * Crea la tabella HTML per gli allenamenti.
 */
// in admin.js

/**
 * Crea la tabella HTML per gli allenamenti.
 */
function creaTabellaAllenamenti(datiAllenamenti, atlete) {
    const table = document.createElement("table");
    table.innerHTML = `
        <caption>Elenco Allenamenti e Voti Ricevuti</caption>
        <thead>
            <tr>
                <th>Data Allenamento</th>
                <th>Voti Ricevuti</th>
                <th></th>
                <th></th>
            </tr>
        </thead>
    `;
    const tbody = document.createElement("tbody");

    datiAllenamenti.forEach((allenamento, index) => {
        const subId = `sub-allenamento-${index}`;

        // --- INIZIO MODIFICA: Logica per il pulsante di cancellazione ---
        let deleteButtonHtml;
        if (allenamento.numeroVoti > 0) {
            // Se ci sono voti, il pulsante è disabilitato
            deleteButtonHtml = `
                <button class="delete-btn-allenamento" disabled title="Impossibile eliminare: ci sono voti associati.">
                    🗑️ Elimina
                </button>
            `;
        } else {
            // Se non ci sono voti, il pulsante è attivo
            deleteButtonHtml = `
                <button class="delete-btn-allenamento" data-workout-date="${allenamento.data}" title="Elimina allenamento vuoto">
                    🗑️ Elimina
                </button>
            `;
        }
        // --- FINE MODIFICA ---

        tbody.innerHTML += `
          <tr class="expandable" data-target="${subId}">
            <td><strong>${allenamento.data}</strong></td>
            <td>${allenamento.numeroVoti} / ${atlete.length}</td>
            <td style="text-align: right;">
                ${deleteButtonHtml}
            </td>
            <td style="text-align: right; width: 30px;">▶️</td>
          </tr>
          <tr id="${subId}" class="subrow hidden">
            <td colspan="4">
              <ul class="dettagli-atleta">
                ${allenamento.voti.length > 0 ? allenamento.voti.map(voto => {
            const atleta = atlete.find(a => a.id === voto.atleta_id);
            const nomeAtleta = atleta ? `${atleta.nome} ${atleta.cognome}` : 'ID Sconosciuto';
            return `<li><span>${nomeAtleta}</span><span>RPE: <strong>${voto.rpe_id}</strong></span></li>`;
        }).join('') : '<li>Nessun voto registrato per questo allenamento.</li>'}
              </ul>
            </td>
          </tr>
        `;
    });

    table.appendChild(tbody);

    // Aggiunge i listener dopo che la tabella è nel DOM
    setTimeout(() => {
        table.querySelectorAll(".expandable").forEach(row => {
            row.addEventListener("click", (e) => {
                if (e.target.closest('.delete-btn-allenamento')) return;
                const targetId = row.dataset.target;
                const subrow = document.getElementById(targetId);
                const open = !subrow.classList.contains("hidden");
                subrow.classList.toggle("hidden", open);
                row.querySelector("td:last-child").textContent = open ? "▶️" : "🔽";
            });
        });

        // Il listener ora si attiverà solo per i bottoni non disabilitati
        table.querySelectorAll(".delete-btn-allenamento:not([disabled])").forEach(btn => {
            btn.addEventListener('click', () => {
                const workoutDate = btn.dataset.workoutDate;
                eliminaAllenamento(workoutDate);
            });
        });
    }, 100);

    return table;
}

/**
 * Elimina un allenamento VUOTO.
 */
async function eliminaAllenamento(workoutDate) {
    const confermato = await showConfirm(`Sei sicuro di voler eliminare l'allenamento vuoto del ${workoutDate}?`);
    if (!confermato) return;

    showLoader(true);
    try {
        // 1. Trova e cancella l'allenamento
        const allenamentiRes = await fetch(`${BASE_URL}/allenamenti.json?orderBy="data"&equalTo="${workoutDate}"`);
        const allenamentiTrovati = await allenamentiRes.json();

        if (allenamentiTrovati) {
            const allenamentoId = Object.keys(allenamentiTrovati)[0];
            await fetch(`${BASE_URL}/allenamenti/${allenamentoId}.json`, { method: 'DELETE' });
        } else {
            throw new Error("Nessun allenamento da eliminare trovato per questa data.");
        }

        // 2. Ricarica i dati della tabella (che gestirà il loader)
        await loadAdminData();

        // 3. Mostra il messaggio di successo DOPO che tutto è stato ricaricato
        await showMessage("Allenamento eliminato con successo.");

    } catch (error) {
        console.error("Errore durante l'eliminazione dell'allenamento:", error);
        // In caso di errore, nascondiamo il loader e mostriamo il messaggio
        showLoader(false);
        await showMessage(`Errore: ${error.message}`);
    }
    // Rimuoviamo il blocco 'finally' perché la gestione del loader è ora interna al try/catch
}


/**
 * Gestisce la sottomissione del form per creare un nuovo allenamento.
 */
async function gestisciAggiuntaAllenamento(event) {
    event.preventDefault();
    showLoader(true);

    const dateInput = document.getElementById('data-nuovo-allenamento');
    const dataFormattata = dateInput.value.replace(/-/g, '/');

    try {
        // 1. Controlla duplicati
        const queryUrl = `${BASE_URL}/allenamenti.json?orderBy="data"&equalTo="${dataFormattata}"`;
        const res = await fetch(queryUrl);
        const allenamentiEsistenti = await res.json();

        if (allenamentiEsistenti && Object.keys(allenamentiEsistenti).length > 0) {
            // Se esiste già, mostra errore e ferma tutto
            showLoader(false);
            await showMessage(`Errore: Esiste già un allenamento per la data ${dataFormattata}.`);
            return;
        }

        // 2. Crea il nuovo allenamento
        const nuovoAllenamento = {
            data: dataFormattata
            // Rimosso id e durata per coerenza con la struttura dati
        };

        const postRes = await fetch(`${BASE_URL}/allenamenti.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuovoAllenamento)
        });

        if (!postRes.ok) {
            throw new Error("Qualcosa è andato storto durante la creazione dell'allenamento.");
        }

        // 3. Pulisci il form e ricarica la tabella
        dateInput.value = '';
        await loadAdminData();

        // 4. Mostra il messaggio di successo alla fine
        await showMessage("Nuovo allenamento creato con successo!");

    } catch (error) {
        console.error("Errore nella creazione dell'allenamento:", error);
        // In caso di errore, nascondiamo il loader e mostriamo il messaggio
        showLoader(false);
        await showMessage(`Errore: ${error.message}`);
    }
    // Rimuoviamo il blocco 'finally'
}



function showLoader(show) {
    const loader = document.getElementById("overlay-loader");
    if (loader) loader.classList.toggle("hidden", !show);
}
