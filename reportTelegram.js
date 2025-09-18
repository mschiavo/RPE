const admin = require('firebase-admin');
const axios = require('axios');

// In GitHub Actions, carichiamo la chiave come secret FIREBASE_SERVICE_ACCOUNT
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://<tuo-progetto>.firebaseio.com" // cambia con il tuo
});

const db = admin.firestore();

function getYesterdayDateString() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

async function main() {
    const yesterday = getYesterdayDateString();

    const atleteSnap = await db.collection('atlete').get();
    const rpeSnap = await db.collection('rpe').where('data', '==', yesterday).get();

    const atlete = atleteSnap.docs.map(doc => doc.data().nome);  // modifica se il campo è diverso
    const rpeAtlete = new Set(rpeSnap.docs.map(doc => doc.data().atleta));

    const mancanti = atlete.filter(nome => !rpeAtlete.has(nome));

    let msg = `📊 *Report RPE - ${yesterday}*\n\n`;
    msg += `Inseriti: *${rpeAtlete.size}*\n`;
    if (mancanti.length > 0) {
        msg += `Mancanti (${mancanti.length}):\n`;
        msg += mancanti.map(n => `- ${n}`).join("\n");
    } else {
        msg += `Tutti hanno inserito RPE ✅`;
    }

    // Invia a Telegram
    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`;

    await axios.post(url, {
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: msg,
        parse_mode: "Markdown"
    });

    console.log("✅ Report inviato");
}

main().catch(err => {
    console.error("❌ Errore:", err);
    process.exit(1);
});
