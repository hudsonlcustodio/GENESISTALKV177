// Fresh install and upgrades are different operations. Never report an
// unapplied migration as success or push the historical chain into a live DB.
process.stderr.write(
  "Nenhuma migration foi aplicada. Instalação nova: use deploy/contabo/install.sh. " +
    "Banco existente: valide schema/ledger e execute o plano de migração da release. " +
    "Consulte deploy/contabo/README.md.\n",
);
process.exitCode = 1;
