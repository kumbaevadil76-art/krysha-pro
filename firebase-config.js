// ====================== FIREBASE CONFIG ======================
// Конфигурация Firebase для Krysha Pro

const firebaseConfig = {
    apiKey: "AIzaSyBKuAZA5GynegoGJc03NjueXLw5vpmLbxw",
    authDomain: "krysha-pro.firebaseapp.com",
    databaseURL: "https://krysha-pro-default-rtdb.firebaseio.com",
    projectId: "krysha-pro",
    storageBucket: "krysha-pro.firebasestorage.app",
    messagingSenderId: "725659137802",
    appId: "1:725659137802:web:f6f2db5d2b48bd5fd32cf3",
    measurementId: "G-QD9GETX3YV"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);

// Firestore Database
const db = firebase.firestore();

// Auth (авторизация)
const auth = firebase.auth();

// Analytics (опционально)
let analytics = null;
if (typeof window !== 'undefined') {
    analytics = firebase.analytics();
}

// Экспорт для использования
window.db = db;
window.auth = auth;
window.analytics = analytics;

console.log('✅ Firebase инициализирован');
console.log('📊 Project ID:', firebaseConfig.projectId);
