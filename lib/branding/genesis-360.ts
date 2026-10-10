export const GENESIS_360 = {
  lime: "#D4FF00",
  takeGreen: "#00E676",
  deepBlueGreen: "#071B33",
  cyan: "#19C2FF",
  technicalGray: "#52616F",
  white: "#F7FAFC",
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
