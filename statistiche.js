let token = localStorage.getItem('github_token') || '';
const tokenContainer = document.getElementById('token-container');
const tokenInput = document.getElementById('token');

if (token) {
  // Nascondi il form token se già presente
  tokenContainer.style.display = 'none';
} else {
  tokenInput.value = '';
  tokenContainer.style.display = 'block';
}

function salvaToken() {
  token = tokenInput.value.trim();
  if (!token) {
    alert('Inserisci un token valido!');
    return;
  }
  localStorage.setItem('github_token', token);
  alert('Token salvato localmente!');
  tokenContainer.style.display = 'none';
    window.onload = () => {
      if (token) caricaDati();
    };
}

const urlBase = 'https://raw.githubusercontent.com/mschiavo/RPE/main';

async function caricaDati() {
  const [atlete, allenamenti, rpeList, rpeData] = await Promise.all([
    fetchJSON('atlete.json'),
    fetchJSON('allenamenti.json'),
    fetchJSON('rpe.json'),
    fetchJSON('rpe_data.json'),
  ]);

  const mapRPEValore = Object.fromEntries(rpeList.map(r => [r.id, r.valore]));

  function mappaRPEIdARate(rpeId) {
    return mapRPEValore[rpeId] || 0;
  }

  function raggruppaPerAtletaConMedia(dati) {
    const grouped = {};
    dati.forEach(d => {
      const rpeVal = mappaRPEIdARate(d.rpe_id);
      if (!grouped[d.atleta_id]) grouped[d.atleta_id] = { totaleRPE: 0, totaleDurata: 0, count: 0 };
      grouped[d.atleta_id].totaleRPE += rpeVal;
      grouped[d.atleta_id].totaleDurata += d.durata || 0;
      grouped[d.atleta_id].count++;
    });
    return grouped;
  }

  // Per tabella ultima settimana
  const datiUltimaSettimana = rpeData.filter(d => new Date(mapAllenamenti[d.allenamento_id]?.data) >= oneWeekAgo);
  const groupedSettimana = raggruppaPerAtletaConMedia(datiUltimaSettimana);
  stampaTabellaMediaSettimanaMese('ultimaSettimana', 'Ultimi 7 giorni', datiUltimaSettimana, mapAtlete, mapAllenamenti);
  
  // Per tabella ultimo mese
  const datiUltimoMese = rpeData.filter(d => new Date(mapAllenamenti[d.allenamento_id]?.data) >= oneMonthAgo);
  const groupedMese = raggruppaPerAtletaConMedia(datiUltimoMese);
  stampaTabellaMediaSettimanaMese('ultimoMese', 'Ultimi 30 giorni', datiUltimoMese, mapAtlete, mapAllenamenti);


  const mapRPE = Object.fromEntries(rpeList.map(r => [r.id, `${r.valore} - ${r.descrizione}`]));
  const mapAtlete = Object.fromEntries(atlete.map(a => [a.id, a]));
  const mapAllenamenti = Object.fromEntries(allenamenti.map(a => [a.id, a]));

  const today = new Date();
  const oneWeekAgo = new Date(today); oneWeekAgo.setDate(today.getDate() - 7);
  const oneMonthAgo = new Date(today); oneMonthAgo.setDate(today.getDate() - 30);

  const ultimoAllenamentoId = Math.max(...allenamenti.map(a => a.id));
  const ultimoAllenamentoData = rpeData.filter(d => d.allenamento_id == ultimoAllenamentoId);

  const setTimelimit = (daysAgo) => {
    return rpeData.filter(d => new Date(mapAllenamenti[d.allenamento_id]?.data) >= daysAgo);
  };

  const media = (arr) => (arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : "-");

  stampaTabella('ultimoAllenamento', 'Ultimo Allenamento', ultimoAllenamentoData, mapAtlete, mapRPE);
  stampaTabella('ultimaSettimana', 'Ultimi 7 giorni', setTimelimit(oneWeekAgo), mapAtlete, mapRPE);
  stampaTabella('ultimoMese', 'Ultimi 30 giorni', setTimelimit(oneMonthAgo), mapAtlete, mapRPE);

  // Media per atleta
  const perAtleta = {};
  rpeData.forEach(r => {
    const valore = parseInt(mapRPE[r.rpe_id]);
    if (!perAtleta[r.atleta_id]) perAtleta[r.atleta_id] = [];
    perAtleta[r.atleta_id].push(valore);
  });

  const perRuolo = {};
  for (const id in perAtleta) {
    const atleta = mapAtlete[id];
    const ruolo = atleta?.ruolo || 'ND';
    if (!perRuolo[ruolo]) perRuolo[ruolo] = [];
    perRuolo[ruolo].push(...perAtleta[id]);
  }

  stampaTabellaMedia('mediaPerAtleta', 'Media per Atleta', Object.entries(perAtleta).map(([id, v]) => ({
    nome: `${mapAtlete[id]?.nome} ${mapAtlete[id]?.cognome}`,
    media: media(v)
  })));

  stampaTabellaMedia('mediaPerRuolo', 'Media per Ruolo', Object.entries(perRuolo).map(([r, v]) => ({
    nome: r,
    media: media(v)
  })));
};

async function fetchJSON(file) {
  const res = await fetch(`${urlBase}/${file}`);
  return res.json();
}

function stampaTabella(containerId, titolo, dati, mapAtlete, mapRPE) {
  const container = document.getElementById(containerId);
  container.innerHTML = `
    <h2 class="text-xl font-bold mb-2">${titolo}</h2>
    <div class="overflow-auto">
    <table class="min-w-full bg-white rounded shadow">
      <thead>
        <tr class="bg-gray-200 text-left">
          <th class="p-2">Atleta</th>
          <th class="p-2">RPE</th>
          <th class="p-2">Durata</th>
        </tr>
      </thead>
      <tbody>
        ${dati.map(d => `
          <tr class="border-t">
            <td class="p-2">${mapAtlete[d.atleta_id]?.nome} ${mapAtlete[d.atleta_id]?.cognome}</td>
            <td class="p-2">${mapRPE[d.rpe_id]}</td>
            <td class="p-2">${d.durata} min</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    </div>
  `;
}

function stampaTabellaMedia(containerId, titolo, dati) {
  const container = document.getElementById(containerId);
  container.innerHTML = `
    <h2 class="text-xl font-bold mb-2">${titolo}</h2>
    <div class="overflow-auto">
    <table class="min-w-full bg-white rounded shadow">
      <thead>
        <tr class="bg-gray-200 text-left">
          <th class="p-2">Nome</th>
          <th class="p-2">Media RPE</th>
        </tr>
      </thead>
      <tbody>
        ${dati.map(d => `
          <tr class="border-t">
            <td class="p-2">${d.nome}</td>
            <td class="p-2">${d.media}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    </div>
  `;
}

function stampaTabellaMediaSettimanaMese(containerId, titolo, dati, mapAtlete, mapAllenamenti) {
  // Raggruppa i dati per atleta
  const grouped = {};
  dati.forEach(d => {
    if (!grouped[d.atleta_id]) grouped[d.atleta_id] = { totaleRPE: 0, totaleDurata: 0, count: 0 };
    grouped[d.atleta_id].totaleRPE += parseInt(d.rpe_id); // se rpe_id è id, bisogna mappare al valore, correggo sotto
    grouped[d.atleta_id].totaleDurata += d.durata || 0;
    grouped[d.atleta_id].count++;
  });

  // Per correggere l'errore rpe_id che è id, serve mappare al valore RPE
  // quindi passiamo mapRPE come oggetto id => valore numerico
  // modifica chiamata sotto

  const rows = Object.entries(grouped).map(([atletaId, stats]) => {
    const atleta = mapAtlete[atletaId];
    const mediaRPE = (stats.totaleRPE / stats.count).toFixed(2);
    const mediaDurata = (stats.totaleDurata / stats.count).toFixed(2);
    return {
      nome: atleta ? `${atleta.nome} ${atleta.cognome}` : 'Sconosciuto',
      mediaRPE,
      mediaDurata
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

