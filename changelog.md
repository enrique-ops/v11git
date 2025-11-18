# SKUscale - Historial de Cambios

## Versión 1.0.0 (17 de Noviembre, 2025)

### ✨ ¡Lanzamiento Inicial y Estabilización!

Esta versión representa la primera versión estable y funcional de la aplicación web de SKUscale, incluyendo la landing page y el flujo de onboarding inicial.

#### ✅ Funcionalidades Implementadas:

*   **Landing Page Completa:** Diseño profesional con contenido de marketing en inglés y español.
*   **Logo y Favicon:** Identidad visual basada en el concepto de gráfico de dispersión.
*   **Traducción EN/ES:** Sistema de cambio de idioma robusto y funcional.
*   **Autenticación de Usuarios:** Integración completa con Netlify Identity y login a través de Google.
*   **Redirección Automática:**
    *   Los usuarios ya logueados son redirigidos al `/dashboard` al visitar la home.
    *   Los usuarios que se registran o loguean por primera vez son redirigidos al `/dashboard` inmediatamente.
*   **Dashboard de Onboarding:**
    *   Página de bienvenida personalizada con el nombre del usuario.
    *   Flujo de onboarding en dos pasos: (1) Solicitar Google Ads ID, (2) Mensaje de confirmación "Human in the Loop".
    *   Diseño de perfil de usuario moderno y funcional.

#### 🐞 Errores Solucionados (¡Gracias a tu feedback!):

*   **Corregido:** Botones con texto duplicado debido a conflictos entre el script de Netlify y el HTML.
*   **Corregido:** Fallo total de los botones (login, idioma) debido a errores en el script de traducción y de `DOMContentLoaded`.
*   **Corregido:** El nombre del usuario no aparecía en el dashboard en la primera carga.
*   **Corregido:** La redirección al dashboard no funcionaba en el primer login/registro.
*   **Mejorado:** El diseño del menú de usuario en el dashboard ahora es más moderno y está integrado en la cabecera.
