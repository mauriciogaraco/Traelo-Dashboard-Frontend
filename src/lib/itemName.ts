// El envase se ve en el nombre del producto del vale: "Espaguetis + [Termopack]". Así el mensajero y el
// cliente lo leen sin tener que buscar el cargo aparte.

// " + [Termopack]" al final del nombre (con o sin espacios alrededor del +).
const PACKAGING_SUFFIX = /\s*\+\s*\[[^\]]+\]\s*$/

/** "Espaguetis" + "Termopack" -> "Espaguetis + [Termopack]". Sin envase devuelve el nombre tal cual. */
export function withPackagingSuffix(name: string, packagingName: string | null | undefined): string {
  const base = stripPackagingSuffix(name)
  const packaging = packagingName?.trim()
  return packaging ? `${base} + [${packaging}]` : base
}

/** Quita el " + [envase]" del final, para volver al nombre base (p. ej. al reabrir un pedido para editarlo). */
export function stripPackagingSuffix(name: string): string {
  return name.replace(PACKAGING_SUFFIX, '').trim()
}
