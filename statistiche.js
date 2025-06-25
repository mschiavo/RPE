const API_URL = "https://script.google.com/macros/s/AKfycbx_gVYSWRtgR8IxIlbKzPz26iLnVVVhrhlTVwfVpGyHoxqJaIUjEAb77U6wvXaMpqMEng/exec";

document.addEventListener("DOMContentLoaded", async () => {
  showLoader(true);
  const res = await fetch(`${API_URL}?action=get_all`);
  const data = await res.json();
  showLoader(false);
  renderTabelle(data);
});

function renderTabelle({ atlete, rpe_data, allenamenti }) {
  const container = document.getElementById("tabelle");
  const oggi = new Date();
  const settimanaFa = new Date(oggi); settimanaFa.setDate(oggi.getDate() - 7);
  const meseFa = new Date(oggi); meseFa.setDate(oggi.getDate() - 30);

  const parseData = d => new Date(d + "T00:00:00");

  const ultimiAllenamenti = [...new Set(rpe_data.map(r => r.data))].sort().reverse();
  const ultimaData = ultimiAllenamenti[0];
  const datiUltimo = rpe_data.filter(r => r.data === ultimaData);
  const datiSettimana = rpe_data.filter(r => parseData(r.data) >= settimanaFa);
  const datiMese = rpe_data.filter(r => parseData(r.data) >= meseFa);

  // Funzioni di aggregazione
  const perAtleta = aggregaPer(rpe_data, "atleta_id", atlete);
  const perRuolo = aggregaPer(rpe_data, "ruolo", atlete);
  const medieSettimana = aggregaMedie(datiSettimana, atlete);
  const medieMese = aggregaMedie(datiMese, atlete);

  container.appendChild(creaTabella(datiUltimo, "Voti ultimo allenamento", atlete));
  container.appendChild(creaTabella(medieSettimana, "Media ultima settimana", atlete, true));
  container.appendChild(creaTabella(medieMese, "Media ultimo mese", atlete, true));
  container.appendChild(creaTabella(perAtleta, "Voti per atleta", atlete));
  container.appendChild(creaTabella(perRuolo, "Voti per ruolo", atlete));
}

function aggregaPer(data, chiave, atlete) {
  const mappa = {};
  data.forEach(r => {
    const id = chiave === "ruolo"
        ? atlete.find(a => a.id == r.atleta_id)?.ruolo
        : r.atleta_id;
    if (!mappa[id]) mappa[id] = [];
    mappa[id].push(r);
  });
  return Object.entries(mappa).map(([k, arr]) => {
    const rpeMedia = media(arr.map(x => +x.rpe_id));
    const durataMedia = media(arr.map(x => +x.durata));
    const nome = chiave === "ruolo" ? k : formatNome(atlete, k);
    return { nome, rpe_id: rpeMedia.toFixed(2), durata: durataMedia.toFixed(1) };
  });
}

function aggregaMedie(data, atlete) {
  const mappa = {};
  data.forEach(r => {
    if (!mappa[r.atleta_id]) mappa[r.atleta_id] = [];
    mappa[r.atleta_id].push(r);
  });
  return Object.entries(mappa).map(([id, voci]) => {
    const rpeMedia = media(voci.map(x => +x.rpe_id));
    const durataMedia = media(voci.map(x => +x.durata));
    const nome = formatNome(atlete, id);
    return { nome, rpe_id: rpeMedia.toFixed(2), durata: durataMedia.toFixed(1) };
  });
}

function creaTabella(data, titolo, atlete, soloMedie = false) {
  const table = document.createElement("table");
  table.innerHTML = `<caption>${titolo}</caption>
    <thead><tr>${soloMedie
      ? "<th>Atleta</th><th>RPE medio</th><th>Durata media</th>"
      : "<th>Atleta</th><th>RPE</th><th>Durata</th><th>Data</th>"}</tr></thead>`;
  const tbody = document.createElement("tbody");
  data.forEach(r => {
    const row = document.createElement("tr");
    const nome = r.nome || formatNome(atlete, r.atleta_id);
    row.innerHTML = soloMedie
        ? `<td>${nome}</td><td>${r.rpe_id}</td><td>${r.durata}</td>`
        : `<td>${nome}</td><td>${r.rpe_id}</td><td>${r.durata}</td><td>${r.data}</td>`;
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  return table;
}

function media(arr) {
  const nums = arr.filter(v => !isNaN(v));
  return nums.length ? nums.reduce((a, b) => a + b) / nums.length : 0;
}

function formatNome(atlete, id) {
  const a = atlete.find(a => a.id == id);
  return a ? `${a.nome} ${a.cognome}` : id;
}

function showLoader(on) {
  document.getElementById("loader").style.display = on ? "block" : "none";
}
