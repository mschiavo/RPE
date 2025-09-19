const BASE_URL = "https://rpe-app-49320-default-rtdb.europe-west1.firebasedatabase.app";

// Funzione di utilità per il parsing delle date (CORRETTA per YYYY/MM/DD)
const parseDate = d => {
    const [year, month, day] = d.split('/');
    return new Date(`${year}-${month}-${day}T00:00:00`);
};

document.addEventListener("DOMContentLoaded", () => {
    // 1. Crea e inserisce dinamicamente il form nella pagina
    const formPlaceholder = document.getElementById('form-container-placeholder');
    if (formPlaceholder) {
        formPlaceholder.appendChild(creaFormNuovoAllenamento());
    }

    // 2. Aggancia l'event listener al form appena creato
    const form = document.getElementById('form-nuovo-allenamento');
    if (form) {
        form.addEventListener('submit', gestisciAggiuntaAllenamento);
    }

    // 3. Carica i dati delle tabelle (logica esistente)
    loadAdminData();
});

async function loadAdminData() {
    showLoader(true);
    try {
        const [allenamenti, rpeData, atlete] = await Promise.all([
            fetchData("allenamenti"),
            fetchData("rpe_data"),
            fetchData("atlete")
        ]);

        // --- 1. Gestione Tabella Allenamenti ---
        const processedData = processWorkoutData(allenamenti, rpeData);
        const container = document.getElementById("admin-container");
        container.innerHTML = '';
        container.appendChild(creaTabellaAllenamenti(processedData, atlete));

        // --- 2. Gestione Tabella Voti Orfani ---
        const votiOrfani = processOrphanVotes(allenamenti, rpeData);
        const containerOrfani = document.getElementById("voti-orfani-container");
        containerOrfani.innerHTML = '';

        if (votiOrfani.length > 0) {
            // Passiamo anche l'array 'allenamenti' alla funzione
            containerOrfani.appendChild(creaTabellaVotiOrfani(votiOrfani, atlete, allenamenti));
        } else {
            containerOrfani.innerHTML = '<h2>Voti Orfani</h2><p>Nessun voto non collegato a un allenamento. Ottimo!</p>';
        }

    } catch (error) {
        console.error("Errore nel caricamento dei dati admin:", error);
        document.getElementById("admin-container").innerHTML = `<p class="error">Impossibile caricare i dati.</p>`;
    } finally {
        showLoader(false);
    }
}

/**
 * Crea e restituisce l'elemento HTML per il form di aggiunta allenamento.
 * @returns {HTMLElement} La sezione del form.
 */
function creaFormNuovoAllenamento() {
    const section = document.createElement('section');
    section.className = 'form-container';

    section.innerHTML = `
        <caption>Aggiungi Nuovo Allenamento</caption>
        <form id="form-nuovo-allenamento">
            <fieldset>
                <div class="form-group">
                    <label for="data-nuovo-allenamento">Data Allenamento:</label>
                    <input type="date" id="data-nuovo-allenamento" required>
                    <button type="submit" class="btn-save">Crea Allenamento</button>
                </div>
            </fieldset>
        </form>
    `;
    return section;
}

async function fetchData(path) {
    const res = await fetch(`${BASE_URL}/${path}.json`);
    if (!res.ok) {
        throw new Error(`Errore nel fetch dei dati da ${path}: ${res.statusText}`);
    }
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

        let deleteButtonHtml;
        if (allenamento.numeroVoti > 0) {
            deleteButtonHtml = `
                <button class="delete-btn-allenamento" disabled title="Impossibile eliminare: ci sono voti associati.">
                    🗑️ Elimina
                </button>
            `;
        } else {
            deleteButtonHtml = `
                <button class="delete-btn-allenamento" data-workout-date="${allenamento.data}" title="Elimina allenamento vuoto">
                    🗑️ Elimina
                </button>
            `;
        }

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

    // Event Delegation per una migliore performance
    table.addEventListener('click', (e) => {
        const expandableRow = e.target.closest('.expandable');
        const deleteBtn = e.target.closest('.delete-btn-allenamento:not([disabled])');

        if (deleteBtn) {
            const workoutDate = deleteBtn.dataset.workoutDate;
            eliminaAllenamento(workoutDate);
            return;
        }

        if (expandableRow) {
            const targetId = expandableRow.dataset.target;
            const subrow = document.getElementById(targetId);
            if (subrow) {
                const open = !subrow.classList.contains("hidden");
                subrow.classList.toggle("hidden", open);
                expandableRow.querySelector("td:last-child").textContent = open ? "▶️" : "🔽";
            }
        }
    });

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
        const allenamentiRes = await fetch(`${BASE_URL}/allenamenti.json?orderBy="data"&equalTo="${workoutDate}"`);
        const allenamentiTrovati = await allenamentiRes.json();

        if (allenamentiTrovati) {
            const allenamentoId = Object.keys(allenamentiTrovati)[0];
            await fetch(`${BASE_URL}/allenamenti/${allenamentoId}.json`, { method: 'DELETE' });
        } else {
            throw new Error("Nessun allenamento da eliminare trovato per questa data.");
        }

        await loadAdminData();
        await showMessage("Allenamento eliminato con successo.");

    } catch (error) {
        console.error("Errore durante l'eliminazione dell'allenamento:", error);
        showLoader(false);
        await showMessage(`Errore: ${error.message}`);
    }
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
        const queryUrl = `${BASE_URL}/allenamenti.json?orderBy="data"&equalTo="${dataFormattata}"`;
        const res = await fetch(queryUrl);
        const allenamentiEsistenti = await res.json();

        if (allenamentiEsistenti && Object.keys(allenamentiEsistenti).length > 0) {
            showLoader(false);
            await showMessage(`Errore: Esiste già un allenamento per la data ${dataFormattata}.`);
            return;
        }

        const nuovoAllenamento = { data: dataFormattata };
        const postRes = await fetch(`${BASE_URL}/allenamenti.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuovoAllenamento)
        });

        if (!postRes.ok) {
            throw new Error("Qualcosa è andato storto durante la creazione dell'allenamento.");
        }

        dateInput.value = '';
        await loadAdminData();
        await showMessage("Nuovo allenamento creato con successo!");

    } catch (error) {
        console.error("Errore nella creazione dell'allenamento:", error);
        showLoader(false);
        await showMessage(`Errore: ${error.message}`);
    }
}

/**
 * Identifica i voti RPE che non hanno un allenamento corrispondente.
 */
function processOrphanVotes(allenamenti, rpeData) {
    const dateAllenamenti = new Set(allenamenti.map(a => a.data));
    return rpeData.filter(voto => voto.data && !dateAllenamenti.has(voto.data));
}

/**
 * Crea la tabella HTML per i voti orfani.
 */
function creaTabellaVotiOrfani(votiOrfani, atlete, allenamenti) {
    const table = document.createElement("table");
    table.innerHTML = `
        <caption>Voti Orfani (non collegati a un allenamento)</caption>
        <thead>
            <tr>
                <th>Atleta</th>
                <th>Data Voto</th>
                <th>RPE</th>
                <th>Azioni</th>
            </tr>
        </thead>
    `;
    const tbody = document.createElement("tbody");

    const opzioniAllenamenti = allenamenti
        .sort((a, b) => parseDate(b.data) - parseDate(a.data)) // Ordina anche le opzioni
        .map(a => `<option value="${a.data}">${a.data}</option>`)
        .join('');

    votiOrfani.forEach(voto => {
        const atleta = atlete.find(a => a.id === voto.atleta_id);
        const nomeAtleta = atleta ? `${atleta.nome} ${atleta.cognome}` : 'Atleta Sconosciuta';
        // Aggiungiamo l'ID del voto alla riga per trovarlo più facilmente
        tbody.innerHTML += `
            <tr data-rpe-id="${voto.id}">
                <td>${nomeAtleta}</td>
                <td>${voto.data}</td>
                <td><strong>${voto.rpe_id}</strong></td>
                <td>
                    <div class="azione-voto-orfano">
                        <select class="select-allenamento">
                            <option value="" selected disabled>Assegna a...</option>
                            ${opzioniAllenamenti}
                        </select>
                        <button class="assign-btn-voto" title="Assegna a questo allenamento" disabled>✔️ Assegna</button>
                        <button class="delete-btn-voto" title="Elimina questo voto">🗑️ Elimina</button>
                    </div>
                </td>
            </tr>
        `;
    });

    table.appendChild(tbody);

    // Event Delegation per la tabella dei voti orfani
    table.addEventListener('click', (e) => {
        const rpeId = e.target.closest('tr')?.dataset.rpeId;
        if (!rpeId) return;

        if (e.target.matches('.assign-btn-voto')) {
            const select = e.target.closest('tr').querySelector('.select-allenamento');
            if (select && select.value) {
                assegnaVotoAdAllenamento(rpeId, select.value);
            }
        } else if (e.target.matches('.delete-btn-voto')) {
            eliminaVotoOrfano(rpeId);
        }
    });

    table.addEventListener('change', (e) => {
        if (e.target.matches('.select-allenamento')) {
            const assignBtn = e.target.closest('tr').querySelector('.assign-btn-voto');
            if (assignBtn) {
                assignBtn.disabled = !e.target.value;
            }
        }
    });

    return table;
}

/**
 * Assegna un voto orfano a un allenamento esistente aggiornando la sua data.
 */
async function assegnaVotoAdAllenamento(rpeDbId, nuovaData) {
    const confermato = await showConfirm(`Sei sicuro di voler assegnare questo voto all'allenamento del ${nuovaData}?`);
    if (!confermato) return;

    showLoader(true);
    try {
        await fetch(`${BASE_URL}/rpe_data/${rpeDbId}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: nuovaData })
        });

        await loadAdminData();
        await showMessage("Voto assegnato con successo.");

    } catch (error) {
        console.error("Errore durante l'assegnazione del voto:", error);
        showLoader(false);
        await showMessage(`Errore: ${error.message}`);
    }
}

/**
 * Elimina un singolo voto orfano.
 */
async function eliminaVotoOrfano(rpeDbId) {
    const confermato = await showConfirm("Sei sicuro di voler eliminare questo voto orfano? L'azione è irreversibile.");
    if (!confermato) return;

    showLoader(true);
    try {
        await fetch(`${BASE_URL}/rpe_data/${rpeDbId}.json`, { method: 'DELETE' });

        await loadAdminData();
        await showMessage("Voto orfano eliminato con successo.");

    } catch (error) {
        console.error("Errore durante l'eliminazione del voto orfano:", error);
        showLoader(false);
        await showMessage(`Errore: ${error.message}`);
    }
}

function showLoader(show) {
    const loader = document.getElementById("overlay-loader");
    if (loader) loader.classList.toggle("hidden", !show);
}
