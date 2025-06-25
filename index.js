// index.js - Gestione pagina inserimento RPE

const tokenContainer = document.getElementById('token-container');
const tokenInput = document.getElementById('token');
const tokenSalvaBtn = document.getElementById('token-salva-btn');
const grigliaContainer = document.getElementById('griglia-atlete');
const btnSalva = document.getElementById('btn-salva');
const loader = document.getElementById('loader');
const durataGenericaInput = document.getElementById('durata-generica');

let token = localStorage.getItem('github_token') || '';
let atlete = [];
let rpeList = [];

if (token) {
  tokenContainer.style.display = 'none';
} else {
  tokenContainer.style.display = 'block';
}

tokenSalvaBtn.addEventListener('click', () => {
  const val = tokenInput.value.trim();
  if (!val) {
    alert('Inserisci un token GitHub valido');
    return;
  }
  token = val;
  localStorage.setItem('github_token', token);
  alert('Token salvato localmente!');
  tokenContainer.style.display = 'none';
  caricaAtleteERPE();
});

window.onload = () => {
  if (token) {
    caricaAtleteERPE();
  }
};

async function caricaAtleteERPE() {
  showLoader(true);
  try {
    atlete = await fetchJSON('atlete.json');
    rpeList = await fetchJSON('rpe.json');
    popolaGrigliaAtlete();
  } catch (err) {
    alert('Errore caricamento dati: ' + err.message);
  }
  showLoader(false);
}

async function fetchJSON(filename) {
  const resp = await fetch(filename);
  if (!resp.ok) throw new Error(`Impossibile caricare ${filename}`);
  return resp.json();
}

function popolaGrigliaAtlete() {
  grigliaContainer.innerHTML = '';

  atlete.forEach(atleta => {
    const div = document.createElement('div');
    div.className = 'atleta-card';

    const nome = document.createElement('h3');
    nome.textContent = `${atleta.nome} ${atleta.cognome} (#${atleta.numero_maglia})`;

    const ruolo = document.createElement('p');
    ruolo.textContent = `Ruolo: ${atleta.ruolo}`;

    // Durata input per atleta (opzionale)
    const durataInput = document.createElement('input');
    durataInput.type = 'number';
    durataInput.min = '1';
    durataInput.placeholder = 'Durata (min)';
    durataInput.className = 'durata-input';

    // Select RPE
    const selectRPE = document.createElement('select');
    rpeList.forEach(rpe => {
      const option = document.createElement('option');
      option.value = rpe.id;
      option.textContent = `${rpe.valore} - ${rpe.descrizione}`;
      selectRPE.appendChild(option);
    });

    div.appendChild(nome);
    div.appendChild(ruolo);
    div.appendChild(durataInput);
    div.appendChild(selectR
