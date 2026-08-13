<script setup lang="ts">
import QRCode from 'qrcode';
import { useI18n } from 'vue-i18n';
import bankDirectory from './banks.json';
import { vietQrMessages } from './vietqr-bank-generator.i18n';
import {
  VIETQR_MAX_AMOUNT,
  VIETQR_MAX_DESCRIPTION_LENGTH,
  VIETQR_MAX_PAYER_NAME_LENGTH,
  type VietQrBank,
  bankSearchLabel,
  formatVietQrAmount,
  getVietQrDescriptionValidationError,
  isValidVietQrAccount,
  isValidVietQrAmount,
  makeVietQrContent,
  parseVietQrAmountInput,
  parseVietQrAmountTyping,
  sanitizeVietQrDescriptionInput,
  sanitizeVietQrPayerNameInput,
  validateVietQrInput,
} from './vietqr-bank-generator.service';
import type { CKeyValueListItems } from '@/ui/c-key-value-list/c-key-value-list.types';

const STORAGE_PREFIX = 'eplus-vietqr';
const COPYRIGHT_YEAR = new Date().getFullYear();
const SENSITIVE_STORAGE_KEYS = ['account', 'amount', 'content', 'payer'] as const;
const CANVAS_FONT_FAMILY = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Arial, sans-serif';
const CANVAS_MONO_FONT_FAMILY = 'ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace';
const DEFAULT_QR_FOREGROUND = '#111827';
const DEFAULT_QR_BACKGROUND = '#ffffff';
const DEFAULT_QR_MODULE_STYLE: QrModuleStyle = 'square';
const DEFAULT_QR_EYE_STYLE: QrEyeStyle = 'square';
const DEFAULT_QR_ERROR_CORRECTION: QrErrorCorrection = 'M';
const DEFAULT_QR_SIZE = 512;

const THEME_PRESETS = {
  purple: {
    label: 'Purple',
    swatch: 'linear-gradient(135deg, #8b5cf6, #60a5fa)',
    stageFrom: '#f7f5ff',
    stageMid: '#eef5ff',
    stageTo: '#faf5ff',
    glowLeft: 'rgba(167, 139, 250, 0.30)',
    glowRight: 'rgba(96, 165, 250, 0.25)',
    accentLeft: '#60a5fa',
    accentRight: '#a78bfa',
    shadow: 'rgba(99, 102, 241, 0.16)',
  },
  blue: {
    label: 'Blue',
    swatch: 'linear-gradient(135deg, #2563eb, #22d3ee)',
    stageFrom: '#f1f7ff',
    stageMid: '#eaf6ff',
    stageTo: '#f3fbff',
    glowLeft: 'rgba(59, 130, 246, 0.28)',
    glowRight: 'rgba(34, 211, 238, 0.24)',
    accentLeft: '#2563eb',
    accentRight: '#22d3ee',
    shadow: 'rgba(37, 99, 235, 0.15)',
  },
  emerald: {
    label: 'Emerald',
    swatch: 'linear-gradient(135deg, #10b981, #2dd4bf)',
    stageFrom: '#f0fdf8',
    stageMid: '#ecfdf5',
    stageTo: '#f0fdfa',
    glowLeft: 'rgba(16, 185, 129, 0.24)',
    glowRight: 'rgba(45, 212, 191, 0.22)',
    accentLeft: '#10b981',
    accentRight: '#2dd4bf',
    shadow: 'rgba(16, 185, 129, 0.14)',
  },
  rose: {
    label: 'Rose',
    swatch: 'linear-gradient(135deg, #f43f5e, #fb7185)',
    stageFrom: '#fff4f7',
    stageMid: '#fff1f5',
    stageTo: '#fff7f8',
    glowLeft: 'rgba(244, 63, 94, 0.22)',
    glowRight: 'rgba(251, 113, 133, 0.22)',
    accentLeft: '#f43f5e',
    accentRight: '#fb7185',
    shadow: 'rgba(244, 63, 94, 0.13)',
  },
  slate: {
    label: 'Slate',
    swatch: 'linear-gradient(135deg, #334155, #94a3b8)',
    stageFrom: '#f8fafc',
    stageMid: '#f1f5f9',
    stageTo: '#f8fafc',
    glowLeft: 'rgba(100, 116, 139, 0.20)',
    glowRight: 'rgba(148, 163, 184, 0.20)',
    accentLeft: '#475569',
    accentRight: '#94a3b8',
    shadow: 'rgba(51, 65, 85, 0.13)',
  },
} as const;

type ThemeName = keyof typeof THEME_PRESETS;
type CopyState = 'idle' | 'copied' | 'unsupported' | 'failed';
type QrModuleStyle = 'square' | 'rounded' | 'dots';
type QrEyeStyle = 'square' | 'rounded' | 'circle';
type QrErrorCorrection = 'L' | 'M' | 'Q' | 'H';

const { t, locale } = useI18n({
  useScope: 'local',
  messages: vietQrMessages,
});
const route = useRoute();
const router = useRouter();

const banks = [...bankDirectory.data]
  .sort((a, b) => a.shortName.localeCompare(b.shortName)) as VietQrBank[];

const selectedBankBin = ref('');
const accountNo = ref('');
const payerName = ref('');
const payerNameInput = computed({
  get: () => payerName.value,
  set: (value: string) => {
    payerName.value = sanitizeVietQrPayerNameInput(value);
  },
});
const amount = ref('');
const descriptionValue = ref('');
const description = ref('');
const descriptionInput = computed({
  get: () => descriptionValue.value,
  set: (value: string) => {
    descriptionValue.value = value.slice(0, VIETQR_MAX_DESCRIPTION_LENGTH);
    scheduleDescriptionNormalization();
  },
});
const qrDataUrl = ref('');
const qrRendering = ref(false);
const copyState = ref<CopyState>('idle');
const selectedTheme = ref<ThemeName>('purple');
const qrForeground = ref(DEFAULT_QR_FOREGROUND);
const qrBackground = ref(DEFAULT_QR_BACKGROUND);
const qrModuleStyle = ref<QrModuleStyle>(DEFAULT_QR_MODULE_STYLE);
const qrEyeStyle = ref<QrEyeStyle>(DEFAULT_QR_EYE_STYLE);
const qrErrorCorrection = ref<QrErrorCorrection>(DEFAULT_QR_ERROR_CORRECTION);
const qrSize = ref(DEFAULT_QR_SIZE);
const qrCenterLogo = ref(false);
const shareImageBlob = shallowRef<Blob | null>(null);
const shareImageObjectUrl = ref('');
const shareImageRendering = ref(false);
let shareImageRenderId = 0;
let qrRenderId = 0;
let urlSyncReady = false;
let urlSyncTimer: number | undefined;
let descriptionNormalizeTimer: number | undefined;
let shareImageRefreshTimer: number | undefined;
const DESCRIPTION_NORMALIZE_DELAY_MS = 600;
const SHARE_IMAGE_REFRESH_DELAY_MS = 180;

const themeOptions = Object.entries(THEME_PRESETS).map(([value, theme]) => ({
  value: value as ThemeName,
  label: theme.label,
  swatch: theme.swatch,
}));

const activeTheme = computed(() => THEME_PRESETS[selectedTheme.value]);
const themeStyle = computed(() => ({
  '--theme-from': activeTheme.value.stageFrom,
  '--theme-mid': activeTheme.value.stageMid,
  '--theme-to': activeTheme.value.stageTo,
  '--theme-glow-left': activeTheme.value.glowLeft,
  '--theme-glow-right': activeTheme.value.glowRight,
  '--theme-accent-left': activeTheme.value.accentLeft,
  '--theme-accent-right': activeTheme.value.accentRight,
  '--theme-shadow': activeTheme.value.shadow,
}));

const bankOptions = computed(() => banks.map(bank => ({
  label: `${bankSearchLabel(bank)}${bank.transferSupported ? '' : ` · ${t('unavailableSuffix')}`}`,
  value: bank.bin,
})));

const selectedBank = computed(() => banks.find(bank => bank.bin === selectedBankBin.value));

const selectedBankInfo = computed<CKeyValueListItems>(() => {
  if (!selectedBank.value) {
    return [];
  }

  const bank = selectedBank.value;
  return [
    { label: t('bankName'), value: bank.name },
    { label: t('shortName'), value: bank.shortName },
    { label: t('bin'), value: bank.bin },
    { label: t('napasCode'), value: bank.code },
    { label: t('swiftBic'), value: bank.swift_code || t('notPublished') },
    { label: t('supported'), value: Boolean(bank.transferSupported), showCopyButton: false },
  ];
});

const formattedAmount = computed({
  get: () => formatVietQrAmount(amount.value, locale.value),
  set: (value: string) => {
    amount.value = parseVietQrAmountTyping(value);
  },
});

const formattedMaximumAmount = computed(() => `${formatVietQrAmount(VIETQR_MAX_AMOUNT, locale.value)} ₫`);
const isVietnameseLocale = computed(() => locale.value.toLowerCase().startsWith('vi'));
const amountPlaceholder = computed(() => isVietnameseLocale.value
  ? `Không bắt buộc · tối đa ${formattedMaximumAmount.value}`
  : t('amountPlaceholder'));
const amountValidationMessage = computed(() => isVietnameseLocale.value
  ? `Số tiền phải là số nguyên VND dương, tối đa ${formattedMaximumAmount.value}.`
  : t('validation.amount'));
const payerNameCharacterCount = computed(() => payerName.value.length);
const previewPayerName = computed(() => payerName.value.trim());
const descriptionCharacterCount = computed(() => descriptionValue.value.length);

const validation = computed(() => {
  const result = validateVietQrInput({
    bankId: selectedBankBin.value,
    accountNo: accountNo.value,
    amount: amount.value,
    description: description.value,
  });

  if (selectedBankBin.value && !selectedBank.value && !result.errors.includes('chooseBank')) {
    return {
      valid: false,
      errors: ['chooseBank', ...result.errors] as typeof result.errors,
    };
  }

  return result;
});

const localizedValidationErrors = computed(() => validation.value.errors.map((error) => {
  if (error === 'amount') {
    return amountValidationMessage.value;
  }

  return t(`validation.${error}`);
}));

const accountValidationRules = computed(() => [{
  message: t('validation.account'),
  validator: (value: string) => !value.trim() || isValidVietQrAccount(value),
}]);

const amountValidationRules = computed(() => [{
  message: amountValidationMessage.value,
  validator: (value: string) => !value.trim() || isValidVietQrAmount(value),
}]);

const descriptionValidationRules = computed(() => [
  {
    message: t('validation.contentCharset'),
    validator: (value: string) => getVietQrDescriptionValidationError(sanitizeVietQrDescriptionInput(value)) !== 'contentCharset',
  },
  {
    message: t('validation.contentLength'),
    validator: (value: string) => getVietQrDescriptionValidationError(sanitizeVietQrDescriptionInput(value)) !== 'contentLength',
  },
]);

const qrPayload = computed(() => {
  if (!selectedBank.value?.transferSupported) {
    return '';
  }

  return makeVietQrContent({
    bankId: selectedBankBin.value,
    accountNo: accountNo.value,
    amount: amount.value,
    description: description.value,
  });
});

const previewAmount = computed(() => {
  if (!amount.value) {
    return t('notSpecified');
  }

  return `${new Intl.NumberFormat(locale.value).format(Number(amount.value))} ₫`;
});

const previewDescription = computed(() => description.value || t('notSpecified'));
const copyStatusLabel = computed(() => t(`copy.${copyState.value}`));
const shareFileName = computed(() => `vietqr-${selectedBank.value?.shortName || selectedBankBin.value}-${accountNo.value}.png`);

function firstQueryValue(value: unknown) {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : '';
  }
  return typeof value === 'string' ? value : '';
}

function queryValue(...keys: string[]) {
  for (const key of keys) {
    const value = firstQueryValue(route.query[key]);
    if (value) {
      return value;
    }
  }
  return '';
}

function resolveBankParameter(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return '';
  }

  const bank = banks.find(candidate => [
    candidate.bin,
    candidate.code,
    candidate.shortName,
    candidate.swift_code,
  ].some(identifier => identifier?.toLowerCase() === normalized));

  return bank?.bin ?? '';
}

function applyUrlParameters() {
  const bankParam = queryValue('bank', 'bin', 'bankId');
  const accountParam = queryValue('account', 'accountNo');
  const payerParam = queryValue('payer', 'payerName', 'sender');
  const amountParam = queryValue('amount');
  const contentParam = queryValue('content', 'description');
  const themeParam = queryValue('theme').toLowerCase();
  const qrColorParam = queryValue('qrColor');
  const qrBgParam = queryValue('qrBg');
  const qrStyleParam = queryValue('qrStyle');
  const eyeStyleParam = queryValue('eyeStyle');
  const eccParam = queryValue('ecc').toUpperCase();
  const qrSizeParam = Number(queryValue('qrSize'));
  const logoParam = queryValue('logo');

  if (bankParam) {
    selectedBankBin.value = resolveBankParameter(bankParam);
  }

  if (accountParam) {
    // Preserve invalid values so the field validator can show the actual error.
    accountNo.value = accountParam.trim();
  }

  if (payerParam) {
    payerName.value = sanitizeVietQrPayerNameInput(payerParam.trim());
  }

  if (amountParam) {
    // Shared URL values stay strict so malformed amounts are never silently repaired.
    amount.value = parseVietQrAmountInput(amountParam);
  }

  if (contentParam) {
    setDescriptionFromExternal(contentParam.trim());
  }

  if (themeParam) {
    selectedTheme.value = themeParam in THEME_PRESETS
      ? themeParam as ThemeName
      : 'purple';
  }
  if (/^#[0-9a-f]{6}$/i.test(qrColorParam)) {
    qrForeground.value = qrColorParam.toLowerCase();
  }
  if (/^#[0-9a-f]{6}$/i.test(qrBgParam)) {
    qrBackground.value = qrBgParam.toLowerCase();
  }
  if (['square', 'rounded', 'dots'].includes(qrStyleParam)) {
    qrModuleStyle.value = qrStyleParam as QrModuleStyle;
  }
  if (['square', 'rounded', 'circle'].includes(eyeStyleParam)) {
    qrEyeStyle.value = eyeStyleParam as QrEyeStyle;
  }
  if (['L', 'M', 'Q', 'H'].includes(eccParam)) {
    qrErrorCorrection.value = eccParam as QrErrorCorrection;
  }
  if (Number.isFinite(qrSizeParam) && qrSizeParam >= 256 && qrSizeParam <= 1024) {
    qrSize.value = Math.round(qrSizeParam / 64) * 64;
  }
  if (logoParam) {
    qrCenterLogo.value = logoParam === '1';
  }
}

function makeFormQuery() {
  const query = { ...route.query };
  for (const key of ['bank', 'bin', 'bankId', 'account', 'accountNo', 'payer', 'payerName', 'sender', 'amount', 'content', 'description', 'theme', 'qrColor', 'qrBg', 'qrStyle', 'eyeStyle', 'ecc', 'qrSize', 'logo']) {
    delete query[key];
  }

  if (selectedBankBin.value) {
    query.bank = selectedBankBin.value;
  }
  if (accountNo.value) {
    query.account = accountNo.value;
  }
  if (previewPayerName.value) {
    query.payer = previewPayerName.value;
  }
  if (amount.value) {
    query.amount = amount.value;
  }
  if (description.value) {
    query.content = description.value;
  }
  if (selectedTheme.value !== 'purple') {
    query.theme = selectedTheme.value;
  }
  if (qrForeground.value !== DEFAULT_QR_FOREGROUND) {
    query.qrColor = qrForeground.value;
  }
  if (qrBackground.value !== DEFAULT_QR_BACKGROUND) {
    query.qrBg = qrBackground.value;
  }
  if (qrModuleStyle.value !== DEFAULT_QR_MODULE_STYLE) {
    query.qrStyle = qrModuleStyle.value;
  }
  if (qrEyeStyle.value !== DEFAULT_QR_EYE_STYLE) {
    query.eyeStyle = qrEyeStyle.value;
  }
  if (qrErrorCorrection.value !== DEFAULT_QR_ERROR_CORRECTION) {
    query.ecc = qrErrorCorrection.value;
  }
  if (qrSize.value !== DEFAULT_QR_SIZE) {
    query.qrSize = String(qrSize.value);
  }
  if (qrCenterLogo.value) {
    query.logo = '1';
  }

  return query;
}

async function syncFormToUrl() {
  if (!urlSyncReady) {
    return;
  }

  const location = {
    path: route.path,
    query: makeFormQuery(),
    hash: route.hash,
  };
  if (router.resolve(location).fullPath === route.fullPath) {
    return;
  }

  await router.replace(location);
}

function scheduleUrlSync() {
  if (!urlSyncReady || typeof window === 'undefined') {
    return;
  }

  if (urlSyncTimer !== undefined) {
    window.clearTimeout(urlSyncTimer);
  }
  urlSyncTimer = window.setTimeout(() => {
    syncFormToUrl();
  }, 120);
}

function clearDescriptionNormalizeTimer() {
  if (descriptionNormalizeTimer !== undefined && typeof window !== 'undefined') {
    window.clearTimeout(descriptionNormalizeTimer);
    descriptionNormalizeTimer = undefined;
  }
}

function commitDescriptionInput() {
  clearDescriptionNormalizeTimer();
  const sanitized = sanitizeVietQrDescriptionInput(descriptionValue.value);
  descriptionValue.value = sanitized;
  description.value = sanitized;
}

function scheduleDescriptionNormalization() {
  if (typeof window === 'undefined') {
    const sanitized = sanitizeVietQrDescriptionInput(descriptionValue.value);
    descriptionValue.value = sanitized;
    description.value = sanitized;
    return;
  }

  clearDescriptionNormalizeTimer();
  descriptionNormalizeTimer = window.setTimeout(() => {
    commitDescriptionInput();
  }, DESCRIPTION_NORMALIZE_DELAY_MS);
}

function setDescriptionFromExternal(value: string) {
  clearDescriptionNormalizeTimer();
  const sanitized = sanitizeVietQrDescriptionInput(value);
  descriptionValue.value = sanitized;
  description.value = sanitized;
}

function isFinderModule(row: number, column: number, moduleCount: number) {
  return (row < 7 && column < 7)
    || (row < 7 && column >= moduleCount - 7)
    || (row >= moduleCount - 7 && column < 7);
}

function drawQrModule(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  moduleSize: number,
  style: QrModuleStyle,
) {
  context.fillStyle = qrForeground.value;
  if (style === 'square') {
    context.fillRect(x, y, moduleSize + 0.05, moduleSize + 0.05);
    return;
  }

  const inset = style === 'dots' ? moduleSize * 0.12 : moduleSize * 0.06;
  const size = moduleSize - inset * 2;
  if (style === 'dots') {
    context.beginPath();
    context.arc(x + moduleSize / 2, y + moduleSize / 2, size / 2, 0, Math.PI * 2);
    context.fill();
    return;
  }

  fillRoundedRect(context, x + inset, y + inset, size, size, moduleSize * 0.28, qrForeground.value);
}

function drawQrEye(
  context: CanvasRenderingContext2D,
  startRow: number,
  startColumn: number,
  moduleSize: number,
  margin: number,
) {
  const x = (margin + startColumn) * moduleSize;
  const y = (margin + startRow) * moduleSize;
  const outer = moduleSize * 7;
  const middle = moduleSize * 5;
  const center = moduleSize * 3;
  let outerRadius = 0;
  if (qrEyeStyle.value === 'rounded') {
    outerRadius = moduleSize * 1.6;
  }
  else if (qrEyeStyle.value === 'circle') {
    outerRadius = outer / 2;
  }

  if (outerRadius === 0) {
    context.fillStyle = qrForeground.value;
    context.fillRect(x, y, outer, outer);
    context.fillStyle = qrBackground.value;
    context.fillRect(x + moduleSize, y + moduleSize, middle, middle);
    context.fillStyle = qrForeground.value;
    context.fillRect(x + moduleSize * 2, y + moduleSize * 2, center, center);
    return;
  }

  fillRoundedRect(context, x, y, outer, outer, outerRadius, qrForeground.value);
  fillRoundedRect(context, x + moduleSize, y + moduleSize, middle, middle, Math.max(moduleSize, outerRadius - moduleSize), qrBackground.value);
  const centerRadius = qrEyeStyle.value === 'circle' ? center / 2 : moduleSize * 0.8;
  fillRoundedRect(context, x + moduleSize * 2, y + moduleSize * 2, center, center, centerRadius, qrForeground.value);
}

async function renderStyledQr(payload: string) {
  const generated = QRCode.create(payload, { errorCorrectionLevel: qrErrorCorrection.value });
  const moduleCount = generated.modules.size;
  const margin = 4;
  const canvas = document.createElement('canvas');
  canvas.width = qrSize.value;
  canvas.height = qrSize.value;
  const context = canvas.getContext('2d');
  if (!context) {
    return '';
  }

  context.imageSmoothingEnabled = false;
  context.fillStyle = qrBackground.value;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const moduleSize = canvas.width / (moduleCount + margin * 2);

  for (let row = 0; row < moduleCount; row += 1) {
    for (let column = 0; column < moduleCount; column += 1) {
      if (isFinderModule(row, column, moduleCount)) {
        continue;
      }
      if (!generated.modules.data[row * moduleCount + column]) {
        continue;
      }
      drawQrModule(
        context,
        (margin + column) * moduleSize,
        (margin + row) * moduleSize,
        moduleSize,
        qrModuleStyle.value,
      );
    }
  }

  drawQrEye(context, 0, 0, moduleSize, margin);
  drawQrEye(context, 0, moduleCount - 7, moduleSize, margin);
  drawQrEye(context, moduleCount - 7, 0, moduleSize, margin);

  if (qrCenterLogo.value && selectedBank.value?.logo) {
    const logo = await loadImage(selectedBank.value.logo).catch(() => null);
    if (logo) {
      const logoBoxSize = canvas.width * 0.18;
      const logoSize = logoBoxSize * 0.74;
      fillRoundedRect(
        context,
        (canvas.width - logoBoxSize) / 2,
        (canvas.height - logoBoxSize) / 2,
        logoBoxSize,
        logoBoxSize,
        logoBoxSize * 0.22,
        qrBackground.value,
      );
      drawContainImage(
        context,
        logo,
        (canvas.width - logoSize) / 2,
        (canvas.height - logoSize) / 2,
        logoSize,
        logoSize,
      );
    }
  }

  return canvas.toDataURL('image/png');
}

watch(
  [qrPayload, qrForeground, qrBackground, qrModuleStyle, qrEyeStyle, qrErrorCorrection, qrSize, qrCenterLogo],
  async ([payload]) => {
    const renderId = ++qrRenderId;

    // Any QR payload/design change makes the current exported image stale
    // immediately. Invalidate in-flight exports before awaiting QR work so
    // stale PNGs can never become visible/copyable during a slow render.
    shareImageRenderId += 1;
    shareImageRendering.value = true;
    qrRendering.value = true;

    if (!payload) {
      qrDataUrl.value = '';
      qrRendering.value = false;
      await refreshShareImage();
      return;
    }

    try {
      const rendered = await renderStyledQr(payload);
      if (renderId === qrRenderId) {
        qrDataUrl.value = rendered;
      }
    }
    catch {
      if (renderId === qrRenderId) {
        qrDataUrl.value = '';
      }
    }
    finally {
      if (renderId === qrRenderId) {
        qrRendering.value = false;
      }
    }
  },
  { immediate: true },
);

watch(selectedBankBin, (value) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (value) {
    window.localStorage.setItem(`${STORAGE_PREFIX}:bank`, value);
  }
  else {
    window.localStorage.removeItem(`${STORAGE_PREFIX}:bank`);
  }
});

watch(selectedTheme, (value) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(`${STORAGE_PREFIX}:theme`, value);
  }
});

watch(() => route.query, () => {
  applyUrlParameters();
}, { deep: true });

watch(
  [
    selectedBankBin,
    accountNo,
    payerName,
    amount,
    description,
    selectedTheme,
    qrForeground,
    qrBackground,
    qrModuleStyle,
    qrEyeStyle,
    qrErrorCorrection,
    qrSize,
    qrCenterLogo,
  ],
  scheduleUrlSync,
);

function clearSensitiveStorage() {
  for (const key of SENSITIVE_STORAGE_KEYS) {
    window.localStorage.removeItem(`${STORAGE_PREFIX}:${key}`);
  }
}

function restoreForm() {
  selectedBankBin.value = window.localStorage.getItem(`${STORAGE_PREFIX}:bank`) ?? '';
  const storedTheme = window.localStorage.getItem(`${STORAGE_PREFIX}:theme`);
  if (storedTheme && storedTheme in THEME_PRESETS) {
    selectedTheme.value = storedTheme as ThemeName;
  }
  clearSensitiveStorage();
}

function resetForm() {
  selectedBankBin.value = '';
  accountNo.value = '';
  payerName.value = '';
  amount.value = '';
  setDescriptionFromExternal('');

  window.localStorage.removeItem(`${STORAGE_PREFIX}:bank`);
  clearSensitiveStorage();
}
function resetDesign() {
  qrForeground.value = DEFAULT_QR_FOREGROUND;
  qrBackground.value = DEFAULT_QR_BACKGROUND;
  qrModuleStyle.value = DEFAULT_QR_MODULE_STYLE;
  qrEyeStyle.value = DEFAULT_QR_EYE_STYLE;
  qrErrorCorrection.value = DEFAULT_QR_ERROR_CORRECTION;
  qrSize.value = DEFAULT_QR_SIZE;
  qrCenterLogo.value = false;
}

function loadImage(source: string, crossOrigin = false) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    if (crossOrigin) {
      image.crossOrigin = 'anonymous';
    }
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function fillRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string | CanvasGradient,
) {
  roundedRect(context, x, y, width, height, radius);
  context.fillStyle = fill;
  context.fill();
}

function drawContainImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

function drawShareRow(
  context: CanvasRenderingContext2D,
  label: string,
  value: string,
  y: number,
  emphasize = false,
) {
  context.textAlign = 'left';
  context.fillStyle = '#667085';
  context.font = `500 14px ${CANVAS_FONT_FAMILY}`;
  context.fillText(label, 150, y);

  context.textAlign = 'right';
  context.fillStyle = '#101828';
  context.font = `${emphasize ? '700 20px' : '600 16px'} ${CANVAS_FONT_FAMILY}`;
  context.fillText(value, 750, y, 410);
}

function drawQrGuides(context: CanvasRenderingContext2D, theme: typeof THEME_PRESETS[ThemeName]) {
  const left = 150;
  const top = 267;
  const right = 750;
  const bottom = 867;
  const length = 54;
  const radius = 16;

  context.save();
  context.lineWidth = 7;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  context.strokeStyle = theme.accentLeft;
  context.beginPath();
  context.moveTo(left + length, top);
  context.lineTo(left + radius, top);
  context.quadraticCurveTo(left, top, left, top + radius);
  context.lineTo(left, top + length);
  context.stroke();
  context.beginPath();
  context.moveTo(left, bottom - length);
  context.lineTo(left, bottom - radius);
  context.quadraticCurveTo(left, bottom, left + radius, bottom);
  context.lineTo(left + length, bottom);
  context.stroke();

  context.strokeStyle = theme.accentRight;
  context.beginPath();
  context.moveTo(right - length, top);
  context.lineTo(right - radius, top);
  context.quadraticCurveTo(right, top, right, top + radius);
  context.lineTo(right, top + length);
  context.stroke();
  context.beginPath();
  context.moveTo(right, bottom - length);
  context.lineTo(right, bottom - radius);
  context.quadraticCurveTo(right, bottom, right - radius, bottom);
  context.lineTo(right - length, bottom);
  context.stroke();

  context.restore();
}

function drawStageDecorations(context: CanvasRenderingContext2D, theme: typeof THEME_PRESETS[ThemeName]) {
  context.save();

  context.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  context.lineWidth = 2;
  for (const radius of [90, 126, 166, 210]) {
    context.globalAlpha = radius === 90 ? 0.8 : 0.35;
    context.beginPath();
    context.arc(845, 260, radius, 0, Math.PI * 2);
    context.stroke();
  }

  context.globalAlpha = 0.28;
  context.fillStyle = theme.accentRight;
  for (let row = 0; row < 6; row += 1) {
    for (let column = 0; column < 6; column += 1) {
      context.beginPath();
      context.arc(54 + column * 28, 318 + row * 28, 3, 0, Math.PI * 2);
      context.fill();
    }
  }

  context.globalAlpha = 0.95;
  context.translate(104, 76);
  context.rotate(Math.PI / 4);
  fillRoundedRect(context, -10, -10, 20, 20, 3, 'rgba(255, 255, 255, 0.95)');

  context.restore();
}

async function createShareImage() {
  if (!qrDataUrl.value || !selectedBank.value) {
    return '';
  }

  if ('fonts' in document) {
    await document.fonts.ready;
  }

  const theme = activeTheme.value;
  const qrImage = await loadImage(qrDataUrl.value);
  const bankLogo = selectedBank.value.logo
    ? await loadImage(selectedBank.value.logo, true).catch(() => null)
    : null;

  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1200;
  const context = canvas.getContext('2d');
  if (!context) {
    return '';
  }

  const background = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  background.addColorStop(0, theme.stageFrom);
  background.addColorStop(0.48, theme.stageMid);
  background.addColorStop(1, theme.stageTo);
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = theme.glowLeft;
  context.beginPath();
  context.arc(70, 920, 240, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = theme.glowRight;
  context.beginPath();
  context.arc(860, 330, 250, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = 'rgba(255, 255, 255, 0.72)';
  context.beginPath();
  context.arc(810, 1040, 130, 0, Math.PI * 2);
  context.fill();

  drawStageDecorations(context, theme);

  context.shadowColor = theme.shadow;
  context.shadowBlur = 48;
  context.shadowOffsetY = 20;
  fillRoundedRect(context, 82, 52, 736, 1096, 42, 'rgba(255,255,255,0.94)');
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;

  context.textAlign = 'center';

  if (bankLogo) {
    drawContainImage(context, bankLogo, 285, 88, 330, 76);
  }
  else {
    context.fillStyle = '#101828';
    context.font = `800 29px ${CANVAS_FONT_FAMILY}`;
    context.fillText(selectedBank.value.shortName, 450, 138, 330);
  }

  context.fillStyle = '#98a2b3';
  context.font = `500 13px ${CANVAS_FONT_FAMILY}`;
  context.fillText(selectedBank.value.name, 450, 180, 610);

  context.fillStyle = '#101828';
  context.font = `800 34px ${CANVAS_FONT_FAMILY}`;
  context.fillText(t('scanTitle'), 450, 235, 610);

  context.shadowColor = theme.shadow;
  context.shadowBlur = 30;
  fillRoundedRect(context, 158, 275, 584, 584, 36, '#ffffff');
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.drawImage(qrImage, 178, 295, 544, 544);
  drawQrGuides(context, theme);

  const accountGradient = context.createLinearGradient(130, 0, 770, 0);
  accountGradient.addColorStop(0, '#fafaff');
  accountGradient.addColorStop(1, theme.stageMid);
  fillRoundedRect(context, 130, 891, 640, 104, 22, accountGradient);

  context.fillStyle = '#98a2b3';
  context.font = `500 13px ${CANVAS_FONT_FAMILY}`;
  context.fillText(t('accountLabel'), 450, 927);
  context.fillStyle = '#101828';
  context.font = `800 30px ${CANVAS_MONO_FONT_FAMILY}`;
  context.fillText(accountNo.value, 450, 970, 560);

  let rowY = 1024;
  if (previewPayerName.value) {
    drawShareRow(context, t('payer'), previewPayerName.value, rowY);
    rowY += 38;
  }
  if (amount.value) {
    drawShareRow(context, t('amount'), previewAmount.value, rowY, true);
    rowY += 38;
  }
  if (description.value) {
    drawShareRow(context, t('content'), previewDescription.value, rowY);
  }

  context.textAlign = 'center';
  context.fillStyle = '#98a2b3';
  context.font = `500 12px ${CANVAS_FONT_FAMILY}`;
  context.fillText(`© ${COPYRIGHT_YEAR} ePlus.DEV · tools.eplus.dev`, 450, 1132);

  return canvas.toDataURL('image/png');
}

function revokeShareImageUrl() {
  if (shareImageObjectUrl.value) {
    URL.revokeObjectURL(shareImageObjectUrl.value);
    shareImageObjectUrl.value = '';
  }
}

async function refreshShareImage() {
  const renderId = ++shareImageRenderId;

  if (!qrDataUrl.value || !selectedBank.value) {
    shareImageRendering.value = false;
    shareImageBlob.value = null;
    revokeShareImageUrl();
    return;
  }

  shareImageRendering.value = true;

  try {
    const image = await createShareImage();
    if (!image || renderId !== shareImageRenderId) {
      return;
    }

    const blob = await (await fetch(image)).blob();
    if (renderId !== shareImageRenderId) {
      return;
    }

    const nextObjectUrl = URL.createObjectURL(blob);
    if (renderId !== shareImageRenderId) {
      URL.revokeObjectURL(nextObjectUrl);
      return;
    }

    const previousObjectUrl = shareImageObjectUrl.value;
    shareImageBlob.value = blob;
    shareImageObjectUrl.value = nextObjectUrl;

    if (previousObjectUrl) {
      URL.revokeObjectURL(previousObjectUrl);
    }
  }
  catch {
    if (renderId === shareImageRenderId) {
      shareImageBlob.value = null;
      revokeShareImageUrl();
    }
  }
  finally {
    if (renderId === shareImageRenderId) {
      shareImageRendering.value = false;
    }
  }
}

function scheduleShareImageRefresh() {
  if (shareImageRefreshTimer !== undefined && typeof window !== 'undefined') {
    window.clearTimeout(shareImageRefreshTimer);
    shareImageRefreshTimer = undefined;
  }

  // Invalidate any export already in flight before entering the debounce
  // window. Its generation checks will then prevent it from committing a
  // stale blob/object URL or clearing the pending rendering state.
  shareImageRenderId += 1;
  shareImageRendering.value = true;

  // A payload/design change may still be producing the corresponding QR.
  // Wait for that render to finish instead of exporting the previous QR.
  // qrRendering is watched below, so completion schedules the fresh export.
  if (qrRendering.value) {
    return;
  }

  // Keep the lightweight live preview responsive while the user is typing.
  // The export-sized 900x1200 canvas is regenerated only after input settles,
  // preventing stale QR snapshots and unnecessary canvas work on every key.
  if (!qrDataUrl.value || !selectedBank.value) {
    refreshShareImage();
    return;
  }

  if (typeof window === 'undefined') {
    refreshShareImage();
    return;
  }

  shareImageRefreshTimer = window.setTimeout(() => {
    shareImageRefreshTimer = undefined;
    refreshShareImage();
  }, SHARE_IMAGE_REFRESH_DELAY_MS);
}

function isIosFamily() {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

async function shareImageOnIos(blob: Blob, fileName: string) {
  if (!isIosFamily() || typeof navigator.share !== 'function') {
    return false;
  }

  const file = new File([blob], fileName, { type: 'image/png' });

  try {
    if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [file] })) {
      return false;
    }

    await navigator.share({
      files: [file],
      title: fileName,
    });
    return true;
  }
  catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return true;
    }
    return false;
  }
}

async function copyQrImage() {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    copyState.value = 'unsupported';
    return;
  }

  const blob = shareImageBlob.value;
  if (!blob) {
    copyState.value = 'failed';
    return;
  }

  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    copyState.value = 'copied';
  }
  catch {
    copyState.value = 'failed';
  }

  window.setTimeout(() => {
    copyState.value = 'idle';
  }, 2000);
}

async function downloadQrImage() {
  const blob = shareImageBlob.value;
  const objectUrl = shareImageObjectUrl.value;
  if (!blob || !objectUrl) {
    return;
  }

  // iOS/WKWebView may ignore synthetic downloads after asynchronous canvas
  // rendering. The image is pre-rendered above, so the native share sheet can
  // be opened directly from the user's tap and offers Save Image / Save to Files.
  if (await shareImageOnIos(blob, shareFileName.value)) {
    return;
  }

  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = shareFileName.value;
  link.rel = 'noopener';
  link.style.display = 'none';

  // If an iOS webview does not expose Web Share, opening the blob in a new tab
  // is a usable fallback instead of silently ignoring the click.
  if (isIosFamily()) {
    link.target = '_blank';
  }

  document.body.appendChild(link);
  link.click();
  link.remove();
}

watch(
  [qrDataUrl, qrRendering, selectedTheme, selectedBankBin, accountNo, payerName, amount, description, locale],
  scheduleShareImageRefresh,
  { immediate: true },
);

onMounted(() => {
  restoreForm();
  applyUrlParameters();
  urlSyncReady = true;
  scheduleUrlSync();
});

onBeforeUnmount(() => {
  if (urlSyncTimer !== undefined) {
    window.clearTimeout(urlSyncTimer);
  }
  if (shareImageRefreshTimer !== undefined) {
    window.clearTimeout(shareImageRefreshTimer);
  }
  clearDescriptionNormalizeTimer();
  qrRenderId += 1;
  shareImageRenderId += 1;
  revokeShareImageUrl();
});
</script>

<template>
  <div class="vietqr-tool">
    <n-alert type="info" :bordered="false">
      {{ t('privacy') }}
    </n-alert>

    <div class="vietqr-layout">
      <div class="form-column">
        <div class="create-card-slot">
          <c-card :title="t('createTitle')">
          <div class="form-stack">
            <c-select
              v-model:value="selectedBankBin"
              :options="bankOptions"
              searchable
              :label="t('bankLabel')"
              :placeholder="t('bankPlaceholder')"
            />

            <div v-if="selectedBank" class="bank-summary">
              <div class="bank-logo-box">
                <img
                  :src="selectedBank.logo"
                  :alt="t('bankLogoAlt', { bank: selectedBank.shortName })"
                  class="bank-logo"
                >
              </div>
              <div class="bank-summary-copy">
                <div class="bank-summary-title">
                  {{ selectedBank.shortName }}
                </div>
                <div class="bank-summary-name">
                  {{ selectedBank.name }}
                </div>
              </div>
              <div class="bank-bin">
                {{ selectedBank.bin }}
              </div>
            </div>

            <n-alert v-if="selectedBank && !selectedBank.transferSupported" type="warning" :bordered="false">
              {{ t('unsupportedWarning') }}
            </n-alert>

            <c-input-text
              v-model:value="accountNo"
              :label="t('accountLabel')"
              :placeholder="t('accountPlaceholder')"
              :validation-rules="accountValidationRules"
              raw-text
            />

            <div class="payer-name-field">
              <c-input-text
                v-model:value="payerNameInput"
                :label="t('payerNameLabel')"
                :placeholder="t('payerNamePlaceholder')"
                raw-text
              />
              <div class="payer-name-meta">
                <span>{{ t('payerNameHint') }}</span>
                <span class="payer-name-counter">{{ payerNameCharacterCount }}/{{ VIETQR_MAX_PAYER_NAME_LENGTH }}</span>
              </div>
            </div>

            <div class="form-pair">
              <c-input-text
                v-model:value="formattedAmount"
                :label="t('amountLabel')"
                :placeholder="amountPlaceholder"
                :validation-rules="amountValidationRules"
                raw-text
              />

              <div class="content-field">
                <c-input-text
                  v-model:value="descriptionInput"
                  :label="t('contentLabel')"
                  :placeholder="t('contentPlaceholder')"
                  :validation-rules="descriptionValidationRules"
                  raw-text
                />
                <div class="content-counter">
                  {{ descriptionCharacterCount }}/{{ VIETQR_MAX_DESCRIPTION_LENGTH }}
                </div>
              </div>
            </div>

            <n-alert v-if="!validation.valid && (selectedBankBin || accountNo || amount || description)" type="error" :bordered="false">
              <ul class="validation-list">
                <li v-for="error in localizedValidationErrors" :key="error">
                  {{ error }}
                </li>
              </ul>
            </n-alert>

            <div class="form-actions">
              <c-button @click="resetForm">
                {{ t('clear') }}
              </c-button>
            </div>
          </div>
          </c-card>
        </div>

        <div class="design-card-slot">
          <c-card :title="t('designTitle')">
          <div class="design-stack">
            <div class="design-hint">{{ t('designHint') }}</div>

            <div class="design-color-grid">
              <label class="design-control">
                <span>{{ t('qrColor') }}</span>
                <div class="color-control">
                  <input v-model="qrForeground" type="color" aria-label="QR color">
                  <code>{{ qrForeground.toUpperCase() }}</code>
                </div>
              </label>
              <label class="design-control">
                <span>{{ t('backgroundColor') }}</span>
                <div class="color-control">
                  <input v-model="qrBackground" type="color" aria-label="QR background color">
                  <code>{{ qrBackground.toUpperCase() }}</code>
                </div>
              </label>
            </div>

            <div class="design-section">
              <div class="design-label">{{ t('moduleStyle') }}</div>
              <div class="design-options">
                <button type="button" class="design-option" :class="{ active: qrModuleStyle === 'square' }" @click="qrModuleStyle = 'square'">{{ t('square') }}</button>
                <button type="button" class="design-option" :class="{ active: qrModuleStyle === 'rounded' }" @click="qrModuleStyle = 'rounded'">{{ t('rounded') }}</button>
                <button type="button" class="design-option" :class="{ active: qrModuleStyle === 'dots' }" @click="qrModuleStyle = 'dots'">{{ t('dots') }}</button>
              </div>
            </div>

            <div class="design-section">
              <div class="design-label">{{ t('eyeStyle') }}</div>
              <div class="design-options">
                <button type="button" class="design-option" :class="{ active: qrEyeStyle === 'square' }" @click="qrEyeStyle = 'square'">{{ t('square') }}</button>
                <button type="button" class="design-option" :class="{ active: qrEyeStyle === 'rounded' }" @click="qrEyeStyle = 'rounded'">{{ t('rounded') }}</button>
                <button type="button" class="design-option" :class="{ active: qrEyeStyle === 'circle' }" @click="qrEyeStyle = 'circle'">{{ t('circle') }}</button>
              </div>
            </div>

            <div class="design-settings-grid">
              <label class="design-control">
                <span>{{ t('errorCorrection') }}</span>
                <select v-model="qrErrorCorrection" class="design-select">
                  <option value="L">L (~7%)</option>
                  <option value="M">M (~15%)</option>
                  <option value="Q">Q (~25%)</option>
                  <option value="H">H (~30%)</option>
                </select>
                <small>{{ t('errorCorrectionHint') }}</small>
              </label>
              <label class="design-control">
                <span>{{ t('qrSizeLabel') }}: {{ qrSize }}px</span>
                <input v-model.number="qrSize" class="design-range" type="range" min="256" max="1024" step="64">
              </label>
            </div>

            <label class="logo-toggle">
              <input v-model="qrCenterLogo" type="checkbox">
              <span>
                <strong>{{ t('centerLogo') }}</strong>
                <small>{{ t('centerLogoHint') }}</small>
              </span>
            </label>

            <div class="form-actions">
              <c-button @click="resetDesign">{{ t('resetDesign') }}</c-button>
            </div>
          </div>
          </c-card>
        </div>

        <div v-if="selectedBankInfo.length" class="secondary-card-slot">
          <c-card :title="t('technicalTitle')">
          <div class="technical-hint">
            {{ t('technicalHint') }}
          </div>
          <c-key-value-list :items="selectedBankInfo" />
          </c-card>
        </div>

        <div v-if="qrPayload" class="secondary-card-slot">
          <c-card :title="t('payloadTitle')">
          <c-text-copyable :value="qrPayload" font-mono break-all />
          <div class="payload-meta">
            {{ t('payloadMeta') }}
          </div>
          </c-card>
        </div>
      </div>

      <div class="preview-column">
        <c-card :title="t('previewTitle')">
          <div class="theme-picker" role="radiogroup" aria-label="Color theme">
            <button
              v-for="theme in themeOptions"
              :key="theme.value"
              type="button"
              class="theme-swatch"
              :class="{ active: selectedTheme === theme.value }"
              :style="{ background: theme.swatch }"
              :title="theme.label"
              :aria-label="theme.label"
              :aria-checked="selectedTheme === theme.value"
              role="radio"
              @click="selectedTheme = theme.value"
            >
              <span v-if="selectedTheme === theme.value" class="theme-check">✓</span>
            </button>
          </div>

          <div
            class="preview-stage"
            :class="{ 'preview-stage-exported': qrDataUrl && selectedBank && shareImageObjectUrl && !shareImageRendering && !qrRendering }"
            :style="themeStyle"
          >
            <template v-if="qrDataUrl && selectedBank && shareImageObjectUrl && !shareImageRendering && !qrRendering">
              <img
                :src="shareImageObjectUrl"
                :alt="t('previewTitle')"
                class="share-preview-image"
              >
            </template>

            <template v-else>
              <div class="decor-blob decor-blob-left" />
              <div class="decor-blob decor-blob-right" />
              <div class="decor-rings" />
              <div class="decor-dots" />
              <div class="decor-star" />

              <div v-if="qrDataUrl && selectedBank" class="payment-sheet">
                <div class="bank-brand">
                  <img
                    :src="selectedBank.logo"
                    :alt="t('bankLogoAlt', { bank: selectedBank.shortName })"
                    class="preview-bank-logo"
                  >
                  <div class="preview-bank-name">
                    {{ selectedBank.name }}
                  </div>
                </div>

                <div class="scan-title">
                  {{ t('scanTitle') }}
                </div>

                <div class="qr-frame">
                  <span class="qr-guide qr-guide-tl" />
                  <span class="qr-guide qr-guide-tr" />
                  <span class="qr-guide qr-guide-bl" />
                  <span class="qr-guide qr-guide-br" />
                  <div class="qr-surface">
                    <img
                      :src="qrDataUrl"
                      alt="VietQR bank transfer code"
                      class="qr-code-image"
                      :style="{ visibility: qrRendering ? 'hidden' : 'visible' }"
                    >
                  </div>
                </div>

                <div class="account-card">
                  <span>{{ t('accountLabel') }}</span>
                  <strong>{{ accountNo }}</strong>
                </div>

                <div v-if="previewPayerName || amount || description" class="payment-details">
                  <div v-if="previewPayerName" class="detail-row">
                    <span>{{ t('payer') }}</span>
                    <strong>{{ previewPayerName }}</strong>
                  </div>
                  <div v-if="amount" class="detail-row">
                    <span>{{ t('amount') }}</span>
                    <strong class="amount-value">{{ previewAmount }}</strong>
                  </div>
                  <div v-if="description" class="detail-row">
                    <span>{{ t('content') }}</span>
                    <strong>{{ previewDescription }}</strong>
                  </div>
                </div>

                <div class="sheet-copyright">
                  © {{ COPYRIGHT_YEAR }} ePlus.DEV · tools.eplus.dev
                </div>
              </div>

              <div v-else class="payment-sheet payment-sheet-empty">
                <div class="empty-preview-title">
                  {{ t('previewTitle') }}
                </div>
                <div class="empty-preview-copy">
                  {{ t('emptyPreview') }}
                </div>

                <div class="empty-qr-frame">
                  <span class="qr-guide qr-guide-tl" />
                  <span class="qr-guide qr-guide-tr" />
                  <span class="qr-guide qr-guide-bl" />
                  <span class="qr-guide qr-guide-br" />
                  <div class="empty-qr-grid" />
                </div>

                <div class="empty-account-card">
                  <span>{{ t('accountLabel') }}</span>
                  <strong>•••• •••• ••••</strong>
                </div>

                <div class="sheet-copyright">
                  © {{ COPYRIGHT_YEAR }} ePlus.DEV · tools.eplus.dev
                </div>
              </div>
            </template>

            <template v-if="qrDataUrl && selectedBank">
              <div class="qr-actions">
                <c-button :disabled="!shareImageBlob || shareImageRendering || qrRendering" @click="copyQrImage">
                  {{ copyStatusLabel }}
                </c-button>
                <c-button :disabled="!shareImageBlob || shareImageRendering || qrRendering" @click="downloadQrImage">
                  {{ t('downloadPng') }}
                </c-button>
              </div>

              <n-alert type="warning" :bordered="false">
                {{ t('verifyWarning') }}
              </n-alert>
            </template>
          </div>
        </c-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vietqr-tool {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.vietqr-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
}

.form-column,
.form-stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-stack {
  gap: 16px;
}

.form-pair {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}

.bank-summary {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 14px;
  background: rgba(148, 163, 184, 0.05);
}

.bank-logo-box {
  display: flex;
  width: 76px;
  height: 46px;
  align-items: center;
  justify-content: center;
  flex: none;
  border-radius: 10px;
  background: #fff;
}

.bank-logo {
  display: block;
  max-width: 64px;
  max-height: 34px;
  object-fit: contain;
}

.bank-summary-copy {
  min-width: 0;
  flex: 1;
}

.bank-summary-title {
  font-size: 14px;
  font-weight: 700;
}

.bank-summary-name {
  overflow: hidden;
  margin-top: 3px;
  opacity: 0.64;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bank-bin {
  flex: none;
  padding: 5px 8px;
  border-radius: 7px;
  background: rgba(148, 163, 184, 0.1);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  opacity: 0.72;
}

.validation-list {
  margin: 0;
  padding-left: 20px;
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.technical-hint,
.payload-meta {
  margin-bottom: 12px;
  opacity: 0.66;
  font-size: 13px;
}

.payload-meta {
  margin-top: 12px;
  margin-bottom: 0;
}

.content-field,
.payer-name-field {
  min-width: 0;
}

.content-counter {
  margin-top: 5px;
  opacity: 0.55;
  font-size: 11px;
  text-align: right;
}

.payer-name-meta {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-top: 5px;
  opacity: 0.58;
  font-size: 11px;
  line-height: 1.4;
}

.payer-name-counter {
  flex: none;
  white-space: nowrap;
}

.design-stack {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.design-hint {
  opacity: 0.65;
  font-size: 13px;
}

.design-color-grid,
.design-settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.design-control {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}

.design-control small,
.logo-toggle small {
  opacity: 0.58;
  font-size: 11px;
  font-weight: 400;
  line-height: 1.4;
}

.color-control {
  display: flex;
  min-height: 42px;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  padding: 6px 10px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 12px;
}

.color-control input[type='color'] {
  width: 32px;
  height: 32px;
  flex: none;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
}

.color-control code {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
}

.design-label {
  margin-bottom: 9px;
  font-size: 13px;
  font-weight: 600;
}

.design-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.design-option {
  min-height: 36px;
  padding: 7px 13px;
  border: 1px solid rgba(148, 163, 184, 0.32);
  border-radius: 999px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.design-option.active {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  font-weight: 700;
}

.design-select {
  width: 100%;
  min-height: 40px;
  box-sizing: border-box;
  padding: 0 10px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 10px;
  background: transparent;
  color: inherit;
}

.design-range {
  width: 100%;
}

.logo-toggle {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 12px;
  cursor: pointer;
}

.logo-toggle input {
  margin-top: 3px;
}

.logo-toggle span {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.preview-column {
  min-width: 0;
}

.theme-picker {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin: -4px 2px 12px;
}

.theme-swatch {
  display: inline-flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
  cursor: pointer;
  transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
}

.theme-swatch:hover {
  transform: translateY(-1px) scale(1.05);
}

.theme-swatch.active {
  border-color: rgba(15, 23, 42, 0.72);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.92), 0 3px 12px rgba(15, 23, 42, 0.16);
}

.theme-swatch:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
}

.theme-check {
  color: #fff;
  font-size: 13px;
  font-weight: 900;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.32);
}

.preview-stage {
  position: relative;
  min-height: 620px;
  overflow: hidden;
  padding: 22px;
  border: 1px solid rgba(129, 140, 248, 0.12);
  border-radius: 30px;
  background:
    radial-gradient(circle at 14% 8%, var(--theme-glow-left), transparent 30%),
    radial-gradient(circle at 94% 20%, var(--theme-glow-right), transparent 30%),
    linear-gradient(160deg, var(--theme-from) 0%, var(--theme-mid) 50%, var(--theme-to) 100%);
  isolation: isolate;
  transition: background 220ms ease;
}

.preview-stage-exported {
  min-height: 0;
  overflow: visible;
  padding: 0;
  border: 0;
  background: transparent;
}

.share-preview-image {
  display: block;
  width: 100%;
  max-width: 390px;
  height: auto;
  aspect-ratio: 3 / 4;
  margin: 0 auto;
  border-radius: 30px;
  box-shadow: 0 18px 44px var(--theme-shadow);
  object-fit: contain;
}

.preview-stage-exported .qr-actions {
  margin-top: 16px;
}

.decor-blob {
  position: absolute;
  z-index: -1;
  border-radius: 999px;
  filter: blur(2px);
  pointer-events: none;
}

.decor-blob-left {
  width: 250px;
  height: 250px;
  left: -120px;
  bottom: 40px;
  background: radial-gradient(circle, var(--theme-glow-left), transparent 70%);
}

.decor-blob-right {
  width: 270px;
  height: 270px;
  top: 130px;
  right: -150px;
  background: radial-gradient(circle, var(--theme-glow-right), transparent 70%);
}

.decor-rings {
  position: absolute;
  z-index: -1;
  width: 190px;
  height: 190px;
  top: 110px;
  right: -82px;
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 50%;
  box-shadow:
    0 0 0 18px rgba(255, 255, 255, 0.14),
    0 0 0 38px rgba(255, 255, 255, 0.1),
    0 0 0 60px rgba(255, 255, 255, 0.06);
  pointer-events: none;
}

.decor-dots {
  position: absolute;
  z-index: -1;
  width: 78px;
  height: 78px;
  top: 178px;
  left: 18px;
  opacity: 0.27;
  background-image: radial-gradient(circle, var(--theme-accent-right) 1.4px, transparent 1.4px);
  background-size: 14px 14px;
  pointer-events: none;
}

.decor-star {
  position: absolute;
  z-index: -1;
  width: 14px;
  height: 14px;
  top: 30px;
  left: 48px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 18px rgba(255, 255, 255, 0.9);
  transform: rotate(45deg);
  pointer-events: none;
}

.payment-sheet {
  position: relative;
  width: 100%;
  max-width: 390px;
  box-sizing: border-box;
  margin: 0 auto;
  padding: 22px 20px 16px;
  border: 1px solid rgba(255, 255, 255, 0.86);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.91);
  box-shadow:
    0 24px 64px var(--theme-shadow),
    inset 0 1px 0 rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(12px);
  color: #101828;
}

.payment-sheet-empty {
  display: flex;
  min-height: 540px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.bank-brand {
  display: flex;
  min-height: 58px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.preview-bank-logo {
  display: block;
  max-width: 148px;
  max-height: 48px;
  object-fit: contain;
}

.preview-bank-name {
  max-width: 300px;
  overflow: hidden;
  margin-top: 6px;
  color: #98a2b3;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scan-title {
  margin-top: 13px;
  color: #101828;
  font-size: 22px;
  font-weight: 850;
  letter-spacing: -0.03em;
  text-align: center;
}

.empty-preview-title {
  color: #101828;
  font-size: 20px;
  font-weight: 800;
  text-align: center;
}

.empty-preview-copy {
  max-width: 280px;
  margin-top: 7px;
  color: #667085;
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
}

.empty-qr-frame {
  position: relative;
  width: min(100%, 240px);
  margin: 24px auto 0;
  padding: 12px;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 16px 34px var(--theme-shadow);
}

.empty-qr-grid {
  aspect-ratio: 1;
  border-radius: 15px;
  background:
    linear-gradient(90deg, rgba(15, 23, 42, 0.08) 12px, transparent 12px) 0 0 / 28px 28px,
    linear-gradient(rgba(15, 23, 42, 0.08) 12px, transparent 12px) 0 0 / 28px 28px,
    #fff;
  opacity: 0.65;
}

.empty-account-card {
  display: flex;
  width: min(100%, 280px);
  box-sizing: border-box;
  flex-direction: column;
  align-items: center;
  margin-top: 22px;
  padding: 13px 16px 14px;
  border: 1px solid rgba(226, 232, 240, 0.72);
  border-radius: 18px;
  background: linear-gradient(110deg, rgba(255, 255, 255, 0.96), var(--theme-mid));
}

.empty-account-card span {
  color: #98a2b3;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.empty-account-card strong {
  margin-top: 5px;
  color: #667085;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 19px;
  letter-spacing: 0.08em;
}

.qr-frame {
  position: relative;
  width: min(100%, 300px);
  margin: 22px auto 0;
}

.qr-surface {
  box-sizing: border-box;
  padding: 12px;
  border-radius: 27px;
  background: #fff;
  box-shadow:
    0 18px 38px var(--theme-shadow),
    inset 0 0 0 1px rgba(226, 232, 240, 0.76);
}

.qr-code-image {
  display: block;
  width: 100%;
  border-radius: 16px;
  object-fit: contain;
  background: #fff;
}

.qr-guide {
  position: absolute;
  z-index: 2;
  width: 25px;
  height: 25px;
  pointer-events: none;
}

.qr-guide-tl {
  top: -8px;
  left: -8px;
  border-top: 3px solid var(--theme-accent-left);
  border-left: 3px solid var(--theme-accent-left);
  border-radius: 9px 0 0;
}

.qr-guide-tr {
  top: -8px;
  right: -8px;
  border-top: 3px solid var(--theme-accent-right);
  border-right: 3px solid var(--theme-accent-right);
  border-radius: 0 9px 0 0;
}

.qr-guide-bl {
  bottom: -8px;
  left: -8px;
  border-bottom: 3px solid var(--theme-accent-left);
  border-left: 3px solid var(--theme-accent-left);
  border-radius: 0 0 0 9px;
}

.qr-guide-br {
  right: -8px;
  bottom: -8px;
  border-right: 3px solid var(--theme-accent-right);
  border-bottom: 3px solid var(--theme-accent-right);
  border-radius: 0 0 9px;
}

.account-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 22px;
  padding: 13px 16px 14px;
  border: 1px solid rgba(226, 232, 240, 0.72);
  border-radius: 18px;
  background: linear-gradient(110deg, rgba(255, 255, 255, 0.96), var(--theme-mid));
  text-align: center;
}

.account-card span {
  color: #98a2b3;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.account-card strong {
  max-width: 100%;
  margin-top: 5px;
  overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: clamp(19px, 5vw, 23px);
  font-weight: 800;
  letter-spacing: 0.025em;
}

.payment-details {
  margin-top: 12px;
  padding: 4px 14px;
  border: 1px solid rgba(226, 232, 240, 0.68);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
}

.detail-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 0;
}

.detail-row + .detail-row {
  border-top: 1px solid rgba(226, 232, 240, 0.7);
}

.detail-row span {
  flex: none;
  color: #98a2b3;
  font-size: 10px;
}

.detail-row strong {
  min-width: 0;
  overflow: hidden;
  color: #344054;
  font-size: 12px;
  font-weight: 650;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-row .amount-value {
  color: #101828;
  font-size: 16px;
  font-weight: 800;
}

.sheet-copyright {
  margin-top: 14px;
  padding-top: 11px;
  border-top: 1px solid rgba(226, 232, 240, 0.62);
  color: #a5adba;
  font-size: 8px;
  text-align: center;
}

.qr-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
  max-width: 390px;
  margin: 16px auto 14px;
}

@media (min-width: 768px) {
  .form-pair {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .vietqr-layout {
    grid-template-columns: minmax(0, 1fr) 450px;
  }

  .preview-column {
    position: sticky;
    top: 18px;
    align-self: start;
  }
}

@media (max-width: 767px) {
  .vietqr-tool,
  .vietqr-layout {
    gap: 14px;
  }

  .form-column {
    display: contents;
  }

  .create-card-slot {
    order: 1;
  }

  .preview-column {
    order: 2;
  }

  .design-card-slot {
    order: 3;
  }

  .secondary-card-slot {
    order: 4;
  }

  .create-card-slot,
  .design-card-slot,
  .secondary-card-slot,
  .preview-column {
    min-width: 0;
  }

  .form-stack {
    gap: 14px;
  }

  .design-stack {
    gap: 15px;
  }

  .design-color-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .design-settings-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }

  .design-options {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .design-option {
    width: 100%;
    min-height: 42px;
    padding: 8px 6px;
    text-align: center;
    touch-action: manipulation;
  }

  .color-control {
    min-height: 46px;
    padding: 6px 8px;
  }

  .color-control input[type='color'] {
    width: 34px;
    height: 34px;
  }

  .color-control code {
    min-width: 0;
    font-size: 11px;
  }

  .logo-toggle {
    min-height: 48px;
    box-sizing: border-box;
    padding: 12px;
  }

  .form-actions > * {
    min-height: 42px;
  }

  .bank-summary {
    align-items: flex-start;
    gap: 10px;
    padding: 10px 12px;
  }

  .bank-logo-box {
    width: 64px;
    height: 42px;
  }

  .bank-logo {
    max-width: 54px;
    max-height: 30px;
  }

  .bank-bin {
    display: none;
  }

  .payer-name-meta {
    flex-wrap: wrap;
    gap: 4px 10px;
  }

  .theme-picker {
    justify-content: center;
    overflow-x: auto;
    margin: -2px 0 10px;
    padding: 2px 2px 4px;
    scrollbar-width: none;
  }

  .theme-picker::-webkit-scrollbar {
    display: none;
  }

  .theme-swatch {
    width: 34px;
    height: 34px;
    flex: none;
  }

  .preview-stage {
    min-height: 0;
    padding: 10px;
    border-radius: 22px;
  }

  .preview-stage-exported {
    padding: 0;
    border-radius: 0;
  }

  .share-preview-image {
    width: 100%;
    max-width: none;
    border-radius: 22px;
  }

  .payment-sheet {
    width: 100%;
    max-width: none;
    padding: 17px 12px 12px;
    border-radius: 23px;
  }

  .payment-sheet-empty {
    min-height: 470px;
  }

  .preview-bank-logo {
    max-width: 126px;
    max-height: 40px;
  }

  .scan-title {
    margin-top: 10px;
    font-size: 19px;
  }

  .qr-frame {
    width: min(100%, 278px);
    margin-top: 16px;
  }

  .qr-surface {
    padding: 8px;
    border-radius: 20px;
  }

  .account-card {
    margin-top: 18px;
    padding: 11px 12px 12px;
  }

  .account-card strong {
    font-size: clamp(17px, 5.5vw, 22px);
  }

  .payment-details {
    padding-inline: 11px;
  }

  .detail-row {
    gap: 10px;
  }

  .detail-row strong {
    overflow: visible;
    overflow-wrap: anywhere;
    white-space: normal;
  }

  .qr-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    max-width: none;
    margin: 12px auto 10px;
  }

  .qr-actions > * {
    min-width: 0;
    min-height: 44px;
  }

  .decor-dots {
    display: none;
  }
}

@media (max-width: 359px) {
  .design-color-grid,
  .design-options,
  .qr-actions {
    grid-template-columns: minmax(0, 1fr);
  }

  .payment-sheet {
    padding-inline: 9px;
  }

  .qr-frame {
    width: min(100%, 250px);
  }
}
</style>
