const API_URL = "https://script.google.com/macros/s/AKfycbx_gVYSWRtgR8IxIlbKzPz26iLnVVVhrhlTVwfVpGyHoxqJaIUjEAb77U6wvXaMpqMEng/exec";

document.addEventListener("DOMContentLoaded", async () => {
  showLoader(true);
  const res = await fetch(`${API_URL}?action=get_all`);
  const data = await res.json();
  showLoader(false);
  renderTabelle(data);
});

function renderTabelle({ atlete, rpe_data }) {
  const oggi = new Date();
  const settimanaFa = new Date(oggi); settimanaFa.setDate(oggi.getDate() - 7);
  const meseFa = new Date(oggi); meseFa.setDate(oggi.getDate() - 30);

  const container = document.getElementById("tabelle");

  const parseData = d => new Date(d + "T00:00:00");

  const datiUltimo = filtraPerData(rpe_data, parseData, 0);
  const datiSettimana = rpe_data.filter(r => parseData(r.data) >= settimanaFa);
  const datiMese = rpe_data.filter(r => parseData(r.data) >= meseFa);

  container.appendChild(creaTabella(datiUltimo, "Ultimo allenamento", atlete));
  container.appendChild(creaTabellaMedia(datiSettimana, "Ultima settimana", atlete));
  container.appendChild(creaTabellaMedia(datiMese, "Ultimo mese", atlete));
}

function filtraPerData(data, parseData, giorniFa) {
  const tutteLeDate = [...new Set(data.map(r => r.data))].sort().reverse();
  return data.filter(r => r.data === tutteLeDate[0]);
}

function creaTabella(dati, titolo, atlete) {
  const table = document.createElement("table");
  table.innerHTML = `<caption>${titolo}</caption>
    <thead><tr><th>Atleta</th><th>RPE</th><th>Durata</th><th>Data</th></tr></thead>`;
  const tbody = document.createElement("tbody");

  dati.forEach(r => {
    const atleta = atlete.find(a => a.id == r.atleta_id);
    const nome = atleta ? `${atleta.nome} ${atleta.cognome}` : r.atleta_id;
    const tr = `<tr><td>${nome}</td><td>${r.rpe_id}</td><td>${r.durata}</td><td>${r.data}</td></tr>`;
    tbody.innerHTML += tr;
  });

  table.appendChild(tbody);
  return table;
}

function creaTabellaMedia(dati, titolo, atlete) {
  const gruppi = {};
  dati.forEach(r => {
    if (!gruppi[r.atleta_id]) gruppi[r.atleta_id] = [];
    gruppi[r.atleta_id].push(r);
  });

  const table = document.createElement("table");
  table.innerHTML = `<caption>${titolo}</caption>
    <thead><tr><th>Atleta</th><th>RPE medio</th><th>Durata media</th></tr></thead>`;
  const tbody = document.createElement("tbody");

  Object.entries(gruppi).forEach(([id, rpeList]) => {
    const atleta = atlete.find(a => a.id == id);
    const nome = atleta ? `${atleta.nome} ${atleta.cognome}` : id;
    const rpeMedia = media(rpeList.map(r => +r.rpe_id));
    const durataMedia = media(rpeList.map(r => +r.durata));
    const tr = `<tr><td>${nome}</td><td>${rpeMedia.toFixed(2)}</td><td>${durataMedia.toFixed(1)}</td></tr>`;
    tbody.innerHTML += tr;
  });

  table.appendChild(tbody);
  return table;
}

function media(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function showLoader(on) {
  document.getElementById("loader").style.display = on ? "block" : "none";
}
