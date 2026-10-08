/**
 * GENESIS TALK product mark as inline geometry/text.
 * White-label installations only receive this drawing when the resolved brand is
 * the product default; configured installation/organization logos still win.
 * No licensed font asset is embedded here.
 */
export const SIMBOLO = {
  viewBox: "0 0 100 100",
  transform: "translate(0 0)",
  d: "M50 4C24.6 4 4 24.6 4 50s20.6 46 46 46c21.9 0 40.2-15.3 44.8-35.8H52v16h20.4C66.9 86.4 59 90 50 90c-22.1 0-40-17.9-40-40s17.9-40 40-40c12.2 0 23.1 5.5 30.4 14.1L92 13.7C81.5 1.6 66.5-4 50 4Z",
  modulo: { x: 72, y: 44, width: 22, height: 12, rx: 3 },
} as const;

export const LOGOTIPO = {
  viewBox: "0 0 520 100",
  proporcao: 5.2,
  simbolo: { transform: "translate(0 0)", d: SIMBOLO.d, modulo: SIMBOLO.modulo },
  nome: [] as const,
  sufixo: [] as const,
} as const;

export const CORES_DA_MARCA = {
  claro: { simbolo: "#0b3d3a", nome: "#0b3d3a", sufixo: "#6b7280" },
  escuro: { simbolo: "#7ed321", nome: "#ffffff", sufixo: "#00b8d9" },
} as const;
