# SGC — Sistema de Gestão de Clube · Núcleo SCP Castelo Branco

Aplicação web (HTML + CSS + JavaScript, sem build step) para gerir jogos, treinos,
avaliações físicas, plantel, estatísticas e presenças, com backend em Supabase e
hospedagem no GitHub Pages.

## 1. Configurar a base de dados (Supabase)

1. Cria um projeto em https://supabase.com.
2. Abre o **SQL Editor** e corre o ficheiro `sql/schema.sql` deste projeto — cria todas as tabelas.
3. Em **Project Settings → API**, copia o `Project URL` e a `anon public key`.
4. Edita `js/supabase-config.js` e substitui:
   ```js
   const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
   const SUPABASE_ANON_KEY = "SUA_CHAVE_ANON_PUBLICA";
   ```
5. Em **Authentication/Policies (RLS)**: para simplificar o arranque, podes desativar
   Row Level Security nas tabelas, ou criar policies abertas para leitura/escrita.
   Como o login é feito à parte (ver ponto 2), a app usa sempre a chave anon.

## 2. Login

O login não usa o Supabase Auth — foi implementado como pedido, com **2 utilizadores fixos**,
verificados por hash SHA-256 no browser (`js/auth.js`):

- `miguel_custodio`
- `joao_rebelo`

As passwords estão definidas em `js/auth.js`, na constante `RAW_CREDENTIALS`.
**Recomenda-se fortemente** substituir esta abordagem por Supabase Auth (email/password)
antes de publicares dados sensíveis de menores online — o método atual é apenas um
controlo de acesso simples ao nível do browser, não segurança de produção.

## 3. Publicar no GitHub Pages

1. Cria um repositório no GitHub e faz push de todos os ficheiros deste projeto.
2. Em **Settings → Pages**, escolhe a branch `main` e a pasta `/root`.
3. O site fica disponível em `https://<utilizador>.github.io/<repositorio>/`.
4. Como o site é 100% estático, não precisas de PHP/JSP/servidor próprio — o Supabase
   faz de backend/base de dados.

## 4. Estrutura do projeto

```
index.html              → login
dashboard.html          → resumo geral
jogos.html               → menu de jogos
treinos.html              → menu de treinos
avaliacoes.html            → menu de avaliações físicas
plantel.html                → menu de plantel
atleta-detalhe.html          → ficha individual da atleta
estatisticas.html              → menu de estatísticas
presencas.html                  → folha de presenças geral
css/style.css                    → design (branco/verde, formas redondas, sidebar)
js/supabase-config.js             → liga ao teu projeto Supabase
js/auth.js                         → login com os 2 utilizadores
js/sidebar.js                       → menu lateral + topbar (comum a todas as páginas)
js/pdf-utils.js                      → geração de PDFs (jsPDF + AutoTable)
js/jogos.js, treinos.js, avaliacoes.js, plantel.js, atleta-detalhe.js,
estatisticas.js, presencas.js         → lógica de cada módulo
sql/schema.sql                         → schema completo da base de dados
```

## 5. O que já está implementado

- CRUD completo de atletas com todos os campos pedidos, IMC automático, notas
  escolares, lesões e histórico de saúde, e PDF de ficha individual.
- Jogos: criação, convocatória, titulares por parte, substituições, golos
  (marcador/assistente/parte do corpo/zona/momento), estatísticas individuais
  em tempo real, estatísticas gerais somadas, cálculo automático dos minutos
  jogados a partir das substituições, classificação média decimal por
  algoritmo de desempenho, e relatório de jogo em PDF.
- Treinos: presenças (5 estados), autoavaliação de cansaço (0–10) e PDF.
- Avaliações físicas: todos os parâmetros físicos e técnicos pedidos, médias
  e ranking por parâmetro, e PDF.
- Estatísticas gerais do plantel (contagens, idades, posições, presenças,
  médias de jogo, rankings de golos/assistências/classificação, lesões).
- Folha de presenças geral consolidada, com PDF.
- Sidebar expansível/retrátil, cores branco/verde, formas geométricas redondas.

## 6. Sugestões de continuação

- Trocar o login por Supabase Auth real.
- Adicionar upload de fotos/logótipos para o Supabase Storage (atualmente
  usam-se URLs de imagem).
- Ativar Row Level Security com policies dedicadas por utilizador.
- Adicionar edição/eliminação de golos e estatísticas diretamente na tabela,
  se preferires não usar `prompt()` (usado aqui para manter o código simples
  — pode ser substituído por modais completos como o de "Plantel").
- Ajustar os pesos do algoritmo de classificação em `calcularClassificacao()`
  (`js/jogos.js`) ao critério da equipa técnica.
