 import { StrictMode } from 'react';
  import { createRoot } from 'react-dom/client';                                                                                                                                                                     
  import App from './App.tsx';
  import './index.css';                                                                                                                                                                                              
                  
  createRoot(document.getElementById('root')!).render(                                                                                                                                                               
    <StrictMode>
      <App />                                                                                                                                                                                                        
    </StrictMode> 
  );

  if ('serviceWorker' in navigator) {
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {                                                                                                                                             
      if (reloaded) return;
      reloaded = true;                                                                                                                                                                                               
      window.location.reload();                                                                                                                                                                                      
    });
  }  