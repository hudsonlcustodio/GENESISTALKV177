import { SIMBOLO } from "@/lib/branding/desenho";
import { cn } from "@/lib/utils";

type Props = {
  readonly nome: string;
  readonly className?: string;
  readonly decorativo?: boolean;
};

const SIMBOLO_CLARO_ESCURO = "fill-[#0b3d3a] dark:fill-[#7ed321]";
const NOME_CLARO_ESCURO = "fill-[#0b3d3a] dark:fill-[#ffffff]";
const SUFIXO_CLARO_ESCURO = "fill-[#6b7280] dark:fill-[#00b8d9]";

export const CLASSES_DE_COR = {
  simbolo: SIMBOLO_CLARO_ESCURO,
  nome: NOME_CLARO_ESCURO,
  sufixo: SUFIXO_CLARO_ESCURO,
} as const;

function acessibilidade(nome: string, decorativo: boolean) {
  return decorativo
    ? ({ "aria-hidden": true } as const)
    : ({ role: "img", "aria-label": nome } as const);
}

export function SimboloDoProduto({ nome, className, decorativo = false }: Props) {
  return (
    <svg viewBox={SIMBOLO.viewBox} className={cn("shrink-0", className)} {...acessibilidade(nome, decorativo)}>
      <g className={SIMBOLO_CLARO_ESCURO} transform={SIMBOLO.transform}>
        <path d={SIMBOLO.d} fillRule="evenodd" />
        <rect {...SIMBOLO.modulo} className="fill-[#00b8d9] dark:fill-[#00b8d9]" />
      </g>
    </svg>
  );
}

export function LogotipoDoProduto({ nome, className, decorativo = false }: Props) {
  return (
    <svg viewBox="0 0 520 100" className={cn("shrink-0", className)} {...acessibilidade(nome, decorativo)}>
      <g transform="translate(0 0)">
        <g className={SIMBOLO_CLARO_ESCURO}>
          <path d={SIMBOLO.d} fillRule="evenodd" />
          <rect {...SIMBOLO.modulo} className="fill-[#00b8d9] dark:fill-[#00b8d9]" />
        </g>
      </g>
      <text
        x="118"
        y="62"
        className={NOME_CLARO_ESCURO}
        fontFamily="Arial, system-ui, sans-serif"
        fontSize="42"
        fontWeight="800"
        letterSpacing="1.5"
      >
        {nome}
      </text>
      <rect x="118" y="72" width="235" height="5" rx="2.5" className={SUFIXO_CLARO_ESCURO} />
    </svg>
  );
}
