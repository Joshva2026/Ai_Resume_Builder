document.addEventListener('DOMContentLoaded', () => {
  const themeSelect = document.getElementById('themeSelect');
  const accentColor = document.getElementById('accentColor');
  const heroName = document.getElementById('heroName');
  const heroHeadline = document.getElementById('heroHeadline');
  const heroAbout = document.getElementById('heroAbout');
  const btnAddProject = document.getElementById('btnAddProject');
  const projectsContainer = document.getElementById('projectsContainer');
  const iframe = document.getElementById('livePreviewFrame');
  const btnPublish = document.getElementById('btnPublish');

  let projects = [];

  function updatePreview() {
    const data = {
      theme: themeSelect.value,
      accentColor: accentColor.value,
      heroName: heroName.value,
      heroHeadline: heroHeadline.value,
      heroAbout: heroAbout.value,
      projects: projects
    };
    
    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'updatePreview', payload: data }, '*');
    }
  }

  [themeSelect, accentColor, heroName, heroHeadline, heroAbout].forEach(el => {
    el.addEventListener('input', updatePreview);
  });

  btnAddProject.addEventListener('click', () => {
    const p = { id: Date.now(), title: '', description: '', tech: '' };
    projects.push(p);
    renderProjects();
    updatePreview();
  });

  function renderProjects() {
    projectsContainer.innerHTML = '';
    projects.forEach(p => {
      const div = document.createElement('div');
      div.className = 'form-group';
      div.style.border = '1px dashed #ccc';
      div.style.padding = '10px';
      div.style.borderRadius = '6px';
      div.style.marginBottom = '10px';
      
      div.innerHTML = `
        <input type="text" class="form-control" style="margin-bottom:8px" placeholder="Project Title" value="${p.title}" data-id="${p.id}" data-field="title">
        <textarea class="form-control" style="margin-bottom:8px" placeholder="Description" data-id="${p.id}" data-field="description">${p.description}</textarea>
        <input type="text" class="form-control" style="margin-bottom:8px" placeholder="Technologies (e.g. React, Node)" value="${p.tech}" data-id="${p.id}" data-field="tech">
        <button class="btn btn-outline" style="color:red; border-color:red" data-action="delete" data-id="${p.id}">Remove</button>
      `;
      projectsContainer.appendChild(div);
    });

    projectsContainer.querySelectorAll('input, textarea').forEach(el => {
      el.addEventListener('input', (e) => {
        const id = parseInt(e.target.dataset.id);
        const field = e.target.dataset.field;
        const proj = projects.find(x => x.id === id);
        if (proj) {
          proj[field] = e.target.value;
          updatePreview();
        }
      });
    });

    projectsContainer.querySelectorAll('button[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        projects = projects.filter(x => x.id !== id);
        renderProjects();
        updatePreview();
      });
    });
  }

  btnPublish.addEventListener('click', async () => {
    const btn = btnPublish;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing...';
    
    try {
      const user = ApiService.getUser();
      const username = user ? (user.firstName + user.lastName).toLowerCase() || user.email.split('@')[0] : 'portfolio-' + Date.now();
      
      const payload = {
        username: username,
        title: heroHeadline.value || 'Portfolio',
        aboutText: heroAbout.value,
        theme: themeSelect.value,
        accentColor: accentColor.value,
        typography: 'inter',
        isPublished: true,
        heroImageUrl: '',
        projects: projects
      };

      await ApiService.savePortfolio(payload);
      alert('Portfolio published successfully! You can view it at: /portfolio/' + username);
    } catch (error) {
      alert('Failed to publish portfolio: ' + error.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-rocket"></i> Publish';
    }
  });

  // Initial load
  setTimeout(updatePreview, 500);
});
