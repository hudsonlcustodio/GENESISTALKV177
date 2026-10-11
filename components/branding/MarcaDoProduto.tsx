import { LOGOTIPO, SIMBOLO } from "@/lib/branding/desenho";
import { cn } from "@/lib/utils";

type Props = {
  readonly nome: string;
  readonly className?: string;
  readonly decorativo?: boolean;
};

function ArteDoProduto({
  nome,
  className,
  decorativo = false,
  simbolo = false,
}: Props & { simbolo?: boolean }) {
  const arte = simbolo ? SIMBOLO : LOGOTIPO;
  return (
    <svg
      viewBox={arte.viewBox}
      className={cn("shrink-0 rounded-sm", className)}
      {...(decorativo ? { "aria-hidden": true as const } : { role: "img", "aria-label": nome })}
    >
      <title>{nome}</title>
      {/* A arte original permanece intacta. O viewport remove apenas seu respiro
          externo; branco preserva o lettering azul também no tema escuro. */}
      <rect x="0" y="0" width="1672" height="941" fill="#ffffff" />
      <image href={arte.arquivo} width="1672" height="941" />
    </svg>
  );
}

export function SimboloDoProduto(props: Props) {
  return <ArteDoProduto {...props} simbolo />;
}

export function LogotipoDoProduto(props: Props) {
  return <ArteDoProduto {...props} />;
}
