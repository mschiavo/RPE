const BASE_URL = "https://rpe-app-49320-default-rtdb.europe-west1.firebasedatabase.app/";

let atlete = [];
let atleteDaMostrare = [];
let rpeList = [];

document.addEventListener("DOMContentLoaded", async () => {
    showLoader(true);
    atlete = await fetchData("atlete");
    rpeList = await fetchData("rpe");
    renderAtlete();
    showLoader(false);
});

const logged = JSON.parse(localStorage.getItem('rpe_user'));
console.log(JSON.parse(localStorage.getItem('rpe_user')));
if (!logged) {
    window.location.href = 'login.html';
} else {
    const now = Date.now();
    const maxSession = 20 * 60 * 1000; // 20 minuti in ms

    if ((now - logged.timestamp) > maxSession) {
        // sessione scaduta
        localStorage.removeItem('rpe_user');
        alert('Sessione scaduta, effettua di nuovo il login.');
        window.location.href = 'login.html';
    }

    const statisticheBtn = document.getElementById('statisticheBtn');
    statisticheBtn.style.display = logged.profilo === 1 ? 'inline-block' : 'none';
}

// mostra info utente e logout
document.addEventListener('DOMContentLoaded', () => {
    const userSpan = document.getElementById('username-display');
    if (userSpan) {
        userSpan.textContent = logged.username;
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.style.display = 'inline-block';
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('rpe_user');
            window.location.href = 'login.html';
        });
    }
});

async function fetchData(path) {
    const res = await fetch(`${BASE_URL}/${path}.json`);
    const data = await res.json();
    return Object.entries(data || {})
        .filter(([_, val]) => val !== null && typeof val === "object")
        .map(([id, val]) => ({ ...val, id }));
}


// function renderAtleteList(atlete) {
//     const container = document.getElementById('atlete-list');
//     container.innerHTML = '';
//     if (logged.ruolo === 'admin') {
//         atlete.forEach(a => {
//             const div = document.createElement('div');
//             div.textContent = `${a.nome} ${a.cognome}`;
//             container.appendChild(div);
//         });
//     } else if (logged.ruolo === 'athlete') {
//         const my = atlete.find(a => a.id === logged.atletaId);
//         if (my) {
//             const div = document.createElement('div');
//             div.textContent = `${my.nome} ${my.cognome}`;
//             container.appendChild(div);
//         }
//     }
// }

// function setupRpeForm(atlete) {
//     const select = document.getElementById('atletaSelect');
//     select.innerHTML = '';
//     if (logged.ruolo === 'admin') {
//         atlete.forEach(a => {
//             const opt = document.createElement('option');
//             opt.value = a.id;
//             opt.textContent = `${a.nome} ${a.cognome}`;
//             select.appendChild(opt);
//         });
//         select.disabled = false;
//     } else if (logged.ruolo === 'athlete') {
//         const my = atlete.find(a => a.id === logged.atletaId);
//         const opt = document.createElement('option');
//         opt.value = logged.atletaId;
//         opt.textContent = `${my.nome} ${my.cognome}`;
//         select.appendChild(opt);
//         select.disabled = true;
//     }
// }

// function submitRpe(formData) {
//     if (logged.ruolo === 'athlete') formData.atletaId = logged.atletaId;
//     // Salva i dati RPE sul DB o JSON come nella versione originale
//     saveRpe(formData);
// }


function renderAtlete() {
    const container = document.getElementById("atleteContainer");
    container.innerHTML = "";

    if (logged.profilo === 1) {
        // admin vede tutte
        atleteDaMostrare = atlete;
        console.log("renderAtlete() -> admin");
    } else if (logged.profilo === 2) {
        // atleta vede solo se stesso
        atleteDaMostrare = atlete.filter(a => a.id == logged.atletaId);
        console.log("renderAtlete() -> atleta -> " + logged);
    }

    atleteDaMostrare.forEach(a => {
        const div = document.createElement("div");
        div.classList.add("card-atleta");

        const rpeButtons = rpeList.map(r => `
      <button type="button" class="rpe-btn" data-atleta="${a.id}" data-rpe="${r.id}">
        ${r.valore}
        <span class="tooltip">${r.descrizione}</span>
      </button>
    `).join("");

        div.innerHTML = `
      <h3>${a.nome} ${a.cognome}</h3>
      <div class="rpe-grid">${rpeButtons}</div>
      <input id="durata-${a.id}" type="number" placeholder="Durata (opzionale)" />
    `;

        container.appendChild(div);
    });

    // Aggiungi gestione click su pulsanti RPE
    document.querySelectorAll(".rpe-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const atletaId = btn.dataset.atleta;
            const value = btn.dataset.rpe;
            document.querySelectorAll(`.rpe-btn[data-atleta="${atletaId}"]`).forEach(b => {
                b.classList.remove("selected");
            });
            btn.classList.add("selected");
        });
    });

}

async function salvaDati() {
    const data = document.getElementById("dataAllenamento").value;
    // const durataGen = document.getElementById("durataGenerale").value;
    const durataGen = 120;
    if (!data || !durataGen) return alert("Compila tutti i campi!");

    showLoader(true);

    const allenamenti = await fetchData("allenamenti");
    let allenamento = allenamenti.find(a => a.data === data);
    let allenamento_id;

    if (allenamento) {
        allenamento_id = allenamento.id;
        alert("Allenamento già presente! I dati verranno aggiornati.");
    } else {
        allenamento_id = Date.now().toString();
        await pushData("allenamenti", {
            id: allenamento_id,
            data,
            durata: durataGen
        });
    }

    console.log("Allenamento inserito o aggiornato");

    const nuoviRPE = atleteDaMostrare.map(a => {
        const durataSpecifica = document.getElementById(`durata-${a.id}`).value;
        const selectedBtn = document.querySelector(`.rpe-btn.selected[data-atleta="${a.id}"]`);
        const rpe_id = selectedBtn ? selectedBtn.dataset.rpe : null;

        return {
            atleta_id: a.id,
            rpe_id,
            durata: durataSpecifica || durataGen,
            data,
            allenamento_id
        };
    });

    console.log("Nuovi rpe calcolati: " + nuoviRPE);

    // ⚠️ controllo se manca qualche voto
    if (nuoviRPE.some(r => !r.rpe_id)) {
        alert("Seleziona un RPE per ogni atleta");
        showLoader(false);
        return;
    }

    // ✅ Salvo su Firebase
    for (const r of nuoviRPE) {
        await pushData("rpe_data", r);
    }

    showLoader(false);
    alert("Dati salvati!");
}


async function pushData(path, obj) {
    await fetch(`${BASE_URL}/${path}.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(obj)
    });
}

function showLoader(show) {
    const loader = document.getElementById("overlay-loader");
    if (!loader) return;
    loader.classList.toggle("hidden", !show);
}

// function setupRpeForm(atlete) {
//     const select = document.getElementById('atletaSelect');
//     select.innerHTML = '';
//     if (logged.ruolo === 'admin') {
//         atlete.forEach(a => {
//             const opt = document.createElement('option');
//             opt.value = a.id;
//             opt.textContent = `${a.nome} ${a.cognome}`;
//             select.appendChild(opt);
//         });
//         select.disabled = false;
//     } else if (logged.ruolo === 'athlete') {
//         const my = atlete.find(a => a.id === logged.atletaId);
//         const opt = document.createElement('option');
//         opt.value = logged.atletaId;
//         opt.textContent = `${my.nome} ${my.cognome}`;
//         select.appendChild(opt);
//         select.disabled = true;
//     }
// }

// async function submitRpe(formData) {
//     if (logged.ruolo === 'athlete') formData.atletaId = logged.atletaId;
//
//     // usa pushData come nel progetto originale
//     await pushData('rpe', formData);
//     alert('RPE salvata!');
// }
