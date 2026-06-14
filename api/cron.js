const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

function getApp() {
    if (getApps().length) return getApps()[0];
    return initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        })
    });
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function isTimeDue(schedTime, nowMins) {
    const [h, m] = schedTime.split(':').map(Number);
    const schedMins = h * 60 + m;
    return nowMins >= schedMins && nowMins < schedMins + 5;
}

export default async function handler(req, res) {
    try {
        getApp();
        const db = getFirestore();
        const messaging = getMessaging();

        const now = new Date();
        const nowMins = now.getHours() * 60 + now.getMinutes();
        const dayName = DAY_NAMES[now.getDay()];

        const caretakersSnap = await db.collection('caretakers').get();

        for (const caretakerDoc of caretakersSnap.docs) {
            const data = caretakerDoc.data();
            const meds = data.medications || [];
            const usersSnap = await caretakerDoc.ref.collection('users').get();

            for (const userDoc of usersSnap.docs) {
                const { fcmToken, username } = userDoc.data();
                if (!fcmToken) continue;

                for (const med of meds) {
                    if (!med.times || !med.days || !med.days.includes(dayName)) continue;
                    if (med.assignedTo !== 'everyone' && med.assignedTo !== username) continue;

                    for (const time of med.times) {
                        if (!isTimeDue(time, nowMins)) continue;

                        try {
                            await messaging.send({
                                token: fcmToken,
                                notification: {
                                    title: '💊 Time to take your medication',
                                    body: med.name,
                                },
                                webpush: {
                                    fcmOptions: {
                                        link: 'https://summative-csp-5-rho.vercel.app/user.html'
                                    }
                                }
                            });
                            console.log(`Sent notification to ${username} for ${med.name}`);
                        } catch (e) {
                            console.error(`Failed to send to ${username}:`, e.message);
                        }
                    }
                }
            }
        }

        res.status(200).json({ success: true, time: now.toISOString() });
    } catch (e) {
        console.error('Cron error:', e);
        res.status(500).json({ error: e.message });
    }
}