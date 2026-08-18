/**
 * PROFILE PAGE LOGIC
 * Loads user profile from TiDB Cloud backend and saves updates via ApiService.
 */
(function () {
  document.addEventListener('DOMContentLoaded', init);
  setTimeout(init, 0);

  let initialized = false;

  function init() {
    if (initialized) return;
    const form = document.getElementById('profileForm');
    if (!form) return;
    initialized = true;
    bindForm();
    loadProfile();
  }

  /* ── Load profile from backend ─────────────────────────── */
  async function loadProfile() {
    const status = document.getElementById('profileStatus');
    try {
      let profile;
      try {
        profile = await ApiService.profile.get();
      } catch (_) {
        profile = await ApiService.auth.me();
      }

      // Unwrap profile if nested in object
      if (profile && profile.profile) {
        profile = { ...profile.profile, ...profile };
      }
      if (profile && profile.user) {
        profile = { ...profile.user, ...profile };
      }

      populateForm(profile || {});
      updateProfileCard(profile || {});
    } catch (error) {
      if (status) {
        status.textContent = 'Unable to load profile. Is the server running?';
        status.style.color = 'var(--score-low)';
      }
      console.error('Profile load failed:', error);
    }
  }

  /* ── Populate form fields ──────────────────────────────── */
  function populateForm(profile) {
    setValue('profileImageUrl', profile.profileImageUrl || profile.profile_image_url);
    setValue('firstName', profile.firstName || profile.first_name);
    setValue('lastName',  profile.lastName || profile.last_name);
    setValue('email',     profile.email);
    setValue('phone',     profile.phone);
    setValue('location',  profile.location);
    setValue('bio',       profile.bio);
    setValue('linkedinUrl',  profile.linkedinUrl || profile.linkedin_url);
    setValue('portfolioUrl', profile.portfolioUrl || profile.portfolio_url);
    setValue('githubUrl',    profile.githubUrl || profile.github_url);
  }

  function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  }

  function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  /* ── Bind save form ────────────────────────────────────── */
  function bindForm() {
    const form      = document.getElementById('profileForm');
    const status    = document.getElementById('profileStatus');
    const submitBtn = document.getElementById('saveProfileBtn');
    const btnUpload = document.getElementById('btnUploadAvatar');
    const fileInput = document.getElementById('avatarFileInput');

    if (btnUpload && fileInput) {
      btnUpload.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (file.size > 5 * 1024 * 1024) {
            alert('Image file size exceeds 5MB limit.');
            return;
          }
          const reader = new FileReader();
          reader.onload = (evt) => {
            setValue('profileImageUrl', evt.target.result);
            updateProfileCard({ ...ApiService.getUser(), profileImageUrl: evt.target.result });
          };
          reader.readAsDataURL(file);
        }
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (status) { status.textContent = ''; status.style.color = ''; }
      submitBtn.disabled    = true;
      submitBtn.textContent = 'Saving…';

      try {
        const payload = {
          email:           getValue('email'),
          profileImageUrl: getValue('profileImageUrl'),
          firstName:       getValue('firstName'),
          lastName:        getValue('lastName'),
          phone:           getValue('phone'),
          location:        getValue('location'),
          bio:             document.getElementById('bio') ? document.getElementById('bio').value.trim() : '',
          linkedinUrl:     getValue('linkedinUrl'),
          portfolioUrl:    getValue('portfolioUrl'),
          githubUrl:       getValue('githubUrl'),
        };

        const res = await ApiService.profile.update(payload);
        const updated = (res && res.profile) ? res.profile : res;

        // Merge with current cached user so name shows in top bar / AppShell
        const currentUser = ApiService.getUser() || {};
        const mergedUser  = { ...currentUser, ...payload };
        localStorage.setItem('rf_user', JSON.stringify(mergedUser));

        const finalProfile = { ...mergedUser, ...(updated || {}) };
        populateForm(finalProfile);
        updateProfileCard(finalProfile);

        if (status) {
          status.textContent = '✓ Profile saved successfully!';
          status.style.color = 'var(--score-high)';
        }
      } catch (error) {
        if (status) {
          status.textContent = error.message || 'Save failed. Please try again.';
          status.style.color = 'var(--score-low)';
        }
      } finally {
        submitBtn.disabled    = false;
        submitBtn.textContent = 'Save changes';
      }
    });
  }

  /* ── Update the left profile card ─────────────────────── */
  function updateProfileCard(profile) {
    const firstName = profile.firstName || profile.first_name || '';
    const lastName  = profile.lastName || profile.last_name || '';
    const name      = [firstName, lastName].filter(Boolean).join(' ');

    const elName      = document.getElementById('profileName');
    const elEmail     = document.getElementById('profileEmail');
    const elPhone     = document.getElementById('profilePhone');
    const elLocation  = document.getElementById('profileLocation');
    const elBio       = document.getElementById('profileBio');
    const elAvatar    = document.getElementById('profileAvatar');

    const elLinkedin  = document.getElementById('profileLinkedin');
    const elPortfolio = document.getElementById('profilePortfolio');
    const elGithub    = document.getElementById('profileGithub');

    if (elName)     elName.textContent     = name || 'Your Name';
    if (elEmail)    elEmail.textContent    = profile.email || 'No email set';
    if (elPhone)    elPhone.textContent    = profile.phone    || 'Not added';
    if (elLocation) elLocation.textContent = profile.location || 'Not added';
    if (elBio)      elBio.textContent      = profile.bio      || 'Add a short bio to personalize your profile.';

    // Links rendering
    const linkedin = profile.linkedinUrl || profile.linkedin_url;
    if (elLinkedin) {
      if (linkedin) {
        elLinkedin.innerHTML = `<a href="${escapeHtml(linkedin)}" target="_blank" rel="noopener" class="meta-value-link"><i class="fa-brands fa-linkedin"></i> LinkedIn</a>`;
      } else {
        elLinkedin.textContent = 'Not added';
      }
    }

    const portfolio = profile.portfolioUrl || profile.portfolio_url;
    if (elPortfolio) {
      if (portfolio) {
        elPortfolio.innerHTML = `<a href="${escapeHtml(portfolio)}" target="_blank" rel="noopener" class="meta-value-link"><i class="fa-solid fa-globe"></i> Portfolio</a>`;
      } else {
        elPortfolio.textContent = 'Not added';
      }
    }

    const github = profile.githubUrl || profile.github_url;
    if (elGithub) {
      if (github) {
        elGithub.innerHTML = `<a href="${escapeHtml(github)}" target="_blank" rel="noopener" class="meta-value-link"><i class="fa-brands fa-github"></i> GitHub</a>`;
      } else {
        elGithub.textContent = 'Not added';
      }
    }

    // Avatar rendering
    const imageUrl = profile.profileImageUrl || profile.profile_image_url;
    if (elAvatar) {
      if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:image/'))) {
        elAvatar.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="Avatar" onerror="this.remove()">`;
      } else {
        elAvatar.textContent = getInitials(firstName, lastName, profile.email);
      }
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getInitials(firstName, lastName, email) {
    const parts = [firstName?.trim()?.[0], lastName?.trim()?.[0]].filter(Boolean);
    if (parts.length) return parts.join('').toUpperCase();
    return (email || 'RF').slice(0, 2).toUpperCase();
  }
})();
