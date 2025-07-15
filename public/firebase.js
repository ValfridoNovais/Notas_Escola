// Configurações do Firebase do seu projeto (placeholder)
const firebaseConfig = {
  apiKey: "AIzaSyCzULI3MfbiA2dxoVpYg2ThZgL5x7yn5Bk",
  authDomain: "recompensa-escolar.firebaseapp.com",
  projectId: "recompensa-escolar",
  storageBucket: "recompensa-escolar.firebasestorage.app",
  messagingSenderId: "338709118154",
  appId: "1:338709118154:web:a2c108851100fb4fd3c833",
  measurementId: "G-Q16Z2GRCRX"
};
// Inicializar o Firebase
firebase.initializeApp(firebaseConfig);
// Serviços do Firebase usados
const auth = firebase.auth();
const db   = firebase.firestore();
// Habilitar cache offline (persistência) para Firestore
db.enablePersistence().catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn("Persistência não habilitada - múltiplas abas abertas?");
  } else if (err.code === 'unimplemented') {
    console.warn("Persistência não suportada neste browser.");
  }
});
