// login.js
const BASE_URL = "https://rpe-app-49320-default-rtdb.europe-west1.firebasedatabase.app/";
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
            if (userEntry.password !== password) {
                errorEl.textContent = 'username o password errati';
                return;
            }
        }

        // determina ruolo
        const ruolo = userEntry.profilo === 1 ? 'admin' : 'atleta';
        const atletaId = userEntry.atletaId;

        // salva info in localStorage nello stesso formato del progetto

        const now = Date.now(); // millisecondi
        localStorage.setItem('rpe_user', JSON.stringify({ username, ruolo, atletaId, timestamp:now}));
        console.log(JSON.parse(localStorage.getItem('rpe_user')));

        // redirect alla home
        window.location.href = 'index.html';
    } catch (err) {
        console.error(err);
        errorEl.textContent = 'Errore: ' + err.message;
    }
});

async function fetchData(path) {
    const res = await fetch(`${BASE_URL}/${path}.json`);
    const data = await res.json();
    return Object.entries(data || {})
        .filter(([_, val]) => val !== null && typeof val === "object")
        .map(([id, val]) => ({ ...val, id }));
}
