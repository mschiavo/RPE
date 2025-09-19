// Contenuto per modal.js

const modalOverlay = document.getElementById('modal-overlay');
const modalMessage = document.getElementById('modal-message');
const btnConfirm = document.getElementById('modal-btn-confirm');
const btnCancel = document.getElementById('modal-btn-cancel');
const btnOk = document.getElementById('modal-btn-ok');

/**
 * Mostra un modale di tipo "alert" con un solo bottone OK.
 * @param {string} message
 */
function showAlert(message) {
    modalMessage.textContent = message;

    btnConfirm.classList.add('hidden');
    btnCancel.classList.add('hidden');
    btnOk.classList.remove('hidden');

    modalOverlay.classList.remove('hidden');

    // Usiamo .once per assicurarci che l'evento venga rimosso dopo il click
    btnOk.addEventListener('click', () => modalOverlay.classList.add('hidden'), { once: true });
}

/**
 * Mostra un modale di tipo "confirm" e restituisce una Promise.
 * La promise si risolve con `true` se l'utente conferma, `false` altrimenti.
 * @param {string} message
 * @returns {Promise<boolean>}
 */
function showConfirm(message) {
    modalMessage.textContent = message;

    btnOk.classList.add('hidden');
    btnConfirm.classList.remove('hidden');
    btnCancel.classList.remove('hidden');

    modalOverlay.classList.remove('hidden');

    return new Promise(resolve => {
        btnConfirm.addEventListener('click', () => {
            modalOverlay.classList.add('hidden');
            resolve(true);
        }, { once: true });

        btnCancel.addEventListener('click', () => {
            modalOverlay.classList.add('hidden');
            resolve(false);
        }, { once: true });
    });
}

/**
 * Mostra una finestra di dialogo con un messaggio e un pulsante "OK".
 * Restituisce una Promise che si risolve quando l'utente clicca "OK".
 * @param {string} message - Il messaggio da mostrare.
 * @returns {Promise<void>}
 */
function showMessage(message) {
    return new Promise(resolve => {
        // Imposta il messaggio
        modalMessage.textContent = message;

        // Mostra solo il pulsante "OK"
        btnOk.classList.remove('hidden');
        btnConfirm.classList.add('hidden');
        btnCancel.classList.add('hidden');

        // Mostra la modale
        modalOverlay.classList.remove('hidden');

        // Gestore di eventi
        const okHandler = () => {
            modalOverlay.classList.add('hidden');
            btnOk.removeEventListener('click', okHandler); // Pulizia
            resolve();
        };

        btnOk.addEventListener('click', okHandler);
    });
}
