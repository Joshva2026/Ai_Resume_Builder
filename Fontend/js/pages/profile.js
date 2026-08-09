/**
 * PROFILE PAGE LOGIC
 * Loads user profile from MongoDB backend and saves updates via ApiService.
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
      // Try /api/profile first, fall back to /api/auth/me
      let profile;
      try {
        profile = await ApiService.profile.get();
      } catch (_) {
        profile = await ApiService.auth.me();
      }
      populateForm(profile);
      updateProfileCard(profile);
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
    setValue('firstName', profile.firstName);
    setValue('lastName',  profile.lastName);
    setValue('email',     profile.email);
    setValue('phone',     profile.phone);
    setValue('location',  profile.location);
    setValue('bio',       profile.bio);
  }

  function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  }

  /* ── Bind save form ────────────────────────────────────── */
  function bindForm() {
    const form      = document.getElementById('profileForm');
    const status    = document.getElementById('profileStatus');
    const submitBtn = document.getElementById('saveProfileBtn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (status) { status.textContent = ''; status.style.color = ''; }
      submitBtn.disabled    = true;
      submitBtn.textContent = 'Saving…';

      try {
        const payload = {
          firstName: document.getElementById('firstName').value.trim(),
          lastName:  document.getElementById('lastName').value.trim(),
          phone:     document.getElementById('phone').value.trim(),
          location:  document.getElementById('location').value.trim(),
          bio:       document.getElementById('bio').value.trim(),
        };

        const updated = await ApiService.profile.update(payload);

        // Merge with current cached user so name shows on page
        const currentUser = ApiService.getUser() || {};
        const mergedUser  = { ...currentUser, ...payload };
        localStorage.setItem('rf_user', JSON.stringify(mergedUser));

        updateProfileCard(updated || mergedUser);

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
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ');

    const elName     = document.getElementById('profileName');
    const elEmail    = document.getElementById('profileEmail');
    const elPhone    = document.getElementById('profilePhone');
    const elLocation = document.getElementById('profileLocation');
    const elBio      = document.getElementById('profileBio');
    const elAvatar   = document.getElementById('profileAvatar');

    if (elName)     elName.textContent     = name || 'Your Name';
    if (elEmail)    elEmail.textContent    = profile.email || 'No email set';
    if (elPhone)    elPhone.textContent    = profile.phone    || 'Not added';
    if (elLocation) elLocation.textContent = profile.location || 'Not added';
    if (elBio)      elBio.textContent      = profile.bio      || 'Add a short bio to personalize your profile.';
    if (elAvatar)   elAvatar.textContent   = getInitials(profile.firstName, profile.lastName, profile.email);
  }

  function getInitials(firstName, lastName, email) {
    const parts = [firstName?.trim()?.[0], lastName?.trim()?.[0]].filter(Boolean);
    if (parts.length) return parts.join('').toUpperCase();
    return (email || 'RF').slice(0, 2).toUpperCase();
  }
})();
