const repoOwner = "mschiavo";
const repoName = "RPE";
const allenamentiFile = "allenamenti.json";
const rpeDataFile = "rpe_data.json";
let atlete = [];
let rpeList = [];
let token = "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";

document.addEventListener("DOMContentLoaded", async () => {
  if (token) {
    document.getElementById("token").style.display = "none";
  } else {
    document.getElementById("token").addEventListener("change", (e) => {
      token = e.target.value;
      localStorage.setItem("github_token", token);
      e.target.style.display = "none";
    });
  }

  await caricaDati();
});

async function caricaDati() {
  const atleteRes = await fetch(`https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/atlete.json`);
  const rpeRes = await fetch(`https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/rpe.json`);
  atlete = await atleteRes.json();
  rpeList = await rpeRes.json();
  renderAtlete();
}

function renderAtlete() {
  const container = document.getElementById("atleteContainer");
  container.innerHTML = "";
  atlete.forEach(atleta => {
    const card = document.createElement("div");
    card.className = "border rounded p-4 bg-white shadow";

    const select = document.createElement("select");
    select.className = "mt-2 border p-2 w-full";
    select.id = `rpe-${atleta.id}`;
    rpeList.forEach(rpe => {
      const option = document.createElement("option");
      option.value = rpe.id;
      option.textContent = `${rpe.id} - ${rpe.descrizione}`;
      select.appendChild(option);
    });

    const durataInput = document.createElement("input");
    durataInput.className = "mt-2 border p-2 w-full";
    durataInput.type = "number";
    durataInput.placeholder = "Durata specifica (minuti)";
    durataInput.id = `durata-${atleta.id}`;

    card.innerHTML = `<h2 class="font-bold">${atleta.nome} ${atleta.cognome}</h2>`;
    card.appendChild(select);
    card.appendChild(durataInput);

    container.appendChild(card);
  });
}

async function salvaDati() {
  const dataAllenamento = document.getElementById("dataAllenamento").value;
  const durataGenerale = document.getElementById("durataGenerale").value;

  if (!dataAllenamento || !durataGenerale) {
    alert("Compila data e durata generale.");
    return;
  }

  const allenamenti = await leggiFileJSON(allenamentiFile);
  let allenamentoEsistente = allenamenti.find(a => a.data === dataAllenamento);
  // recupera in ordine cronologico solo l'ultimo allenamento presente nel file
  let ultimoAllenamento =  allenamenti.sort((a, b) => new Date(a.data) - new Date(b.data));
  let allenamentoPrecedente = allenamenti[allenamenti.length - 1];
  let allenamentoId;

  if (allenamentoEsistente) {
    allenamentoId = allenamentoEsistente.id;
    alert("Allenamento già presente per questa data. Userò l’ID esistente.");
  } else {
    allenamentoId = allenamentoPrecedente.id + 1;
    allenamenti.push({
      id: allenamentoId,
      data: dataAllenamento,
      durata: parseInt(durataGenerale)
    });
    await scriviFileJSON(allenamentiFile, allenamenti);
  }

  const rpeData = await leggiFileJSON(rpeDataFile);
  atlete.forEach(atleta => {
    const rpe_id = document.getElementById(`rpe-${atleta.id}`).value;
    const durataSpecifica = document.getElementById(`durata-${atleta.id}`).value;
    rpeData.push({
      atleta_id: atleta.id.toString(),
      allenamento_id: allenamentoId,
      rpe_id: rpe_id.toString(),
      data: dataAllenamento,
      durata: durataSpecifica ? durataSpecifica : durataGenerale
    });
  });

  await scriviFileJSON(rpeDataFile, rpeData);
  alert("Dati salvati con successo!");
}

async function leggiFileJSON(file) {
  const res = await fetch(`https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/${file}?${Date.now()}`);
  if (!res.ok) return [];
  return await res.json();
}

async function scriviFileJSON(fileName, data) {
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${fileName}`;
  const getRes = await fetch(url, {
    headers: { Authorization: `token ${token}` }
  });
  const fileData = await getRes.json();
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `token ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `Aggiornamento ${fileName}`,
      content,
      sha: fileData.sha
    })
  });

  if (!res.ok) {
    alert(`Errore nel salvataggio di ${fileName}`);
  }
}
