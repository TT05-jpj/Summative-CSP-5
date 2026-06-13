// ── Firebase Setup ────────────────────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, getDocs }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAl2Yy6a5w5RVDxC92H8st4ddQPKlMjs8E",
    authDomain: "a-ten-79cb3.firebaseapp.com",
    projectId: "a-ten-79cb3",
    storageBucket: "a-ten-79cb3.firebasestorage.app",
    messagingSenderId: "1058216326991",
    appId: "1:1058216326991:web:6d5af1c44f07404588373a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── Save medications to Firestore (called by caretaker) ───────────────────────
window.syncMedsToFirestore = async function (caretakerUsername, meds) {
    try {
        await setDoc(doc(db, 'caretakers', caretakerUsername), { medications: meds });
    } catch (e) { console.error('Firestore save error:', e); }
};

// ── Load medications from Firestore (called by user) ──────────────────────────
window.loadMedsFromFirestore = async function (caretakerUsername) {
    try {
        const snap = await getDoc(doc(db, 'caretakers', caretakerUsername));
        if (snap.exists()) return snap.data().medications || [];
        return [];
    } catch (e) { console.error('Firestore load error:', e); return []; }
};

// ── Listen for real-time med changes (for user device) ───────────────────────
window.listenToMeds = function (caretakerUsername, callback) {
    return onSnapshot(doc(db, 'caretakers', caretakerUsername), (snap) => {
        if (snap.exists()) callback(snap.data().medications || []);
    });
};

// ── Save user info to Firestore ───────────────────────────────────────────────
window.syncUserToFirestore = async function (caretakerUsername, userUsername, userData) {
    try {
        await setDoc(doc(db, 'caretakers', caretakerUsername, 'users', userUsername), userData);
    } catch (e) { console.error('Firestore user save error:', e); }
};

// ── Get all users under a caretaker ──────────────────────────────────────────
window.getUsersFromFirestore = async function (caretakerUsername) {
    try {
        const snap = await getDocs(collection(db, 'caretakers', caretakerUsername, 'users'));
        return snap.docs.map(d => ({ ...d.data(), username: d.id }));
    } catch (e) { console.error('Firestore get users error:', e); return []; }
};