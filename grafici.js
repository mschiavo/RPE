const BASE_URL = "https://rpe-app-49320-default-rtdb.europe-west1.firebasedatabase.app/";

// Una palette di colori distinti per le linee del grafico
const CHART_COLORS = [
    '#e6194B', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6',
    '#bfef45', '#fabed4', '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000', '#aaffc3',
    '#808000', '#ffd8b1', '#000075', '#a9a9a9'
];

document.addEventListener("DOMContentLoaded", () => {
    loadChartData();
});

/**
 * Carica i dati dal database e avvia la creazione del grafico.
 */
async function loadChartData() {
    showLoader(true);
    try {
        // Carichiamo in parallelo sia i voti RPE che i dati delle atlete
        const [rpeRes, atleteRes] = await Promise.all([
            fetch(`${BASE_URL}/rpe_data.json`),
            fetch(`${BASE_URL}/atlete.json`)
        ]);

        const rpeData = await rpeRes.json();
        const atleteData = await atleteRes.json();

        // Trasformiamo gli oggetti ricevuti da Firebase in array
        const rpeArray = Object.values(rpeData || {});
        const atleteArray = Object.entries(atleteData || {}).map(([id, val]) => ({ ...val, id }));

        // Elaboriamo i dati per creare un dataset per ogni atleta
        const { labels, datasets } = processDataForMultiLineChart(rpeArray, atleteArray);

        // Creiamo il grafico con i nuovi dati
        createRpeTrendChart(labels, datasets);

    } catch (error) {
        console.error("Errore nel caricamento dei dati per i grafici:", error);
        document.getElementById('chart-container').innerHTML = '<p style="color: red; text-align: center;">Impossibile caricare i dati per il grafico.</p>';
    } finally {
        showLoader(false);
    }
}

/**
 * Funzione di utilità per ordinare le date in formato "GG/MM/AAAA".
 */
function parseDate(dateString) {
    const [day, month, year] = dateString.split('/');
    return new Date(`${year}-${month}-${day}`);
}

/**
 * Prepara i dati per un grafico a linee multiple, una per ogni atleta.
 * @param {Array} rpeData - L'array di tutti i voti.
 * @param {Array} atlete - L'array di tutte le atlete.
 * @returns {Object} Un oggetto con 'labels' (le date) e 'datasets' (un array di oggetti dataset, uno per atleta).
 */
function processDataForMultiLineChart(rpeData, atlete) {
    if (!rpeData || rpeData.length === 0) {
        return { labels: [], datasets: [] };
    }

    // 1. Otteniamo tutte le date uniche e le ordiniamo cronologicamente per l'asse X
    const allDates = [...new Set(rpeData.map(vote => vote.data).filter(Boolean))];
    const sortedLabels = allDates.sort((a, b) => parseDate(a) - parseDate(b));

    // 2. Raggruppiamo i voti per atleta per una facile consultazione
    const votesByAthlete = rpeData.reduce((acc, vote) => {
        // --- INIZIO MODIFICA 1: Correzione per il voto '0' ---
        // Controlliamo se rpe_id è null o undefined, ma permettiamo 0.
        if (!vote.atleta_id || !vote.data || vote.rpe_id == null) return acc;
        // --- FINE MODIFICA 1 ---

        if (!acc[vote.atleta_id]) {
            acc[vote.atleta_id] = {};
        }
        // Usiamo la data come chiave per trovare velocemente il voto di un giorno
        acc[vote.atleta_id][vote.data] = Number(vote.rpe_id);
        return acc;
    }, {});

    // 3. Creiamo un "dataset" per ogni atleta
    const datasets = atlete
        .map((atleta, index) => {
            const athleteVotes = votesByAthlete[atleta.id] || {};

            // Per ogni data sull'asse X, cerchiamo il voto dell'atleta.
            // Se non c'è, usiamo 'null' per creare un'interruzione nella linea.
            const dataPoints = sortedLabels.map(date => athleteVotes[date] ?? null);

            // Assegniamo un colore dalla nostra palette
            const color = CHART_COLORS[index % CHART_COLORS.length];

            return {
                label: `${atleta.nome} ${atleta.cognome}`,
                data: dataPoints,
                borderColor: color,
                backgroundColor: `${color}1A`, // Stesso colore ma con bassa opacità per il fill
                fill: false,
                tension: 0.2,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointBackgroundColor: color,
                // --- INIZIO MODIFICA 2: Linee continue ---
                spanGaps: true // Dice al grafico di disegnare la linea anche se ci sono dati mancanti (null)
                // --- FINE MODIFICA 2 ---
            };
        })
        // Filtriamo via le atlete che non hanno nessun voto per non affollare la legenda
        .filter(dataset => dataset.data.some(point => point !== null));

    return { labels: sortedLabels, datasets };
}


/**
 * Crea e disegna il grafico a linee usando Chart.js.
 * @param {Array<string>} labels - Le etichette per l'asse X (date).
 * @param {Array<Object>} datasets - L'array di dataset per ogni linea del grafico.
 */
function createRpeTrendChart(labels, datasets) {
    const ctx = document.getElementById('rpeTrendChart').getContext('2d');

    // Se esiste già un grafico su questa canvas, lo distruggiamo prima di crearne uno nuovo
    if (window.myRpeChart) {
        window.myRpeChart.destroy();
    }

    window.myRpeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onHover: (event, chartElements, chart) => {
                if (!chart.originalLegendColors) {
                    chart.originalLegendColors = chart.legend.legendItems.map(item => item.fontColor);
                }
                const legendItems = chart.legend.legendItems;
                const originalColors = chart.originalLegendColors;
                const inactiveColor = '#ccc';
                legendItems.forEach((item, index) => {
                    item.fontColor = originalColors[index];
                });
                if (chartElements.length > 0) {
                    const hoveredDatasetIndex = chartElements[0].datasetIndex;
                    legendItems.forEach((item, index) => {
                        if (index !== hoveredDatasetIndex) {
                            item.fontColor = inactiveColor;
                        }
                    });
                }
                chart.update();
            },
            scales: {
                y: {
                    beginAtZero: true,
                    suggestedMin: 0,
                    suggestedMax: 10,
                    title: {
                        display: true,
                        text: 'Valore RPE'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Data Allenamento'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    onHover: (event, legendItem, legend) => {
                        const index = legendItem.datasetIndex;
                        const chart = legend.chart;
                        chart.getDatasetMeta(index).controller.options.borderWidth = 4;
                        chart.update();
                    },
                    onLeave: (event, legendItem, legend) => {
                        const index = legendItem.datasetIndex;
                        const chart = legend.chart;
                        chart.getDatasetMeta(index).controller.options.borderWidth = 2;
                        chart.update();
                    }
                },
                tooltip: {
                    // --- INIZIO MODIFICA ---
                    mode: 'nearest', // Mostra solo il punto più vicino al mouse
                    intersect: true,   // Il mouse deve intersecare l'elemento (il punto)
                    // --- FINE MODIFICA ---
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            if (value === null) {
                                return `${label}: Assente`;
                            }
                            return `${label}: ${value.toFixed(2)}`;
                        }
                    }
                }
            },
            animation: false
        }
    });

    // Impostiamo lo spessore di default delle linee
    window.myRpeChart.data.datasets.forEach(dataset => {
        dataset.borderWidth = 2;
    });
    window.myRpeChart.update();
}
/**
 * Mostra o nasconde il loader.
 */
function showLoader(show) {
    const loader = document.getElementById("overlay-loader");
    if (loader) loader.classList.toggle("hidden", !show);
}
