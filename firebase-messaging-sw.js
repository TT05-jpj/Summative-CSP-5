importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyAl2Yy6a5w5RVDxC92H8st4ddQPKlMjs8E",
    authDomain: "a-ten-79cb3.firebaseapp.com",
    projectId: "a-ten-79cb3",
    storageBucket: "a-ten-79cb3.firebasestorage.app",
    messagingSenderId: "1058216326991",
    appId: "1:1058216326991:web:6d5af1c44f07404588373a"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
    const { title, body } = payload.notification;
    self.registration.showNotification(title, {
        body,
        icon: '/miclcon.png'
    });
});