// login.js
import { fetchData } from './utils.js'; // usa le stesse funzioni del progetto
// import db se serve per pushData (non necessario per login in lettura)

const loginForm = document.getElementById('loginForm');
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('error');
    errorEl.textContent = '';

    try {
        // fetchData segue lo standard del progetto
        const utenti = await fetchData('utenza');

        // trova l'utente per username
        const userEntry = Object.values(utenti).find(u => u.username === username);
        if (!userEntry) {
            errorEl.textContent = 'Utente non trovato';
            return;
        }

        if (userEntry.password !== password) {
            errorEl.textContent = 'Password errata';
            return;
        }

        // determina ruolo
        const ruolo = userEntry.profilo === 1 ? 'admin' : 'athlete';
        const atletaId = userEntry.atletaId;

        // salva info in localStorage nello stesso formato del progetto
        localStorage.setItem('rpe_user', JSON.stringify({ username, ruolo, atletaId }));

        // redirect alla home
        window.location.href = 'index.html';
    } catch (err) {
        console.error(err);
        errorEl.textContent = 'Errore: ' + err.message;
    }
});
