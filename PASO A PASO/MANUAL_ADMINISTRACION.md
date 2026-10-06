# 📘 Manual de Administración del CRM - AlgoMásQueLuz

Este documento sirve como guía completa de administración, desarrollo y almacenamiento de datos para tu nuevo CRM corporativo. Consérvalo en la raíz de tu proyecto para consultarlo cuando lo necesites.

---

## 1. ☁️ ¿Dónde y cómo se guardan los datos del CRM?

Cuando interactúas con la plataforma (añades clientes, creas contratos, marcas alertas), los datos viajan a través de internet y se guardan permanentemente en la nube.

*   **¿Dónde se hospeda la base de datos?**
    La base de datos se encuentra alojada en **Supabase**, utilizando servidores dedicados de alta velocidad y seguridad administrados sobre la infraestructura global de **Amazon Web Services (AWS)**.
*   **¿Dónde se guarda cada registro?**
    *   Los clientes se guardan en la tabla: `public.clientes`
    *   Los contratos de luz/gas en la tabla: `public.contratos`
    *   Los usuarios y comerciales en la tabla: `public.usuarios`
    *   Las notificaciones del dashboard en la tabla: `public.notificaciones`
*   **¿Cómo puedo gestionar los datos visualmente fuera del CRM?**
    Puedes acceder directamente a tu panel web de Supabase en cualquier momento a través de este enlace:
    👉 **[Administrar base de datos en Supabase](https://supabase.com/dashboard/project/vcmrrbzmyvbitnimreak/editor/clientes)**
    Ahí verás una interfaz intuitiva similar a un Excel en la nube. Desde allí puedes:
    *   Modificar cualquier dato a mano (haciendo doble clic en la casilla).
    *   Eliminar filas completas o exportar la lista de clientes a formato CSV o Excel.
    *   *Cualquier cambio que realices en estas tablas se reflejará al instante en tu web online.*

---

## 2. 📂 Estructura del Código: ¿Dónde se edita cada sección?

El diseño visual, las funciones y el comportamiento de la interfaz web están guardados localmente en tu ordenador. La carpeta raíz del código es:
📁 `/Users/hugogon15/CRM AMQL/frontend/src/`

Si deseas realizar modificaciones personalizadas o añadir/eliminar elementos a tu gusto, este es el mapa de los archivos clave:

*   **El panel principal (Dashboard):**
    *   *Archivo:* [Dashboard.jsx](file:///Users/hugogon15/CRM%20AMQL/frontend/src/pages/Dashboard.jsx)
    *   *Función:* Controla las tarjetas de KPIs (Clientes totales, Ahorro anual, etc.), el listado de alertas de renovación en los próximos 60 días y la distribución visual del pipeline.
*   **La cartera y lista de clientes:**
    *   *Archivo:* [Clients.jsx](file:///Users/hugogon15/CRM%20AMQL/frontend/src/pages/Clients.jsx)
    *   *Función:* Controla la tabla de clientes, los filtros de búsqueda por CUPS/Provincia/Estado y el formulario desplegable para añadir "Nuevos Clientes".
*   **El mapa geográfico interactivo:**
    *   *Archivo:* [Map.jsx](file:///Users/hugogon15/CRM%20AMQL/frontend/src/pages/Map.jsx)
    *   *Función:* Muestra el mapa interactivo de España, agrupando y geolocalizando a tus clientes por provincia con pines de colores representativos de sus estados comerciales.
*   **La ficha completa y detallada de un cliente:**
    *   *Archivo:* [ClientDetail.jsx](file:///Users/hugogon15/CRM%20AMQL/frontend/src/pages/ClientDetail.jsx)
    *   *Función:* Muestra los datos específicos de contacto del cliente, su histórico de llamadas/notas y sus contratos vinculados con sus tarifas de luz/gas.
*   **El menú lateral izquierdo (Barra de Navegación):**
    *   *Archivo:* [Sidebar.jsx](file:///Users/hugogon15/CRM%20AMQL/frontend/src/components/layout/Sidebar.jsx)
    *   *Función:* Controla los enlaces y botones de navegación rápida de la izquierda de la pantalla.

---

## 3. 🛠️ ¿Quién hace los cambios y cómo se suben a internet?

El ciclo de actualización y personalización de tu CRM es sumamente ágil y seguro:

### A. ¿Quién modifica el código?
*   **Tú o yo (tu asistente de IA):** Puedes abrir la carpeta de tu proyecto en **VS Code** y pedirme a mí directamente a través de este chat que haga las modificaciones. Por ejemplo: *"añade un campo de 'Observaciones' al formulario de clientes"* o *"haz que las tarjetas del dashboard tengan bordes más redondeados"*.
*   Yo realizaré la edición técnica de los archivos locales en tu Mac con total precisión.

### B. ¿Cómo probarlo localmente?
Antes de subir los cambios a internet, puedes probar y ver cómo lucen en tu ordenador ejecutando tu servidor local en la carpeta `frontend/`:
```bash
yarn start
# o
npm run start
```
Esto abrirá tu CRM en desarrollo en `http://localhost:3000` para que juegues con las modificaciones de forma segura y sin afectar a la web de producción.

### C. ¿Cómo publicar los cambios en tu dominio en vivo (`crm.algomasqueluz.com`)?
Una vez que las modificaciones en local estén perfectas y sean de tu agrado, subirlas a internet para que las vea todo el mundo es tan sencillo como:

1.  Abre tu terminal en la carpeta `/Users/hugogon15/CRM AMQL/frontend`.
2.  Escribe y ejecuta este único comando de Vercel:
    ```bash
    npx vercel --prod --yes
    ```
3.  Vercel tomará automáticamente el código actualizado de tu Mac, compilará la versión óptima para internet y la publicará en tu dominio **`crm.algomasqueluz.com`** en menos de 1 minuto, sin interrumpir el servicio ni un solo segundo.

---

*Manual elaborado y configurado el 28 de mayo de 2026 para Hugo Gon.*
