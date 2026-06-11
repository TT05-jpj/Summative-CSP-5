const PHONE_COUNTRIES = [
  { iso: 'US', name: 'United States',        dial: '1',   digits: 10 },
  { iso: 'CA', name: 'Canada',               dial: '1',   digits: 10 },
  { iso: 'GB', name: 'United Kingdom',       dial: '44',  digits: 10 },
  { iso: 'IE', name: 'Ireland',              dial: '353', digits: 9  },
  { iso: 'AU', name: 'Australia',            dial: '61',  digits: 9  },
  { iso: 'NZ', name: 'New Zealand',          dial: '64',  digits: 9  },
  { iso: 'IN', name: 'India',                dial: '91',  digits: 10 },
  { iso: 'PK', name: 'Pakistan',             dial: '92',  digits: 10 },
  { iso: 'PH', name: 'Philippines',          dial: '63',  digits: 10 },
  { iso: 'NG', name: 'Nigeria',              dial: '234', digits: 10 },
  { iso: 'ZA', name: 'South Africa',         dial: '27',  digits: 9  },
  { iso: 'KE', name: 'Kenya',                dial: '254', digits: 9  },
  { iso: 'EG', name: 'Egypt',                dial: '20',  digits: 10 },
  { iso: 'AE', name: 'United Arab Emirates', dial: '971', digits: 9  },
  { iso: 'DE', name: 'Germany',              dial: '49',  digits: 10 },
  { iso: 'FR', name: 'France',               dial: '33',  digits: 9  },
  { iso: 'ES', name: 'Spain',                dial: '34',  digits: 9  },
  { iso: 'IT', name: 'Italy',                dial: '39',  digits: 10 },
  { iso: 'NL', name: 'Netherlands',          dial: '31',  digits: 9  },
  { iso: 'PT', name: 'Portugal',             dial: '351', digits: 9  },
  { iso: 'MX', name: 'Mexico',               dial: '52',  digits: 10 },
  { iso: 'BR', name: 'Brazil',               dial: '55',  digits: 11 },
  { iso: 'JP', name: 'Japan',                dial: '81',  digits: 10 },
  { iso: 'KR', name: 'South Korea',          dial: '82',  digits: 10 },
  { iso: 'CN', name: 'China',                dial: '86',  digits: 11 },
];

function getPhoneCountry(iso) {
  return PHONE_COUNTRIES.find(c => c.iso === iso) || PHONE_COUNTRIES[0];
}

function formatPhoneDigits(digits) {
  const groups = [];
  let i = 0;
  while (digits.length - i > 4) {
    groups.push(digits.slice(i, i + 3));
    i += 3;
  }
  groups.push(digits.slice(i));
  return groups.join('-');
}

function setupPhoneInput(countrySelect, numberInput, defaultIso = 'US') {
  countrySelect.innerHTML = PHONE_COUNTRIES.map(c =>
    `<option value="${c.iso}"${c.iso === defaultIso ? ' selected' : ''}>${c.name} (+${c.dial})</option>`
  ).join('');

  function reformat() {
    const country = getPhoneCountry(countrySelect.value);
    const digits = numberInput.value.replace(/\D/g, '').slice(0, country.digits);
    numberInput.value = formatPhoneDigits(digits);
    numberInput.placeholder = formatPhoneDigits('0'.repeat(country.digits)).replace(/0/g, 'X');
  }

  numberInput.addEventListener('input', reformat);
  countrySelect.addEventListener('change', reformat);
  reformat();
}

function getPhoneDigits(numberInput) {
  return numberInput.value.replace(/\D/g, '');
}

function isPhoneValid(countrySelect, numberInput) {
  return getPhoneDigits(numberInput).length === getPhoneCountry(countrySelect.value).digits;
}

function getFullPhone(countrySelect, numberInput) {
  const country = getPhoneCountry(countrySelect.value);
  return `+${country.dial}${getPhoneDigits(numberInput)}`;
}

function splitFullPhone(fullPhone) {
  if (!fullPhone || fullPhone[0] !== '+') return null;
  const rest = fullPhone.slice(1);
  const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    if (rest.startsWith(c.dial) && rest.length === c.dial.length + c.digits) {
      return { iso: c.iso, digits: rest.slice(c.dial.length) };
    }
  }
  return null;
}

function formatFullPhone(fullPhone) {
  const split = splitFullPhone(fullPhone);
  if (!split) return fullPhone || '';
  const country = getPhoneCountry(split.iso);
  return `+${country.dial} ${formatPhoneDigits(split.digits)}`;
}

const PHONE_KEY_SECRET = 'A-TEN-phone-key-v1';

async function getPhoneCryptoKey() {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(PHONE_KEY_SECRET));
  return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encryptPhone(plainText) {
  if (!plainText) return '';
  const key = await getPhoneCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plainText));
  const ivB64 = btoa(String.fromCharCode(...iv));
  const cipherB64 = btoa(String.fromCharCode(...new Uint8Array(cipherBuf)));
  return `${ivB64}:${cipherB64}`;
}

async function decryptPhone(encrypted) {
  if (!encrypted || !encrypted.includes(':')) return '';
  try {
    const [ivB64, cipherB64] = encrypted.split(':');
    const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
    const cipherBytes = Uint8Array.from(atob(cipherB64), c => c.charCodeAt(0));
    const key = await getPhoneCryptoKey();
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBytes);
    return new TextDecoder().decode(plainBuf);
  } catch {
    return '';
  }
}
