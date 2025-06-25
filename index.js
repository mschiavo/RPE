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
    div.appendChild(selectRPE);

    grigliaContainer.appendChild(div);
  });
}

btnSalva.addEventListener('click', async () => {
  const durataGenerica = durataGenericaInput.value.trim();
  if (durataGenerica && isNaN(durataGenerica)) {
    alert('La durata generica deve essere un numero valido');
    return;
  }

  const datiAllenamento = [];
  let tuttiCompilati = true;

  const cards = grigliaContainer.querySelectorAll('.atleta-card');
  cards.forEach((card, i) => {
    const atleta = atlete[i];
    const durataInput = card.querySelector('input.durata-input');
    const selectRPE = card.querySelector('select');

    const durata = durataInput.value.trim() || durataGenerica || null;
    if (!durata) {
      tuttiCompilati = false;
    }

    const rpeId = selectRPE.value;

    datiAllenamento.push({
      atleta_id: atleta.id,
      rpe_id: rpeId,
      durata: durata ? Number(durata) : null,
      data: new Date().toISOString()
    });
  });

  if (!tuttiCompilati) {
    if (!confirm('Alcune durate non sono state inserite. Vuoi continuare comunque?')) {
      return;
    }
  }

  try {
    showLoader(true);
    await salvaAllenamento(datiAllenamento);
    alert('Allenamento salvato con successo!');
  } catch (err) {
    alert('Errore nel salvataggio: ' + err.message);
  }
  showLoader(false);
});

async function salvaAllenamento(dati) {
  if (!token) throw new Error('Token GitHub mancante.');

  const repo = 'mschiavo/RPE';
  const path = 'allenamenti.json';

  // Prima leggo il file esistente (se c'è)
  let contenutoPrecedente = [];
  try {
    const fileResp = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });
    if (fileResp.status === 200) {
      const fileJson = await fileResp.json();
      const contentDecoded = atob(fileJson.content.replace(/\n/g, ''));
      contenutoPrecedente = JSON.parse(contentDecoded);
    } else if (fileResp.status !== 404) {
      throw new Error('Errore caricamento file su GitHub');
    }
  } catch (err) {
    if (!err.message.includes('404')) throw err;
  }

  // Aggiungo i nuovi dati
  const datiAggiornati = contenutoPrecedente.concat(dati);

  // Devo fare il commit
  // Prima prendo il sha del file se esiste (per aggiornare)
  let sha = null;
  try {
    const fileInfoResp = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });
    if (fileInfoResp.status === 200) {
      const fileInfoJson = await fileInfoResp.json();
      sha = fileInfoJson.sha;
    }
  } catch { /* ignoro */ }

  const contentBase64 = btoa(JSON.stringify(datiAggiornati, null, 2));

  const commitResp = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json'
    },
    body: JSON.stringify({
      message: `Aggiornamento allenamenti ${new Date().toISOString()}`,
      content: contentBase64,
      sha: sha
    })
  });

  if (!commitResp.ok) {
    const errText = await commitResp.text();
    throw new Error('Errore commit su GitHub: ' + errText);
  }
}

function showLoader(show) {
  loader.style.display = show ? 'block' : 'none';
}
