const API_URL = "https://script.google.com/macros/s/AKfycbx_gVYSWRtgR8IxIlbKzPz26iLnVVVhrhlTVwfVpGyHoxqJaIUjEAb77U6wvXaMpqMEng/exec";

let atlete = [];
let rpeList = [];

document.addEventListener("DOMContentLoaded", async () => {
  showLoader(true);
  const res = await fetch(`${API_URL}?action=get_all`);
  const data = await res.json();
  atlete = data.atlete;
  rpeList = data.rpe;
  renderAtlete();
  showLoader(false);
});

function renderAtlete() {
  const container = document.getElementById("atleteContainer");
  container.innerHTML = "";
  atlete.forEach(a => {
    const div = document.createElement("div");
    div.innerHTML = `
      <h3>${a.nome} ${a.cognome}</h3>
      <select id="rpe-${a.id}">
        ${rpeList.map(r => `<option value="${r.id}">${r.valore} - ${r.descrizione}</option>`).join("")}
      </select>
      <input id="durata-${a.id}" placeholder="Durata specifica (min)" type="number" />
      <hr/>
    `;
    container.appendChild(div);
  });
}

async function salvaDati() {
  const data = document.getElementById("dataAllenamento").value;
  const durata = document.getElementById("durataGenerale").value;

  if (!data || !durata) {
    alert("Inserisci data e durata");
    return;
  }

  const datiRPE = atlete.map(a => {
    return {
      atleta_id: a.id,
      rpe_id: document.getElementById(`rpe-${a.id}`).value,
      durata: document.getElementById(`durata-${a.id}`).value
    };
  });

  showLoader(true);

  await fetch(`${API_URL}?action=save_rpe`, {
    method: "POST",
    body: JSON.stringify({
      data,
      durata_generale: durata,
      dati_rpe: datiRPE
    })
  });

  showLoader(false);
  alert("Dati salvati!");
}

function showLoader(visible) {
  document.getElementById("loader").style.display = visible ? "block" : "none";
}
