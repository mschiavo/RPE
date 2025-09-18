const BASE_URL = "https://rpe-app-49320-default-rtdb.europe-west1.firebasedatabase.app/";

// Elementi del DOM
const formContainer = document.getElementById('form-container');
const atletaForm = document.getElementById('atleta-form');
const formTitle = document.getElementById('form-title');
const tableBody = document.getElementById('atlete-table-body');
const btnAddNew = document.getElementById('btn-add-new');
const btnCancel = document.getElementById('btn-cancel');

let allAtlete = []; // Cache locale delle atlete

/**
 * Funzione principale all'avvio della pagina
 */
document.addEventListener("DOMContentLoaded", () => {
    // Protezione pagina per soli admin
    const logged = JSON.parse(localStorage.getItem('rpe_user'));
    if (!logged || logged.profilo !== 1) {
        alert("Accesso non autorizzato."); // Sostituiremo con modale
        window.location.href = 'index.html';
        return;
    }

    loadAtlete();

    // Event Listeners
    btnAddNew.addEventListener('click', showAddForm);
    btnCancel.addEventListener('click', hideForm);
    atletaForm.addEventListener('submit', handleSave);
});

/**
 * Carica le atlete da Firebase e le renderizza
 */
async function loadAtlete() {
    showLoader(true);
    try {
        const res = await fetch(`${BASE_URL}/atlete.json`);
        const data = await res.json();
        allAtlete = Object.entries(data || {}).map(([id, val]) => ({ ...val, id }));
        renderTable(allAtlete);
    } catch (error) {
        console.error("Errore nel caricamento atlete:", error);
        alert("Impossibile caricare i dati delle atlete."); // Sostituiremo con modale
    } finally {
        showLoader(false);
    }
}

/**
 * Popola la tabella con i dati delle atlete
 * @param {Array} atlete
 */
function renderTable(atlete) {
    tableBody.innerHTML = "";
    atlete.sort((a, b) => a.cognome.localeCompare(b.cognome)).forEach(atleta => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${atleta.nome} ${atleta.cognome}</td>
            <td>${atleta.numero_maglia}</td>
            <td>${atleta.ruolo}</td>
            <td class="actions">
                <button class="btn-edit" data-id="${atleta.id}">Modifica</button>
                <button class="btn-delete" data-id="${atleta.id}">Elimina</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Aggiungi event listener ai nuovi bottoni
    tableBody.querySelectorAll('.btn-edit').forEach(btn => btn.addEventListener('click', (e) => showEditForm(e.target.dataset.id)));
    tableBody.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', (e) => handleDelete(e.target.dataset.id)));
}

function showAddForm() {
    atletaForm.reset();
    document.getElementById('atleta-id').value = '';
    formTitle.textContent = "Aggiungi Nuova Atleta";
    formContainer.classList.remove('hidden');
}

function showEditForm(id) {
    const atleta = allAtlete.find(a => a.id === id);
    if (!atleta) return;

    document.getElementById('atleta-id').value = atleta.id;
    document.getElementById('nome').value = atleta.nome;
    document.getElementById('cognome').value = atleta.cognome;
    document.getElementById('numero_maglia').value = atleta.numero_maglia;
    document.getElementById('ruolo').value = atleta.ruolo;

    formTitle.textContent = "Modifica Atleta";
    formContainer.classList.remove('hidden');
}

function hideForm() {
    formContainer.classList.add('hidden');
}

/**
 * Gestisce il salvataggio (sia aggiunta che modifica)
 * @param {Event} e
 */
async function handleSave(e) {
    e.preventDefault();
    showLoader(true);

    const id = document.getElementById('atleta-id').value;
    const atletaData = {
        nome: document.getElementById('nome').value,
        cognome: document.getElementById('cognome').value,
        numero_maglia: document.getElementById('numero_maglia').value,
        ruolo: document.getElementById('ruolo').value,
    };

    const isEditing = !!id;
    const url = isEditing ? `${BASE_URL}/atlete/${id}.json` : `${BASE_URL}/atlete.json`;
    const method = isEditing ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(atletaData)
        });

        if (!res.ok) throw new Error("Salvataggio fallito");

        hideForm();
        loadAtlete(); // Ricarica la lista aggiornata
        alert("Atleta salvata con successo!"); // Sostituiremo con modale
    } catch (error) {
        console.error("Errore nel salvataggio:", error);
        alert("Errore durante il salvataggio."); // Sostituiremo con modale
    } finally {
        showLoader(false);
    }
}

/**
 * Gestisce l'eliminazione di un'atleta
 * @param {string} id
 */
async function handleDelete(id) {
    // Sostituiremo con modale
    const confermato = confirm(`Sei sicuro di voler eliminare questa atleta? L'operazione è irreversibile.`);
    if (!confermato) return;

    showLoader(true);
    try {
        const res = await fetch(`${BASE_URL}/atlete/${id}.json`, { method: 'DELETE' });
        if (!res.ok) throw new Error("Eliminazione fallita");

        loadAtlete(); // Ricarica la lista aggiornata
        alert("Atleta eliminata con successo."); // Sostituiremo con modale
    } catch (error) {
        console.error("Errore eliminazione:", error);
        alert("Errore durante l'eliminazione."); // Sostituiremo con modale
    } finally {
        showLoader(false);
    }
}

function showLoader(show) {
    const loader = document.getElementById("overlay-loader");
    if (loader) loader.classList.toggle("hidden", !show);
}
