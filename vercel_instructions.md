# Guía Paso a Paso: Despliegue del Frontend en Vercel

Esta guía te guiará para conectar tu frontend de React (`/Users/hugogon15/CRM AMQL/frontend`) con **Vercel** usando la terminal.

---

## 🚀 Método Recomendado: Usar `npx vercel` (Sin instalar nada globalmente)

No necesitas instalar la CLI de Vercel de forma global. Puedes usar `npx` para ejecutarla directamente. Sigue estos sencillos pasos desde tu terminal:

### Paso 1: Ir a la carpeta del Frontend
Abre tu terminal y dirígete al directorio del frontend de tu proyecto:
```bash
cd "/Users/hugogon15/CRM AMQL/frontend"
```

### Paso 2: Iniciar Sesión en Vercel
Ejecuta el comando para autenticarte. Te dará opciones para iniciar sesión con GitHub, GitLab o tu correo:
```bash
npx vercel login
```
*Sigue las instrucciones en el navegador para completar el inicio de sesión.*

### Paso 3: Inicializar y Desplegar (Entorno de Desarrollo)
Una vez iniciada la sesión, arranca el despliegue del proyecto con:
```bash
npx vercel
```
Vercel te hará unas sencillas preguntas en la consola. Responde así:
1. **Set up and deploy "~/CRM AMQL/frontend"?** Escribe `Y` (Sí) y presiona Enter.
2. **Which scope do you want to deploy to?** Selecciona tu cuenta personal de Vercel y presiona Enter.
3. **Link to existing project?** Escribe `N` (No) y presiona Enter.
4. **What’s your project’s name?** Escribe `crm-energia-frontend` (o el nombre que gustes) y presiona Enter.
5. **In which directory is your code located?** Presiona Enter (para seleccionar `./`).
6. **Want to modify these settings? [y/N]** Escribe `N` (No) y presiona Enter. *Vercel detectará automáticamente que es un proyecto de React con soporte de Craco y configurará todo solo.*

---

## 🔑 Paso 4: Configurar las Variables de Entorno

Dado que tu Frontend de React se conecta con **Supabase**, debes decirle a Vercel cuáles son tus llaves y URLs. Tienes dos formas de hacerlo:

### Opción A (Desde la terminal - Más Rápida)
Ejecuta estos comandos en la consola (dentro de `frontend/`):
```bash
npx vercel env add REACT_APP_SUPABASE_URL
```
*(Ingresa el valor de tu URL de Supabase cuando te lo pida)*

```bash
npx vercel env add REACT_APP_SUPABASE_ANON_KEY
```
*(Ingresa tu Anon Key de Supabase cuando te lo pida)*

### Opción B (Desde el Panel Web de Vercel)
1. Entra a tu dashboard de [Vercel](https://vercel.com).
2. Selecciona tu proyecto `crm-energia-frontend`.
3. Ve a la pestaña **Settings** (Configuración) -> **Environment Variables**.
4. Agrega los nombres y valores de tus variables:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`

---

## ⚡ Paso 5: Despliegue Final en Producción
Una vez configuradas las variables de entorno, realiza el despliegue final en producción para que se compile con tus llaves y te dé tu dominio definitivo público:
```bash
npx vercel --prod
```

¡Listo! Vercel compilará tu aplicación y te dará una URL pública real como `https://crm-energia-frontend.vercel.app` para acceder a tu plataforma.
