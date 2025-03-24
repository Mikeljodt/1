import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import App from './App'
import './index.css'
import { initDB } from './lib/db'
import { ensureDefaultAdmin } from './lib/auth'
import { startAutoBackup } from './lib/backup'

// Initialize the database and create default admin if needed
initDB().then(async () => {
  await ensureDefaultAdmin();
  // Iniciar backup automático
  await startAutoBackup();
  
  // Render the app only after database is initialized
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </React.StrictMode>,
  )
}).catch(error => {
  console.error('Failed to initialize the database:', error);
  // Show error message to user
  document.getElementById('root')!.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; height: 100vh;">
      <div style="text-align: center; color: red;">
        <h1>Error al inicializar la aplicación</h1>
        <p>Por favor, recarga la página o contacta al administrador.</p>
      </div>
    </div>
  `;
});
