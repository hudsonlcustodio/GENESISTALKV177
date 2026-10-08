import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
describe("Contabo: artefatos Genesis e segredos fora do build", () => {
  it("override substitui todas as imagens próprias, inclusive telefonia opcional", () => {
    const compose = read("deploy/contabo/docker-compose.genesis.yml");
    for (const service of ["app", "worker", "scheduler", "voice-agent"]) {
      const block = compose.split(`  ${service}:`)[1]?.split(/\n  [a-z]/)[0];
      expect(block).toContain(`image: genesis-talk-${service}:1.77.0`);
      expect(block).toContain("pull_policy: never");
      expect(block).toContain("context: .");
      expect(block).toContain(`dockerfile: Dockerfile${service === "app" ? "" : `.${service}`}`);
    }
    expect(compose).toContain("profiles: [telefonia]");
  });
  it("ignora estado operacional nos quatro COPY . .", () => {
    const ignore = read(".dockerignore").split(/\r?\n/);
    for (const path of [".runtime", "backups", ".env", ".auth", ".qa-vps", "*.key", "*.pem"])
      expect(ignore).toContain(path);
  });
  it("primeiro deploy single-server não chama instalação Deskcomm", () => {
    const kit = read("hostgator-setup-kit/install-single-server.sh");
    expect(kit).toContain("--prepare-only) prepare_only=1");
    const prepare = kit.indexOf('if [[ "$prepare_only" == 1 ]]');
    expect(prepare).toBeGreaterThan(0);
    expect(kit.indexOf('bash "$KIT_DIR/install.sh" --yes')).toBeGreaterThan(prepare);
    expect(kit.slice(prepare, kit.indexOf('bash "$KIT_DIR/install.sh" --yes'))).toContain("exit 0");
    expect(read("deploy/contabo/install.sh")).toContain("--prepare-only --domain");
  });
  it("os jobs que publicam não têm autorização no repositório Genesis", () => {
    for (const file of ["release.yml", "publish-image.yml"]) {
      const workflow = read(`.github/workflows/${file}`);
      const jobs = workflow.split(/\n  (?=[a-z][a-z0-9-]+:\r?\n)/);
      for (const job of jobs.filter((j) => /packages: write|id: token/.test(j)))
        expect(job).toContain("if: github.repository == 'melgarafael/DeskcommCRM' &&");
    }
  });
});
