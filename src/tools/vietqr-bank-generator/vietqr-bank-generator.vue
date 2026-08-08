<script setup lang="ts">
import QRCode from 'qrcode';
import { useI18n } from 'vue-i18n';
import bankDirectory from './banks.json';
import { vietQrMessages } from './vietqr-bank-generator.i18n';
import {
  type VietQrBank,
  bankSearchLabel,
  formatVietQrAmount,
  makeVietQrContent,
  normalizeVietQrAmount,
  validateVietQrInput,
} from './vietqr-bank-generator.service';
import type { CKeyValueListItems } from '@/ui/c-key-value-list/c-key-value-list.types';

const STORAGE_PREFIX = 'eplus-vietqr';
const COPYRIGHT_YEAR = new Date().getFullYear();
const SENSITIVE_STORAGE_KEYS = ['account', 'amount', 'content'] as const;

type CopyState = 'idle' | 'copied' | 'unsupported' | 'failed';

const { t, locale } = useI18n({
  useScope: 'local',
  messages: vietQrMessages,
});

const banks = [...bankDirectory.data]
  .sort((a, b) => a.shortName.localeCompare(b.shortName)) as VietQrBank[];
const selectedBankBin = ref('');
const accountNo = ref('');
const amount = ref('');
const description = ref('');
const qrDataUrl = ref('');
const copyState = ref<CopyState>('idle');

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
  get: () => formatVietQrAmount(amount.value),
  set: (value: string) => {
    amount.value = normalizeVietQrAmount(value);
  },
});

const validation = computed(() => validateVietQrInput({
  bankId: selectedBankBin.value,
  accountNo: accountNo.value,
  amount: amount.value,
  description: description.value,
}));

const localizedValidationErrors = computed(() => validation.value.errors.map(error => t(`validation.${error}`)));

const qrPayload = computed(() => {
  if (selectedBank.value && !selectedBank.value.transferSupported) {
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

watch(qrPayload, async (payload) => {
  if (!payload) {
    qrDataUrl.value = '';
    return;
  }

  try {
    const rendered = await QRCode.toDataURL(payload, {
      width: 640,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    });

    if (qrPayload.value === payload) {
      qrDataUrl.value = rendered;
    }
  }
  catch {
    if (qrPayload.value === payload) {
      qrDataUrl.value = '';
    }
  }
}, { immediate: true });

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

function clearSensitiveStorage() {
  for (const key of SENSITIVE_STORAGE_KEYS) {
    window.localStorage.removeItem(`${STORAGE_PREFIX}:${key}`);
  }
}

function restoreForm() {
  selectedBankBin.value = window.localStorage.getItem(`${STORAGE_PREFIX}:bank`) ?? '';
  clearSensitiveStorage();
}

function resetForm() {
  selectedBankBin.value = '';
  accountNo.value = '';
  amount.value = '';
  description.value = '';

  window.localStorage.removeItem(`${STORAGE_PREFIX}:bank`);
  clearSensitiveStorage();
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

async function createShareImage() {
  if (!qrDataUrl.value || !selectedBank.value) {
    return '';
  }

  const qrImage = await loadImage(qrDataUrl.value);
  const bankLogo = selectedBank.value.logo
    ? await loadImage(selectedBank.value.logo, true).catch(() => null)
    : null;
  const canvas = document.createElement('canvas');
  canvas.width = 840;
  canvas.height = 1080;
  const context = canvas.getContext('2d');
  if (!context) {
    return '';
  }

  const background = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  background.addColorStop(0, '#f5f3ff');
  background.addColorStop(0.48, '#f8fbff');
  background.addColorStop(1, '#f8fafc');
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = 'rgba(124, 58, 237, 0.08)';
  context.beginPath();
  context.arc(90, 120, 150, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = 'rgba(59, 130, 246, 0.07)';
  context.beginPath();
  context.arc(760, 260, 190, 0, Math.PI * 2);
  context.fill();

  context.shadowColor = 'rgba(15, 23, 42, 0.13)';
  context.shadowBlur = 46;
  context.shadowOffsetY = 22;
  fillRoundedRect(context, 90, 58, 660, 956, 38, '#ffffff');
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;

  const brandGradient = context.createLinearGradient(140, 0, 320, 0);
  brandGradient.addColorStop(0, '#7c3aed');
  brandGradient.addColorStop(1, '#2563eb');
  fillRoundedRect(context, 130, 104, 42, 42, 13, brandGradient);
  context.textAlign = 'center';
  context.fillStyle = '#ffffff';
  context.font = '800 17px sans-serif';
  context.fillText('e+', 151, 131);

  context.textAlign = 'left';
  context.fillStyle = '#111827';
  context.font = '800 24px sans-serif';
  context.fillText('ePlus.DEV', 188, 124);
  context.fillStyle = '#94a3b8';
  context.font = '500 13px sans-serif';
  context.fillText('PAYMENT QR', 188, 145);

  if (bankLogo) {
    drawContainImage(context, bankLogo, 568, 99, 142, 50);
  }
  else {
    context.textAlign = 'right';
    context.fillStyle = '#64748b';
    context.font = '700 16px sans-serif';
    context.fillText(selectedBank.value.shortName, 710, 126, 250);
  }

  context.textAlign = 'center';
  context.fillStyle = '#111827';
  context.font = '800 34px sans-serif';
  context.fillText(t('scanTitle'), 420, 207, 570);
  context.fillStyle = '#64748b';
  context.font = '500 15px sans-serif';
  context.fillText(selectedBank.value.name, 420, 239, 560);

  context.shadowColor = 'rgba(79, 70, 229, 0.10)';
  context.shadowBlur = 30;
  fillRoundedRect(context, 168, 278, 504, 504, 28, '#ffffff');
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.drawImage(qrImage, 184, 294, 472, 472);

  context.fillStyle = '#64748b';
  context.font = '600 13px sans-serif';
  context.fillText(t('accountLabel'), 420, 823);
  context.fillStyle = '#111827';
  context.font = '800 29px monospace';
  context.fillText(accountNo.value, 420, 861, 560);

  if (amount.value) {
    fillRoundedRect(context, 222, 890, 396, 62, 31, '#f5f3ff');
    context.fillStyle = '#6d28d9';
    context.font = '800 24px sans-serif';
    context.fillText(previewAmount.value, 420, 930, 340);
  }

  context.fillStyle = '#64748b';
  context.font = '500 14px sans-serif';
  context.fillText(previewDescription.value, 420, amount.value ? 980 : 922, 560);

  context.fillStyle = '#94a3b8';
  context.font = '500 12px sans-serif';
  context.fillText(`© ${COPYRIGHT_YEAR} ePlus.DEV · tools.eplus.dev`, 420, 1000);

  return canvas.toDataURL('image/png');
}

async function copyQrImage() {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    copyState.value = 'unsupported';
    return;
  }

  try {
    const image = await createShareImage();
    if (!image) {
      copyState.value = 'failed';
      return;
    }

    const blob = await (await fetch(image)).blob();
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
  const image = await createShareImage();
  if (!image) {
    return;
  }

  const link = document.createElement('a');
  link.href = image;
  link.download = `vietqr-${selectedBank.value?.shortName || selectedBankBin.value}-${accountNo.value}.png`;
  link.click();
}

onMounted(() => {
  restoreForm();
});
</script>

<template>
  <div flex flex-col gap-5>
    <n-alert type="info" :bordered="false">
      {{ t('privacy') }}
    </n-alert>

    <div grid grid-cols-1 gap-5 class="lg:grid-cols-[minmax(0,1fr)_440px]">
      <div flex flex-col gap-5>
        <c-card :title="t('createTitle')">
          <div flex flex-col gap-4>
            <c-select
              v-model:value="selectedBankBin"
              :options="bankOptions"
              searchable
              :label="t('bankLabel')"
              :placeholder="t('bankPlaceholder')"
            />

            <div v-if="selectedBank" class="bank-summary">
              <img
                :src="selectedBank.logo"
                :alt="t('bankLogoAlt', { bank: selectedBank.shortName })"
                class="bank-logo"
              >
              <div min-w-0 flex-1>
                <div font-600>
                  {{ selectedBank.shortName }}
                </div>
                <div truncate text-sm op-70>
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
              maxlength="25"
            />

            <c-input-text
              v-model:value="formattedAmount"
              :label="t('amountLabel')"
              :placeholder="t('amountPlaceholder')"
            />

            <c-input-text
              v-model:value="description"
              :label="t('contentLabel')"
              :placeholder="t('contentPlaceholder')"
              maxlength="25"
            />

            <n-alert v-if="!validation.valid && (selectedBankBin || accountNo || amount || description)" type="error" :bordered="false">
              <ul m-0 pl-5>
                <li v-for="error in localizedValidationErrors" :key="error">
                  {{ error }}
                </li>
              </ul>
            </n-alert>

            <div flex flex-wrap gap-3>
              <c-button @click="resetForm">
                {{ t('clear') }}
              </c-button>
            </div>
          </div>
        </c-card>

        <c-card v-if="selectedBankInfo.length" :title="t('technicalTitle')">
          <div mb-3 text-sm op-65>
            {{ t('technicalHint') }}
          </div>
          <c-key-value-list :items="selectedBankInfo" />
        </c-card>

        <c-card v-if="qrPayload" :title="t('payloadTitle')">
          <c-text-copyable :value="qrPayload" font-mono break-all />
          <div mt-3 text-sm op-70>
            {{ t('payloadMeta') }}
          </div>
        </c-card>
      </div>

      <div>
        <c-card :title="t('previewTitle')">
          <div v-if="qrDataUrl && selectedBank" flex flex-col gap-4>
            <div class="qr-preview-stage">
              <div class="qr-payment-card">
                <div class="qr-card-header">
                  <div class="qr-brand">
                    <div class="qr-brand-mark">
                      e+
                    </div>
                    <div class="qr-brand-copy">
                      <strong>ePlus.DEV</strong>
                      <span>PAYMENT QR</span>
                    </div>
                  </div>
                  <div class="qr-bank-logo-wrap">
                    <img
                      :src="selectedBank.logo"
                      :alt="t('bankLogoAlt', { bank: selectedBank.shortName })"
                      class="qr-bank-logo"
                    >
                  </div>
                </div>

                <div class="qr-heading">
                  <strong>{{ t('scanTitle') }}</strong>
                  <span>{{ selectedBank.name }}</span>
                </div>

                <div class="qr-code-shell">
                  <span class="qr-corner qr-corner-tl" />
                  <span class="qr-corner qr-corner-tr" />
                  <span class="qr-corner qr-corner-bl" />
                  <span class="qr-corner qr-corner-br" />
                  <img :src="qrDataUrl" alt="VietQR bank transfer code" class="qr-code-image">
                </div>

                <div class="qr-recipient">
                  <span>{{ t('accountLabel') }}</span>
                  <strong>{{ accountNo }}</strong>
                </div>

                <div v-if="amount" class="qr-amount-pill">
                  {{ previewAmount }}
                </div>

                <div v-if="description" class="qr-note">
                  {{ previewDescription }}
                </div>

                <div class="qr-copyright">
                  © {{ COPYRIGHT_YEAR }} ePlus.DEV · tools.eplus.dev
                </div>
              </div>
            </div>

            <div flex flex-wrap justify-center gap-3>
              <c-button @click="copyQrImage">
                {{ copyStatusLabel }}
              </c-button>
              <c-button @click="downloadQrImage">
                {{ t('downloadPng') }}
              </c-button>
            </div>

            <n-alert type="warning" :bordered="false">
              {{ t('verifyWarning') }}
            </n-alert>
          </div>

          <div v-else py-12 text-center op-60>
            {{ t('emptyPreview') }}
          </div>
        </c-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bank-summary {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 14px;
  background: rgba(248, 250, 252, 0.55);
}

.bank-logo {
  display: block;
  width: 72px;
  height: 42px;
  flex: none;
  object-fit: contain;
}

.bank-bin {
  flex: none;
  color: #667085;
  font-family: monospace;
  font-size: 12px;
}

.qr-preview-stage {
  position: relative;
  overflow: hidden;
  padding: 24px;
  border: 1px solid rgba(99, 102, 241, 0.09);
  border-radius: 30px;
  background:
    radial-gradient(circle at 8% 8%, rgba(124, 58, 237, 0.12), transparent 32%),
    radial-gradient(circle at 92% 18%, rgba(37, 99, 235, 0.10), transparent 30%),
    linear-gradient(145deg, #f7f5ff 0%, #f8fbff 50%, #f8fafc 100%);
}

.qr-payment-card {
  position: relative;
  width: 100%;
  max-width: 378px;
  box-sizing: border-box;
  margin: 0 auto;
  padding: 22px 22px 16px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
  color: #0f172a;
}

.qr-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.qr-brand {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.qr-brand-mark {
  display: flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  flex: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #7c3aed, #2563eb);
  box-shadow: 0 8px 18px rgba(79, 70, 229, 0.23);
  color: #fff;
  font-size: 14px;
  font-weight: 900;
}

.qr-brand-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  line-height: 1.1;
}

.qr-brand-copy strong {
  font-size: 13px;
  font-weight: 800;
}

.qr-brand-copy span {
  margin-top: 4px;
  color: #94a3b8;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.qr-bank-logo-wrap {
  display: flex;
  width: 112px;
  height: 42px;
  align-items: center;
  justify-content: flex-end;
  flex: none;
}

.qr-bank-logo {
  display: block;
  max-width: 100%;
  max-height: 38px;
  object-fit: contain;
}

.qr-heading {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 24px 0 12px;
  text-align: center;
}

.qr-heading strong {
  color: #0f172a;
  font-size: 20px;
  font-weight: 850;
  letter-spacing: -0.025em;
}

.qr-heading span {
  max-width: 280px;
  overflow: hidden;
  margin-top: 5px;
  color: #64748b;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qr-code-shell {
  position: relative;
  width: min(100%, 296px);
  box-sizing: border-box;
  margin: 0 auto;
  padding: 12px;
  border-radius: 22px;
  background: #fff;
  box-shadow:
    0 15px 35px rgba(79, 70, 229, 0.08),
    inset 0 0 0 1px rgba(226, 232, 240, 0.9);
}

.qr-code-image {
  display: block;
  width: 100%;
  border-radius: 10px;
  object-fit: contain;
}

.qr-corner {
  position: absolute;
  z-index: 1;
  width: 24px;
  height: 24px;
  pointer-events: none;
}

.qr-corner-tl {
  top: -4px;
  left: -4px;
  border-top: 3px solid #7c3aed;
  border-left: 3px solid #7c3aed;
  border-radius: 9px 0 0;
}

.qr-corner-tr {
  top: -4px;
  right: -4px;
  border-top: 3px solid #2563eb;
  border-right: 3px solid #2563eb;
  border-radius: 0 9px 0 0;
}

.qr-corner-bl {
  bottom: -4px;
  left: -4px;
  border-bottom: 3px solid #7c3aed;
  border-left: 3px solid #7c3aed;
  border-radius: 0 0 0 9px;
}

.qr-corner-br {
  right: -4px;
  bottom: -4px;
  border-right: 3px solid #2563eb;
  border-bottom: 3px solid #2563eb;
  border-radius: 0 0 9px;
}

.qr-recipient {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 18px;
  text-align: center;
}

.qr-recipient span {
  color: #94a3b8;
  font-size: 9px;
  font-weight: 600;
}

.qr-recipient strong {
  max-width: 100%;
  margin-top: 5px;
  overflow-wrap: anywhere;
  color: #0f172a;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: clamp(19px, 5.5vw, 24px);
  font-weight: 850;
  letter-spacing: 0.03em;
}

.qr-amount-pill {
  width: fit-content;
  max-width: 100%;
  box-sizing: border-box;
  margin: 14px auto 0;
  padding: 9px 16px;
  overflow: hidden;
  border-radius: 999px;
  background: #f5f3ff;
  color: #6d28d9;
  font-size: 16px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qr-note {
  max-width: 100%;
  margin-top: 12px;
  overflow: hidden;
  color: #64748b;
  font-size: 11px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qr-copyright {
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
  color: #a1a1aa;
  font-size: 8px;
  font-weight: 500;
  letter-spacing: 0.02em;
  text-align: center;
}

@media (max-width: 480px) {
  .bank-summary {
    align-items: flex-start;
  }

  .bank-bin {
    display: none;
  }

  .qr-preview-stage {
    padding: 12px;
    border-radius: 22px;
  }

  .qr-payment-card {
    padding: 18px 14px 14px;
    border-radius: 22px;
  }

  .qr-brand-mark {
    width: 34px;
    height: 34px;
  }

  .qr-bank-logo-wrap {
    width: 88px;
    height: 38px;
  }

  .qr-heading {
    margin-top: 20px;
  }

  .qr-heading strong {
    font-size: 18px;
  }

  .qr-code-shell {
    width: min(100%, 286px);
    padding: 10px;
  }
}
</style>
