<div align="center">

<img src="public/branding/genesis-360.png" alt="Genesis 360 Talk AI" width="420">

# Genesis 360 Talk AI

**Atendimento, vendas e inteligência artificial em uma única plataforma.**

Centralize conversas de WhatsApp, organize seu CRM e conecte sua equipe a agentes
de IA, com instalação no seu próprio servidor.

[O que faz](#o-que-o-genesis-faz) · [Instalar](#instalação-na-vps) · [Primeiro acesso](#primeiro-acesso)

</div>

## O que o Genesis faz

O **Genesis 360 Talk AI** reúne atendimento humano, agentes de IA e gestão comercial
para acompanhar o cliente da primeira conversa ao fechamento.

- **WhatsApp integrado:** atendimento por QR code via WAHA ou canal oficial da
  Meta, com conversas, anexos e transferência entre atendentes.
- **CRM e funis:** contatos, oportunidades e etapas de venda organizados em Kanban.
- **Agentes de IA:** atendimento e qualificação com base de conhecimento, ferramentas
  do CRM e passagem para uma pessoa quando necessário.
- **Follow-ups e automações:** acompanhamento de contatos, regras por eventos,
  webhooks e retomada de oportunidades.
- **Supervisão 360:** visão conjunta da operação humana e de IA, com filas, carga
  da equipe, falhas, tempos de resposta, filtros e custos registrados.
- **Agenda e tarefas:** organização dos compromissos e das próximas ações da equipe.
- **Uso no celular:** interfaces adaptadas para trabalhar com Inbox, contatos, CRM,
  agenda e tarefas em telas menores.
- **Organizações e permissões:** separação dos dados entre empresas, controle de
  acesso por função e recursos de auditoria e privacidade.

## Instalação na VPS

A instalação do Genesis utiliza o kit próprio em `deploy/contabo`, que prepara e
compila os serviços no servidor. Há duas opções: Supabase na mesma VPS ou um
projeto Supabase externo.

> **Versão 1.77 — candidato de homologação.** O código foi validado em CI;
> a homologação na Contabo e com provedores reais permanece pendente.
> O [guia de instalação](deploy/contabo/README.md) detalha os requisitos e a operação.

### O que você precisa

| Item        | Requisito                                                                            |
| ----------- | ------------------------------------------------------------------------------------ |
| Servidor    | VPS Linux AMD64 ou ARM64, com acesso SSH e permissão para operar o Docker            |
| Memória     | Piso de 4 GB; 8 GB recomendados. A compilação pode exigir swap                       |
| Disco       | Pelo menos 20 GiB livres para passar no preflight; dimensione também dados e backups |
| Ferramentas | Docker com Compose, Git e utilitários listados no guia de instalação                 |
| Domínio     | Registro DNS A apontando para a VPS e portas 80/443 disponíveis para o Caddy         |
| Supabase    | Na mesma VPS ou um projeto externo dedicado, com schema `public` vazio               |
| WhatsApp    | Número para pareamento via QR code ou credenciais do canal oficial da Meta           |
| IA          | Credenciais do provedor escolhido, configuráveis posteriormente na plataforma        |
| E-mail      | SMTP configurado no Supabase Auth para confirmação e recuperação de senha            |

Se a VPS já tiver um proxy nas portas 80/443, siga a integração descrita no guia
antes de instalar.

### 1. Conecte-se ao servidor

No terminal do computador, use os dados SSH fornecidos pela hospedagem:

```bash
ssh -p PORTA USUARIO@IP_DA_VPS
```

Substitua `PORTA`, `USUARIO` e `IP_DA_VPS`. A porta SSH padrão é `22`.
Os próximos comandos são executados dentro da VPS.

### 2. Baixe o candidato validado

```bash
git clone --branch genesis-v1.77.0-rc.1 --depth 1 https://github.com/hudsonlcustodio/GENESISTALKV177.git genesis-360-talk-ai
cd genesis-360-talk-ai
```

Escolha **uma** das opções abaixo para uma instalação nova.

### 3A. Instale com Supabase na mesma VPS

Nesta opção, o kit prepara o Supabase local, gera as credenciais e instala os
serviços Genesis. Execute em um clone novo, sem `.env` ou instalação anterior.

```bash
bash deploy/contabo/install.sh --single-server --domain crm.seudominio.com.br
```

Troque `crm.seudominio.com.br` pelo domínio que já aponta para a VPS.
A instalação gera as credenciais iniciais em `.runtime/admin-credentials`,
com acesso protegido no servidor.

### 3B. Instale com Supabase externo

Use um projeto Supabase dedicado, sem tabelas existentes no schema `public`.
No Supabase Auth, configure:

- **Site URL:** `https://crm.seudominio.com.br`
- **Redirect URL:** `https://crm.seudominio.com.br/auth/confirm`

Prepare o arquivo de configuração:

```bash
cp deploy/contabo/.env.example .env
chmod 600 .env
```

Edite o `.env` no servidor e preencha os campos obrigatórios do
[template de instalação](deploy/contabo/.env.example), incluindo:

| Configuração           | O que informar                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| Domínio e URLs         | `DOMAIN`, `ACME_EMAIL`, `NEXT_PUBLIC_APP_URL` e `NEXT_PUBLIC_ADMIN_URL`                                     |
| Supabase público       | `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`                                                |
| Supabase servidor      | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` e `SUPABASE_DB_ADMIN_URL` do mesmo projeto                   |
| Segurança e serviços   | Segredos de aplicação, cifra, cron, WAHA e Redis indicados no template; preserve os pares e hashes exigidos |
| Primeiro administrador | `OWNER_EMAIL`, `OWNER_PASSWORD` e `OWNER_ORG_NAME`                                                          |

As chaves do Supabase seguem o contrato do instalador: chave pública
anon/publishable e chave de servidor service-role/secret. IA e SMTP podem ser
configurados posteriormente; o SMTP do Auth é necessário para os e-mails de acesso.

Depois de preencher a configuração:

```bash
bash deploy/contabo/install.sh --external
```

O instalador aplica o banco inicial, cria o primeiro administrador, compila e
inicia os serviços Genesis. Depois do bootstrap, remova `OWNER_PASSWORD` do `.env`.
Mantenha o arquivo protegido e fora do Git.

## Primeiro acesso

1. Abra `https://crm.seudominio.com.br`, usando o domínio configurado.
2. Entre com o administrador criado na instalação. No modo single-server,
   consulte as credenciais iniciais no arquivo protegido `.runtime/admin-credentials`.
3. Configure a organização e a equipe.
4. Conecte o WhatsApp por QR code ou configure o canal oficial da Meta.
5. Cadastre as credenciais de IA, prepare a base de conhecimento e configure os agentes.
6. Organize os funis, tarefas e follow-ups da operação.

Para conferir a instalação pelo terminal:

```bash
bash deploy/contabo/smoke.sh
```

Os procedimentos de atualização manual, backup e recuperação estão no
[guia Contabo](deploy/contabo/README.md). Esta versão utiliza os wrappers Genesis;
seu canal de atualização automática ainda está adiado.

---

Baseado no [DeskcommCRM](https://github.com/melgarafael/DeskcommCRM), com
personalizações Genesis e preservação da [licença MIT](LICENSE).
