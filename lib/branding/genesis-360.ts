export const GENESIS_360 = {
  lime: "#7ED321",
  takeGreen: "#00C853",
  deepBlueGreen: "#0B3D3A",
  cyan: "#00B8D9",
  technicalGray: "#6B7280",
  white: "#FFFFFF",
} as const;

/**
 * Paleta corporativa herdada da marca-pai GENESIS 360.
 * Não alterar sem decisão explícita de marca.
 */
export const GENESIS_TALK_BRAND = {
  primary: GENESIS_360.takeGreen,
  highlight: GENESIS_360.lime,
  deep: GENESIS_360.deepBlueGreen,
  info: GENESIS_360.cyan,
  neutral: GENESIS_360.technicalGray,
  surface: GENESIS_360.white,
} as const;
