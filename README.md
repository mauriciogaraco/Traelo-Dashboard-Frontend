# Traelo Dashboard Frontend

## Revisión de propuestas de productos

`src/features/productProposals/` — cola de revisión comercial para altas/ediciones de catálogo
que proponen los `BUSINESS_OWNER` desde `Traelo-Business-Owner`. Ruta `/product-proposals`,
visible para `OWNER`/`ADMIN`/`COMMERCIAL` (rol nuevo — ver `src/lib/types.ts` y el backend).
Compara actual vs. propuesto, exige motivo para rechazar, y aprobar publica el cambio de
inmediato en el catálogo. Ver `Traelo-Business-Owner/IMPLEMENTATION_PLAN.md` para el diseño
completo del flujo.

Cambio relacionado: `ProductsTab.tsx` ya no muestra "Nuevo producto"/"Editar" cuando
`ownerMode` (el dueño de negocio usa el portal nuevo para eso, que pasa por aprobación);
activar/desactivar/disponibilidad siguen siendo directos ahí.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
