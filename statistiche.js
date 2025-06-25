// statistiche.js - pagina visualizzazione statistiche

const tokenContainer = document.getElementById('token-container');
const tokenInput = document.getElementById('token');
const tokenSalvaBtn = document.getElementById('token-salva-btn');
let token = localStorage.getItem('github_token') || '';

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
  caricaDati();
});

window.onload = () => {
  if (token) {
    caricaDati();
  }
};

async function caricaDati() {
  showLoader(true);
  try {
    const atlete = await fetchJSON('atlete.json');
    const rpeList = await fetchJSON('rpe.json');
    const allenamenti = await fetchJSON('allenamenti.json');
    const rpeData = await fetchJSON('rpe_atleta_allenamento.json');

    // Mappa dati per accesso veloce
    const mapAtlete = Object.fromEntries(atlete.map(a => [a.id, a]));
    const mapAllenamenti = Object.fromEntries(allenamenti.map(a => [a.id, a]));
    const mapRPE = Object.fromEntries(rpeList.map(r => [r.id, r]));

    // Visualizza tutte le tabelle
    stampaTabellaUltimoAllenamento(rpeData, mapAtlete, mapAllenamenti, mapRPE);
    stampaTabellaMediaPeriodi(rpeData, mapAtlete, mapAllenamenti, mapRPE, 7, 'ultimaSettimana', 'Ultimi 7 giorni');
    stampaTabellaMediaPeriodi(rpeData, mapAtlete, mapAllenamenti, mapRPE, 30, 'ultimoMese', 'Ultimi 30 giorni');
    stampaTabellaPerAtleta(rpeData, mapAtlete, mapRPE, 'perAtleta', 'Voti per atleta');
    stampaTabellaPerRuolo(rpeData, mapAtlete, mapRPE, 'perRuolo', 'Voti per ruolo');

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

function showLoader(show) {
  const loader = document.getElementById('loader');
  loader.style.display = show ? 'block' : 'none';
}

function stampaTabellaUltimoAllenamento(rpeData, mapAtlete, mapAllenamenti, mapRPE) {
  // Trova data ultimo allenamento
  const dateUltimo = new Date(Math.max(...Object.values(mapAllenamenti).map(a => new Date(a.data))));
  const ultimoAllenamento = Object.values(mapAllenamenti).find(a => new Date(a.data).getTime() === dateUltimo.getTime());
  if (!ultimoAllenamento) return;

  const datiUltimo = rpeData.filter(d => d.allenamento_id === ultimoAllenamento.id);

  const container = document.getElementById('ultimoAllenamento');
  container.innerHTML = `<h2 class="text-xl font-bold mb-2">Voti ultimo allenamento (${ultimoAllenamento.data})</h2>`;
  container.appendChild(creaTabella(datiUltimo, mapAtlete, mapRPE));
}

function stampaTabellaMediaPeriodi(rpeData, mapAtlete, mapAllenamenti, mapRPE, giorni, containerId, titolo) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - giorni);

  const datiFiltrati = rpeData.filter(d => {
    const dataAllenamento = new Date(mapAllenamenti[d.allenamento_id]?.data);
    return dataAllenamento >= cutoff;
  });

  // Raggruppa per atleta e calcola medie
  const grouped = {};
  datiFiltrati.forEach(d => {
    const rpeVal = mapRPE[d.rpe_id]?.valore || 0;
    const durata = mapAllenamenti[d.allenamento_id]?.durata || 0;
    if (!grouped[d.atleta_id]) grouped[d.atleta_id] = { totaleRPE: 0, totaleDurata: 0, count: 0 };
    grouped[d.atleta_id].totaleRPE += rpeVal;
    grouped[d.atleta_id].totaleDurata += durata;
    grouped[d.atleta_id].count++;
  });

  const rows = Object.entries(grouped).map(([atletaId, stats]) => {
    const atleta = mapAtlete[atletaId];
    return {
      nome: atleta ? `${atleta.nome} ${atleta.cognome}` : 'Sconosciuto',
      mediaRPE: (stats.totaleRPE / stats.count).toFixed(2),
      mediaDurata: (stats.totaleDurata / stats.count).toFixed(2)
    };
  });

  const container = document.getElementById(containerId);
  container.innerHTML = `
    <h2 class="text-xl font-bold mb-2">${titolo}</h2>
    <div class="overflow-auto">
      <table class="min-w-full bg-white rounded shadow">
        <thead>
          <tr class="bg-gray-200 text-left">
            <th class="p-2">Atleta</th>
            <th class="p-2">RPE medio</th>
            <th class="p-2">Durata media (min)</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr class="border-t">
              <td class="p-2">${r.nome}</td>
              <td class="p-2">${r.mediaRPE}</td>
              <td class="p-2">${r.mediaDurata}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function stampaTabellaPerAtleta(rpeData, mapAtlete, mapRPE, containerId, titolo) {
  const grouped = {};
  rpeData.forEach(d => {
    const rpeVal = mapRPE[d.rpe_id]?.valore || 0;
    if (!grouped[d.atleta_id]) grouped[d.atleta_id] = { totaleRPE: 0, count: 0 };
    grouped[d.atleta_id].totaleRPE += rpeVal;
    grouped[d.atleta_id].count++;
  });

  const rows = Object.entries(grouped).map(([atletaId, stats]) => {
    const atleta = mapAtlete[atletaId];
    return {
      nome: atleta ? `${atleta.nome} ${atleta.cognome}` : 'Sconosciuto',
      mediaRPE: (stats.totaleRPE / stats.count).toFixed(2),
    };
  });

  const container = document.getElementById(containerId);
  container.innerHTML = `
    <h2 class="text-xl font-bold mb-2">${titolo}</h2>
    <div class="overflow-auto">
      <table class="min-w-full bg-white rounded shadow">
        <thead>
          <tr class="bg-gray-200 text-left">
            <th class="p-2">Atleta</th>
            <th class="p-2">RPE medio</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr class="border-t">
              <td class="p-2">${r.nome}</td>
              <td class="p-2">${r.mediaRPE}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function stampaTabellaPerRuolo(rpeData, mapAtlete, mapRPE, containerId, titolo) {
  const grouped = {};
  rpeData.forEach(d => {
    const rpeVal = mapRPE[d.rpe_id]?.valore || 0;
    const atleta = mapAtlete[d.atleta_id];
    if (!atleta) return;
    const ruolo = atleta.ruolo || 'Sconosciuto';
    if (!grouped[ruolo]) grouped[ruolo] = { totaleRPE: 0, count: 0 };
    grouped[ruolo].totaleRPE += rpeVal;
    grouped[ruolo].count++;
  });

  const rows = Object.entries(grouped).map(([ruolo, stats]) => {
    return {
      ruolo,
      mediaRPE: (stats.totaleRPE / stats.count).toFixed(2)
    };
  });

  const container = document.getElementById(containerId);
  container.innerHTML = `
    <h2 class="text-xl font-bold mb-2">${titolo}</h2>
    <div class="overflow-auto">
      <table class="min-w-full bg-white rounded shadow">
        <thead>
          <tr class="bg-gray-200 text-left">
            <th class="p-2">Ruolo</th>
            <th class="p-2">RPE medio</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr class="border-t">
              <td class="p-2">${r.ruolo}</td>
              <td class="p-2">${r.mediaRPE}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function creaTabella(dati, mapAtlete, mapRPE) {
  const table = document.createElement('table');
  table.className = 'min-w-full bg-white rounded shadow';

  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr class="bg-gray-200 text-left">
      <th class="p-2">Atleta</th>
      <th class="p-2">RPE</th>
      <th class="p-2">Descrizione</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  dati.forEach(d => {
    const atleta = mapAtlete[d.atleta_id];
    const rpe = mapRPE[d.rpe_id];
    const tr = document.createElement('tr');
    tr.className = 'border-t';

    const tdNome = document.createElement('td');
    tdNome.className = 'p-2';
    tdNome.textContent = atleta ? `${atleta.nome} ${atleta.cognome}` : 'Sconosciuto';

    const tdRPE = document.createElement('td');
    tdRPE.className = 'p-2';
    tdRPE.textContent = rpe ? rpe.valore : 'N/A';

    const tdDescr = document.createElement('td');
    tdDescr.className = 'p-2';
    tdDescr.textContent = rpe ? rpe.descrizione : '';

    tr.appendChild(tdNome);
    tr.appendChild(tdRPE);
    tr.appendChild(tdDescr);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  return table;
}
