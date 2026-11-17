# Estructura del frontend (monolito modular)

El frontend sigue los mismos módulos que el backend.

```
src/
├── environments/environment.ts   URL del backend
└── app/
    ├── core/                     Lo que usa toda la app (≈ config/ y usuario/security del backend)
    │   ├── auth/                 Sesión: guarda el JWT, rol y correo
    │   ├── http/                 Interceptor: agrega "Bearer <token>" y maneja el 401
    │   └── guards/               Protegen rutas por sesión o por rol
    ├── shared/                   Componentes y modelos reutilizables entre módulos
    └── modulos/                  Un módulo por cada módulo del backend
        └── <modulo>/
            ├── pages/            Pantallas con ruta propia      (≈ api/)
            ├── components/       Piezas usadas por esas pantallas
            ├── services/         Llamadas HTTP al backend       (≈ application/)
            ├── models/           Interfaces de request/response (≈ api/request, api/response)
            └── <modulo>.routes.ts
```

## Reglas
1. Un módulo **no importa** archivos internos de otro módulo. Lo que se comparte va en `shared/` o `core/`.
2. Cada módulo carga sus rutas por separado (lazy loading) desde `app.routes.ts`.
3. Toda llamada al backend usa `environment.apiUrl`; nunca escribir `http://localhost:8080` a mano.
4. Las páginas solo para un rol se protegen con `canMatch: [rolGuard('ANFITRION')]`.
5. Cada servicio, guard y página nueva lleva su `.spec.ts` (SonarCloud pide cobertura en el código nuevo).

## Ramas
- Una rama por HU, con el mismo ID que en Jira y en el backend: `feature/HU-002-inicio-sesion`.
- Ajustes técnicos sin HU: `chore/<descripcion>`.
- Correcciones: `fix/HU-002-<descripcion>`.
