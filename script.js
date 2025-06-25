let token = localStorage.getItem('github_token') || '';
const tokenInput = document.getElementById('token');
if (tokenInput && token) tokenInput.value = token;

function salvaToken() {
  token = tokenInput.value;
  localStorage.setItem('github_token', token);
  alert('Token salvato localmente!');
}

async function caricaDati() {
  const atlete = await fetchGitHubJSON('atlete.json');
  const rpeList = await fetchGitHubJSON('rpe.json');
  const container = document.getElementById('atleteContainer');
  container.innerHTML = '';

  atlete.forEach(atleta => {
    const div = document.createElement('div');
    div.className = 'bg-white p-4 rounded shadow';
    div.innerHTML = `
      <h2 class="font-bold mb-2">${atleta.nome} ${atleta.cognome}</h2>
      <label class="block text-sm mb-1">RPE:</label>
      <select class="rpeSelect border p-1 w-full mb-2" data-id="${atleta.id}">
        ${rpeList.map(r => `<option value="${r.id}">${r.valore} - ${r.descrizione}</option>`).join('')}
      </select>
      <label class="block text-sm mb-1">Durata (opzionale):</label>
      <input class="durataInput border p-1 w-full" type="number" data-id="${atleta.id}" />
    `;
    container.appendChild(div);
  });
}

async function fetchGitHubJSON(file) {
  const res = await fetch(`https://raw.githubusercontent.com/mschiavo/RPE/main/${file}`);
  return res.json();
}

async function salvaDati() {
  const allRPE = document.querySelectorAll('.rpeSelect');
  const allDurata = document.querySelectorAll('.durataInput');
  const durataGenerale = document.getElementById('durataGenerale').value;
  const data = new Date().toISOString().split('T')[0];
  const allenamentoId = Date.now();

  const rpeData = Array.from(allRPE).map((sel, i) => ({
    atleta_id: sel.dataset.id,
    allenamento_id: allenamentoId,
    rpe_id: sel.value,
    data: data,
    durata: allDurata[i].value || durataGenerale
  }));

  const allenamento = { id: allenamentoId, data: data, durata: durataGenerale };

  await updateGitHubFile('rpe_data.json', rpeData, true);
  await updateGitHubFile('allenamenti.json', [allenamento], true);

  alert('Dati salvati con successo!');
}

async function updateGitHubFile(filename, newData, append = false) {
  const url = `https://api.github.com/repos/mschiavo/RPE/contents/${filename}`;
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
  };

  const res = await fetch(url, { headers });
  const resData = await res.json();
  const sha = resData.sha;
  const existingData = append ? JSON.parse(atob(resData.content)) : [];

  const updatedContent = btoa(JSON.stringify(append ? [...existingData, ...newData] : newData, null, 2));
  const body = {
    message: `Update ${filename}`,
    content: updatedContent,
    sha: sha,
  };

  await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
}

window.onload = caricaDati;
