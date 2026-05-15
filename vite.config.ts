  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';                                                                                                                                                                          
  import { VitePWA } from 'vite-plugin-pwa';                                                                                                                                                                         
  
  export default defineConfig({                                                                                                                                                                                      
    plugins: [    
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],                                                                                                                                       
        manifest: {                                                                                                                                                                                                  
          name: 'Dhruva Intelligence Platform',                                                                                                                                                                      
          short_name: 'Dhruva',                                                                                                                                                                                      
          description: 'Real-time geopolitical and security intelligence dashboard',                                                                                                                                 
          theme_color: '#0a0f1a',                                                                                                                                                                                    
          background_color: '#0a0f1a',                                                                                                                                                                               
          display: 'standalone',                                                                                                                                                                                     
          orientation: 'landscape-primary',
          scope: '/',                                                                                                                                                                                                
          start_url: '/',
          icons: [                                                                                                                                                                                                   
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },                                                                                                                                     
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],                                                                                                                                                                                                         
        },        
        workbox: {                                                                                                                                                                                                   
          skipWaiting: true,
          clientsClaim: true,                                                                                                                                                                                        
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],                                                                                                                                                    
          navigateFallback: null,                                                                                                                                                                                    
          runtimeCaching: [
            {                                                                                                                                                                                                        
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,                                                                                                                                                        
              handler: 'NetworkOnly',
              options: { cacheName: 'supabase-api-cache' },                                                                                                                                                          
            },                                                                                                                                                                                                       
          ],
        },                                                                                                                                                                                                           
      }),         
    ],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },                                                                                                                                                                                                               
  });