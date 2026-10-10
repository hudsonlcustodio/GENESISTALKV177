import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

// public/ acompanha o runner standalone. Não aceita caminho nem URL do usuário.
export async function arteDoProduto(): Promise<string> {
  const bytes = await readFile(path.join(process.cwd(), "public/branding/genesis-360.png"));
  return `data:image/png;base64,${bytes.toString("base64")}`;
}
