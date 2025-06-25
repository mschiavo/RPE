// statistiche.js - gestione visualizzazione tabelle statistiche

const loader = document.getElementById('loader');

const repo = 'mschiavo/RPE'; // Modifica se necessario

const tabUltimoAllenamento = document.querySelector('#tab-ultimo-allenamento tbody');
const tabUltimaSettimana = document.querySelector('#tab-ultima-settimana tbody');
const tabUltimoMese = document.querySelector('#tab-ultimo-mese tbody');
const tabPerAtleta = document.querySelector('#tab-per-atleta tbody');
const tabPerRuolo = document.querySelector('#tab-per-ruolo tbody');

let token = GITHUB_TOKEN;

let atlete = [];
let allenamenti = [];
let rpeList = [];
let rpeData = [];

init();

async function init() {
  showLoader(true);
  try {
    [atlete, rpeList, allenamenti, rpeData] = await Promise.all([
      fetchJSON('atlete.json'),
      fetchJSON('rpe.json'),
      fetchAllenamenti(),
      fetchJSON('rpe_data.json')
    ]);
    popolaTabelle();
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

async function fetchAllenamenti() {
  // Prendo allenamenti da GitHub
  const url = `https://api.github.com/repos/${repo}/contents/allenamenti.json`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json'
    }
  });
  if (resp.status === 404) return [];
  if (!resp.ok) throw new Error('Errore nel caricamento degli allenamenti');
  const json = await resp.json();
  const content = atob(json.content.replace(/\n/g, ''));
  return JSON.parse(content);
}

// Trova atleta per id
function getAtletaById(id) {
  return atlete.find(a => a.id === id);
}
// Trova RPE per id
function getRPEById(id) {
  return rpeList.find(r => r.id === id);
}

// Funzione per popolare tutte le tabelle
function popolaTabelle() {
  if (allenamenti.length === 0) {
    const vuotoRow = '<tr><td colspan="5" style="text-align:center;">Nessun dato disponibile</td></tr>';
    tabUltimoAllenamento.innerHTML = vuotoRow;
    tabUltimaSettimana.innerHTML = vuotoRow;
    tabUltimoMese.innerHTML = vuotoRow;
    tabPerAtleta.innerHTML = vuotoRow;
    tabPerRuolo.innerHTML = vuotoRow;
    return;
  }

  // 1) Voti ultimo allenamento
  const ultimoData = getUltimaData(allenamenti);
  const allenamentoUltimo = allenamenti.filter(a => a.data.startsWith(ultimoData));
  const datiAllenamentoUltimo = rpeData.filter(d => allenamentoUltimo.some(a => a.id === d.allenamento_id));
  popolaTabUltimoAllenamento(datiAllenamentoUltimo);

  // 2) Voti medi ultima settimana (7 giorni precedenti incluso oggi)
  const settimanaDataMin = new Date();
  settimanaDataMin.setDate(settimanaDataMin.getDate() - 6);
  let filterAllenamentiUltimaSettimana = allenamenti.filter(a => new Date(a.data) >= settimanaDataMin);
  popolaTabAggregata(rpeData.filter(d => filterAllenamentiUltimaSettimana.some(a => a.id === d.allenamento_id)), tabUltimaSettimana);

  // 3) Voti medi ultimo mese (30 giorni precedenti incluso oggi)
  const meseDataMin = new Date();
  meseDataMin.setDate(meseDataMin.getDate() - 29);
  let filterAllenamentiUltimoMese = allenamenti.filter(a => new Date(a.data) >= meseDataMin);
  popolaTabAggregata(rpeData.filter(d => filterAllenamentiUltimoMese.some(a => a.id === d.allenamento_id)), tabUltimoMese);

  // 4) Voti per atleta (tutti)
  popolaTabPerAtleta(rpeData);

  // 5) Voti per ruolo (tutti)
  popolaTabPerRuolo(rpeData);
}

function getUltimaData(allenamenti) {
  // Prendo la data massima YYYY-MM-DD (senza orario)
  const dates = allenamenti.map(a => a.data.substring(0, 10));
  return dates.reduce((max, curr) => (curr > max ? curr : max), '0000-00-00');
}

function popolaTabUltimoAllenamento(dati) {
  if (dati.length === 0) {
    tabUltimoAllenamento.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nessun dato disponibile</td></tr>';
    return;
  }
  tabUltimoAllenamento.innerHTML = '';

  dati.forEach(d => {
    const atleta = getAtletaById(d.atleta_id);
    const rpe = getRPEById(d.rpe_id);
    if (!atleta || !rpe) return;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${atleta.nome}</td>
      <td>${atleta.ruolo || ''}</td>
      <td>${rpe.valore}</td>
      <td>${d.durata ?? ''}</td>
      <td>${d.data.substring(0,10)}</td>
    `;
    tabUltimoAllenamento.appendChild(tr);
  });
}

// Funzione per aggregare dati per atleta (media rpe e durata) e popolare tabella passata
function popolaTabAggregata(dati, tbody) {
  if (dati.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Nessun dato disponibile</td></tr>';
    return;
  }
  // Raggruppa per atleta id
  const map = new Map();

  dati.forEach(d => {
    if (!map.has(d.atleta_id)) {
      map.set(d.atleta_id, { count: 0, sommaRpe: 0, sommaDurata: 0 });
    }
    const obj = map.get(d.atleta_id);
    obj.count++;
    const rpeVal = getRPEById(d.rpe_id)?.valore ?? 0;
    obj.sommaRpe += rpeVal;
    obj.sommaDurata += parseInt(d.durata ?? ``);
  });

  tbody.innerHTML = '';
  map.forEach((val, atletaId) => {
    const atleta = getAtletaById(atletaId);
    if (!atleta) return;
    const mediaRpe = (parseInt(val.sommaRpe) / val.count).toFixed(2);
    const mediaDurata = (parseInt(val.sommaDurata) / val.count).toFixed(1);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${atleta.nome}</td>
      <td>${mediaRpe}</td>
      <td>${mediaDurata}</td>
    `;
    tbody.appendChild(tr);
  });
}

function popolaTabPerAtleta(dati) {
  if (dati.length === 0) {
    tabPerAtleta.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nessun dato disponibile</td></tr>';
    return;
  }
  const map = new Map();

  dati.forEach(d => {
    if (!map.has(d.atleta_id)) {
      map.set(d.atleta_id, { count: 0, sommaRpe: 0, sommaDurata: 0 });
    }
    const obj = map.get(d.atleta_id);
    obj.count++;
    const rpeVal = getRPEById(d.rpe_id)?.valore ?? 0;
    obj.sommaRpe += rpeVal;
    obj.sommaDurata += parseInt(d.durata ?? '');
  });

  tabPerAtleta.innerHTML = '';
  map.forEach((val, atletaId) => {
    const atleta = getAtletaById(atletaId);
    if (!atleta) return;
    const mediaRpe = (val.sommaRpe / val.count).toFixed(2);
    const mediaDurata = (val.sommaDurata / val.count).toFixed(1);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${atleta.nome}</td>
      <td>${atleta.ruolo || ''}</td>
      <td>${val.count}</td>
      <td>${mediaRpe}</td>
      <td>${mediaDurata}</td>
    `;
    tabPerAtleta.appendChild(tr);
  });
}

function popolaTabPerRuolo(dati) {
  if (dati.length === 0) {
    tabPerRuolo.innerHTML = '<tr><td colspan="3" style="text-align:center;">Nessun dato disponibile</td></tr>';
    return;
  }
  const map = new Map();

  dati.forEach(d => {
    const atleta = getAtletaById(d.atleta_id);
    if (!atleta) return;
    const ruolo = atleta.ruolo || 'Sconosciuto';

    if (!map.has(ruolo)) {
      map.set(ruolo, { count: 0, sommaRpe: 0, sommaDurata: 0 });
    }
    const obj = map.get(ruolo);
    obj.count++;
    const rpeVal = getRPEById(d.rpe_id)?.valore ?? 0;
    obj.sommaRpe += rpeVal;
    obj.sommaDurata += parseInt(d.durata ?? '');
  });

  tabPerRuolo.innerHTML = '';
  map.forEach((val, ruolo) => {
    const mediaRpe = (val.sommaRpe / val.count).toFixed(2);
    const mediaDurata = (val.sommaDurata / val.count).toFixed(1);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${ruolo}</td>
      <td>${mediaRpe}</td>
      <td>${mediaDurata}</td>
    `;
    tabPerRuolo.appendChild(tr);
  });
}

function showLoader(show) {
  loader.style.display = show ? 'block' : 'none';
}
