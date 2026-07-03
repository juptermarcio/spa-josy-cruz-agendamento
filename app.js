const APP_KEY = 'spa_josy_cruz_pwa_v1_2';
const ADMIN_PIN = '0711';

const defaultState = {
  services: [
    { id: 'massagem-relaxante', name: 'Massagem Relaxante', duration: 60, price: '', active: true, description: 'Atendimento de relaxamento corporal.' },
    { id: 'massagem-terapeutica', name: 'Massagem Terapêutica', duration: 60, price: '', active: true, description: 'Atendimento corporal com foco em tensão e desconforto.' },
    { id: 'ventosaterapia', name: 'Ventosaterapia', duration: 60, price: '', active: true, description: 'Sessão com ventosas, conforme avaliação profissional.' },
    { id: 'escalda-pes', name: 'Escalda-pés', duration: 30, price: '', active: true, description: 'Cuidado complementar de relaxamento.' },
    { id: 'pacote-cliente', name: 'Cliente com pacote', duration: 60, price: '', active: true, description: 'Agendamento para quem já possui pacote.' }
  ],
  clients: [],
  appointments: [],
  history: [],
  settings: {
    businessName: 'Spa Josy Cruz',
    address: 'Tech Office, sala 711, São Luís/MA',
    openDays: [2, 3, 4, 5, 6],
    times: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']
  }
};

let state = loadState();
let selectedServiceId = '';
let selectedTime = '';
let deferredPrompt = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function loadState() {
  try {
    const raw = localStorage.getItem(APP_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(defaultState), ...parsed };
  } catch (error) {
    console.error('Erro ao carregar estado', error);
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(APP_KEY, JSON.stringify(state));
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso) {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function currentTimestamp() {
  return new Date().toISOString();
}

function getService(id) {
  return state.services.find((service) => service.id === id);
}

function getClient(id) {
  return state.clients.find((client) => client.id === id);
}

function setMessage(element, text, type = 'ok') {
  element.textContent = text;
  element.className = `message ${type}`;
}

function renderServices() {
  const grid = $('#servicesGrid');
  grid.innerHTML = '';
  state.services.filter((service) => service.active).forEach((service) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `choice ${selectedServiceId === service.id ? 'active' : ''}`;
    button.innerHTML = `<strong>${service.name}</strong><span>${service.duration} min${service.price ? ` · ${service.price}` : ''}</span><br><span>${service.description}</span>`;
    button.addEventListener('click', () => {
      selectedServiceId = service.id;
      $('#selectedService').value = service.id;
      selectedTime = '';
      $('#selectedTime').value = '';
      renderServices();
      renderTimes();
    });
    grid.appendChild(button);
  });
}

function isOpenDate(dateIso) {
  if (!dateIso) return false;
  const date = new Date(`${dateIso}T12:00:00`);
  return state.settings.openDays.includes(date.getDay());
}

function isTimeBlocked(dateIso, time) {
  return state.appointments.some((appointment) => {
    return appointment.date === dateIso && appointment.time === time && ['Solicitado', 'Confirmado', 'Remarcado'].includes(appointment.status);
  });
}

function renderTimes() {
  const grid = $('#timeGrid');
  const dateIso = $('#appointmentDate').value;
  grid.innerHTML = '';
  selectedTime = '';
  $('#selectedTime').value = '';

  if (!selectedServiceId) {
    grid.innerHTML = '<p class="hint">Escolha um serviço para ver os horários.</p>';
    return;
  }
  if (!dateIso) {
    grid.innerHTML = '<p class="hint">Escolha uma data para ver os horários.</p>';
    return;
  }
  if (!isOpenDate(dateIso)) {
    grid.innerHTML = '<p class="message err">Data fora do funcionamento inicial: terça a sábado.</p>';
    return;
  }

  state.settings.times.forEach((time) => {
    const blocked = isTimeBlocked(dateIso, time);
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = time;
    button.className = `time-btn ${blocked ? 'blocked' : ''}`;
    button.disabled = blocked;
    button.addEventListener('click', () => {
      selectedTime = time;
      $('#selectedTime').value = time;
      $$('.time-btn').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
    });
    grid.appendChild(button);
  });
}

function findOrCreateClient({ name, phone, email }) {
  const phoneKey = normalizePhone(phone);
  let client = state.clients.find((item) => item.phoneKey === phoneKey);
  if (client) {
    client.name = name.trim();
    client.phone = phone.trim();
    client.email = email.trim();
    client.updatedAt = currentTimestamp();
    return client;
  }
  client = {
    id: uid('client'),
    name: name.trim(),
    phone: phone.trim(),
    phoneKey,
    email: email.trim(),
    createdAt: currentTimestamp(),
    updatedAt: currentTimestamp()
  };
  state.clients.push(client);
  return client;
}

function createAppointment(payload) {
  const appointment = {
    id: uid('appt'),
    clientId: payload.clientId,
    serviceId: payload.serviceId,
    date: payload.date,
    time: payload.time,
    notes: payload.notes || '',
    status: 'Confirmado',
    createdAt: currentTimestamp(),
    updatedAt: currentTimestamp()
  };
  state.appointments.push(appointment);
  state.history.push({
    id: uid('hist'),
    appointmentId: appointment.id,
    from: null,
    to: 'Confirmado',
    at: currentTimestamp(),
    actor: 'Sistema',
    note: 'Agendamento confirmado automaticamente pelo fluxo público.'
  });
  saveState();
  return appointment;
}

function handleBookingSubmit(event) {
  event.preventDefault();
  const message = $('#bookingMessage');
  const name = $('#clientName').value;
  const phone = $('#clientPhone').value;
  const email = $('#clientEmail').value;
  const date = $('#appointmentDate').value;
  const time = $('#selectedTime').value;
  const serviceId = $('#selectedService').value;

  if (!name || !phone || !date || !time || !serviceId || !$('#acceptance').checked) {
    setMessage(message, 'Preencha os dados obrigatórios e escolha um horário.', 'err');
    return;
  }
  if (isTimeBlocked(date, time)) {
    setMessage(message, 'Este horário acabou de ficar indisponível. Escolha outro.', 'err');
    renderTimes();
    return;
  }

  const client = findOrCreateClient({ name, phone, email });
  const appointment = createAppointment({
    clientId: client.id,
    serviceId,
    date,
    time,
    notes: $('#clientNotes').value.trim()
  });
  const service = getService(serviceId);
  setMessage(message, `Agendamento confirmado: ${service.name}, ${formatDate(date)}, ${time}. Anote o horário.`, 'ok');
  event.target.reset();
  selectedServiceId = '';
  selectedTime = '';
  renderServices();
  renderTimes();
  renderAdmin();
  console.log('Agendamento confirmado automaticamente', appointment);
}

function switchView(viewId) {
  $$('.view').forEach((view) => view.classList.toggle('active', view.id === viewId));
  $$('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.view === viewId));
  if (viewId === 'adminView') renderAdmin();
}

function loginAdmin() {
  if ($('#adminPin').value === ADMIN_PIN) {
    $('#loginCard').classList.add('hidden');
    $('#adminPanel').classList.remove('hidden');
    setMessage($('#loginMessage'), '', 'ok');
    renderAdmin();
  } else {
    setMessage($('#loginMessage'), 'PIN incorreto.', 'err');
  }
}

function updateStatus(appointmentId, newStatus) {
  const appointment = state.appointments.find((item) => item.id === appointmentId);
  if (!appointment) return;
  const oldStatus = appointment.status;
  appointment.status = newStatus;
  appointment.updatedAt = currentTimestamp();
  state.history.push({
    id: uid('hist'),
    appointmentId,
    from: oldStatus,
    to: newStatus,
    at: currentTimestamp(),
    actor: 'Admin',
    note: `Status alterado de ${oldStatus} para ${newStatus}.`
  });
  saveState();
  renderAdmin();
  renderTimes();
}

function getFilteredAppointments() {
  const date = $('#filterDate')?.value || '';
  const status = $('#filterStatus')?.value || '';
  const search = ($('#filterSearch')?.value || '').toLowerCase().trim();
  return state.appointments
    .filter((appointment) => !date || appointment.date === date)
    .filter((appointment) => !status || appointment.status === status)
    .filter((appointment) => {
      if (!search) return true;
      const client = getClient(appointment.clientId) || {};
      const service = getService(appointment.serviceId) || {};
      return `${client.name} ${client.phone} ${client.email} ${service.name}`.toLowerCase().includes(search);
    })
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

function renderStats(appointments) {
  const stats = [
    ['Total', appointments.length],
    ['Confirmados', appointments.filter((item) => item.status === 'Confirmado').length],
    ['Realizados', appointments.filter((item) => item.status === 'Realizado').length],
    ['Cancelados', appointments.filter((item) => item.status === 'Cancelado').length],
    ['Clientes', state.clients.length]
  ];
  $('#statsGrid').innerHTML = stats.map(([label, value]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join('');
}

function statusClass(status) {
  return `status-${status.replace(/\s/g, '.')}`;
}

function whatsappMessage(appointment) {
  const client = getClient(appointment.clientId);
  const service = getService(appointment.serviceId);
  return `Olá, ${client.name}. Seu agendamento no Spa Josy Cruz está confirmado para ${service.name}, em ${formatDate(appointment.date)} às ${appointment.time}. Local: Tech Office, sala 711, São Luís/MA.`;
}

function emailMessage(appointment) {
  const client = getClient(appointment.clientId);
  const service = getService(appointment.serviceId);
  return `Seu agendamento no Spa Josy Cruz está confirmado.\n\nCliente: ${client.name}\nServiço: ${service.name}\nData: ${formatDate(appointment.date)}\nHorário: ${appointment.time}\nStatus: ${appointment.status}\nLocal: Tech Office, sala 711, São Luís/MA.\n\nCaso precise remarcar ou cancelar, fale com a equipe pelo WhatsApp.`;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    alert('Texto copiado.');
  } catch (error) {
    window.prompt('Copie o texto:', text);
  }
}

function renderAdmin() {
  if (!$('#adminPanel') || $('#adminPanel').classList.contains('hidden')) return;
  const list = $('#appointmentsList');
  const appointments = getFilteredAppointments();
  renderStats(appointments);
  list.innerHTML = '';

  if (!appointments.length) {
    list.innerHTML = '<div class="card"><p class="hint">Nenhum agendamento encontrado para os filtros atuais.</p></div>';
    return;
  }

  appointments.forEach((appointment) => {
    const template = $('#appointmentTemplate').content.cloneNode(true);
    const article = template.querySelector('.appointment');
    const client = getClient(appointment.clientId) || { name: 'Cliente não encontrado', phone: '', email: '' };
    const service = getService(appointment.serviceId) || { name: 'Serviço não encontrado' };
    article.classList.add(statusClass(appointment.status));
    template.querySelector('.appt-status').textContent = appointment.status;
    template.querySelector('.appt-title').textContent = `${client.name} · ${service.name}`;
    template.querySelector('.appt-meta').textContent = `${formatDate(appointment.date)} · ${appointment.time}`;
    template.querySelector('.appt-contact').textContent = `WhatsApp: ${client.phone || '-'} · E-mail: ${client.email || '-'}`;
    template.querySelector('.appt-notes').textContent = appointment.notes ? `Obs.: ${appointment.notes}` : '';
    template.querySelector('.status-pill').textContent = appointment.status;

    template.querySelectorAll('button[data-action]').forEach((button) => {
      const action = button.dataset.action;
      button.addEventListener('click', () => {
        if (action === 'copyWhatsapp') return copyText(whatsappMessage(appointment));
        if (action === 'copyEmail') return copyText(emailMessage(appointment));
        updateStatus(appointment.id, action);
      });
    });

    list.appendChild(template);
  });
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `spa-josy-cruz-backup-${todayISO()}.json`);
}

function exportCsv() {
  const rows = [['Data', 'Hora', 'Cliente', 'WhatsApp', 'E-mail', 'Serviço', 'Status', 'Observações']];
  state.appointments.forEach((appointment) => {
    const client = getClient(appointment.clientId) || {};
    const service = getService(appointment.serviceId) || {};
    rows.push([appointment.date, appointment.time, client.name, client.phone, client.email, service.name, appointment.status, appointment.notes]);
  });
  const csv = rows.map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `spa-josy-cruz-agendamentos-${todayISO()}.csv`);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function resetData() {
  if (!confirm('Limpar todos os dados locais deste protótipo?')) return;
  localStorage.removeItem(APP_KEY);
  state = loadState();
  selectedServiceId = '';
  selectedTime = '';
  renderServices();
  renderTimes();
  renderAdmin();
}

function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    $('#installBtn').classList.remove('hidden');
  });
  $('#installBtn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    $('#installBtn').classList.add('hidden');
  });
}

function setupServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
  }
}

function setupHiddenAdminAccess() {
  const trigger = $('#internalAccess');
  let taps = 0;
  let timer = null;

  function openAdmin() {
    switchView('adminView');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (trigger) {
    trigger.addEventListener('click', () => {
      taps += 1;
      clearTimeout(timer);
      timer = setTimeout(() => { taps = 0; }, 1200);
      if (taps >= 5) {
        taps = 0;
        openAdmin();
      }
    });
  }

  if (window.location.hash === '#admin' || window.location.search.includes('admin=1')) {
    openAdmin();
  }

  const backButton = $('#backToBookingBtn');
  if (backButton) {
    backButton.addEventListener('click', () => {
      switchView('bookingView');
      if (window.location.hash === '#admin') history.replaceState(null, '', window.location.pathname);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

function init() {
  $('#appointmentDate').min = todayISO();
  $('#filterDate').value = todayISO();
  renderServices();
  renderTimes();
  setupInstallPrompt();
  setupServiceWorker();
  setupHiddenAdminAccess();

  $$('.tab').forEach((tab) => tab.addEventListener('click', () => switchView(tab.dataset.view)));
  $('#appointmentDate').addEventListener('change', renderTimes);
  $('#bookingForm').addEventListener('submit', handleBookingSubmit);
  $('#loginBtn').addEventListener('click', loginAdmin);
  $('#adminPin').addEventListener('keydown', (event) => { if (event.key === 'Enter') loginAdmin(); });
  $('#filterDate').addEventListener('change', renderAdmin);
  $('#filterStatus').addEventListener('change', renderAdmin);
  $('#filterSearch').addEventListener('input', renderAdmin);
  $('#exportJsonBtn').addEventListener('click', exportJson);
  $('#exportCsvBtn').addEventListener('click', exportCsv);
  $('#resetDemoBtn').addEventListener('click', resetData);
}

document.addEventListener('DOMContentLoaded', init);
