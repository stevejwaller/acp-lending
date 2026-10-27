// Dynamic Content Loader - loads settings from content/settings.json
// Add this script before </body> tag: <script src="/js/dynamic-content.js" defer></script>

async function loadDynamicContent() {
    try {
        const response = await fetch('/content/settings.json');
        if (!response.ok) throw new Error('Failed to load settings');
        const settings = await response.json();

        // Update header content
        updateHeaderContent(settings);

        // Update footer content
        updateFooterContent(settings);

        // Update navigation
        updateNavigation(settings);

    } catch (error) {
        console.error('Error loading dynamic content:', error);
    }
}

function updateHeaderContent(settings) {
    // Update phone in header
    const phoneElements = document.querySelectorAll('[data-content="phone"]');
    phoneElements.forEach(el => el.textContent = settings.phone);

    // Update email in header
    const emailElements = document.querySelectorAll('[data-content="email"]');
    emailElements.forEach(el => el.textContent = settings.email);
}

function updateFooterContent(settings) {
    // Update phone in footer
    const footerPhone = document.querySelector('footer [data-content="phone"]');
    if (footerPhone) footerPhone.textContent = settings.phone;

    // Update email in footer
    const footerEmail = document.querySelector('footer [data-content="email"]');
    if (footerEmail) footerEmail.textContent = settings.email;

    // Update social links in footer
    if (settings.facebook) {
        const fbLink = document.querySelector('footer a[href*="facebook"]');
        if (fbLink) fbLink.href = settings.facebook;
    }
    if (settings.linkedin) {
        const liLink = document.querySelector('footer a[href*="linkedin"]');
        if (liLink) liLink.href = settings.linkedin;
    }
    if (settings.instagram) {
        const igLink = document.querySelector('footer a[href*="instagram"]');
        if (igLink) igLink.href = settings.instagram;
    }
    if (settings.youtube) {
        const ytLink = document.querySelector('footer a[href*="youtube"]');
        if (ytLink) ytLink.href = settings.youtube;
    }
}

function updateNavigation(settings) {
    if (!settings.navLinks || settings.navLinks.length === 0) return;

    const navContainer = document.querySelector('nav');
    if (!navContainer) return;

    const existingLinks = navContainer.querySelectorAll('a');
    settings.navLinks.forEach((linkData, index) => {
        if (existingLinks[index]) {
            existingLinks[index].href = linkData.href;
            existingLinks[index].textContent = linkData.text;
        }
    });
}

// Load content when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDynamicContent);
} else {
    loadDynamicContent();
}
