/**
 * Midnight Anarchy - Main JavaScript
 * Mobile-first event landing page
 */

(function() {
  'use strict';

  // ==========================================================================
  // ADMIN CONFIGURATION - Edit these values to control ticket sales
  // ==========================================================================
  const TICKET_CONFIG = {
    // Set to true to disable ticket sales (sold out)
    soldOut: false,
    
    // Maximum tickets per request
    maxTicketsPerRequest: 5,
    
    // Maximum attendance (for display purposes)
    maxAttendance: 200,
    
    // Price per ticket in RM (Malaysian Ringgit)
    pricePerTicket: 50.00,
    
    // Currency
    currency: 'RM',
    
    // Event name for submissions
    eventName: 'Midnight Anarchy: Genesis'
  };

  // ==========================================================================
  // DOM Elements
  // ==========================================================================
  const elements = {
    ticketToggle: document.getElementById('ticket-toggle'),
    ticketFormContainer: document.getElementById('ticket-form-container'),
    ticketForm: document.getElementById('ticket-form'),
    soldOutBanner: document.getElementById('sold-out-banner'),
    shimmerBg: document.getElementById('shimmer-bg'),
    promoVideo: document.getElementById('promo-video'),
    videoPlaceholder: document.getElementById('video-placeholder'),
    // Image upload elements
    imageUploadContainer: document.getElementById('image-upload-container'),
    imageUploadPlaceholder: document.getElementById('image-upload-placeholder'),
    receiptImageInput: document.getElementById('receipt-image'),
    imagePreview: document.getElementById('image-preview'),
    previewImg: document.getElementById('preview-img'),
    removeImageBtn: document.getElementById('remove-image'),
    // Price display elements
    pricePerTicketDisplay: document.getElementById('price-per-ticket'),
    qtyDisplay: document.getElementById('qty-display'),
    totalPriceDisplay: document.getElementById('total-price'),
    ticketQtySelect: document.getElementById('ticket-qty')
  };

  // ==========================================================================
  // Form Data Cache (persists during session, organized for submission)
  // ==========================================================================
  let formDataCache = {
    fullName: '',
    email: '',
    phone: '',
    ticketQty: 0,
    eventName: TICKET_CONFIG.eventName,
    pricePerTicket: TICKET_CONFIG.pricePerTicket,
    totalAmount: 0,
    receiptImage: null,
    receiptFileName: '',
    receiptFileType: '',
    confirmationMethod: '',
    timestamp: '',
    userAgent: navigator.userAgent,
    submissionId: ''
  };

  // ==========================================================================
  // Currency Formatting
  // ==========================================================================
  function formatPrice(amount) {
    return `${TICKET_CONFIG.currency} ${amount.toFixed(2)}`;
  }

  // ==========================================================================
  // Price Calculation Display
  // ==========================================================================
  function updatePriceDisplay(qty = 0) {
    const quantity = parseInt(qty) || 0;
    const total = quantity * TICKET_CONFIG.pricePerTicket;
    
    if (elements.pricePerTicketDisplay) {
      elements.pricePerTicketDisplay.textContent = formatPrice(TICKET_CONFIG.pricePerTicket);
    }
    if (elements.qtyDisplay) {
      elements.qtyDisplay.textContent = quantity;
    }
    if (elements.totalPriceDisplay) {
      elements.totalPriceDisplay.textContent = formatPrice(total);
    }
    
    // Update cache
    formDataCache.ticketQty = quantity;
    formDataCache.totalAmount = total;
  }

  function setupPriceCalculation() {
    // Initialize price display
    updatePriceDisplay(0);
    
    // Listen for ticket quantity changes
    if (elements.ticketQtySelect) {
      elements.ticketQtySelect.addEventListener('change', (e) => {
        updatePriceDisplay(e.target.value);
      });
    }
  }

  // ==========================================================================
  // Sold Out Logic
  // ==========================================================================
  function checkSoldOutStatus() {
    if (TICKET_CONFIG.soldOut) {
      if (elements.soldOutBanner) {
        elements.soldOutBanner.hidden = false;
      }
      
      if (elements.ticketToggle) {
        elements.ticketToggle.classList.add('sold-out');
        elements.ticketToggle.disabled = true;
        elements.ticketToggle.textContent = 'Sold Out';
      }
      
      if (elements.ticketFormContainer) {
        elements.ticketFormContainer.classList.remove('active');
      }
      
      return true;
    }
    return false;
  }

  // ==========================================================================
  // Diamond Shimmer Background
  // ==========================================================================
  function createShimmers() {
    const shimmerCount = Math.min(30, Math.floor(window.innerWidth / 50));
    const container = elements.shimmerBg;
    
    if (!container) return;
    
    container.innerHTML = '';
    
    for (let i = 0; i < shimmerCount; i++) {
      const shimmer = document.createElement('div');
      shimmer.className = 'shimmer';
      shimmer.style.left = Math.random() * 100 + '%';
      shimmer.style.top = Math.random() * 100 + '%';
      shimmer.style.animationDelay = (Math.random() * 5) + 's';
      shimmer.style.animationDuration = (3 + Math.random() * 4) + 's';
      const scale = 0.5 + Math.random() * 1;
      shimmer.style.transform = `scale(${scale})`;
      container.appendChild(shimmer);
    }
  }

  let resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(createShimmers, 250);
  });

  // ==========================================================================
  // Ticket Form Toggle (with sold-out check)
  // ==========================================================================
  function toggleTicketForm() {
    // Block if sold out
    if (TICKET_CONFIG.soldOut) return;
    
    if (!elements.ticketFormContainer || !elements.ticketToggle) {
      console.error('Ticket form elements not found');
      return;
    }
    
    const isExpanded = elements.ticketToggle.getAttribute('aria-expanded') === 'true';
    
    if (isExpanded) {
      // Close form
      elements.ticketFormContainer.classList.remove('active');
      elements.ticketToggle.setAttribute('aria-expanded', 'false');
      elements.ticketToggle.textContent = 'Buy Tickets';
    } else {
      // Open form
      elements.ticketFormContainer.classList.add('active');
      elements.ticketToggle.setAttribute('aria-expanded', 'true');
      elements.ticketToggle.textContent = 'Close';
      
      // Restore cached form data
      restoreFormFromCache();
      
      // Focus first input after animation
      setTimeout(() => {
        const firstInput = elements.ticketFormContainer.querySelector('input[type="text"]');
        if (firstInput) firstInput.focus();
      }, 350);
    }
  }

  // ==========================================================================
  // Form Data Caching (auto-save as user types)
  // ==========================================================================
  function setupFormCaching() {
    if (!elements.ticketForm) return;
    
    // Cache text inputs on change
    const inputFields = ['full-name', 'email', 'phone'];
    inputFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('input', () => cacheFieldValue(fieldId, field.value));
        field.addEventListener('change', () => cacheFieldValue(fieldId, field.value));
      }
    });
    
    // Cache radio button selection
    const radioButtons = document.querySelectorAll('input[name="confirmationMethod"]');
    radioButtons.forEach(radio => {
      radio.addEventListener('change', () => {
        formDataCache.confirmationMethod = radio.value;
      });
    });
  }

  function cacheFieldValue(fieldId, value) {
    const fieldMap = {
      'full-name': 'fullName',
      'email': 'email',
      'phone': 'phone'
    };
    
    if (fieldMap[fieldId]) {
      formDataCache[fieldMap[fieldId]] = value;
    }
  }

  function restoreFormFromCache() {
    // Restore text fields
    const fieldMap = {
      'full-name': 'fullName',
      'email': 'email',
      'phone': 'phone'
    };
    
    Object.entries(fieldMap).forEach(([fieldId, cacheKey]) => {
      const field = document.getElementById(fieldId);
      if (field && formDataCache[cacheKey]) {
        field.value = formDataCache[cacheKey];
      }
    });
    
    // Restore ticket quantity
    if (elements.ticketQtySelect && formDataCache.ticketQty) {
      elements.ticketQtySelect.value = formDataCache.ticketQty;
      updatePriceDisplay(formDataCache.ticketQty);
    }
    
    // Restore radio selection
    if (formDataCache.confirmationMethod) {
      const radio = document.querySelector(`input[name="confirmationMethod"][value="${formDataCache.confirmationMethod}"]`);
      if (radio) radio.checked = true;
    }
    
    // Restore image preview if exists
    if (formDataCache.receiptImage && elements.previewImg) {
      elements.previewImg.src = formDataCache.receiptImage;
      if (elements.imagePreview) elements.imagePreview.classList.add('active');
      if (elements.imageUploadContainer) elements.imageUploadContainer.classList.add('has-image');
    }
  }

  // ==========================================================================
  // Image Upload Handling
  // ==========================================================================
  function setupImageUpload() {
    if (!elements.receiptImageInput) return;
    
    // File input change
    elements.receiptImageInput.addEventListener('change', handleImageSelect);
    
    // Drag and drop
    if (elements.imageUploadContainer) {
      elements.imageUploadContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.imageUploadContainer.classList.add('dragover');
      });
      
      elements.imageUploadContainer.addEventListener('dragleave', () => {
        elements.imageUploadContainer.classList.remove('dragover');
      });
      
      elements.imageUploadContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.imageUploadContainer.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
          processImageFile(files[0]);
        }
      });
    }
    
    // Remove image button
    if (elements.removeImageBtn) {
      elements.removeImageBtn.addEventListener('click', removeImage);
    }
  }

  function handleImageSelect(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      processImageFile(file);
    }
  }

  function processImageFile(file) {
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Image too large. Please upload an image smaller than 5MB.');
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const base64 = e.target.result;
      
      // Cache the image data
      formDataCache.receiptImage = base64;
      formDataCache.receiptFileName = file.name;
      formDataCache.receiptFileType = file.type;
      
      // Show preview
      if (elements.previewImg) {
        elements.previewImg.src = base64;
      }
      if (elements.imagePreview) {
        elements.imagePreview.classList.add('active');
      }
      if (elements.imageUploadContainer) {
        elements.imageUploadContainer.classList.add('has-image');
      }
    };
    
    reader.readAsDataURL(file);
  }

  function removeImage() {
    // Clear cache
    formDataCache.receiptImage = null;
    formDataCache.receiptFileName = '';
    formDataCache.receiptFileType = '';
    
    // Reset UI
    if (elements.previewImg) {
      elements.previewImg.src = '';
    }
    if (elements.imagePreview) {
      elements.imagePreview.classList.remove('active');
    }
    if (elements.imageUploadContainer) {
      elements.imageUploadContainer.classList.remove('has-image');
    }
    if (elements.receiptImageInput) {
      elements.receiptImageInput.value = '';
    }
  }

  // ==========================================================================
  // Form Submission - Google Sheets Integration
  // ==========================================================================
  
  const GOOGLE_SHEETS_CONFIG = {
    webAppUrl: 'https://script.google.com/macros/s/AKfycbxRE7U1idaVDzMZyQiDRhVt93IFtZxrjGYzzCZQMxGeEVLwOD4xwlX_ZuWfcsNJJbjfvw/exec', // Paste your Apps Script Web App URL here
    enabled: true // Set to true when configured
  };

  // Generate unique submission ID
  function generateSubmissionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `MA-${timestamp}-${random}`.toUpperCase();
  }

  function setupFormSubmission() {
    if (!elements.ticketForm) return;
    
    elements.ticketForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Double-check sold out status before submission
      if (TICKET_CONFIG.soldOut) {
        alert('Sorry, tickets are no longer available. Maximum attendance has been reached.');
        return;
      }
      
      const submitBtn = document.getElementById('form-submit');
      if (!submitBtn) return;
      
      const originalText = submitBtn.textContent;
      
      // Get form values directly (more reliable than cache for validation)
      const fullName = document.getElementById('full-name')?.value?.trim();
      const email = document.getElementById('email')?.value?.trim();
      const phone = document.getElementById('phone')?.value?.trim() || 'Not provided';
      const ticketQty = parseInt(elements.ticketQtySelect?.value) || 0;
      const confirmationMethod = document.querySelector('input[name="confirmationMethod"]:checked');
      
      // Validate all required fields
      if (!fullName || !email) {
        alert('Please fill in your name and email.');
        return;
      }
      
      if (ticketQty < 1 || ticketQty > TICKET_CONFIG.maxTicketsPerRequest) {
        alert(`Please select between 1 and ${TICKET_CONFIG.maxTicketsPerRequest} tickets.`);
        return;
      }
      
      if (!formDataCache.receiptImage) {
        alert('Please upload your payment receipt screenshot.');
        return;
      }
      
      if (!confirmationMethod) {
        alert('Please select how you would like to receive your confirmation.');
        return;
      }
      
      // Generate submission ID
      const submissionId = generateSubmissionId();
      
      // Prepare submission data (INCLUDING the receipt image for Google Sheets)
      const submissionData = {
        // ===== PERSONAL INFORMATION =====
        fullName: fullName,
        email: email,
        phone: phone,
        
        // ===== TICKET DETAILS =====
        eventName: TICKET_CONFIG.eventName,
        ticketQty: ticketQty,
        pricePerTicket: TICKET_CONFIG.pricePerTicket,
        currency: TICKET_CONFIG.currency,
        totalAmount: ticketQty * TICKET_CONFIG.pricePerTicket,
        totalFormatted: formatPrice(ticketQty * TICKET_CONFIG.pricePerTicket),
        
        // ===== PAYMENT PROOF (sent to Google Sheets) =====
        receiptImage: formDataCache.receiptImage,
        receiptFileName: formDataCache.receiptFileName,
        receiptFileType: formDataCache.receiptFileType,
        
        // ===== CONFIRMATION PREFERENCE =====
        confirmationMethod: confirmationMethod.value,
        
        // ===== METADATA =====
        submissionId: submissionId,
        timestamp: new Date().toISOString(),
        timestampLocal: new Date().toLocaleString(),
        status: 'Pending'
      };
      
      // Disable button
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      
      try {
        if (GOOGLE_SHEETS_CONFIG.enabled && GOOGLE_SHEETS_CONFIG.webAppUrl) {
          // Send data to Google Sheets (WITHOUT the receipt image)
          await fetch(GOOGLE_SHEETS_CONFIG.webAppUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData)
          });
        } else {
          // Log organized data when not configured
          console.log('=== TICKET SUBMISSION DATA ===');
          console.log('Submission ID:', submissionData.submissionId);
          console.log('--- Personal Info ---');
          console.log('Name:', submissionData.fullName);
          console.log('Email:', submissionData.email);
          console.log('Phone:', submissionData.phone);
          console.log('--- Ticket Details ---');
          console.log('Event:', submissionData.eventName);
          console.log('Quantity:', submissionData.ticketQty);
          console.log('Price per ticket:', formatPrice(submissionData.pricePerTicket));
          console.log('Total:', submissionData.totalFormatted);
          console.log('--- Preferences ---');
          console.log('Confirmation via:', submissionData.confirmationMethod);
          console.log('--- Receipt ---');
          console.log('File:', submissionData.receiptFileName);
          console.log('Type:', submissionData.receiptFileType);
          console.log('Image included:', !!submissionData.receiptImage);
          console.log('==============================');
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Success
        submitBtn.textContent = 'Submitted!';
        submitBtn.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
        
        // Clear form and cache
        elements.ticketForm.reset();
        removeImage();
        updatePriceDisplay(0);
        formDataCache = {
          fullName: '', email: '', phone: '', ticketQty: 0,
          eventName: TICKET_CONFIG.eventName,
          pricePerTicket: TICKET_CONFIG.pricePerTicket,
          totalAmount: 0, receiptImage: null, receiptFileName: '',
          receiptFileType: '', confirmationMethod: '', timestamp: '',
          userAgent: navigator.userAgent, submissionId: ''
        };
        
        setTimeout(() => {
          submitBtn.textContent = originalText;
          submitBtn.style.background = '';
          submitBtn.disabled = false;
        }, 3000);
        
      } catch (error) {
        console.error('Form submission error:', error);
        submitBtn.textContent = 'Error - Try Again';
        submitBtn.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
        submitBtn.disabled = false;
        
        setTimeout(() => {
          submitBtn.textContent = originalText;
          submitBtn.style.background = '';
        }, 3000);
      }
    });
  }

  // ==========================================================================
  // Video Intersection Observer
  // ==========================================================================
  function setupVideoObserver() {
    const video = elements.promoVideo;
    if (!video) return;
    
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          video.play().catch(err => console.log('Autoplay prevented:', err));
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.5 });
    
    videoObserver.observe(video);
    
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) video.pause();
    });
  }

  // ==========================================================================
  // Countdown Timer - Reads from upcoming event data
  // ==========================================================================
  function initCountdown() {
    const upcomingEvent = document.getElementById('upcoming-event');
    if (!upcomingEvent) return;

    // Get event data from data attributes
    const eventDate = upcomingEvent.dataset.eventDate;
    const eventTime = upcomingEvent.dataset.eventTime || '00:00';
    const eventLocation = upcomingEvent.dataset.eventLocation || 'TBA';

    if (!eventDate) return;

    // Create target date
    const targetDate = new Date(`${eventDate}T${eventTime}:00`);
    
    // Elements
    const daysEl = document.getElementById('countdown-days');
    const hoursEl = document.getElementById('countdown-hours');
    const minutesEl = document.getElementById('countdown-minutes');
    const secondsEl = document.getElementById('countdown-seconds');
    const dateDisplay = document.getElementById('event-date-display');
    const timeDisplay = document.getElementById('event-time-display');
    const locationDisplay = document.getElementById('event-location-display');

    // Format date for display
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };

    if (dateDisplay) {
      dateDisplay.textContent = targetDate.toLocaleDateString('en-US', dateOptions);
    }
    if (timeDisplay) {
      timeDisplay.textContent = targetDate.toLocaleTimeString('en-US', timeOptions);
    }
    if (locationDisplay) {
      locationDisplay.textContent = eventLocation;
    }

    function updateCountdown() {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance < 0) {
        // Event has passed
        if (daysEl) daysEl.textContent = '00';
        if (hoursEl) hoursEl.textContent = '00';
        if (minutesEl) minutesEl.textContent = '00';
        if (secondsEl) secondsEl.textContent = '00';
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
      if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
      if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
      if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
    }

    // Update immediately
    updateCountdown();
    
    // Update every second
    setInterval(updateCountdown, 1000);
  }

  // ==========================================================================
  // QR Code Download Menu
  // ==========================================================================
  function initQRMenu() {
    const qrMenuBtn = document.getElementById('qr-menu-btn');
    const qrMenu = document.getElementById('qr-menu');
    const qrDownloadBtn = document.getElementById('qr-download');
    const qrImage = document.getElementById('qr-image');

    if (!qrMenuBtn || !qrMenu) return;

    // Toggle menu
    qrMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      qrMenu.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', () => {
      qrMenu.classList.remove('active');
    });

    // Download QR code
    if (qrDownloadBtn && qrImage) {
      qrDownloadBtn.addEventListener('click', () => {
        qrMenu.classList.remove('active');
        
        // Check if it's an actual image
        if (qrImage.tagName === 'IMG' && qrImage.src) {
          // Create download link
          const link = document.createElement('a');
          link.download = 'midnight-anarchy-payment-qr.png';
          link.href = qrImage.src;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          // Placeholder - show message
          alert('QR code image not yet available. Check back soon!');
        }
      });
    }
  }

  // ==========================================================================
  // Scroll Animations - Fade In Zoom
  // ==========================================================================
  function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.fade-in-zoom');
    
    if (!animatedElements.length) return;
    
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      // Skip animations for accessibility
      animatedElements.forEach(el => el.classList.add('visible'));
      return;
    }
    
    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -50px 0px',
      threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Optional: unobserve after animation triggers
          // observer.unobserve(entry.target);
        }
      });
    }, observerOptions);
    
    animatedElements.forEach(el => observer.observe(el));
  }

  // ==========================================================================
  // Theme System
  // ==========================================================================
  const THEME_CONFIG = {
    themes: ['diamond', 'gold', 'rosegold', 'cream'],
    logos: {
      diamond: 'img/midnightanarchy-diamond-nobg.png',
      gold: 'img/midnightanarchy-gold-nobg.png',
      rosegold: 'img/midnightanarchy-rosegold-nobg.png',
      cream: 'img/midnightanarchy-gold-nobg.png'
    },
    storageKey: 'midnight-anarchy-theme'
  };

  function initThemeSystem() {
    // Load saved theme or use default from body attribute
    const savedTheme = localStorage.getItem(THEME_CONFIG.storageKey);
    const bodyTheme = document.body.dataset.theme || 'diamond';
    const currentTheme = savedTheme || bodyTheme;
    
    applyTheme(currentTheme);
  }

  function applyTheme(themeName) {
    if (!THEME_CONFIG.themes.includes(themeName)) {
      themeName = 'diamond';
    }
    
    // Update body data-theme attribute
    document.body.dataset.theme = themeName;
    
    // Update logo image
    const logoImg = document.getElementById('theme-logo');
    if (logoImg && THEME_CONFIG.logos[themeName]) {
      logoImg.src = THEME_CONFIG.logos[themeName];
    }
    
    // Save preference
    localStorage.setItem(THEME_CONFIG.storageKey, themeName);
    
    // Recreate shimmers with new theme colors
    createShimmers();
    
    console.log(`Theme applied: ${themeName}`);
  }

  // Expose theme functions globally for easy switching
  window.MidnightAnarchy = {
    setTheme: applyTheme,
    getTheme: () => document.body.dataset.theme,
    themes: THEME_CONFIG.themes
  };

  // ==========================================================================
  // Theme Switcher UI
  // ==========================================================================
  function initThemeSwitcher() {
    const switcher = document.getElementById('theme-switcher');
    const toggle = document.getElementById('theme-toggle');
    const menu = document.getElementById('theme-menu');
    const options = document.querySelectorAll('.theme-option');
    
    if (!switcher || !toggle || !menu) return;
    
    // Update active state on buttons
    function updateActiveState() {
      const currentTheme = document.body.dataset.theme || 'diamond';
      options.forEach(option => {
        if (option.dataset.theme === currentTheme) {
          option.classList.add('active');
        } else {
          option.classList.remove('active');
        }
      });
    }
    
    // Toggle menu open/close
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      switcher.classList.toggle('open');
      updateActiveState();
    });
    
    // Handle theme selection
    options.forEach(option => {
      option.addEventListener('click', () => {
        const themeName = option.dataset.theme;
        applyTheme(themeName);
        updateActiveState();
        
        // Close menu with a slight delay for visual feedback
        setTimeout(() => {
          switcher.classList.remove('open');
        }, 200);
      });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!switcher.contains(e.target)) {
        switcher.classList.remove('open');
      }
    });
    
    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        switcher.classList.remove('open');
      }
    });
    
    // Initial active state
    updateActiveState();
  }

  // ==========================================================================
  // Smooth Scroll
  // ==========================================================================
  function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ==========================================================================
  // Initialize
  // ==========================================================================
  function init() {
    console.log('Midnight Anarchy - Initializing...');
    
    // Initialize theme system first
    initThemeSystem();
    initThemeSwitcher();
    
    // Check sold out status first
    const isSoldOut = checkSoldOutStatus();
    
    // Setup features
    createShimmers();
    initScrollAnimations();
    setupVideoObserver();
    setupSmoothScroll();
    initCountdown();
    initQRMenu();
    
    // Only setup form if not sold out
    if (!isSoldOut) {
      setupImageUpload();
      setupFormCaching();
      setupPriceCalculation();
      setupFormSubmission();
      
      // Setup ticket toggle
      if (elements.ticketToggle) {
        elements.ticketToggle.addEventListener('click', toggleTicketForm);
        console.log('Ticket toggle initialized');
      }
    }
    
    document.body.classList.add('loaded');
    console.log('Midnight Anarchy - Ready');
  }

  // Run initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
