const repoOwner = "mschiavo";
const repoName = "RPE";
const files = {
  atlete: "atlete.json",
  rpe_data: "rpe_data.json"
};

let token = localStorage.getItem("github_token");

document.addEventListener("DOMContentLoaded", async () => {
  if (!token) {
    alert("Token mancante! Inseriscilo prima nella pagina principale.");
    return;
  }

  showLoader(true);
  const [atlete, rpeData] = await Promise.all([
    fetchJson(files.atlete),
    fetchJson(files.rpe_data)
  ]);
  showLoader(false);

  renderTabelle({ atlete, rpeData });
});

async function fetchJson(file) {
  const url = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/${file}?${Date.now()}`;
  const res = await fetch(url);
  return res.ok ? res.json() : [];
}

function renderTabelle({ atlete, rpeData }) {
  const container = document.getElementById("tabelle");
  const oggi = new Date();
  const settimanaFa = new Date(oggi); settimanaFa.setDate(oggi.getDate() - 7);
  const meseFa = new Date(oggi); meseFa.setDate(oggi.getDate() - 30);
  const parseData = d => new Date(d + "T00:00:00");

  const ultimeDate = [...new Set(rpeData.map(r => r.data))].sort().reverse();
  const ultimaData = ultimeDate[0];
  const datiUltimo = rpeData.filter(r => r.data === ultimaData);
  const datiSettimana = rpeData.filter(r => parseData(r.data) >= settimanaFa);
  const datiMese = rpeData.filter(r => parseData(r.data) >= meseFa);

  container.appendChild(creaTabella(datiUltimo, "Voti dell'ultimo allenamento", atlete));
  container.appendChild(creaTabellaMedia(datiSettimana, "Media ultima settimana", atlete));
  container.appendChild(creaTabellaMedia(datiMese, "Media ultimo mese", atlete));
  container.appendChild(creaTabellaPerAtleta(rpeData, "Voti per atleta", atlete));
  container.appendChild(creaTabellaPerRuolo(rpeData, "Voti per ruolo", atlete));
}

function creaTabella(dati, titolo, atlete) {
  const table = document.createElement("table");
  table.innerHTML = `<caption>${titolo}</caption>
    <thead><tr><th>Atleta</th><th>RPE</th><th>Durata</th><th>Data</th></tr></thead>`;
  const tbody = document.createElement("tbody");

  dati.forEach(r => {
    const a = atlete.find(at => at.id == r.atleta_id);
    const nome = a ? `${a.nome} ${a.cognome}` : r.atleta_id;
    tbody.innerHTML += `<tr><td>${nome}</td><td>${r.rpe_id}</td><td>${r.durata}</td><td>${r.data}</td></tr>`;
  });

  table.appendChild(tbody);
  return table;
}

function creaTabellaMedia(dati, titolo, atlete) {
  const grouped = {};
  dati.forEach(r => {
    if (!grouped[r.atleta_id]) grouped[r.atleta_id] = [];
    grouped[r.atleta_id].push(r);
  });

  const table = document.createElement("table");
  table.innerHTML = `<caption>${titolo}</caption>
    <thead><tr><th>Atleta</th><th>RPE medio</th><th>Durata media</th></tr></thead>`;
  const tbody = document.createElement("tbody");

  Object.entries(grouped).forEach(([id, arr]) => {
    const a = atlete.find(at => at.id == id);
    const nome = a ? `${a.nome} ${a.cognome}` : id;
    const rpeMedia = media(arr.map(r => +r.rpe_id));
    const durataMedia = media(arr.map(r => +r.durata));
    tbody.innerHTML += `<tr><td>${nome}</td><td>${rpeMedia.toFixed(2)}</td><td>${durataMedia.toFixed(1)}</td></tr>`;
  });

  table.appendChild(tbody);
  return table;
}

function creaTabellaPerAtleta(dati, titolo, atlete) {
  return creaTabella(dati, titolo, atlete);
}

function creaTabellaPerRuolo(dati, titolo, atlete) {
  const grouped = {};

  dati.forEach(r => {
    const atleta = atlete.find(a => a.id == r.atleta_id);
    const ruolo = atleta ? atleta.ruolo : "Sconosciuto";
    if (!grouped[ruolo]) grouped[ruolo] = [];
    grouped[ruolo].push(r);
  });

  const table = document.createElement("table");
  table.innerHTML = `<caption>${titolo}</caption>
    <thead><tr><th>Ruolo</th><th>RPE medio</th><th>Durata media</th></tr></thead>`;
  const tbody = document.createElement("tbody");

  Object.entries(grouped).forEach(([ruolo, arr]) => {
    const rpeMedia = media(arr.map(r => +r.rpe_id));
    const durataMedia = media(arr.map(r => +r.durata));
    tbody.innerHTML += `<tr><td>${ruolo}</td><td>${rpeMedia.toFixed(2)}</td><td>${durataMedia.toFixed(1)}</td></tr>`;
  });

  table.appendChild(tbody);
  return table;
}

function media(arr) {
  return arr.length ? arr.reduce((a, b) => a + b) / arr.length : 0;
}

function showLoader(show) {
  document.getElementById("loader").style.display = show ? "block" : "none";
}
