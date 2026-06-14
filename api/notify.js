const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

let app;
function getApp() {
    if (!app) {
        app = initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            })
        });
    }
    return app;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { caretakerUsername, medName, userUsername, token } = req.body;

    try {
        getApp();
        const messaging = getMessaging();

        await messaging.send({
            token,
            notification: {
                title: '💊 Time to take your medication',
                body: medName,
            },
            webpush: {
                fcmOptions: {
                    link: 'https://summative-csp-5-rho.vercel.app/scanner.html'
                }
            }
        });

        res.status(200).json({ success: true });
    } catch (e) {
        console.error('Notify error:', e);
        res.status(500).json({ error: e.message });
    }
}