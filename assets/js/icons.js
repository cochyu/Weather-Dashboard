/* 天穹天气 · 图标库（内联 SVG，无外部依赖） */

const UI_ICONS = {
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.2 4.2"/>',
  locate: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.4l6.1-.9L12 3Z"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5L3 9"/><path d="M3 4v5h5"/><path d="M4 13a8 8 0 0 0 14.6 4.5L21 15"/><path d="M21 20v-5h-5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v0a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z"/>',
  send: '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',
  github: '<path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.8c.85 0 1.71.11 2.51.34 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/>',
  droplet: '<path d="M12 2.7S5.5 9.8 5.5 14.2a6.5 6.5 0 0 0 13 0C18.5 9.8 12 2.7 12 2.7Z"/>',
  wind: '<path d="M3 8h11.2a2.8 2.8 0 1 0-2.8-2.8"/><path d="M3 12h15.2a2.8 2.8 0 1 1-2.8 2.8"/><path d="M3 16h7.5a2.5 2.5 0 1 1-2.5 2.5"/>',
  gauge: '<path d="M4.2 18a9 9 0 1 1 15.6 0"/><path d="m12 14 4.2-4.2"/><circle cx="12" cy="14" r="1.6" fill="currentColor" stroke="none"/>',
  eye: '<path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.8"/>',
  cloud: '<path d="M6.5 18a4.5 4.5 0 0 1-.4-8.98A6 6 0 0 1 17.7 9.5 4.25 4.25 0 0 1 17.75 18H6.5Z"/>',
  sunrise: '<path d="M4 18h16"/><path d="M7 18a5 5 0 0 1 10 0"/><path d="M12 3v4M5.6 6.6l2.1 2.1M3 13h3M18 13h3M16.3 8.7l2.1-2.1"/>',
  sunset: '<path d="M4 18h16"/><path d="M7 18a5 5 0 0 1 10 0"/><path d="M12 7V3M5.6 9.4l2.1-2.1M3 13h3M18 13h3M16.3 7.3l2.1 2.1"/>',
  sparkles: '<path d="m12 3 1.3 4.2L17.5 8.5l-4.2 1.3L12 14l-1.3-4.2-4.2-1.3 4.2-1.3L12 3Z"/><path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z"/><path d="m5 15 .5 1.5L7 17l-1.5.5L5 19l-.5-1.5L3 17l1.5-.5L5 15Z"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  chevron: '<path d="m8 10 4 4 4-4"/>',
  arrow: '<path d="M5 12h14"/><path d="m14 7 5 5-5 5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8-8M16 4l4 4M14 6l4 4"/>',
  server: '<rect x="3.5" y="4" width="17" height="6" rx="2"/><rect x="3.5" y="14" width="17" height="6" rx="2"/><path d="M7 7h.01M7 17h.01"/>',
  check: '<path d="m5 12 4.5 4.5L19 7"/>',
  alert: '<path d="M12 3 2.7 20h18.6L12 3Z"/><path d="M12 9v5M12 17h.01"/>',
  thermometer: '<path d="M10 14.5V5.5a2 2 0 1 1 4 0v9a4 4 0 1 1-4 0Z"/><path d="M12 10v6"/>',
  umbrella: '<path d="M3 12a9 9 0 0 1 18 0H3Z"/><path d="M12 12v6a2 2 0 0 0 4 0"/>',
  activity: '<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
};

export function uiIcon(name, className = '') {
  const paths = UI_ICONS[name] || UI_ICONS.info;
  const isFilled = name === 'github';
  return `<svg class="ui-icon ${className}" viewBox="0 0 24 24" aria-hidden="true" ${
    isFilled
      ? 'fill="currentColor" stroke="none"'
      : 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"'
  }>${paths}</svg>`;
}

/* ── 天气插画 ─────────────────────────────────────────────── */

let weatherIconSeq = 0;

function shell(kind, content, size) {
  return `<svg class="wi wi-${kind} wi-${size}" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${content}</svg>`;
}

const CLOUD_PATH = 'M36 87c-11 0-19-7.5-19-17s8-17 19-17c2.6-12 13.2-21 26-21 15 0 27 11 29 25.5 9.8 1.2 17 8.7 17 18.2 0 7-6 11.3-16 11.3H36Z';

function cloud(fill = 'url(#cloudGrad)', opacity = 1, transform = '') {
  return `<path d="${CLOUD_PATH}" fill="${fill}" opacity="${opacity}" ${transform ? `transform="${transform}"` : ''}/>`;
}

function sunCore(id, cx = 60, cy = 60, r = 24) {
  return `<circle cx="${cx}" cy="${cy}" r="${r + 12}" fill="url(#${id}Glow)" opacity=".55"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}Grad)"/>`;
}

function rays(cx = 60, cy = 60, inner = 34, outer = 45) {
  return `<g class="wi-rays" stroke="var(--icon-sun)" stroke-width="3.2" stroke-linecap="round" opacity=".9">
    <path d="M${cx} ${cy - inner}V${cy - outer}"/><path d="M${cx} ${cy + inner}V${cy + outer}"/>
    <path d="M${cx - inner} ${cy}H${cx - outer}"/><path d="M${cx + inner} ${cy}H${cx + outer}"/>
    <g transform="rotate(45 ${cx} ${cy})">
      <path d="M${cx} ${cy - inner}V${cy - outer}"/><path d="M${cx} ${cy + inner}V${cy + outer}"/>
      <path d="M${cx - inner} ${cy}H${cx - outer}"/><path d="M${cx + inner} ${cy}H${cx + outer}"/>
    </g>
  </g>`;
}

function defs(id, { sun = true, cloudColor = true } = {}) {
  return `<defs>
    ${sun ? `<radialGradient id="${id}Grad" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="#fff6cf"/><stop offset=".55" stop-color="#ffd166"/><stop offset="1" stop-color="#f59e0b"/></radialGradient><radialGradient id="${id}Glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffd166" stop-opacity=".55"/><stop offset="1" stop-color="#ffd166" stop-opacity="0"/></radialGradient>` : ''}
    ${cloudColor ? `<linearGradient id="${id}Cloud" x1="25" y1="35" x2="82" y2="95" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f4f8ff"/><stop offset=".55" stop-color="#cddcff"/><stop offset="1" stop-color="#8fa8da"/></linearGradient><linearGradient id="${id}CloudBack" x1="40" y1="30" x2="95" y2="85" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#a9bce6" stop-opacity=".85"/><stop offset="1" stop-color="#66779f" stop-opacity=".55"/></linearGradient>` : ''}
  </defs>`;
}

function drops(id) {
  return `<g class="wi-rain" stroke="url(#${id}Drop)" stroke-width="3.4" stroke-linecap="round">
    <path d="M42 94l-3 7"/><path d="M59 96l-3 7"/><path d="M76 94l-3 7"/>
    <path d="M50 101l-2.4 5.6" opacity=".55"/><path d="M68 102l-2.4 5.6" opacity=".55"/>
  </g>`;
}

function snow(id) {
  return `<g class="wi-snow" stroke="url(#${id}Drop)" stroke-width="2.4" stroke-linecap="round">
    <g transform="translate(40 96)"><path d="M0-5V5M-4.4-2.5 4.4 2.5M-4.4 2.5 4.4-2.5"/></g>
    <g transform="translate(60 101)"><path d="M0-5V5M-4.4-2.5 4.4 2.5M-4.4 2.5 4.4-2.5"/></g>
    <g transform="translate(80 95)"><path d="M0-5V5M-4.4-2.5 4.4 2.5M-4.4 2.5 4.4-2.5"/></g>
  </g>`;
}

function moon(id, cx = 62, cy = 57, scale = 1) {
  return `<g transform="translate(${cx} ${cy}) scale(${scale}) translate(-62 -57)">
    <circle cx="62" cy="57" r="33" fill="url(#${id}Glow)" opacity=".55"/>
    <path d="M73 31a29 29 0 1 0 17.5 51.5A31 31 0 0 1 73 31Z" fill="url(#${id}Moon)"/>
    <circle cx="42" cy="35" r="2" fill="#e0e7ff" class="wi-star"/><circle cx="90" cy="38" r="1.5" fill="#e0e7ff" class="wi-star"/>
    <circle cx="94" cy="78" r="1.8" fill="#e0e7ff" class="wi-star"/>
  </g>`;
}

function moonDefs(id) {
  return `<defs>
    <linearGradient id="${id}Moon" x1="50" y1="25" x2="90" y2="90" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#dbe3ff"/><stop offset="1" stop-color="#a5b4fc"/></linearGradient>
    <radialGradient id="${id}Glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#a5b4fc" stop-opacity=".6"/><stop offset="1" stop-color="#a5b4fc" stop-opacity="0"/></radialGradient>
  </defs>`;
}

export function weatherIcon(kind = 'cloudy', size = 'md') {
  const id = `wi${++weatherIconSeq}`;
  switch (kind) {
    case 'clear-day':
      return shell(kind, `${defs(id)}${rays()}${sunCore(id)}`, size);

    case 'clear-night':
      return shell(kind, `${moonDefs(id)}${moon(id)}`, size);

    case 'partly-day':
      return shell(kind, `${defs(id)}
        <g transform="translate(22 -8) scale(.76)">${rays(62, 52, 30, 40)}${sunCore(id, 62, 52, 21)}</g>
        ${cloud(`url(#${id}Cloud)`, 1, 'translate(6 12) scale(.9)')}
      `, size);

    case 'partly-night':
      return shell(kind, `${moonDefs(id)}${defs(id, { sun: false, cloudColor: true })}
        ${moon(id, 76, 42, 0.7)}
        ${cloud(`url(#${id}Cloud)`, 1, 'translate(2 18) scale(.86)')}
      `, size);

    case 'cloudy':
      return shell(kind, `${defs(id, { sun: false, cloudColor: true })}
        ${cloud(`url(#${id}CloudBack)`, 0.95, 'translate(22 -8) scale(.72)')}
        ${cloud(`url(#${id}Cloud)`, 1, 'translate(-2 12) scale(.92)')}
      `, size);

    case 'cloudy-night':
      return shell(kind, `${moonDefs(id)}${defs(id, { sun: false, cloudColor: true })}
        ${moon(id, 75, 38, 0.58)}
        ${cloud(`url(#${id}CloudBack)`, 0.9, 'translate(24 -4) scale(.68)')}
        ${cloud(`url(#${id}Cloud)`, 1, 'translate(-2 16) scale(.9)')}
      `, size);

    case 'rain':
      return shell(kind, `${defs(id, { sun: false, cloudColor: true })}
        <defs><linearGradient id="${id}Drop" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#8ce7ff"/><stop offset="1" stop-color="#3b82f6"/></linearGradient></defs>
        ${cloud(`url(#${id}Cloud)`, 1, 'translate(0 2)')}${drops(id)}
      `, size);

    case 'storm':
      return shell(kind, `${defs(id, { sun: false, cloudColor: true })}
        <defs><linearGradient id="${id}Drop" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#93c5fd"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs>
        ${cloud(`url(#${id}Cloud)`, 1, 'translate(0 0)')}
        <path class="wi-bolt" d="M64 72 50 94h11l-6 17 23-27H66l9-12H64Z" fill="#ffd166" stroke="#f59e0b" stroke-width="1.5" stroke-linejoin="round"/>
        <g stroke="url(#${id}Drop)" stroke-width="3" stroke-linecap="round">
          <path d="M35 96l-2.5 6" class="wi-drop"/><path d="M88 94l-2.5 6" class="wi-drop" style="animation-delay:.4s"/>
        </g>
      `, size);

    case 'snow':
      return shell(kind, `${defs(id, { sun: false, cloudColor: true })}
        <defs><linearGradient id="${id}Drop" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#bae6fd"/></linearGradient></defs>
        ${cloud(`url(#${id}Cloud)`, 1, 'translate(0 2)')}${snow(id)}
      `, size);

    case 'mist':
      return shell(kind, `${defs(id, { sun: false, cloudColor: true })}
        ${cloud(`url(#${id}CloudBack)`, 0.8, 'translate(12 0) scale(.86)')}
        <g class="wi-mist" stroke="#dbeafe" stroke-width="3" stroke-linecap="round" opacity=".75">
          <path d="M25 88h55"/><path d="M34 98h56"/><path d="M23 108h62"/>
        </g>
      `, size);

    default:
      return shell('cloudy', `${defs(id, { sun: false, cloudColor: true })}${cloud(`url(#${id}Cloud)`, 1)}`, size);
  }
}
