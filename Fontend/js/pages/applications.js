(function () {
  document.addEventListener('DOMContentLoaded', init);
  setTimeout(init, 0);

  let initialized = false;
  let allApps = [];

  function init() {
    if (initialized) return;
    const btn = document.getElementById('btnNewApp');
    if (!btn) return;
    initialized = true;

    bindEvents();
    loadApplications();
  }

  function bindEvents() {
    const modal = document.getElementById('appModal');
    const btnNew = document.getElementById('btnNewApp');
    const closeBtn = document.getElementById('modalClose');
    const form = document.getElementById('appForm');

    btnNew.addEventListener('click', () => {
      document.getElementById('appId').value = '';
      document.getElementById('modalTitle').textContent = 'Add Job Application';
      form.reset();
      modal.style.display = 'flex';
    });

    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    form.addEventListener('submit', saveApplication);

    // Setup Drag-and-Drop Column Dropzones
    document.querySelectorAll('.kanban-column').forEach(col => {
      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        col.style.background = 'rgba(255, 255, 255, 0.05)';
      });
      col.addEventListener('dragleave', () => {
        col.style.background = 'var(--paper-100)';
      });
      col.addEventListener('drop', async (e) => {
        e.preventDefault();
        col.style.background = 'var(--paper-100)';
        const id = e.dataTransfer.getData('text/plain');
        const newStatus = col.dataset.status;
        if (id && newStatus) {
          try {
            await ApiService.applications.updateStatus(id, newStatus);
            loadApplications();
          } catch (err) {
            if (typeof window.showToast === 'function') window.showToast('Failed to update status: ' + err.message, 'error');
          }
        }
      });
    });
  }

  async function loadApplications() {
    try {
      allApps = await ApiService.applications.list();
      
      const statuses = ['Wishlist', 'Applied', 'Screening', 'Interview', 'Offer', 'Rejected'];
      
      // Clear all columns
      statuses.forEach(status => {
        document.getElementById(`cards_${status}`).innerHTML = '';
        document.getElementById(`count_${status}`).textContent = '0';
      });

      // Group & render apps
      allApps.forEach(app => {
        const status = app.status || 'Wishlist';
        const cardsEl = document.getElementById(`cards_${status}`);
        const countEl = document.getElementById(`count_${status}`);
        
        if (cardsEl) {
          const card = document.createElement('div');
          card.className = 'kanban-card';
          card.draggable = true;
          card.dataset.id = app.id;
          
          card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', app.id);
          });

          card.innerHTML = `
            <div class="title">${escapeHtml(app.title)}</div>
            <div class="company">${escapeHtml(app.company)}</div>
            <div class="notes">${escapeHtml(app.notes || 'No notes added')}</div>
            <div class="actions">
              <select onchange="changeStatus(${app.id}, this.value)" aria-label="Change status">
                ${statuses.map(s => `<option ${s === status ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
              <div style="display:flex; gap:6px">
                <button class="icon-btn" onclick="editApp(${app.id})" title="Edit"><i class="fa-solid fa-pen" style="font-size:11px"></i></button>
                <button class="icon-btn" onclick="deleteApp(${app.id})" style="color:var(--score-low)" title="Delete"><i class="fa-solid fa-trash" style="font-size:11px"></i></button>
              </div>
            </div>
          `;
          cardsEl.appendChild(card);
          countEl.textContent = (parseInt(countEl.textContent) + 1).toString();
        }
      });
    } catch (err) {
      console.error('Failed to load applications', err);
    }
  }

  async function saveApplication(e) {
    e.preventDefault();
    const modal = document.getElementById('appModal');
    const id = document.getElementById('appId').value;
    
    const company = document.getElementById('f_company').value.trim();
    const payload = {
      company: document.getElementById('f_company').value,
      title: document.getElementById('f_title').value,
      url: document.getElementById('f_url').value,
      status: document.getElementById('f_status').value,
      applied_date: document.getElementById('f_applied_date').value || null,
      notes: document.getElementById('f_notes').value
    };

    if (!payload.company || !payload.title) {
      if (typeof window.showToast === 'function') window.showToast('Please provide Company and Job Title.', 'warning');
      return;
    }

    try {
      if (id) {
        await ApiService.applications.update(id, payload);
      } else {
        await ApiService.applications.create(payload);
      }
      modal.style.display = 'none';
      loadApplications();
      if (typeof window.showToast === 'function') window.showToast('Application saved successfully!', 'success');
    } catch (err) {
      if (typeof window.showToast === 'function') window.showToast('Save failed: ' + err.message, 'error');
    }
  }

  // Bind globals for inline html actions
  window.changeStatus = async function (id, newStatus) {
    try {
      await ApiService.applications.updateStatus(id, newStatus);
      loadApplications();
    } catch (err) {
      if (typeof window.showToast === 'function') window.showToast('Failed to update status: ' + err.message, 'error');
    }
  };

  window.editApp = function (id) {
    const modal = document.getElementById('appModal');
    const app = allApps.find(a => a.id === id);
    if (!app) return;

    document.getElementById('appId').value = app.id;
    document.getElementById('modalTitle').textContent = 'Edit Job Application';
    document.getElementById('f_company').value = app.company;
    document.getElementById('f_title').value = app.title;
    document.getElementById('f_url').value = app.url || '';
    document.getElementById('f_status').value = app.status || 'Wishlist';
    
    // format date as YYYY-MM-DD
    let d = '';
    if (app.applied_date) {
      d = new Date(app.applied_date).toISOString().split('T')[0];
    }
    document.getElementById('f_applied_date').value = d;
    document.getElementById('f_notes').value = app.notes || '';

    modal.style.display = 'flex';
  };

  window.deleteApp = async function (id) {
    if (typeof window.confirmModal === 'function') {
      const ok = await window.confirmModal({
        title: 'Delete Job Application?',
        message: 'Are you sure you want to delete this job application?',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        isDanger: true
      });
      if (!ok) return;
    }
    try {
      await ApiService.applications.remove(id);
      loadApplications();
      if (typeof window.showToast === 'function') window.showToast('Application deleted.', 'success');
    } catch (err) {
      if (typeof window.showToast === 'function') window.showToast('Delete failed: ' + err.message, 'error');
    }
  };

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }
})();
