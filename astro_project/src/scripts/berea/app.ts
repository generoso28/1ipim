/**
 * Berea App — cliente TypeScript
 *
 * Lida com autenticação (cookie WordPress + nonce), navegação entre views,
 * chamadas à API Berea (1ipim/v1), e gerenciamento de estado da UI.
 */

import { BEREA_API_BASE, BEREA_ORIGIN } from "../../config/api";

// ============================================================================
// Tipos
// ============================================================================

interface BereaUser {
  id: number;
  nome: string;
  avatar: string;
  iniciais: string;
}

interface BereaProfile {
  bio: string;
  timezone: string;
  day_cutoff: string;
  ranking_optin: boolean;
  notifications: { daily: boolean; activity: boolean };
}

interface BereaStreak {
  atual: number;
  recorde: number;
  ultimo_checkin: string;
}

interface BereaBadge {
  badge: string;
  label: string;
  icon: string;
  concedido_em: string;
}

interface BereaRoom {
  id: number;
  nome: string;
  slug: string;
  descricao: string;
  codigo: string;
  tipo: 'livre' | 'pg' | 'ministerio';
  privacidade: 'privada' | 'publica';
  grupo_id: number | null;
  grupo_nome: string;
  owner_id: number;
  imagem: string;
  postagem: 'membros' | 'moderadores';
  membros: number;
  is_member: boolean;
  papel: 'membro' | 'moderador' | '';
  can_moderate: boolean;
  created_at: string;
}

interface BereaPlan {
  id: number;
  slug: string;
  titulo: string;
  descricao: string;
  dias: number;
  traducao: string;
  started_on: string;
  current_day: number;
  status: string;
  hoje: number | null;
  days: BereaPlanDay[];
}

interface BereaPlanDay {
  dia: number;
  passagem: string;
  titulo: string;
  reflexao: string;
  concluido: boolean;
}

interface BereaCheckin {
  tipo: 'checkin' | 'encontro';
  id: number;
  data: string;
  texto?: string;
  foto_url?: string;
  foto_expira_em?: string;
  visibilidade?: string;
  autor: BereaUser;
  rooms?: { id: number; nome: string; codigo: string; tipo: string }[];
  plan_day?: number | null;
  plan_titulo?: string;
  comentarios?: number;
  reacoes?: Record<string, number>;
  minha_reacao?: string;
  is_own?: boolean;
  created_at?: string;
  // Encontro fields
  texto_lido?: string;
  tema?: string;
  preletor?: string;
  observacoes?: string;
  publico_presente?: number;
  presentes?: string[];
  grupo_nome?: string;
}

interface BereaMeResponse {
  user: BereaUser;
  profile: BereaProfile;
  streak: BereaStreak;
  badges: BereaBadge[];
  rooms: BereaRoom[];
  plan: BereaPlan | null;
  permissions: {
    can_manage_content: boolean;
    can_moderate: boolean;
    is_global_moderator: boolean;
  };
  unread_notifications: number;
}

type ViewName = 'feed' | 'diario' | 'plano' | 'salas' | 'perfil';

// ============================================================================
// Estado global
// ============================================================================

let currentView: ViewName = 'feed';
let currentUser: BereaMeResponse | null = null;
let nonce: string | null = null;

// ============================================================================
// Utilitários
// ============================================================================

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setNonceFromCookie(): void {
  // O nonce vem no cookie do WordPress ou no localStorage do portal
  const lsNonce = localStorage.getItem('1ipim_auth_nonce');
  if (lsNonce) {
    nonce = lsNonce;
  }
}

function apiUrl(path: string): string {
  return `${BEREA_API_BASE}${path}`;
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  if (nonce) {
    headers['X-WP-Nonce'] = nonce;
  }

  const response = await fetch(apiUrl(path), {
    credentials: 'include',
    ...init,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    // Sessão expirada - redirecionar para login do portal
    window.location.href = `${BEREA_ORIGIN.replace('berea', 'portal')}/login?redirect=${encodeURIComponent(window.location.href)}`;
    throw new Error('Sessão expirada');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Erro ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// Autenticação e inicialização
// ============================================================================

async function checkSession(): Promise<boolean> {
  try {
    const data = await apiFetch<BereaMeResponse>('/me');
    currentUser = data;
    nonce = data.user ? (localStorage.getItem('1ipim_auth_nonce') || '') : null;
    return true;
  } catch (e) {
    // Se não autenticado, redirecionar para login
    if (e instanceof Error && e.message === 'Sessão expirada') {
      return false;
    }
    // Outros erros - talvez só não logado
    return false;
  }
}

// ============================================================================
// Renderização de views
// ============================================================================

function showView(view: ViewName): void {
  // Esconder todas as views
  document.querySelectorAll('.view').forEach((el) => el.classList.add('hidden'));
  document.querySelectorAll('.view').forEach((el) => el.classList.remove('active'));

  // Mostrar a view selecionada
  const target = document.getElementById(`view-${view}`);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
  }

  // Atualizar navegação ativa
  document.querySelectorAll('[data-tab]').forEach((el) => {
    if (el.getAttribute('data-tab') === view) {
      el.classList.add('active');
      (el as HTMLElement).setAttribute('aria-current', 'page');
    } else {
      el.classList.remove('active');
      (el as HTMLElement).removeAttribute('aria-current');
    }
  });

  currentView = view;

  // Carregar dados da view
  switch (view) {
    case 'feed':
      loadFeed();
      break;
    case 'diario':
      loadDiario();
      break;
    case 'plano':
      loadPlano();
      break;
    case 'salas':
      loadSalas();
      break;
    case 'perfil':
      loadPerfil();
      break;
  }
}

function renderUserInfo(): void {
  if (!currentUser) return;

  const initialsEl = document.getElementById('user-initials');
  const nameEl = document.getElementById('user-name');
  const streakEl = document.getElementById('user-streak');

  if (initialsEl) initialsEl.textContent = currentUser.user.iniciais;
  if (nameEl) nameEl.textContent = currentUser.user.nome;
  if (streakEl) streakEl.textContent = `Streak: ${currentUser.streak.atual} dias`;
}

async function loadFeed(): Promise<void> {
  if (!currentUser) return;

  const container = document.getElementById('feed-list');
  if (!container) return;

  container.innerHTML = '<div class="text-center py-8 text-zinc-500 dark:text-zinc-400"><span class="material-symbols-outlined text-4xl animate-spin">refresh</span></div>';

  try {
    const data = await apiFetch<{ items: BereaCheckin[] }>('/feed');
    renderFeed(data.items, container);
  } catch (e) {
    console.error('Erro ao carregar feed:', e);
    container.innerHTML = '<div class="text-center py-8 text-red-500">Erro ao carregar feed</div>';
  }
}

function renderFeed(items: BereaCheckin[], container: HTMLElement): void {
  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-symbols-outlined">menu_book</span>
        <p>Nenhum check-in ainda. Seja o primeiro a compartilhar!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map((item) => renderCheckinCard(item)).join('');

  // Adicionar listeners para reações
  container.querySelectorAll('[data-reaction]').forEach((btn) => {
    btn.addEventListener('click', handleReaction);
  });
}

function renderCheckinCard(item: BereaCheckin): string {
  const isEncontro = item.tipo === 'encontro';
  const date = new Date(item.data).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const time = new Date(item.created_at || item.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  let content = '';
  if (isEncontro) {
    content = `
      <div class="mb-3 p-3 bg-berea-comunhao/10 dark:bg-berea-comunhao/20 rounded-xl border border-berea-comunhao/20">
        <div class="flex items-center gap-2 text-sm text-berea-comunhao dark:text-berea-comunhao font-medium mb-2">
          <span class="material-symbols-outlined text-base">event</span>
          <span>Encontro - ${item.grupo_nome || 'Grupo'}</span>
        </div>
        ${item.texto_lido ? `<p class="font-cormorant text-zinc-700 dark:text-zinc-300 mb-1"><strong>Texto:</strong> ${escapeHtml(item.texto_lido)}</p>` : ''}
        ${item.tema ? `<p class="text-sm text-zinc-600 dark:text-zinc-400 mb-1"><strong>Tema:</strong> ${escapeHtml(item.tema)}</p>` : ''}
        ${item.preletor ? `<p class="text-sm text-zinc-600 dark:text-zinc-400 mb-1"><strong>Preletor:</strong> ${escapeHtml(item.preletor)}</p>` : ''}
        ${item.publico_presente ? `<p class="text-sm text-zinc-600 dark:text-zinc-400"><strong>Presentes:</strong> ${item.publico_presente} pessoas</p>` : ''}
      </div>
    `;
  } else {
    content = `
      <p class="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap mb-3">${escapeHtml(item.texto || '')}</p>
      ${item.foto_url ? `<img src="${item.foto_url}" alt="Foto do check-in" class="rounded-xl max-h-64 w-auto mb-3">` : ''}
      ${item.plan_titulo ? `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-berea-partir-pao text-zinc-900 rounded-full mb-2">${escapeHtml(item.plan_titulo)} - Dia ${item.plan_day}</span>` : ''}
    `;
  }

  const reactionsHtml = item.reacoes ? Object.entries(item.reacoes).map(([tipo, count]) => {
    const icon = reactionIcon(tipo);
    const isMine = item.minha_reacao === tipo;
    return `<button type="button" data-reaction="${tipo}" data-checkin="${item.id}" class="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm ${isMine ? 'bg-berea-doutrina/20 text-berea-doutrina' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'} transition-colors" ${isMine ? 'aria-pressed="true"' : ''}>
      <span class="material-symbols-outlined text-base">${icon}</span>
      <span>${count}</span>
    </button>`;
  }).join('') : '';

  return `
    <article class="berea-card checkin-card animate-slide-up" data-checkin-id="${item.id}">
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-full bg-berea-doutrina flex-shrink-0 flex items-center justify-center text-white text-sm font-bold">
          ${item.autor.iniciais}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2 mb-1">
            <div class="flex items-center gap-2">
              <span class="font-medium text-zinc-900 dark:text-white">${escapeHtml(item.autor.nome)}</span>
              ${item.is_own ? '<span class="text-xs text-zinc-400 dark:text-zinc-500">(você)</span>' : ''}
            </div>
            <span class="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">${date} ${time}</span>
          </div>
          ${content}
          <div class="flex items-center gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
            <div class="flex items-center gap-1">${reactionsHtml}</div>
            <button type="button" data-comment="${item.id}" class="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-full text-sm text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <span class="material-symbols-outlined text-base">chat</span>
              <span>${item.comentarios || 0}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function reactionIcon(tipo: string): string {
  switch (tipo) {
    case 'amem': return 'favorite';
    case 'oracao': return 'self_improvement';
    case 'coracao': return 'favorite_border';
    case 'fogo': return 'local_fire_department';
    default: return 'favorite';
  }
}

async function handleReaction(e: Event): Promise<void> {
  const btn = e.currentTarget as HTMLButtonElement;
  const checkinId = btn.getAttribute('data-checkin');
  const tipo = btn.getAttribute('data-reaction');
  if (!checkinId || !tipo) return;

  try {
    await apiFetch(`/reaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: parseInt(checkinId), tipo }),
    });
    // Atualizar UI otimisticamente
    const countEl = btn.querySelector('span:last-child');
    if (countEl) {
      const current = parseInt(countEl.textContent || '0');
      if (btn.getAttribute('aria-pressed') === 'true') {
        countEl.textContent = String(current - 1);
        btn.setAttribute('aria-pressed', 'false');
        btn.classList.remove('bg-berea-doutrina/20', 'text-berea-doutrina');
        btn.classList.add('text-zinc-500', 'dark:text-zinc-400');
      } else {
        countEl.textContent = String(current + 1);
        btn.setAttribute('aria-pressed', 'true');
        btn.classList.add('bg-berea-doutrina/20', 'text-berea-doutrina');
        btn.classList.remove('text-zinc-500', 'dark:text-zinc-400');
      }
    }
  } catch (err) {
    console.error('Erro ao reagir:', err);
  }
}

async function loadDiario(): Promise<void> {
  const container = document.getElementById('view-diario');
  if (!container) return;

  container.innerHTML = '<div class="text-center py-8 text-zinc-500 dark:text-zinc-400"><span class="material-symbols-outlined text-4xl mb-2 block">book</span><p>Seus check-ins privados aparecerão aqui.</p></div>';
}

async function loadPlano(): Promise<void> {
  const container = document.getElementById('view-plano');
  if (!container) return;

  container.innerHTML = '<div class="text-center py-8 text-zinc-500 dark:text-zinc-400"><span class="material-symbols-outlined text-4xl mb-2 block">calendar_month</span><p>Carregando plano...</p></div>';

  try {
    const data = await apiFetch<{ plan: BereaPlan | null; available: BereaPlan[] }>('/plan');
    renderPlano(data.plan, data.available, container);
  } catch (e) {
    console.error('Erro ao carregar plano:', e);
    container.innerHTML = '<div class="text-center py-8 text-red-500">Erro ao carregar plano</div>';
  }
}

function renderPlano(plan: BereaPlan | null, available: BereaPlan[], container: HTMLElement): void {
  if (!plan) {
    container.innerHTML = `
      <div class="space-y-4">
        <div class="text-center py-8 text-zinc-500 dark:text-zinc-400">
          <span class="material-symbols-outlined text-4xl mb-2 block">calendar_month</span>
          <p>Nenhum plano ativo. Escolha um para começar:</p>
        </div>
        <div class="grid gap-4">${available.map((p) => `
          <button type="button" data-plan-start="${p.id}" class="berea-card p-6 text-left hover:border-berea-doutrina transition-colors">
            <h3 class="font-cormorant text-xl font-bold text-zinc-900 dark:text-white mb-1">${escapeHtml(p.titulo)}</h3>
            <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-3">${escapeHtml(p.descricao)}</p>
            <div class="flex items-center gap-4 text-sm text-zinc-500">
              <span>${p.dias} dias</span>
              <span>${p.traducao}</span>
            </div>
          </button>
        `).join('')}</div>
      </div>
    `;

    container.querySelectorAll('[data-plan-start]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const planId = (e.currentTarget as HTMLButtonElement).getAttribute('data-plan-start');
        if (planId) await startPlan(parseInt(planId));
      });
    });
    return;
  }

  // Plano ativo - mostrar progresso
  const progress = plan.current_day > plan.dias ? 100 : Math.round((plan.current_day / plan.dias) * 100);
  container.innerHTML = `
    <div class="space-y-6">
      <div class="berea-card p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-cormorant text-xl font-bold text-zinc-900 dark:text-white">${escapeHtml(plan.titulo)}</h3>
          <span class="badge-streak"><span class="material-symbols-outlined">local_fire_department</span> ${currentUser?.streak.atual || 0} dias</span>
        </div>
        <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden mb-2">
          <div class="h-full bg-berea-amber-500 rounded-full transition-all duration-500" style="width: ${progress}%"></div>
        </div>
        <div class="flex justify-between text-sm text-zinc-500">
          <span>Dia ${plan.current_day} de ${plan.dias}</span>
          <span>${progress}% concluído</span>
        </div>
      </div>
      <div>
        <h4 class="font-medium text-zinc-700 dark:text-zinc-300 mb-3">Dias do plano</h4>
        <div class="grid gap-2">${plan.days.map((day) => `
          <button type="button" data-plan-day="${day.dia}" class="berea-card p-4 text-left ${day.concluido ? 'border-berea-amber-500 bg-berea-amber-500/5' : 'hover:border-berea-doutrina'} transition-colors">
            <div class="flex items-center justify-between">
              <div>
                <span class="font-medium text-zinc-900 dark:text-white">Dia ${day.dia}</span>
                <span class="text-sm text-zinc-500 ml-2">${escapeHtml(day.passagem)}</span>
              </div>
              ${day.concluido ? '<span class="material-symbols-outlined text-berea-amber-500">check_circle</span>' : '<span class="material-symbols-outlined text-zinc-400">radio_button_unchecked</span>'}
            </div>
            <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-2">${escapeHtml(day.reflexao)}</p>
          </button>
        `).join('')}</div>
      </div>
    </div>
  `;

  container.querySelectorAll('[data-plan-day]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const day = btn.getAttribute('data-plan-day');
      if (day) openCheckinModal(parseInt(day));
    });
  });
}

async function startPlan(planId: number): Promise<void> {
  try {
    await apiFetch('/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: planId }),
    });
    loadPlano();
  } catch (e) {
    console.error('Erro ao iniciar plano:', e);
  }
}

function openCheckinModal(planDay?: number): void {
  const modal = document.getElementById('checkin-modal');
  const backdrop = document.getElementById('modal-backdrop');
  const roomsContainer = document.getElementById('checkin-rooms');

  if (modal && backdrop) {
    modal.classList.remove('hidden');
    backdrop.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Carregar salas
    if (roomsContainer && currentUser) {
      roomsContainer.innerHTML = currentUser.rooms.map((room) => `
        <label class="flex items-center gap-3 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer transition-colors">
          <input type="checkbox" name="rooms" value="${room.id}" class="w-5 h-5 text-berea-doutrina rounded border-zinc-300 focus:ring-berea-doutrina">
          <span class="font-medium text-zinc-900 dark:text-white">${escapeHtml(room.nome)}</span>
          ${room.tipo === 'pg' ? '<span class="text-xs px-2 py-0.5 bg-berea-comunhao/20 text-berea-comunhao rounded-full">PG</span>' : ''}
        </label>
      `).join('');
    }
  }
}

function closeCheckinModal(): void {
  const modal = document.getElementById('checkin-modal');
  const backdrop = document.getElementById('modal-backdrop');
  if (modal && backdrop) {
    modal.classList.add('hidden');
    backdrop.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

async function loadSalas(): Promise<void> {
  const container = document.getElementById('view-salas');
  if (!container) return;

  container.innerHTML = '<div class="text-center py-8 text-zinc-500 dark:text-zinc-400"><span class="material-symbols-outlined text-4xl mb-2 block">groups</span><p>Carregando salas...</p></div>';

  try {
    const data = await apiFetch<{ minhas: BereaRoom[]; descobrir: BereaRoom[] }>('/room');
    renderSalas(data.minhas, data.descobrir, container);
  } catch (e) {
    console.error('Erro ao carregar salas:', e);
    container.innerHTML = '<div class="text-center py-8 text-red-500">Erro ao carregar salas</div>';
  }
}

function renderSalas(minhas: BereaRoom[], descobrir: BereaRoom[], container: HTMLElement): void {
  let html = '';

  if (minhas.length > 0) {
    html += `
      <h3 class="font-medium text-zinc-700 dark:text-zinc-300 mb-3">Minhas salas</h3>
      <div class="grid gap-3 mb-6">${minhas.map((room) => renderRoomCard(room, true)).join('')}</div>
    `;
  }

  if (descobrir.length > 0) {
    html += `
      <h3 class="font-medium text-zinc-700 dark:text-zinc-300 mb-3">Descobrir salas</h3>
      <div class="grid gap-3">${descobrir.map((room) => renderRoomCard(room, false)).join('')}</div>
    `;
  }

  if (minhas.length === 0 && descobrir.length === 0) {
    html = `
      <div class="empty-state">
        <span class="material-symbols-outlined">groups</span>
        <p>Você não participa de nenhuma sala ainda.</p>
        <button type="button" id="create-room-btn" class="mt-4 btn-primary px-6 py-3">
          <span class="material-symbols-outlined mr-2">add</span> Criar sala
        </button>
      </div>
    `;
  }

  container.innerHTML = html;

  // Listeners
  container.querySelectorAll('[data-room-join]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const roomId = (e.currentTarget as HTMLButtonElement).getAttribute('data-room-join');
      if (roomId) await joinRoom(parseInt(roomId));
    });
  });

  const createBtn = document.getElementById('create-room-btn');
  if (createBtn) {
    createBtn.addEventListener('click', () => openCreateRoomModal());
  }
}

function renderRoomCard(room: BereaRoom, isMember: boolean): string {
  const color = roomColor(room.tipo);
  return `
    <article class="berea-card p-4 flex items-center gap-4">
      <div class="room-avatar ${color}" style="width: 48px; height: 48px; font-size: 1.125rem;">
        ${escapeHtml(room.nome.charAt(0).toUpperCase())}
      </div>
      <div class="flex-1 min-w-0">
        <h4 class="font-medium text-zinc-900 dark:text-white truncate">${escapeHtml(room.nome)}</h4>
        <div class="flex items-center gap-2 text-sm text-zinc-500 mt-1">
          <span class="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full">${room.membros} membros</span>
          ${room.tipo === 'pg' ? '<span class="px-2 py-0.5 bg-berea-comunhao/20 text-berea-comunhao rounded-full text-xs">PG</span>' : ''}
          ${room.tipo === 'ministerio' ? '<span class="px-2 py-0.5 bg-berea-doutrina/20 text-berea-doutrina rounded-full text-xs">Ministério</span>' : ''}
        </div>
      </div>
      ${!isMember ? `
        <button type="button" data-room-join="${room.id}" class="btn-secondary px-4 py-2 text-sm">Entrar</button>
      ` : `
        <span class="text-sm font-medium text-berea-doutrina">Você participa</span>
      `}
    </article>
  `;
}

function roomColor(tipo: string): string {
  switch (tipo) {
    case 'pg': return 'bg-berea-comunhao';
    case 'ministerio': return 'bg-berea-doutrina';
    default: return 'bg-berea-oracoes';
  }
}

async function joinRoom(roomId: number): Promise<void> {
  try {
    await apiFetch(`/room/${roomId}/join`, { method: 'POST' });
    loadSalas();
  } catch (e) {
    console.error('Erro ao entrar na sala:', e);
  }
}

function openCreateRoomModal(): void {
  const nome = prompt('Nome da nova sala:');
  if (!nome) return;

  createRoom(nome);
}

async function createRoom(nome: string): Promise<void> {
  try {
    await apiFetch('/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome }),
    });
    loadSalas();
  } catch (e) {
    console.error('Erro ao criar sala:', e);
  }
}

async function loadPerfil(): Promise<void> {
  const container = document.getElementById('view-perfil');
  if (!container || !currentUser) return;

  container.innerHTML = `
    <div class="space-y-6">
      <div class="berea-card p-6 text-center">
        <div class="w-24 h-24 rounded-full bg-berea-doutrina flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
          ${currentUser.user.iniciais}
        </div>
        <h3 class="font-cormorant text-2xl font-bold text-zinc-900 dark:text-white">${escapeHtml(currentUser.user.nome)}</h3>
        <p class="text-zinc-500 dark:text-zinc-400 mt-1">ID: ${currentUser.user.id}</p>
      </div>

      <div class="berea-card p-6">
        <h4 class="font-medium text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
          <span class="material-symbols-outlined">local_fire_department</span>
          Streak
        </h4>
        <div class="flex items-center gap-4">
          <div class="streak-display">
            <span class="material-symbols-outlined">local_fire_department</span>
            <span>${currentUser.streak.atual} dias</span>
          </div>
          <div class="text-zinc-600 dark:text-zinc-400">
            Recorde: ${currentUser.streak.recorde} dias
          </div>
        </div>
      </div>

      ${currentUser.badges.length > 0 ? `
        <div class="berea-card p-6">
          <h4 class="font-medium text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
            <span class="material-symbols-outlined">workspace_premium</span>
            Conquistas
          </h4>
          <div class="flex flex-wrap gap-2">
            ${currentUser.badges.map((b) => `
              <span class="badge-streak">
                <span class="material-symbols-outlined">${b.icon}</span>
                ${escapeHtml(b.label)}
              </span>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="berea-card p-6">
        <h4 class="font-medium text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
          <span class="material-symbols-outlined">settings</span>
          Configurações
        </h4>
        <div class="space-y-4">
          <label class="flex items-center justify-between">
            <span class="text-zinc-700 dark:text-zinc-300">Modo escuro</span>
            <button type="button" id="theme-toggle-profile" class="w-12 h-7 rounded-full bg-zinc-300 dark:bg-zinc-600 relative transition-colors" role="switch" aria-checked="${document.documentElement.classList.contains('dark')}">
              <span class="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${document.documentElement.classList.contains('dark') ? 'translate-x-5' : ''}"></span>
            </button>
          </label>
          <label class="flex items-center justify-between">
            <span class="text-zinc-700 dark:text-zinc-300">Participar do ranking</span>
            <input type="checkbox" id="ranking-optin" ${currentUser.profile.ranking_optin ? 'checked' : ''} class="w-5 h-5 text-berea-doutrina rounded border-zinc-300 focus:ring-berea-doutrina">
          </label>
        </div>
      </div>
    </div>
  `;

  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle-profile');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  const rankingOptin = document.getElementById('ranking-optin');
  if (rankingOptin) {
    rankingOptin.addEventListener('change', toggleRankingOptin);
  }
}

function toggleTheme(): void {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('berea-theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
}

function toggleRankingOptin(): void {
  // TODO: implementar API
}

function escapeHtml(text: string): string {
  return text
    .replaceAll(String.fromCharCode(38), String.fromCharCode(38) + 'amp;')
    .replaceAll(String.fromCharCode(60), String.fromCharCode(38) + 'lt;')
    .replaceAll(String.fromCharCode(62), String.fromCharCode(38) + 'gt;')
    .replaceAll(String.fromCharCode(34), String.fromCharCode(38) + 'quot;')
    .replaceAll(String.fromCharCode(39), String.fromCharCode(38) + '#39;');
}

// ============================================================================
// Navegação e UI
// ============================================================================

function initNavigation(): void {
  // Desktop left rail
  document.querySelectorAll('[data-tab]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = (e.currentTarget as HTMLElement).getAttribute('data-tab');
      if (view) {
        showView(view as ViewName);
        // Atualizar URL sem recarregar
        history.pushState({ view }, '', `/${view}`);
      }
    });
  });

  // Mobile bottom tabs
  document.querySelectorAll('#bottom-tabs a[data-tab]').forEach((link) => {
    link.addEventListener('click', (e) => {
      // Deixar o link funcionar normalmente para check-in (FAB)
      const view = (e.currentTarget as HTMLElement).getAttribute('data-tab');
      if (view && view !== 'checkin') {
        e.preventDefault();
        showView(view as ViewName);
        history.pushState({ view }, '', `/${view}`);
      }
    });
  });

  // FAB check-in
  const fab = document.getElementById('fab-checkin');
  if (fab) {
    fab.addEventListener('click', (e) => {
      e.preventDefault();
      openCheckinModal();
    });
  }

  // Check-in modal
  document.getElementById('close-modal')?.addEventListener('click', closeCheckinModal);
  document.getElementById('modal-backdrop')?.addEventListener('click', closeCheckinModal);
  document.getElementById('cancel-checkin')?.addEventListener('click', closeCheckinModal);

  const checkinForm = document.getElementById('checkin-form');
  if (checkinForm) {
    checkinForm.addEventListener('submit', handleCheckinSubmit);
  }

  // Theme toggle (header)
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

  // Mobile menu toggle
  document.getElementById('menu-toggle')?.addEventListener('click', toggleSidebar);
  document.getElementById('sidebar-backdrop')?.addEventListener('click', closeSidebar);
}

function toggleSidebar(): void {
  const sidebar = document.getElementById('left-rail');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar && backdrop) {
    const isOpen = sidebar.classList.toggle('translate-x-0');
    sidebar.classList.toggle('-translate-x-full', !isOpen);
    backdrop.classList.toggle('hidden', !isOpen);
  }
}

function closeSidebar(): void {
  const sidebar = document.getElementById('left-rail');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar && backdrop) {
    sidebar.classList.add('-translate-x-full');
    sidebar.classList.remove('translate-x-0');
    backdrop.classList.add('hidden');
  }
}

async function handleCheckinSubmit(e: Event): Promise<void> {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const texto = (form.querySelector('#checkin-texto') as HTMLTextAreaElement).value.trim();
  const roomCheckboxes = form.querySelectorAll('input[name="rooms"]:checked');

  if (!texto) return;

  const roomIds = Array.from(roomCheckboxes).map((cb) => parseInt((cb as HTMLInputElement).value));

  try {
    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Publicando...';

    await apiFetch('/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto, room_ids: roomIds }),
    });

    closeCheckinModal();
    showView('feed'); // Recarrega o feed
  } catch (err) {
    console.error('Erro ao fazer check-in:', err);
    alert('Erro ao publicar check-in. Tente novamente.');
  } finally {
    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Publicar';
  }
}

// ============================================================================
// Inicialização
// ============================================================================

async function init(): Promise<void> {
  // Carregar tema salvo
  const savedTheme = localStorage.getItem('berea-theme');
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }

  setNonceFromCookie();

  const authenticated = await checkSession();
  if (!authenticated) {
    // Redirecionar para login do portal com redirect de volta
    const portalLogin = BEREA_ORIGIN.replace('berea', 'portal') + '/login';
    window.location.href = `${portalLogin}?redirect=${encodeURIComponent(window.location.href)}`;
    return;
  }

  renderUserInfo();
  initNavigation();

  // Determinar view inicial pela URL
  const path = window.location.pathname.replace(/^\//, '') || 'feed';
  const validViews: ViewName[] = ['feed', 'diario', 'plano', 'salas', 'perfil'];
  const initialView = validViews.includes(path as ViewName) ? path as ViewName : 'feed';
  showView(initialView);

  // Listener para popstate (navegação do browser)
  window.addEventListener('popstate', (e) => {
    if (e.state?.view) {
      showView(e.state.view);
    }
  });
}

// Iniciar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Exportar para uso global se necessário
(window as any).bereaApp = {
  showView,
  openCheckinModal,
  closeCheckinModal,
  apiFetch,
};