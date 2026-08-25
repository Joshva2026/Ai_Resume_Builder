/**
 * AI Resume Builder - Main JavaScript File
 * Includes API service, authentication, and utility functions
 */

// ==========================================
// Configuration
// ==========================================

const API_URL = `http://${window.location.hostname}:5000/api`;
const TOKEN_KEY = 'resumeBuilder_accessToken';
const REFRESH_TOKEN_KEY = 'resumeBuilder_refreshToken';

// ==========================================
// API Service
// ==========================================

class APIService {
    static async request(endpoint, options = {}) {
        const url = `${API_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add authorization token if available
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            // Handle token refresh on 401
            if (response.status === 401) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    return this.request(endpoint, options);
                } else {
                    this.logout();
                }
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Authentication
    static async register(email, password, firstName, lastName) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, firstName, lastName })
        });
        
        if (data.accessToken) {
            localStorage.setItem(TOKEN_KEY, data.accessToken);
            localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
        }
        
        return data;
    }

    static async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        if (data.accessToken) {
            localStorage.setItem(TOKEN_KEY, data.accessToken);
            localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
        }
        
        return data;
    }

    static async logout() {
        const token = localStorage.getItem(REFRESH_TOKEN_KEY);
        
        try {
            await this.request('/auth/logout', {
                method: 'POST',
                body: JSON.stringify({ token })
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
        
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        window.location.href = '/index.html';
    }

    static async refreshToken() {
        try {
            const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
            if (!refreshToken) return false;

            const data = await fetch(`${API_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            }).then(r => r.json());

            if (data.accessToken) {
                localStorage.setItem(TOKEN_KEY, data.accessToken);
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    static getCurrentUser() {
        const token = localStorage.getItem(TOKEN_KEY);
        return token ? { isAuthenticated: true } : { isAuthenticated: false };
    }

    // Resume Operations
    static async createResume(title, content, templateId) {
        return this.request('/resumes', {
            method: 'POST',
            body: JSON.stringify({ title, content, templateId })
        });
    }

    static async getResumes() {
        return this.request('/resumes', { method: 'GET' });
    }

    static async getResume(id) {
        return this.request(`/resumes/${id}`, { method: 'GET' });
    }

    static async updateResume(id, title, content) {
        return this.request(`/resumes/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ title, content })
        });
    }

    static async deleteResume(id) {
        return this.request(`/resumes/${id}`, { method: 'DELETE' });
    }

    static async duplicateResume(id) {
        return this.request(`/resumes/${id}/duplicate`, { method: 'POST' });
    }

    // ATS Analysis
    static async analyzeATS(resumeId) {
        return this.request('/ats/analyze', {
            method: 'POST',
            body: JSON.stringify({ resumeId })
        });
    }

    static async getATSHistory() {
        return this.request('/ats/history', { method: 'GET' });
    }

    static async getATSReport(id) {
        return this.request(`/ats/report/${id}`, { method: 'GET' });
    }

    // AI Enhancement
    static async rewriteText(text) {
        return this.request('/ai/rewrite', {
            method: 'POST',
            body: JSON.stringify({ text })
        });
    }

    static async getSummary(careerSummary) {
        return this.request('/ai/summary', {
            method: 'POST',
            body: JSON.stringify({ careerSummary })
        });
    }

    static async getKeywords(jobRole) {
        return this.request('/ai/keywords', {
            method: 'POST',
            body: JSON.stringify({ jobRole })
        });
    }

    static async getActionVerbs() {
        return this.request('/ai/action-verbs', { method: 'POST' });
    }

    static async generateCoverLetter(resumeData, jobTitle, companyName) {
        return this.request('/ai/cover-letter', {
            method: 'POST',
            body: JSON.stringify({ resumeData, jobTitle, companyName })
        });
    }

    // Templates
    static async getTemplates() {
        return this.request('/templates', { method: 'GET' });
    }

    static async getTemplate(id) {
        return this.request(`/templates/${id}`, { method: 'GET' });
    }

    // Downloads
    static async downloadPDF(resumeId) {
        return this.request('/download/pdf', {
            method: 'POST',
            body: JSON.stringify({ resumeId })
        });
    }

    static async downloadDOCX(resumeId) {
        return this.request('/download/docx', {
            method: 'POST',
            body: JSON.stringify({ resumeId })
        });
    }

    static async getDownloadHistory() {
        return this.request('/download/history', { method: 'GET' });
    }

    // Profile
    static async getProfile() {
        return this.request('/profile', { method: 'GET' });
    }

    static async updateProfile(phone, location, bio, profileImageUrl) {
        return this.request('/profile', {
            method: 'PUT',
            body: JSON.stringify({ phone, location, bio, profileImageUrl })
        });
    }
}

// ==========================================
// Utility Functions
// ==========================================

class UIUtils {
    static showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('main') || document.body;
        container.insertBefore(alertDiv, container.firstChild);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    static showLoading(element) {
        const spinner = document.createElement('div');
        spinner.className = 'spinner text-center';
        element.innerHTML = '';
        element.appendChild(spinner);
    }

    static showError(error) {
        const message = error.message || 'An error occurred. Please try again.';
        this.showAlert(message, 'danger');
    }

    static updateNavbarAuth() {
        const user = APIService.getCurrentUser();
        const authButtons = document.querySelector('.d-flex.gap-2');
        
        if (user.isAuthenticated && authButtons) {
            authButtons.innerHTML = `
                <a href="pages/dashboard.html" class="btn btn-primary btn-sm">Dashboard</a>
                <button onclick="APIService.logout()" class="btn btn-outline-danger btn-sm">Logout</button>
            `;
        }
    }
}

// ==========================================
// AOS Animation Initialization
// ==========================================

function initializeAOS() {
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true,
            offset: 100
        });
    }
}

// ==========================================
// Counter Animation
// ==========================================

function animateCounters() {
    const counters = document.querySelectorAll('[data-target]');
    
    const runCounter = (counter) => {
        const target = parseInt(counter.dataset.target);
        const duration = 2000;
        const start = Date.now();
        
        const updateCount = () => {
            const elapsed = Date.now() - start;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                const current = Math.floor(progress * target);
                counter.textContent = current.toLocaleString();
                requestAnimationFrame(updateCount);
            } else {
                counter.textContent = target.toLocaleString();
            }
        };
        
        updateCount();
    };
    
    counters.forEach(counter => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                runCounter(counter);
                observer.unobserve(counter);
            }
        });
        
        observer.observe(counter);
    });
}

// ==========================================
// Form Handling
// ==========================================

class FormHandler {
    static setupLoginForm() {
        const form = document.getElementById('loginForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = form.email.value;
            const password = form.password.value;
            
            try {
                UIUtils.showLoading(form);
                const response = await APIService.login(email, password);
                UIUtils.showAlert('Login successful!', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } catch (error) {
                UIUtils.showError(error);
            }
        });
    }

    static setupRegisterForm() {
        const form = document.getElementById('registerForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = form.email.value;
            const password = form.password.value;
            const confirmPassword = form.confirmPassword.value;
            const firstName = form.firstName.value;
            const lastName = form.lastName.value;
            
            if (password !== confirmPassword) {
                UIUtils.showAlert('Passwords do not match', 'danger');
                return;
            }
            
            try {
                UIUtils.showLoading(form);
                const response = await APIService.register(email, password, firstName, lastName);
                UIUtils.showAlert('Registration successful!', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } catch (error) {
                UIUtils.showError(error);
            }
        });
    }

    static setupContactForm() {
        const form = document.getElementById('contactForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = form.name.value;
            const email = form.email.value;
            const phone = form.phone.value;
            const message = form.message.value;
            
            try {
                // Mock submission
                UIUtils.showAlert('Thank you for your message. We will be in touch soon!', 'success');
                form.reset();
            } catch (error) {
                UIUtils.showError(error);
            }
        });
    }
}

// ==========================================
// Resume Builder Functions
// ==========================================

class ResumeBuilder {
    static async loadResume(id) {
        try {
            const resume = await APIService.getResume(id);
            return resume;
        } catch (error) {
            UIUtils.showError(error);
            return null;
        }
    }

    static async saveResume(id, title, content) {
        try {
            const response = await APIService.updateResume(id, title, content);
            UIUtils.showAlert('Resume saved successfully!', 'success');
            return response;
        } catch (error) {
            UIUtils.showError(error);
        }
    }

    static async analyzeResume(id) {
        try {
            UIUtils.showAlert('Analyzing your resume...', 'info');
            const response = await APIService.analyzeATS(id);
            return response;
        } catch (error) {
            UIUtils.showError(error);
        }
    }
}

// ==========================================
// DOM Ready Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize components
    initializeAOS();
    animateCounters();
    
    // Setup forms
    FormHandler.setupLoginForm();
    FormHandler.setupRegisterForm();
    FormHandler.setupContactForm();
    
    // Update navbar
    UIUtils.updateNavbarAuth();
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const href = anchor.getAttribute('href');
            if (href !== '#' && document.querySelector(href)) {
                e.preventDefault();
            }
        });
    });
    
    // Add copy to clipboard functionality
    window.copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            UIUtils.showAlert('Copied to clipboard!', 'success');
        });
    };
});

// ==========================================
// Helper Functions
// ==========================================

/**
 * Format date to readable string
 */
function formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString(undefined, options);
}

/**
 * Validate email
 */
function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Debounce function for search/input
 */
function debounce(func, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
}

/**
 * Parse query parameters from URL
 */
function getQueryParam(param) {
    const params = new URLSearchParams(window.location.search);
    return params.get(param);
}

// ==========================================
// Export for use in other files
// ==========================================

window.APIService = APIService;
window.UIUtils = UIUtils;
window.ResumeBuilder = ResumeBuilder;
window.FormHandler = FormHandler;
window.formatDate = formatDate;
window.validateEmail = validateEmail;
window.debounce = debounce;
window.getQueryParam = getQueryParam;
