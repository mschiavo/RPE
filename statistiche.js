let token = localStorage.getItem('github_token') || '';
document.getElementById('token').value = token;

function salvaToken() {
  token = document.getElementById('token').value;
  localStorage.setItem('github_token', token);
  alert('Token salvato localmente!');
}

const urlBase = 'https://raw.githubusercontent.com/mschiavo/RPE/main';

window.onload = async () => {
  const [atlete, allenamenti, rpeList, rpeData] = await Promise.all([
    fetchJSON('atlete.json'),
    fetchJSON('allenamenti.json'),
    fetchJSON('rpe.json'),
    fetchJSON('rpe_data.json'),
  ]);

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
