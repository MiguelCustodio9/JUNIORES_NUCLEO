-- =========================================================
-- SGC — Sistema de Gestão de Clube — Núcleo SCP Castelo Branco
-- Schema completo para Supabase (PostgreSQL)
-- Corre este ficheiro no SQL Editor do Supabase Studio
-- =========================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------
-- ESCALÕES
-- ---------------------------------------------------------
create table escaloes (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  faixa_etaria text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- ATLETAS (PLANTEL)
-- ---------------------------------------------------------
create table atletas (
  id uuid primary key default uuid_generate_v4(),
  nome_curto text not null,
  nome_completo text not null,
  numero_camisola int,
  data_nascimento date,
  foto_url text,
  posicao text check (posicao in (
    'guarda-redes','fixo','fixo/ala','fixo/pivot','universal',
    'ala','ala/pivot','ala/fixo','pivot','pivot/fixo','pivot/ala'
  )),
  pe_preferido text check (pe_preferido in ('esquerdina','destra','ambidestra')),
  pais_nascimento text,
  nacionalidade text,
  anos_pratica_federada numeric,
  clube_anterior text,
  telefone text,
  escalao_id uuid references escaloes(id),
  escalao_etario text check (escalao_etario in (
    'petizes','traquinas','benjamins','infantis','iniciadas','juvenis','juniores'
  )),
  desportos_extra_futsal text,
  atividades_extra_desporto text,
  nome_pai text,
  contacto_pai text,
  nome_mae text,
  contacto_mae text,
  email_encarregado_educacao text,
  escola text,
  ano_escolar text,
  disciplina_favorita text,
  peso numeric,      -- kg
  altura numeric,    -- cm
  ativo boolean default true,
  created_at timestamptz default now()
);

-- IMC calculado automaticamente (view)
create or replace view atletas_imc as
select a.*,
  case when altura > 0 then round((peso / ((altura/100.0)^2))::numeric, 2) else null end as imc
from atletas a;

-- ---------------------------------------------------------
-- NOTAS ESCOLARES (períodos, disciplinas, notas)
-- ---------------------------------------------------------
create table notas_escolares (
  id uuid primary key default uuid_generate_v4(),
  atleta_id uuid references atletas(id) on delete cascade,
  periodo text not null,       -- ex: "1º Período"
  disciplina text not null,
  nota text not null,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- LESÕES
-- ---------------------------------------------------------
create table lesoes (
  id uuid primary key default uuid_generate_v4(),
  atleta_id uuid references atletas(id) on delete cascade,
  titulo text not null,
  descricao text,
  data_inicio date,
  tempo_recuperacao text,
  recuperada boolean default false,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- HISTÓRICO DE PROBLEMAS DE SAÚDE
-- ---------------------------------------------------------
create table historico_saude (
  id uuid primary key default uuid_generate_v4(),
  atleta_id uuid references atletas(id) on delete cascade,
  descricao text not null,
  data_registo date default current_date,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- JOGOS
-- ---------------------------------------------------------
create table jogos (
  id uuid primary key default uuid_generate_v4(),
  competicao text,
  jornada text,
  adversario_nome text,
  adversario_logo_url text,
  adversario_sigla text,
  local text,
  localidade text,
  duracao_parte int check (duracao_parte in (20,35)),
  data_jogo date,
  golos_equipa int default 0,
  golos_adversario int default 0,
  capitao_id uuid references atletas(id),
  vice_capitao_id uuid references atletas(id),
  created_at timestamptz default now()
);

create table jogo_convocatorias (
  id uuid primary key default uuid_generate_v4(),
  jogo_id uuid references jogos(id) on delete cascade,
  atleta_id uuid references atletas(id) on delete cascade,
  convocada boolean default true
);

create table jogo_titulares (
  id uuid primary key default uuid_generate_v4(),
  jogo_id uuid references jogos(id) on delete cascade,
  atleta_id uuid references atletas(id) on delete cascade,
  parte int check (parte in (1,2))
);

create table jogo_substituicoes (
  id uuid primary key default uuid_generate_v4(),
  jogo_id uuid references jogos(id) on delete cascade,
  parte int check (parte in (1,2)),
  minuto int not null,
  atleta_entra_id uuid references atletas(id),
  atleta_sai_id uuid references atletas(id)
);

create table jogo_golos (
  id uuid primary key default uuid_generate_v4(),
  jogo_id uuid references jogos(id) on delete cascade,
  marcador_id uuid references atletas(id),
  assistente_id uuid references atletas(id),
  parte_corpo text check (parte_corpo in ('pé direito','pé esquerdo','cabeça','outra parte do corpo')),
  zona text check (zona in ('fora da área','dentro da área')),
  momento text check (momento in (
    'bola corrida','livre indireto','livre direto','livre de 10 metros','pénalti',
    'canto','5x4 ofensivo','5x4 defensivo','4x3 ofensivo','contra-ataque',
    'fora ofensivo','fora defensivo'
  )),
  minuto int,
  parte int check (parte in (1,2))
);

-- estatísticas individuais por jogo (em tempo real)
create table jogo_estatisticas (
  id uuid primary key default uuid_generate_v4(),
  jogo_id uuid references jogos(id) on delete cascade,
  atleta_id uuid references atletas(id) on delete cascade,
  passes_certos int default 0,
  passes_falhados int default 0,
  remates_baliza int default 0,
  remates_fora int default 0,
  remates_postes int default 0,
  dribles_certos int default 0,
  dribles_falhados int default 0,
  grandes_oportunidades int default 0,
  perdas_bola int default 0,
  recuperacoes_bola int default 0,
  defesas_completas int default 0,     -- apenas GR
  defesas_incompletas int default 0,   -- apenas GR
  saidas_conseguidas int default 0,    -- apenas GR
  saidas_nao_conseguidas int default 0,-- apenas GR
  erros_originam_golo int default 0,
  minutos_jogados numeric default 0,   -- calculado a partir das substituições
  classificacao numeric,               -- calculada por algoritmo
  unique(jogo_id, atleta_id)
);

-- ---------------------------------------------------------
-- TREINOS
-- ---------------------------------------------------------
create table treinos (
  id uuid primary key default uuid_generate_v4(),
  numero int,
  dia_semana text,
  data_treino date,
  created_at timestamptz default now()
);

create table treino_presencas (
  id uuid primary key default uuid_generate_v4(),
  treino_id uuid references treinos(id) on delete cascade,
  atleta_id uuid references atletas(id) on delete cascade,
  estado text check (estado in (
    'presente','não presente justificado','não presente injustificado',
    'lesionado/doente presente','lesionado/doente não presente'
  )),
  cansaco int check (cansaco between 0 and 10),
  unique(treino_id, atleta_id)
);

-- ---------------------------------------------------------
-- AVALIAÇÕES FÍSICAS
-- ---------------------------------------------------------
create table avaliacoes_fisicas (
  id uuid primary key default uuid_generate_v4(),
  titulo text not null,
  data_avaliacao date,
  created_at timestamptz default now()
);

create table avaliacao_valores (
  id uuid primary key default uuid_generate_v4(),
  avaliacao_id uuid references avaliacoes_fisicas(id) on delete cascade,
  atleta_id uuid references atletas(id) on delete cascade,
  agachamentos int,
  flexoes int,
  abdominais int,
  sprint_20m interval,
  sprint_40m interval,
  shuttle_run interval,
  corrida_resistencia interval,  -- 10 voltas
  flexibilidade_bracos int check (flexibilidade_bracos between 0 and 5),
  flexibilidade_pernas int check (flexibilidade_pernas between 0 and 5),
  rotacao_tronco int check (rotacao_tronco between 0 and 5),
  equilibrio_direito int check (equilibrio_direito between 0 and 5),
  equilibrio_esquerdo int check (equilibrio_esquerdo between 0 and 5),
  equilibrio_total int check (equilibrio_total between 0 and 5),
  coordenacao_dentro_fora int check (coordenacao_dentro_fora between 0 and 5),
  coordenacao_lateralizados int check (coordenacao_lateralizados between 0 and 5),
  corrida_lateral_esq int check (corrida_lateral_esq between 0 and 5),
  corrida_lateral_dir int check (corrida_lateral_dir between 0 and 5),
  corrida_costas int check (corrida_costas between 0 and 5),
  passe int check (passe between 0 and 5),
  rececao int check (rececao between 0 and 5),
  conducao int check (conducao between 0 and 5),
  remate int check (remate between 0 and 5),
  unique(avaliacao_id, atleta_id)
);

-- ---------------------------------------------------------
-- UTILIZADORES (login simples — 2 utilizadores fixos)
-- ---------------------------------------------------------
create table utilizadores (
  id uuid primary key default uuid_generate_v4(),
  username text unique not null,
  password_hash text not null,
  nome text
);
-- Insere os 2 utilizadores a partir do backend/setup script (ver README) —
-- nunca guardar passwords em texto simples na base de dados.

-- ---------------------------------------------------------
-- Índices úteis
-- ---------------------------------------------------------
create index on jogo_estatisticas(atleta_id);
create index on jogo_golos(marcador_id);
create index on treino_presencas(atleta_id);
create index on avaliacao_valores(atleta_id);
