const repoOwner = "mschiavo";
const repoName = "RPE";
const files = {
  atlete: "atlete.json",
  rpe: "rpe.json",
  allenamenti: "allenamenti.json",
  rpe_data: "rpe_data.json"
};

let token = localStorage.getItem("github_token");
let atlete = [], rpeList = [];

document.addEventListener("DOMContentLoaded", async () => {
  setupTokenField();

  if (!token) return;

  showLoader(true);
  [atlete, rpeList] = await Promise.all([
    readJson(files.atlete),
    readJson(files.rpe)
  ]);
  renderAtlete();
  showLoader(false);
});

function setupTokenField() {
  const container = document.getElementById("token-container");
  const salvaBtn = document.getElementById("salva-token");

  if (token) {
    container.style.display = "none";
  } else {
    container.style.display = "block";
    salvaBtn.addEventListener("click", () => {
      token = document.getElementById("token").value.trim();
      if (token) {
        localStorage.setItem("github_token", token);
        location.reload();
      }
    });
  }
}

function renderAtlete() {
  const container = document.getElementById("atleteContainer");
  container.innerHTML = "";
  atlete.forEach(a => {
    const div = document.createElement("div");
    div.innerHTML = `
      <h3>${a.nome} ${a.cognome}</h3>
      <select id="rpe-${a.id}">
        ${rpeList.map(r => `<option value="${r.id}">${r.valore} – ${r.descrizione}</option>`).join("")}
      </select>
      <input id="durata-${a.id}" type="number" placeholder="Durata (opzionale)" />
      <hr/>
    `;
    container.appendChild(div);
  });

  document.getElementById("salvaDatiBtn").addEventListener("click", salvaDati);
}

async function salvaDati() {
  const data = document.getElementById("dataAllenamento").value;
  const durataGen = document.getElementById("durataGenerale").value;

  if (!data || !durataGen) {
    alert("Data e durata generale sono obbligatorie");
    return;
  }

  showLoader(true);
  const allenamenti = await readJson(files.allenamenti);
  const rpeData = await readJson(files.rpe_data);

  let allenamento = allenamenti.find(a => a.data === data);
  let allenamento_id = allenamento?.id;

  if (!allenamento_id) {
    allenamento_id = Date.now();
    allenamenti.push({ id: allenamento_id, data, durata: durataGen });
    await writeJson(files.allenamenti, allenamenti);
  } else {
    alert("Allenamento già presente! Verranno aggiornati i dati.");
  }

  const nuoviRPE = atlete.map(a => {
    const durataSpecifica = document.getElementById(`durata-${a.id}`).value;
    return {
      atleta_id: a.id,
      allenamento_id,
      rpe_id: document.getElementById(`rpe-${a.id}`).value,
      data,
      durata: durataSpecifica || durataGen
    };
  });

  await writeJson(files.rpe_data, [...rpeData, ...nuoviRPE]);
  showLoader(false);
  alert("Dati salvati!");
}

async function readJson(file) {
  const url = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/${file}?${Date.now()}`;
  const res = await fetch(url);
  return res.ok ? res.json() : [];
}

async function writeJson(file, data) {
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${file}`;
  const res = await fetch(url, { headers: { Authorization: `token ${token}` } });
  const sha = (await res.json()).sha;

  await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `token ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `update ${file}`,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))),
      sha
    })
  });
}

function showLoader(on) {
  document.getElementById("loader").style.display = on ? "block" : "none";
}
