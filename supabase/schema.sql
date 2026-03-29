-- =============================================
-- 숙명여중 2학년 5반 학급 앱 DB 스키마
-- Supabase SQL Editor에 전체 붙여넣기 후 실행
-- =============================================

-- 1. 공지사항 (수행평가/과제/준비물/기타)
create table if not exists class_notices (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null,
  category    text not null default 'general',
  -- category: 'performance' | 'homework' | 'supplies' | 'general'
  due_date    text,           -- 마감일 (자유 텍스트)
  subject     text,           -- 과목
  is_pinned   boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 2. 투표
create table if not exists class_polls (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  is_multiple boolean default false,   -- 복수 선택 여부
  is_closed   boolean default false,   -- 마감 여부
  ends_at     timestamptz,             -- 마감 시간 (null = 무기한)
  created_at  timestamptz default now()
);

-- 3. 투표 선택지
create table if not exists class_poll_options (
  id       uuid primary key default gen_random_uuid(),
  poll_id  uuid references class_polls(id) on delete cascade,
  label    text not null,
  sort_order int default 0
);

-- 4. 투표 결과
create table if not exists class_poll_votes (
  id         uuid primary key default gen_random_uuid(),
  poll_id    uuid references class_polls(id) on delete cascade,
  option_id  uuid references class_poll_options(id) on delete cascade,
  session_id text not null,
  created_at timestamptz default now(),
  unique(poll_id, option_id, session_id)
);

-- 5. 댓글 (공지별)
create table if not exists class_comments (
  id         uuid primary key default gen_random_uuid(),
  notice_id  uuid references class_notices(id) on delete cascade,
  author     text not null,
  body       text not null,
  created_at timestamptz default now()
);

-- 6. 이모지 반응 (공지별)
create table if not exists class_reactions (
  id         uuid primary key default gen_random_uuid(),
  notice_id  uuid references class_notices(id) on delete cascade,
  emoji      text not null,
  session_id text not null,
  created_at timestamptz default now(),
  unique(notice_id, emoji, session_id)
);

-- =============================================
-- RLS 설정
-- =============================================
alter table class_notices    enable row level security;
alter table class_polls      enable row level security;
alter table class_poll_options enable row level security;
alter table class_poll_votes enable row level security;
alter table class_comments   enable row level security;
alter table class_reactions  enable row level security;

-- 전체 읽기 허용
create policy "public read class_notices"      on class_notices      for select using (true);
create policy "public read class_polls"        on class_polls        for select using (true);
create policy "public read class_poll_options" on class_poll_options for select using (true);
create policy "public read class_poll_votes"   on class_poll_votes   for select using (true);
create policy "public read class_comments"     on class_comments     for select using (true);
create policy "public read class_reactions"    on class_reactions    for select using (true);

-- 전체 쓰기 허용 (anon)
create policy "anon write class_notices"      on class_notices      for all using (true) with check (true);
create policy "anon write class_polls"        on class_polls        for all using (true) with check (true);
create policy "anon write class_poll_options" on class_poll_options for all using (true) with check (true);
create policy "anon write class_poll_votes"   on class_poll_votes   for all using (true) with check (true);
create policy "anon write class_comments"     on class_comments     for all using (true) with check (true);
create policy "anon write class_reactions"    on class_reactions    for all using (true) with check (true);

-- =============================================
-- 초기 샘플 데이터
-- =============================================
insert into class_notices (title, body, category, subject, due_date, is_pinned) values
('3월 수행평가 일정 안내', E'3월 수행평가 일정을 안내합니다.\n\n• 국어: 독서 감상문 (3/31까지)\n• 수학: 단원 형성평가 (4/3)\n• 영어: 말하기 평가 (4/7~8)', 'performance', '전과목', '4월 8일', true),
('수학 숙제 안내', E'p.45 ~ p.48 연습문제 전부\n풀이 과정 꼭 작성할 것', 'homework', '수학', '내일까지', false),
('체육 시간 준비물', E'• 체육복 착용 필수\n• 실내화 지참\n• 물통 준비', 'supplies', '체육', '매주 화/목', false),
('자습 시간 안내', E'담임 선생님 출장으로 인해 내일 4교시는 자습입니다.\n떠들지 않고 조용히 공부해 주세요 😊', 'general', null, null, false);

insert into class_polls (title, description, is_multiple, is_closed) values
('점심 메뉴 투표 🍱', '이번 주 금요일 학급 파티 점심 메뉴를 정해요!', false, false),
('체험학습 장소 선택', '5월 체험학습 장소를 투표로 결정합니다. 복수 선택 가능!', true, false);

insert into class_poll_options (poll_id, label, sort_order)
select id, unnest(array['🍕 피자', '🍗 치킨', '🍜 짜장면', '🍣 초밥']), generate_series(1,4)
from class_polls where title = '점심 메뉴 투표 🍱';

insert into class_poll_options (poll_id, label, sort_order)
select id, unnest(array['🏛️ 국립중앙박물관', '🎨 국립현대미술관', '🌿 서울식물원', '🎡 롯데월드']), generate_series(1,4)
from class_polls where title = '체험학습 장소 선택';
