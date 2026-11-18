/**
 * ملاعبي — نظام الأيقونات ثلاثية الأبعاد (MALAEBI Unified 3D SVG System)
 * Pure 3D Vector Icons with Specular Highlights & Depth Gradients
 */
(function(global) {
  'use strict';

  let idCounter = 0;
  function uid(prefix) {
    return `m3d-${prefix}-${++idCounter}`;
  }

  const icons = {
    // 1. دبوس الموقع 3D (Location Pin)
    pin: (s = 24) => {
      const gPin = uid('pin');
      const gDot = uid('pindot');
      const gBase = uid('pinbase');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gPin}" x1="8" y1="2" x2="24" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#34d399"/>
            <stop offset="40%" stop-color="#10b981"/>
            <stop offset="85%" stop-color="#059669"/>
            <stop offset="100%" stop-color="#064e3b"/>
          </linearGradient>
          <radialGradient id="${gDot}" cx="16" cy="11" r="5" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="45%" stop-color="#d1fae5"/>
            <stop offset="100%" stop-color="#059669"/>
          </radialGradient>
          <radialGradient id="${gBase}" cx="16" cy="28.5" rx="7" ry="2.5" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#064e3b" stop-opacity="0.45"/>
            <stop offset="100%" stop-color="#064e3b" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <ellipse cx="16" cy="28.5" rx="7" ry="2.5" fill="url(#${gBase})"/>
        <path d="M16 2C10.5 2 6 6.5 6 12C6 19 14.5 27.5 16 28C17.5 27.5 26 19 26 12C26 6.5 21.5 2 16 2Z" fill="url(#${gPin})"/>
        <path d="M16 3.5C20.7 3.5 24.5 7.3 24.5 12C24.5 17.5 18 24.5 16 26C14 24.5 7.5 17.5 7.5 12C7.5 7.3 11.3 3.5 16 3.5Z" stroke="#a7f3d0" stroke-width="0.8" fill="none" opacity="0.6"/>
        <circle cx="16" cy="11.5" r="4.2" fill="url(#${gDot})"/>
        <circle cx="15.2" cy="10.2" r="1.5" fill="#ffffff" opacity="0.85"/>
      </svg>`;
    },

    // 2. الجرس 3D (Notification Bell)
    bell: (s = 24) => {
      const gBell = uid('bell');
      const gClap = uid('clap');
      const gRing = uid('ring');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gBell}" x1="16" y1="4" x2="16" y2="25" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#fef3c7"/>
            <stop offset="25%" stop-color="#fbbf24"/>
            <stop offset="70%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#b45309"/>
          </linearGradient>
          <linearGradient id="${gRing}" x1="16" y1="2" x2="16" y2="7" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#fde68a"/>
            <stop offset="100%" stop-color="#d97706"/>
          </linearGradient>
          <radialGradient id="${gClap}" cx="16" cy="27" r="3" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#fbbf24"/>
            <stop offset="100%" stop-color="#92400e"/>
          </radialGradient>
        </defs>
        <circle cx="16" cy="5" r="3" stroke="url(#${gRing})" stroke-width="2" fill="none"/>
        <circle cx="16" cy="26" r="3.2" fill="url(#${gClap})"/>
        <path d="M16 6C10.5 6 8.5 11 8 16C7.5 21 5 22.5 5 24H27C27 22.5 24.5 21 24 16C23.5 11 21.5 6 16 6Z" fill="url(#${gBell})"/>
        <rect x="4" y="22.5" width="24" height="2.5" rx="1.25" fill="#fef3c7" opacity="0.9"/>
        <path d="M10 11C11.5 8 14 7 16 7" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.75"/>
      </svg>`;
    },

    // 3. القمر 3D (Dark Mode Moon)
    moon: (s = 24) => {
      const gMoon = uid('moon');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gMoon}" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#a7f3d0"/>
            <stop offset="40%" stop-color="#34d399"/>
            <stop offset="85%" stop-color="#10b981"/>
            <stop offset="100%" stop-color="#064e3b"/>
          </linearGradient>
        </defs>
        <path d="M26 18.5C25.5 24.3 20.8 29 15 29C8.9 29 4 24.1 4 18C4 12.2 8.7 7.5 14.5 7C14 8.5 13.8 10.2 13.8 12C13.8 18.1 18.7 23 24.8 23C25.2 23 25.6 22.9 26 22.8V18.5Z" fill="url(#${gMoon})"/>
        <path d="M25 18.5C24.5 23.5 20.2 27.5 15 27.5C9.7 27.5 5.5 23.3 5.5 18C5.5 13 9.3 8.8 14.2 8.5" stroke="#d1fae5" stroke-width="0.8" fill="none" opacity="0.7"/>
        <circle cx="10" cy="16" r="1.5" fill="#064e3b" opacity="0.3"/>
        <circle cx="13" cy="22" r="1.8" fill="#064e3b" opacity="0.25"/>
      </svg>`;
    },

    // 4. الشمس 3D (Light Mode Sun)
    sun: (s = 24) => {
      const gSun = uid('sun');
      const gRay = uid('sunray');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="${gSun}" cx="16" cy="14" r="8" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#fffbeb"/>
            <stop offset="35%" stop-color="#fde047"/>
            <stop offset="75%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#d97706"/>
          </radialGradient>
          <linearGradient id="${gRay}" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#fde047"/>
            <stop offset="100%" stop-color="#f59e0b"/>
          </linearGradient>
        </defs>
        <g stroke="url(#${gRay})" stroke-width="2.2" stroke-linecap="round">
          <line x1="16" y1="3" x2="16" y2="6.5"/>
          <line x1="16" y1="25.5" x2="16" y2="29"/>
          <line x1="3" y1="16" x2="6.5" y2="16"/>
          <line x1="25.5" y1="16" x2="29" y2="16"/>
          <line x1="6.8" y1="6.8" x2="9.3" y2="9.3"/>
          <line x1="22.7" y1="22.7" x2="25.2" y2="25.2"/>
          <line x1="6.8" y1="25.2" x2="9.3" y2="22.7"/>
          <line x1="22.7" y1="9.3" x2="25.2" y2="6.8"/>
        </g>
        <circle cx="16" cy="16" r="7.5" fill="url(#${gSun})"/>
        <circle cx="13.8" cy="13.8" r="2.5" fill="#ffffff" opacity="0.6"/>
      </svg>`;
    },

    // 5. عدسة البحث 3D (Magnifying Glass Search)
    search: (s = 24) => {
      const gLens = uid('lens');
      const gRim = uid('lensrim');
      const gHandle = uid('lenshandle');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gRim}" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#6ee7b7"/>
            <stop offset="50%" stop-color="#10b981"/>
            <stop offset="100%" stop-color="#047857"/>
          </linearGradient>
          <radialGradient id="${gLens}" cx="11" cy="9" r="8" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
            <stop offset="45%" stop-color="#ecfdf5" stop-opacity="0.5"/>
            <stop offset="100%" stop-color="#a7f3d0" stop-opacity="0.2"/>
          </radialGradient>
          <linearGradient id="${gHandle}" x1="18" y1="18" x2="29" y2="29" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#34d399"/>
            <stop offset="60%" stop-color="#059669"/>
            <stop offset="100%" stop-color="#064e3b"/>
          </linearGradient>
        </defs>
        <rect x="18" y="18" width="5.5" height="13" rx="2.75" transform="rotate(-45 18 18)" fill="url(#${gHandle})"/>
        <circle cx="13" cy="13" r="9" stroke="url(#${gRim})" stroke-width="3" fill="none"/>
        <circle cx="13" cy="13" r="7.5" fill="url(#${gLens})"/>
        <path d="M8 10C9.5 7 13 6 16 7" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.8"/>
      </svg>`;
    },

    // 6. النجمة الذهبية 3D (Gold Star Rating)
    star: (s = 20) => {
      const gStar = uid('star');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gStar}" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="35%" stop-color="#fbbf24"/>
            <stop offset="75%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#b45309"/>
          </linearGradient>
        </defs>
        <path d="M16 2.5L20.2 11.2L29.8 12.6L22.9 19.3L24.5 28.8L16 24.3L7.5 28.8L9.1 19.3L2.2 12.6L11.8 11.2L16 2.5Z" fill="url(#${gStar})"/>
        <path d="M16 2.5L20.2 11.2L16 16L11.8 11.2L16 2.5Z" fill="#fef9c3" opacity="0.6"/>
        <path d="M29.8 12.6L22.9 19.3L16 16L20.2 11.2L29.8 12.6Z" fill="#f59e0b" opacity="0.5"/>
        <path d="M24.5 28.8L16 24.3L16 16L22.9 19.3L24.5 28.8Z" fill="#b45309" opacity="0.35"/>
        <path d="M16 24.3L7.5 28.8L9.1 19.3L16 16L16 24.3Z" fill="#f59e0b" opacity="0.5"/>
        <path d="M7.5 28.8L9.1 19.3L2.2 12.6L16 16L7.5 28.8Z" fill="#fbbf24" opacity="0.4"/>
      </svg>`;
    },

    // 7. القلب 3D (Favorites Heart)
    heart: (s = 22, filled = true) => {
      const gH = uid('heart');
      if (!filled) {
        return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 27.5C15.4 27.2 4 20.3 4 12C4 7.6 7.6 4 12 4C14.6 4 15.8 5.2 16 6C16.2 5.2 17.4 4 20 4C24.4 4 28 7.6 28 12C28 20.3 16.6 27.2 16 27.5Z" stroke="#9ca3af" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.75"/>
        </svg>`;
      }
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gH}" x1="8" y1="4" x2="24" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#f87171"/>
            <stop offset="40%" stop-color="#ef4444"/>
            <stop offset="85%" stop-color="#dc2626"/>
            <stop offset="100%" stop-color="#991b1b"/>
          </linearGradient>
        </defs>
        <path d="M16 27.5C15.4 27.2 4 20.3 4 12C4 7.6 7.6 4 12 4C14.6 4 15.8 5.2 16 6C16.2 5.2 17.4 4 20 4C24.4 4 28 7.6 28 12C28 20.3 16.6 27.2 16 27.5Z" fill="url(#${gH})"/>
        <path d="M9 8C10.5 6.5 12 6.5 13.5 7" stroke="#fecaca" stroke-width="1.4" stroke-linecap="round" opacity="0.8"/>
      </svg>`;
    },

    // 8. عشب صناعي 3D (Turf Field Amenity)
    turf: (s = 24) => {
      const gTurf = uid('turf');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gTurf}" x1="16" y1="4" x2="16" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#34d399"/>
            <stop offset="50%" stop-color="#10b981"/>
            <stop offset="100%" stop-color="#047857"/>
          </linearGradient>
        </defs>
        <rect x="4" y="6" width="24" height="20" rx="4" fill="url(#${gTurf})"/>
        <rect x="6" y="8" width="20" height="16" rx="2" stroke="#ffffff" stroke-width="1.2" fill="none" opacity="0.85"/>
        <line x1="16" y1="8" x2="16" y2="24" stroke="#ffffff" stroke-width="1.2" opacity="0.85"/>
        <circle cx="16" cy="16" r="3.2" stroke="#ffffff" stroke-width="1.2" fill="none" opacity="0.85"/>
        <path d="M5 7C10 5.5 22 5.5 27 7" stroke="#a7f3d0" stroke-width="1" stroke-linecap="round" opacity="0.7"/>
      </svg>`;
    },

    // 9. إضاءة ليلية 3D (Floodlight Amenity)
    lighting: (s = 24) => {
      const gLamp = uid('lamp');
      const gBeam = uid('beam');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gLamp}" x1="16" y1="4" x2="16" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#fde047"/>
            <stop offset="60%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#d97706"/>
          </linearGradient>
          <linearGradient id="${gBeam}" x1="16" y1="12" x2="16" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="0.65"/>
            <stop offset="100%" stop-color="#fef08a" stop-opacity="0.05"/>
          </linearGradient>
        </defs>
        <polygon points="12,12 20,12 27,27 5,27" fill="url(#${gBeam})"/>
        <ellipse cx="16" cy="10" rx="7" ry="3.5" fill="url(#${gLamp})"/>
        <line x1="16" y1="4" x2="16" y2="7" stroke="#9ca3af" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="16" cy="10" r="2" fill="#ffffff"/>
      </svg>`;
    },

    // 10. مواقف سيارات 3D (Parking Amenity)
    parking: (s = 24) => {
      const gP = uid('park');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gP}" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#60a5fa"/>
            <stop offset="40%" stop-color="#3b82f6"/>
            <stop offset="100%" stop-color="#1d4ed8"/>
          </linearGradient>
        </defs>
        <rect x="5" y="5" width="22" height="22" rx="7" fill="url(#${gP})"/>
        <rect x="6.5" y="6.5" width="19" height="19" rx="5.5" stroke="#93c5fd" stroke-width="0.9" fill="none" opacity="0.6"/>
        <path d="M12 22V10H17.5C19.8 10 21.2 11.2 21.2 13.5C21.2 15.8 19.8 17 17.5 17H15.5V22H12ZM15.5 14.5H17.2C18.2 14.5 18.8 14.1 18.8 13.5C18.8 12.9 18.2 12.5 17.2 12.5H15.5V14.5Z" fill="#ffffff"/>
      </svg>`;
    },

    // 11. غرف تبديل 3D (Locker / Changing Room)
    lockers: (s = 24) => {
      const gL = uid('lock');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gL}" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#34d399"/>
            <stop offset="50%" stop-color="#059669"/>
            <stop offset="100%" stop-color="#064e3b"/>
          </linearGradient>
        </defs>
        <rect x="6" y="5" width="20" height="23" rx="3.5" fill="url(#${gL})"/>
        <line x1="16" y1="5" x2="16" y2="28" stroke="#064e3b" stroke-width="1.2"/>
        <line x1="9" y1="9" x2="13" y2="9" stroke="#a7f3d0" stroke-width="1" stroke-linecap="round"/>
        <line x1="9" y1="12" x2="13" y2="12" stroke="#a7f3d0" stroke-width="1" stroke-linecap="round"/>
        <line x1="19" y1="9" x2="23" y2="9" stroke="#a7f3d0" stroke-width="1" stroke-linecap="round"/>
        <line x1="19" y1="12" x2="23" y2="12" stroke="#a7f3d0" stroke-width="1" stroke-linecap="round"/>
        <circle cx="14" cy="18" r="1" fill="#fef08a"/>
        <circle cx="18" cy="18" r="1" fill="#fef08a"/>
      </svg>`;
    },

    // 12. دورات مياه 3D (Restrooms / Facilities)
    restrooms: (s = 24) => {
      const gR = uid('rest');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gR}" x1="8" y1="4" x2="24" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="50%" stop-color="#0284c7"/>
            <stop offset="100%" stop-color="#0369a1"/>
          </linearGradient>
        </defs>
        <path d="M16 3C16 3 8 13.5 8 19C8 23.4 11.6 27 16 27C20.4 27 24 23.4 24 19C24 13.5 16 3 16 3Z" fill="url(#${gR})"/>
        <path d="M13 11C10.5 14.5 10 18 10.5 21" stroke="#e0f2fe" stroke-width="1.2" stroke-linecap="round" opacity="0.75"/>
      </svg>`;
    },

    // 13. علامة الصح 3D (Green Check Badge)
    checkBadge: (s = 28) => {
      const gC = uid('chk');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gC}" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#34d399"/>
            <stop offset="40%" stop-color="#10b981"/>
            <stop offset="85%" stop-color="#059669"/>
            <stop offset="100%" stop-color="#064e3b"/>
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="13" fill="url(#${gC})"/>
        <circle cx="16" cy="16" r="11.8" stroke="#a7f3d0" stroke-width="0.9" fill="none" opacity="0.6"/>
        <path d="M10 16.5L14 20.5L22 12" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    },

    // 14. النقود / الدفع عند الملعب 3D (Cash / Pay at venue)
    cash: (s = 24) => {
      const gCash = uid('cash');
      const gSeal = uid('seal');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gCash}" x1="4" y1="8" x2="28" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#6ee7b7"/>
            <stop offset="45%" stop-color="#10b981"/>
            <stop offset="100%" stop-color="#047857"/>
          </linearGradient>
          <radialGradient id="${gSeal}" cx="16" cy="16" r="5" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="100%" stop-color="#d97706"/>
          </radialGradient>
        </defs>
        <rect x="7" y="6" width="20" height="13" rx="2.5" fill="#047857" opacity="0.5" transform="rotate(-6 17 12)"/>
        <rect x="4" y="9" width="24" height="15" rx="3" fill="url(#${gCash})"/>
        <rect x="5.5" y="10.5" width="21" height="12" rx="2" stroke="#d1fae5" stroke-width="0.8" fill="none" opacity="0.7"/>
        <circle cx="16" cy="16.5" r="4.2" fill="url(#${gSeal})"/>
        <circle cx="16" cy="16.5" r="2.8" stroke="#ffffff" stroke-width="0.8" fill="none" opacity="0.9"/>
      </svg>`;
    },

    // 15. المستخدم / الملف الشخصي 3D (User Profile)
    user: (s = 24) => {
      const gU = uid('usr');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gU}" x1="16" y1="4" x2="16" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#34d399"/>
            <stop offset="45%" stop-color="#10b981"/>
            <stop offset="100%" stop-color="#059669"/>
          </linearGradient>
        </defs>
        <circle cx="16" cy="10.5" r="5.5" fill="url(#${gU})"/>
        <path d="M14 7.5C15 6.5 17 6.5 18 7.5" stroke="#ffffff" stroke-width="0.9" stroke-linecap="round" opacity="0.75"/>
        <path d="M7 26.5C7 21.8 11 18.5 16 18.5C21 18.5 25 21.8 25 26.5C25 27.3 24.3 28 23.5 28H8.5C7.7 28 7 27.3 7 26.5Z" fill="url(#${gU})"/>
        <path d="M9 25C11 21 13.5 20 16 20C18.5 20 21 21 23 25" stroke="#a7f3d0" stroke-width="0.8" fill="none" opacity="0.6"/>
      </svg>`;
    },

    // 16. المفتاح / تغيير كلمة المرور 3D (Key Password)
    key: (s = 24) => {
      const gK = uid('key');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gK}" x1="6" y1="6" x2="26" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="35%" stop-color="#fbbf24"/>
            <stop offset="75%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#b45309"/>
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="7" stroke="url(#${gK})" stroke-width="3" fill="none"/>
        <circle cx="12" cy="12" r="3.2" fill="url(#${gK})"/>
        <path d="M17 17L27 27M24 24L26.5 21.5M21 27L23.5 24.5" stroke="url(#${gK})" stroke-width="3" stroke-linecap="round"/>
        <circle cx="10" cy="10" r="1.2" fill="#ffffff" opacity="0.9"/>
      </svg>`;
    },

    // 17. المحفظة 3D (Wallet)
    wallet: (s = 24) => {
      const gW = uid('wal');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gW}" x1="5" y1="8" x2="27" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#34d399"/>
            <stop offset="50%" stop-color="#059669"/>
            <stop offset="100%" stop-color="#064e3b"/>
          </linearGradient>
        </defs>
        <rect x="4" y="8" width="24" height="18" rx="4" fill="url(#${gW})"/>
        <path d="M4 13H28" stroke="#047857" stroke-width="1.2"/>
        <rect x="18" y="14" width="10" height="6" rx="2.5" fill="#10b981"/>
        <circle cx="23" cy="17" r="1.6" fill="#fef08a"/>
      </svg>`;
    },

    // 18. الترس / الإعدادات 3D (Gear Settings)
    gear: (s = 24) => {
      const gG = uid('gear');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gG}" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#9ca3af"/>
            <stop offset="45%" stop-color="#6b7280"/>
            <stop offset="100%" stop-color="#374151"/>
          </linearGradient>
        </defs>
        <path d="M14 3H18L18.8 6.5C19.8 6.9 20.8 7.5 21.6 8.3L25 7.2L27 10.7L24.4 13.2C24.6 14.1 24.6 15.1 24.4 16L27 18.5L25 22L21.6 20.9C20.8 21.7 19.8 22.3 18.8 22.7L18 26.2H14L13.2 22.7C12.2 22.3 11.2 21.7 10.4 20.9L7 22L5 18.5L7.6 16C7.4 15.1 7.4 14.1 7.6 13.2L5 10.7L7 7.2L10.4 8.3C11.2 7.5 12.2 6.9 13.2 6.5L14 3Z" fill="url(#${gG})"/>
        <circle cx="16" cy="14.6" r="4.5" fill="#f3f4f6"/>
        <circle cx="16" cy="14.6" r="3" fill="#374151"/>
      </svg>`;
    },

    // 19. تواصل معنا 3D (Chat / Help)
    help: (s = 24) => {
      const gC1 = uid('chat1');
      const gC2 = uid('chat2');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gC1}" x1="4" y1="4" x2="24" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#34d399"/>
            <stop offset="100%" stop-color="#059669"/>
          </linearGradient>
          <linearGradient id="${gC2}" x1="12" y1="12" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#60a5fa"/>
            <stop offset="100%" stop-color="#2563eb"/>
          </linearGradient>
        </defs>
        <path d="M6 6C6 4.3 7.3 3 9 3H21C22.7 3 24 4.3 24 6V15C24 16.7 22.7 18 21 18H12L7 22V18H9C7.3 18 6 16.7 6 15V6Z" fill="url(#${gC1})"/>
        <path d="M14 14H23C24.7 14 26 15.3 26 17V22C26 23.7 24.7 25 23 25H21V28L17 25H14C12.3 25 11 23.7 11 22V17C11 15.3 12.3 14 14 14Z" fill="url(#${gC2})" opacity="0.9"/>
      </svg>`;
    },

    // 20. عن المنصة 3D (About Info)
    about: (s = 24) => {
      const gI = uid('info');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gI}" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#60a5fa"/>
            <stop offset="45%" stop-color="#3b82f6"/>
            <stop offset="100%" stop-color="#1d4ed8"/>
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="13" fill="url(#${gI})"/>
        <circle cx="16" cy="16" r="11.8" stroke="#bfdbfe" stroke-width="0.9" fill="none" opacity="0.6"/>
        <circle cx="16" cy="10.5" r="1.8" fill="#ffffff"/>
        <rect x="14.5" y="14" width="3" height="8.5" rx="1.5" fill="#ffffff"/>
      </svg>`;
    },

    // 21. كرة القدم 3D (Soccer Ball)
    ball: (s = 24) => {
      const gB = uid('ball');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="${gB}" cx="14" cy="12" r="13" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="65%" stop-color="#e5e7eb"/>
            <stop offset="100%" stop-color="#9ca3af"/>
          </radialGradient>
        </defs>
        <circle cx="16" cy="16" r="13" fill="url(#${gB})" stroke="#1f2937" stroke-width="0.8"/>
        <polygon points="16,11 20,14 18.5,19 13.5,19 12,14" fill="#1f2937"/>
        <line x1="16" y1="11" x2="16" y2="4" stroke="#1f2937" stroke-width="1.2"/>
        <line x1="20" y1="14" x2="27" y2="12" stroke="#1f2937" stroke-width="1.2"/>
        <line x1="18.5" y1="19" x2="24" y2="25" stroke="#1f2937" stroke-width="1.2"/>
        <line x1="13.5" y1="19" x2="8" y2="25" stroke="#1f2937" stroke-width="1.2"/>
        <line x1="12" y1="14" x2="5" y2="12" stroke="#1f2937" stroke-width="1.2"/>
      </svg>`;
    },

    // 22. التقويم 3D (Calendar Bookings)
    calendar: (s = 24) => {
      const gC1 = uid('cal1');
      const gC2 = uid('cal2');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gC1}" x1="16" y1="4" x2="16" y2="11" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#34d399"/>
            <stop offset="100%" stop-color="#059669"/>
          </linearGradient>
          <linearGradient id="${gC2}" x1="16" y1="11" x2="16" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="100%" stop-color="#f3f4f6"/>
          </linearGradient>
        </defs>
        <rect x="4" y="6" width="24" height="22" rx="4" fill="url(#${gC2})" stroke="#e5e7eb" stroke-width="1"/>
        <path d="M4 10C4 7.8 5.8 6 8 6H24C26.2 6 28 7.8 28 10V12H4V10Z" fill="url(#${gC1})"/>
        <rect x="9" y="3.5" width="2.5" height="5" rx="1.25" fill="#fde047"/>
        <rect x="20.5" y="3.5" width="2.5" height="5" rx="1.25" fill="#fde047"/>
        <circle cx="10" cy="17" r="1.5" fill="#10b981"/>
        <circle cx="16" cy="17" r="1.5" fill="#10b981"/>
        <circle cx="22" cy="17" r="1.5" fill="#9ca3af"/>
        <circle cx="10" cy="22" r="1.5" fill="#9ca3af"/>
        <circle cx="16" cy="22" r="1.5" fill="#3b82f6"/>
        <circle cx="22" cy="22" r="1.5" fill="#10b981"/>
      </svg>`;
    },

    // 23. الإيرادات / المال 3D (Revenue KPI / Dollar Stack)
    revenue: (s = 24) => {
      const gR = uid('rev');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gR}" x1="16" y1="4" x2="16" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="35%" stop-color="#fbbf24"/>
            <stop offset="75%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#b45309"/>
          </linearGradient>
        </defs>
        <ellipse cx="16" cy="23" rx="11" ry="4.5" fill="#b45309"/>
        <ellipse cx="16" cy="21" rx="11" ry="4.5" fill="url(#${gR})"/>
        <ellipse cx="16" cy="16" rx="11" ry="4.5" fill="#b45309"/>
        <ellipse cx="16" cy="14" rx="11" ry="4.5" fill="url(#${gR})"/>
        <ellipse cx="16" cy="9" rx="11" ry="4.5" fill="#b45309"/>
        <ellipse cx="16" cy="7" rx="11" ry="4.5" fill="url(#${gR})"/>
        <path d="M12 7C14 6 18 6 20 7" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round"/>
      </svg>`;
    },

    // 24. نسبة الإشغال / مقياس دائري 3D (Occupancy Gauge)
    occupancy: (s = 24) => {
      const gPie = uid('pie');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gPie}" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="50%" stop-color="#2563eb"/>
            <stop offset="100%" stop-color="#1d4ed8"/>
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="12" stroke="#e5e7eb" stroke-width="3" fill="none"/>
        <path d="M16 4A12 12 0 1 1 6.5 23.5L16 16Z" fill="url(#${gPie})"/>
        <circle cx="16" cy="16" r="4" fill="#ffffff"/>
      </svg>`;
    },

    // 25. حجز خارجي / هاتف 3D (Walk-in / Phone)
    phone: (s = 24) => {
      const gPh = uid('ph');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gPh}" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#34d399"/>
            <stop offset="50%" stop-color="#10b981"/>
            <stop offset="100%" stop-color="#047857"/>
          </linearGradient>
        </defs>
        <path d="M7 6C7 4.9 7.9 4 9 4H13C13.8 4 14.5 4.6 14.7 5.4L15.8 10C16 10.7 15.7 11.5 15.1 11.9L13.3 13.3C14.7 16.3 17 18.6 20 20L21.4 18.2C21.8 17.6 22.6 17.3 23.3 17.5L27.9 18.6C28.7 18.8 29.3 19.5 29.3 20.3V24.3C29.3 25.4 28.4 26.3 27.3 26.3C16.3 26.3 7 17 7 6Z" fill="url(#${gPh})"/>
        <path d="M10 7C10 6.5 10.5 6 11 6H13L14 9.5L12.5 10.5C11.5 9 10.5 8 10 7Z" fill="#a7f3d0" opacity="0.6"/>
      </svg>`;
    },

    // 26. التقارير والإحصائيات 3D (Reports Bar Chart)
    chart: (s = 24) => {
      const gB1 = uid('b1');
      const gB2 = uid('b2');
      const gB3 = uid('b3');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gB1}" x1="8" y1="14" x2="8" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#6ee7b7"/>
            <stop offset="100%" stop-color="#10b981"/>
          </linearGradient>
          <linearGradient id="${gB2}" x1="16" y1="8" x2="16" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#0284c7"/>
          </linearGradient>
          <linearGradient id="${gB3}" x1="24" y1="4" x2="24" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#fde047"/>
            <stop offset="100%" stop-color="#f59e0b"/>
          </linearGradient>
        </defs>
        <rect x="5" y="15" width="6" height="12" rx="2" fill="url(#${gB1})"/>
        <rect x="13" y="9" width="6" height="18" rx="2" fill="url(#${gB2})"/>
        <rect x="21" y="5" width="6" height="22" rx="2" fill="url(#${gB3})"/>
        <ellipse cx="8" cy="15" rx="3" ry="1.2" fill="#d1fae5"/>
        <ellipse cx="16" cy="9" rx="3" ry="1.2" fill="#e0f2fe"/>
        <ellipse cx="24" cy="5" rx="3" ry="1.2" fill="#fef9c3"/>
      </svg>`;
    },

    // 27. الموظفون / فريق العمل 3D (Staff / Members)
    staff: (s = 24) => {
      const gS = uid('stf');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gS}" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#a78bfa"/>
            <stop offset="50%" stop-color="#7c3aed"/>
            <stop offset="100%" stop-color="#5b21b6"/>
          </linearGradient>
        </defs>
        <rect x="6" y="5" width="20" height="23" rx="3.5" fill="url(#${gS})"/>
        <rect x="13" y="3.5" width="6" height="3" rx="1" fill="#fde047"/>
        <circle cx="16" cy="12" r="3.5" fill="#ffffff"/>
        <line x1="10" y1="19" x2="22" y2="19" stroke="#ddd6fe" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="12" y1="23" x2="20" y2="23" stroke="#ddd6fe" stroke-width="1.8" stroke-linecap="round"/>
      </svg>`;
    },

    // 28. العملاء 3D (Customers Group)
    customers: (s = 24) => {
      const gC = uid('cust');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gC}" x1="6" y1="6" x2="26" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="50%" stop-color="#0284c7"/>
            <stop offset="100%" stop-color="#0369a1"/>
          </linearGradient>
        </defs>
        <circle cx="21" cy="11" r="3.5" fill="#94a3b8"/>
        <path d="M17 24C17 21 19 19 22 19C25 19 27 21 27 24" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="12" cy="11" r="4.5" fill="url(#${gC})"/>
        <path d="M5 26C5 21.5 8 18.5 12 18.5C16 18.5 19 21.5 19 26" fill="url(#${gC})"/>
      </svg>`;
    },

    // 29. تحديث البيانات 3D (Refresh Arrows)
    refresh: (s = 20) => {
      const gRef = uid('ref');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gRef}" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#34d399"/>
            <stop offset="50%" stop-color="#10b981"/>
            <stop offset="100%" stop-color="#059669"/>
          </linearGradient>
        </defs>
        <path d="M26 16C26 21.5 21.5 26 16 26C11.5 26 7.6 23 6.4 19M6 16C6 10.5 10.5 6 16 6C20.5 6 24.4 9 25.6 13" stroke="url(#${gRef})" stroke-width="3" stroke-linecap="round"/>
        <polygon points="26,8 28,14 22,14" fill="#10b981"/>
        <polygon points="6,24 4,18 10,18" fill="#10b981"/>
      </svg>`;
    },

    // 30. تسجيل الخروج 3D (Door / Logout)
    door: (s = 22) => {
      const gD = uid('door');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gD}" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#f87171"/>
            <stop offset="50%" stop-color="#ef4444"/>
            <stop offset="100%" stop-color="#b91c1c"/>
          </linearGradient>
        </defs>
        <rect x="6" y="4" width="13" height="24" rx="2" stroke="#9ca3af" stroke-width="2" fill="none"/>
        <path d="M19 16H29M25 12L29 16L25 20" stroke="url(#${gD})" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    },
    // 31. مشاركة 3D (Share Icon)
    share: (s = 20) => {
      const gS = uid('share');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gS}" x1="6" y1="6" x2="26" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#34d399"/>
            <stop offset="50%" stop-color="#10b981"/>
            <stop offset="100%" stop-color="#047857"/>
          </linearGradient>
        </defs>
        <circle cx="23" cy="8" r="4" fill="url(#${gS})"/>
        <circle cx="8" cy="16" r="4" fill="url(#${gS})"/>
        <circle cx="23" cy="24" r="4" fill="url(#${gS})"/>
        <line x1="11.5" y1="14.5" x2="19.5" y2="9.5" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="11.5" y1="17.5" x2="19.5" y2="22.5" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"/>
      </svg>`;
    },

    // 32. بريد إلكتروني 3D (Mail / Envelope)
    mail: (s = 24) => {
      const gM = uid('mail');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gM}" x1="4" y1="6" x2="28" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#34d399"/>
            <stop offset="50%" stop-color="#10b981"/>
            <stop offset="100%" stop-color="#059669"/>
          </linearGradient>
        </defs>
        <rect x="4" y="7" width="24" height="18" rx="3.5" fill="url(#${gM})"/>
        <path d="M5.5 8.5L16 16.5L26.5 8.5" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
        <path d="M5.5 23.5L12 17M26.5 23.5L20 17" stroke="#a7f3d0" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
      </svg>`;
    },

    // 33. مسح الكاش / تنظيف 3D (Clean / Trash)
    trash: (s = 22) => {
      const gT = uid('trash');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gT}" x1="6" y1="6" x2="26" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#f87171"/>
            <stop offset="50%" stop-color="#ef4444"/>
            <stop offset="100%" stop-color="#b91c1c"/>
          </linearGradient>
        </defs>
        <rect x="8" y="11" width="16" height="16" rx="2.5" fill="url(#${gT})"/>
        <path d="M5 8H27M12 8V5C12 4.4 12.4 4 13 4H19C19.6 4 20 4.4 20 5V8" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="13" y1="14" x2="13" y2="22" stroke="#fee2e2" stroke-width="1.8" stroke-linecap="round" opacity="0.8"/>
        <line x1="19" y1="14" x2="19" y2="22" stroke="#fee2e2" stroke-width="1.8" stroke-linecap="round" opacity="0.8"/>
      </svg>`;
    },

    // 34. مدرج الملعب / الاستاد 3D (Stadium)
    stadium: (s = 24) => {
      const gSt = uid('stadium');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gSt}" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#34d399"/>
            <stop offset="40%" stop-color="#10b981"/>
            <stop offset="100%" stop-color="#047857"/>
          </linearGradient>
        </defs>
        <ellipse cx="16" cy="16" rx="13" ry="9" fill="url(#${gSt})"/>
        <ellipse cx="16" cy="16" rx="9" ry="5.5" fill="#064e3b"/>
        <line x1="16" y1="10.5" x2="16" y2="21.5" stroke="#ffffff" stroke-width="1" opacity="0.8"/>
        <ellipse cx="16" cy="16" rx="2.5" ry="1.8" stroke="#ffffff" stroke-width="1" fill="none" opacity="0.8"/>
        <path d="M7 10C10 7.5 22 7.5 25 10" stroke="#a7f3d0" stroke-width="1.2" fill="none" opacity="0.7"/>
      </svg>`;
    },

    // 35. بطاقة دفع إلكترونية 3D (Electronic Card)
    card: (s = 24) => {
      const gC = uid('card');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gC}" x1="4" y1="6" x2="28" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="50%" stop-color="#0284c7"/>
            <stop offset="100%" stop-color="#0369a1"/>
          </linearGradient>
        </defs>
        <rect x="3" y="7" width="26" height="18" rx="3.5" fill="url(#${gC})"/>
        <rect x="3" y="11" width="26" height="4" fill="#082f49"/>
        <rect x="6" y="18" width="5" height="3.5" rx="1" fill="#fbbf24"/>
      </svg>`;
    },
    // 36. الرئيسية 3D (Home)
    home: (s = 20) => {
      const gW = uid('homew');
      const gR = uid('homer');
      const gD = uid('homed');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gR}" x1="16" y1="3" x2="16" y2="17" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#34d399"/>
            <stop offset="40%" stop-color="#10b981"/>
            <stop offset="100%" stop-color="#059669"/>
          </linearGradient>
          <linearGradient id="${gW}" x1="16" y1="13" x2="16" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#047857"/>
            <stop offset="100%" stop-color="#064e3b"/>
          </linearGradient>
          <linearGradient id="${gD}" x1="16" y1="18" x2="16" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#a7f3d0"/>
            <stop offset="100%" stop-color="#6ee7b7"/>
          </linearGradient>
        </defs>
        <path d="M16 3.5L3.5 13.5C2.8 14 3.2 15 4 15H6V26.5C6 27.3 6.7 28 7.5 28H24.5C25.3 28 26 27.3 26 26.5V15H28C28.8 15 29.2 14 28.5 13.5L16 3.5Z" fill="url(#${gW})"/>
        <path d="M16 3.5L4 13.5H28L16 3.5Z" fill="url(#${gR})"/>
        <path d="M16 5.2L25.8 13.5H6.2L16 5.2Z" fill="#a7f3d0" opacity="0.35"/>
        <path d="M12.5 28V20C12.5 18.1 14.1 16.5 16 16.5C17.9 16.5 19.5 18.1 19.5 20V28H12.5Z" fill="url(#${gD})"/>
        <circle cx="16" cy="20.5" r="1.8" fill="#047857"/>
      </svg>`;
    },

    // 37. قائمة الحجوزات 3D (Clipboard)
    clipboard: (s = 20) => {
      const gC = uid('clip');
      const gP = uid('paper');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gC}" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#34d399"/>
            <stop offset="50%" stop-color="#10b981"/>
            <stop offset="100%" stop-color="#047857"/>
          </linearGradient>
          <linearGradient id="${gP}" x1="8" y1="8" x2="24" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="100%" stop-color="#e2e8f0"/>
          </linearGradient>
        </defs>
        <rect x="5" y="6" width="22" height="22" rx="4" fill="url(#${gC})"/>
        <rect x="8" y="9" width="16" height="17" rx="2" fill="url(#${gP})"/>
        <rect x="12" y="3" width="8" height="5" rx="1.5" fill="#047857"/>
        <line x1="11" y1="14" x2="21" y2="14" stroke="#059669" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="11" y1="18" x2="21" y2="18" stroke="#059669" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="11" y1="22" x2="17" y2="22" stroke="#059669" stroke-width="1.8" stroke-linecap="round"/>
      </svg>`;
    }

,

    // 31. الرئيسية 3D (Home Dashboard)
    home: (s = 24) => {
      const gH1 = uid('h1');
      const gH2 = uid('h2');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gH1}" x1="16" y1="3" x2="16" y2="17" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#34d399"/>
            <stop offset="40%" stop-color="#10b981"/>
            <stop offset="100%" stop-color="#059669"/>
          </linearGradient>
          <linearGradient id="${gH2}" x1="16" y1="13" x2="16" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#ecfdf5"/>
            <stop offset="100%" stop-color="#d1fae5"/>
          </linearGradient>
        </defs>
        <path d="M16 3L4 14H8V27C8 27.5 8.5 28 9 28H23C23.5 28 24 27.5 24 27V14H28L16 3Z" fill="url(#${gH1})"/>
        <path d="M13 28V19C13 18.5 13.5 18 14 18H18C18.5 18 19 18.5 19 19V28H13Z" fill="#047857"/>
      </svg>`;
    },

    // 32. الملاعب 3D (Fields Stadium)
    stadium: (s = 24) => {
      const gS = uid('stad');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gS}" x1="16" y1="5" x2="16" y2="27" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#34d399"/>
            <stop offset="45%" stop-color="#10b981"/>
            <stop offset="100%" stop-color="#047857"/>
          </linearGradient>
        </defs>
        <ellipse cx="16" cy="16" rx="13" ry="10" fill="url(#${gS})" stroke="#34d399" stroke-width="1.2"/>
        <ellipse cx="16" cy="16" rx="9" ry="6" fill="#059669" stroke="#ffffff" stroke-width="1"/>
        <line x1="16" y1="10" x2="16" y2="22" stroke="#ffffff" stroke-width="1"/>
        <circle cx="16" cy="16" r="2.5" stroke="#ffffff" stroke-width="1" fill="none"/>
      </svg>`;
    },

    // 33. أسعار وساعات العمل 3D (Pricing & Hours Tag)
    pricingTag: (s = 24) => {
      const gT = uid('tag');
      return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" class="svg-3d" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gT}" x1="6" y1="6" x2="26" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="40%" stop-color="#fbbf24"/>
            <stop offset="100%" stop-color="#d97706"/>
          </linearGradient>
        </defs>
        <path d="M15 4H7C5.3 4 4 5.3 4 7V15L17 28L28 17L15 4Z" fill="url(#${gT})"/>
        <circle cx="9" cy="9" r="2.2" fill="#ffffff"/>
      </svg>`;
    }
  };

  const MalaebiIcons3D = {
    render: (name, size, options = {}) => {
      if (typeof icons[name] === 'function') {
        return icons[name](size, options.filled !== undefined ? options.filled : true);
      }
      return '';
    },
    ...icons
  };

  global.MalaebiIcons3D = MalaebiIcons3D;
})(typeof window !== 'undefined' ? window : this);
