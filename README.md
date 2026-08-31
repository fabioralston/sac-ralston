# SAC Ralston

Sistema de gestão do SAC (atendimento ao cliente) da Ralston: login de atendentes, cadastro de clientes, abertura/acompanhamento de chamados com categoria e prioridade, e dashboard de indicadores.

Feito como um site estático (HTML/CSS/JS puro, sem etapa de build) + [Supabase](https://supabase.com) como banco de dados e autenticação. Não precisa de Node.js, Python nem Docker instalados — só um navegador e o PowerShell que já vem no Windows.

## 1. Criar o projeto no Supabase (gratuito)

1. Acesse [app.supabase.com](https://app.supabase.com) e crie uma conta/projeto (nome sugerido: `sac-ralston`).
2. No painel do projeto, abra **SQL Editor** → **New query**, cole todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e execute (Run). Isso cria as tabelas de clientes, categorias, chamados, interações e as permissões (RLS).
3. Vá em **Project Settings → API** e copie:
   - **Project URL**
   - **anon public key**
4. Abra [`public/js/config.js`](public/js/config.js) neste projeto e cole os dois valores no lugar de `SEU-PROJETO.supabase.co` e `SUA-ANON-KEY-AQUI`.

Por padrão o Supabase pede confirmação por e-mail ao criar conta. Para testes internos, você pode desativar isso em **Authentication → Providers → Email → Confirm email** (desligar), assim os atendentes conseguem entrar assim que criam o acesso.

### Login com Google (contas @ralston.com.br)

A tela de login também tem um botão "Entrar com Google", restrito a e-mails do domínio `@ralston.com.br` (ex: `nomedousuario@ralston.com.br`, se a empresa usa Google Workspace). Para ativar:

1. No [Google Cloud Console](https://console.cloud.google.com/apis/credentials), crie (ou use um já existente) um **OAuth 2.0 Client ID** do tipo "Aplicativo Web".
2. Em **Authorized redirect URIs**, adicione a URL de callback do seu projeto Supabase: `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
3. Copie o **Client ID** e o **Client Secret** gerados.
4. No painel do Supabase, vá em **Authentication → Providers → Google**, ative e cole o Client ID/Secret.
5. Em **Authentication → URL Configuration**, adicione `http://localhost:5500/app.html` em **Redirect URLs** (e a URL de produção, se/quando existir).

O sistema já faz duas camadas de restrição ao domínio: o parâmetro `hd=ralston.com.br` enviado ao Google (sugere só contas da empresa na tela de contas) e uma checagem no próprio app após o login — se o e-mail retornado não terminar em `@ralston.com.br`, a sessão é encerrada automaticamente e o usuário volta para o login com um aviso.

## 2. Rodar localmente (opcional, para testar no seu computador)

Na pasta do projeto, execute no PowerShell:

```powershell
./serve.ps1
```

Isso sobe um servidor em `http://localhost:5500`. Abra esse endereço no navegador para ver a tela de login.

## 3. Publicar no Netlify (site real, com link fixo)

Este projeto está preparado para deploy contínuo via Git:

1. Suba esta pasta para um repositório no GitHub (ou GitLab/Bitbucket).
2. No Netlify, **Add new site → Import an existing project**, conecte esse repositório.
3. O Netlify detecta o `netlify.toml` automaticamente (publica a pasta `public/`) — não precisa configurar build command nem publish directory manualmente.
4. Depois do primeiro deploy, vá em **Authentication → URL Configuration** no Supabase e adicione `https://SEU-SITE.netlify.app/app.html` em **Redirect URLs**.

A partir daí, qualquer atualização enviada ao repositório (`git push`) publica automaticamente uma nova versão do site.

## 4. Primeiro acesso

Na tela de login, clique em **"Criar acesso de atendente"**, preencha nome/e-mail/senha. Esse primeiro usuário já pode cadastrar clientes e abrir chamados — todo atendente autenticado tem acesso completo ao sistema (modelo pensado para uso interno da equipe).

## Estrutura

- `public/` — tudo que é servido no site: `index.html`/`app.html`, `css/`, `js/`.
- `netlify.toml` — configuração de deploy do Netlify (publica só a pasta `public/`).
- `supabase/schema.sql` — tabelas, triggers e políticas de acesso (RLS) — roda no Supabase, não é servido no site.
- `serve.ps1` — servidor estático local, para testar no seu computador antes de publicar.

## Próximos passos possíveis

- Papéis diferenciados (admin vs. atendente) usando a coluna `cargo` da tabela `profiles`.
- Notificação por e-mail ao cliente quando o status do chamado muda (Supabase Edge Functions).
- Exportar relatórios (CSV/PDF) a partir do dashboard.
