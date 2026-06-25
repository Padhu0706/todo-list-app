
// ============================================================
// STATE
// ============================================================
let tasks = []
let currentFilter = 'all'
let currentSearch = ''
let deleteTargetId = null
let editingId = null

const STORAGE_KEY = 'taskflow_tasks'
const THEME_KEY = 'taskflow_theme'

// ============================================================
// DOM REFERENCES
// ============================================================
const taskInput = document.getElementById('task-input')
const dateInput = document.getElementById('date-input')
const priorityInput = document.getElementById('priority-input')
const btnAdd = document.getElementById('btn-add')
const searchInput = document.getElementById('search-input')
const taskList = document.getElementById('task-list')
const emptyState = document.getElementById('empty-state')
const statPending = document.getElementById('stat-pending')
const statCompleted = document.getElementById('stat-completed')
const statTotal = document.getElementById('stat-total')
const themeToggle = document.getElementById('theme-toggle')
const modalOverlay = document.getElementById('modal-overlay')
const modalCancel = document.getElementById('modal-cancel')
const modalConfirm = document.getElementById('modal-confirm')

// ============================================================
// LOCAL STORAGE
// ============================================================
function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      tasks = JSON.parse(stored)
    }
  } catch {
    tasks = []
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  } catch {
    // Storage full
  }
}

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else if (saved === 'light') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    // System preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  }
}

function toggleTheme() {
  const isDark = document.documentElement.hasAttribute('data-theme')
  if (isDark) {
    document.documentElement.removeAttribute('data-theme')
    localStorage.setItem(THEME_KEY, 'light')
  } else {
    document.documentElement.setAttribute('data-theme', 'dark')
    localStorage.setItem(THEME_KEY, 'dark')
  }
}

// ============================================================
// UTILITIES
// ============================================================
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function isOverdue(dueDate) {
  if (!dueDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return due < today
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)

  if (d.getTime() === today.getTime()) return 'Today'
  if (d.getTime() === tomorrow.getTime()) return 'Tomorrow'

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ============================================================
// TASK CRUD
// ============================================================
function addTask() {
  const text = taskInput.value.trim()
  if (!text) {
    taskInput.focus()
    return
  }

  const task = {
    id: generateId(),
    text: text,
    completed: false,
    dueDate: dateInput.value || null,
    priority: priorityInput.value,
    createdAt: Date.now()
  }

  tasks.unshift(task)
  saveTasks()

  // Reset inputs
  taskInput.value = ''
  dateInput.value = ''
  priorityInput.value = 'medium'
  taskInput.focus()

  render()
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id)
  if (task) {
    task.completed = !task.completed
    saveTasks()
    render()
  }
}

function startEdit(id) {
  editingId = id
  render()
  const input = document.getElementById(`edit-input-${id}`)
  if (input) {
    input.focus()
    input.select()
  }
}

function saveEdit(id) {
  const input = document.getElementById(`edit-input-${id}`)
  if (!input) return

  const newText = input.value.trim()
  if (!newText) {
    cancelEdit()
    return
  }

  const task = tasks.find(t => t.id === id)
  if (task) {
    task.text = newText
    saveTasks()
  }
  editingId = null
  render()
}

function cancelEdit() {
  editingId = null
  render()
}

function confirmDelete(id) {
  deleteTargetId = id
  modalOverlay.classList.add('open')
}

function executeDelete() {
  if (!deleteTargetId) {
    closeModal()
    return
  }

  const idToDelete = deleteTargetId
  const el = document.querySelector(`.task-item[data-id="${idToDelete}"]`)

  closeModal()

  if (el) {
    el.classList.add('removing')
    setTimeout(() => {
      tasks = tasks.filter(t => t.id !== idToDelete)
      saveTasks()
      if (deleteTargetId === idToDelete) deleteTargetId = null
      render()
    }, 280)
  } else {
    tasks = tasks.filter(t => t.id !== idToDelete)
    saveTasks()
    if (deleteTargetId === idToDelete) deleteTargetId = null
    render()
  }
}

function closeModal() {
  modalOverlay.classList.remove('open')
}

// ============================================================
// FILTERING & SEARCH
// ============================================================
function getFilteredTasks() {
  let filtered = tasks

  // Apply filter
  if (currentFilter === 'active') {
    filtered = filtered.filter(t => !t.completed)
  } else if (currentFilter === 'completed') {
    filtered = filtered.filter(t => t.completed)
  }

  // Apply search
  if (currentSearch) {
    const query = currentSearch.toLowerCase()
    filtered = filtered.filter(t => t.text.toLowerCase().includes(query))
  }

  return filtered
}

// ============================================================
// RENDERING
// ============================================================
function renderStats() {
  const pending = tasks.filter(t => !t.completed).length
  const completed = tasks.filter(t => t.completed).length
  statPending.textContent = pending
  statCompleted.textContent = completed
  statTotal.textContent = tasks.length
}

function render() {
  const filtered = getFilteredTasks()
  renderStats()

  if (filtered.length === 0) {
    taskList.innerHTML = ''
    emptyState.classList.add('visible')
    return
  }

  emptyState.classList.remove('visible')

  taskList.innerHTML = filtered.map(task => {
    const isEditing = editingId === task.id
    const overdue = task.dueDate && isOverdue(task.dueDate) && !task.completed
    const dateLabel = formatDate(task.dueDate)
    const priorityClass = task.priority

    return `
      <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
        <div class="task-checkbox ${task.completed ? 'checked' : ''}" data-action="toggle" data-id="${task.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>

        <div class="task-content">
          <div class="task-text">${escapeHtml(task.text)}</div>
          <div class="task-meta">
            ${task.dueDate ? `
              <span class="task-due ${overdue ? 'overdue' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                ${overdue ? 'Overdue' : dateLabel}
              </span>
            ` : ''}
            <span class="task-priority ${priorityClass}">${task.priority}</span>
          </div>
        </div>

        <form class="task-edit-form" onsubmit="event.preventDefault()">
          <input type="text" class="task-edit-input" id="edit-input-${task.id}" value="${escapeHtml(task.text)}" />
          <button type="button" class="task-edit-save" data-action="save-edit" data-id="${task.id}">Save</button>
        </form>

        <div class="task-actions">
          <button class="task-btn" data-action="edit" data-id="${task.id}" aria-label="Edit task">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="task-btn delete" data-action="delete" data-id="${task.id}" aria-label="Delete task">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>
    `
  }).join('')

  // Apply editing state
  if (editingId) {
    const el = document.querySelector(`[data-id="${editingId}"]`)
    if (el) el.classList.add('editing')
  }
}

// ============================================================
// EVENT LISTENERS
// ============================================================

// Add task
btnAdd.addEventListener('click', addTask)
taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTask()
})

// Search
searchInput.addEventListener('input', (e) => {
  currentSearch = e.target.value.trim()
  render()
})

// Filter tabs
document.querySelectorAll('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'))
    tab.classList.add('active')
    currentFilter = tab.dataset.filter
    render()
  })
})

// Theme toggle
themeToggle.addEventListener('click', toggleTheme)

// Task list actions (delegation)
taskList.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]')
  if (!target) return

  const action = target.dataset.action
  const id = target.dataset.id

  switch (action) {
    case 'toggle':
      toggleTask(id)
      break
    case 'edit':
      startEdit(id)
      break
    case 'delete':
      confirmDelete(id)
      break
    case 'save-edit':
      saveEdit(id)
      break
  }
})

// Edit form submit
taskList.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.classList.contains('task-edit-input')) {
    const id = e.target.id.replace('edit-input-', '')
    saveEdit(id)
  }
  if (e.key === 'Escape' && e.target.classList.contains('task-edit-input')) {
    cancelEdit()
  }
})

// Modal
modalCancel.addEventListener('click', closeModal)
modalConfirm.addEventListener('click', executeDelete)
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal()
})
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay.classList.contains('open')) {
    closeModal()
  }
})

// ============================================================
// INIT
// ============================================================
loadTheme()
loadTasks()
render()
