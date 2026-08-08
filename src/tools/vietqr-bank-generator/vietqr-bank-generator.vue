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

function drawCanvasInfoRow(
  context: CanvasRenderingContext2D,
  label: string,
  value: string,
  y: number,
  bold = false,
) {
  context.textAlign = 'left';
  context.fillStyle = '#6b7280';
  context.font = '500 15px sans-serif';
  context.fillText(label, 142, y);

  context.textAlign = 'right';
  context.fillStyle = '#111827';
  context.font = `${bold ? '700' : '600'} 18px sans-serif`;
  context.fillText(value, 698, y, 380);
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
  canvas.height = 1100;
  const context = canvas.getContext('2d');
  if (!context) {
    return '';
  }

  context.fillStyle = '#f3f4f6';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.shadowColor = 'rgba(17, 24, 39, 0.10)';
  context.shadowBlur = 32;
  context.shadowOffsetY = 14;
  fillRoundedRect(context, 92, 48, 656, 1004, 30, '#ffffff');
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;

  if (bankLogo) {
    drawContainImage(context, bankLogo, 270, 92, 300, 72);
  }
  else {
    context.textAlign = 'center';
    context.fillStyle = '#111827';
    context.font = '800 30px sans-serif';
    context.fillText(selectedBank.value.shortName, 420, 136, 300);
  }

  context.textAlign = 'center';
  context.fillStyle = '#6b7280';
  context.font = '500 14px sans-serif';
  context.fillText(selectedBank.value.name, 420, 190, 540);

  context.fillStyle = '#111827';
  context.font = '700 28px sans-serif';
  context.fillText(t('scanTitle'), 420, 238, 520);

  context.strokeStyle = '#e5e7eb';
  context.lineWidth = 2;
  roundedRect(context, 174, 270, 492, 492, 22);
  context.stroke();
  context.drawImage(qrImage, 190, 286, 460, 460);

  context.fillStyle = '#6b7280';
  context.font = '500 14px sans-serif';
  context.fillText(t('accountLabel'), 420, 810);
  context.fillStyle = '#111827';
  context.font = '800 30px monospace';
  context.fillText(accountNo.value, 420, 851, 560);

  context.strokeStyle = '#e5e7eb';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(142, 892);
  context.lineTo(698, 892);
  context.stroke();

  let rowY = 930;
  if (amount.value) {
    drawCanvasInfoRow(context, t('amount'), previewAmount.value, rowY, true);
    rowY += 48;
  }
  if (description.value) {
    drawCanvasInfoRow(context, t('content'), previewDescription.value, rowY);
  }

  context.textAlign = 'center';
  context.fillStyle = '#9ca3af';
  context.font = '500 12px sans-serif';
  context.fillText(`© ${COPYRIGHT_YEAR} ePlus.DEV · tools.eplus.dev`, 420, 1022);

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

    <div grid grid-cols-1 gap-5 class="lg:grid-cols-[minmax(0,1fr)_420px]">
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
              <div class="bank-logo-box">
                <img
                  :src="selectedBank.logo"
                  :alt="t('bankLogoAlt', { bank: selectedBank.shortName })"
                  class="bank-logo"
                >
              </div>
              <div min-w-0 flex-1>
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
              maxlength="25"
            />

            <div grid grid-cols-1 gap-4 class="md:grid-cols-2">
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
            </div>

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

      <div class="preview-column">
        <c-card :title="t('previewTitle')">
          <div v-if="qrDataUrl && selectedBank" flex flex-col gap-4>
            <div class="qr-preview-stage">
              <div class="qr-payment-card">
                <div class="qr-bank-header">
                  <img
                    :src="selectedBank.logo"
                    :alt="t('bankLogoAlt', { bank: selectedBank.shortName })"
                    class="qr-bank-logo"
                  >
                  <div class="qr-bank-name">
                    {{ selectedBank.name }}
                  </div>
                </div>

                <div class="qr-heading">
                  {{ t('scanTitle') }}
                </div>

                <div class="qr-code-shell">
                  <img :src="qrDataUrl" alt="VietQR bank transfer code" class="qr-code-image">
                </div>

                <div class="qr-account">
                  <span>{{ t('accountLabel') }}</span>
                  <strong>{{ accountNo }}</strong>
                </div>

                <div v-if="amount || description" class="qr-details">
                  <div v-if="amount" class="qr-detail-row">
                    <span>{{ t('amount') }}</span>
                    <strong class="qr-amount">{{ previewAmount }}</strong>
                  </div>
                  <div v-if="description" class="qr-detail-row">
                    <span>{{ t('content') }}</span>
                    <strong>{{ previewDescription }}</strong>
                  </div>
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
  padding: 13px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}

.bank-logo-box {
  display: flex;
  width: 76px;
  height: 46px;
  align-items: center;
  justify-content: center;
  flex: none;
  border: 1px solid #f0f1f3;
  border-radius: 10px;
  background: #fff;
}

.bank-logo {
  display: block;
  max-width: 64px;
  max-height: 34px;
  object-fit: contain;
}

.bank-summary-title {
  color: var(--c-text-color, #111827);
  font-size: 14px;
  font-weight: 700;
}

.bank-summary-name {
  max-width: 100%;
  overflow: hidden;
  margin-top: 3px;
  opacity: 0.65;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bank-bin {
  flex: none;
  padding: 5px 8px;
  border-radius: 7px;
  background: rgba(148, 163, 184, 0.10);
  font-family: monospace;
  font-size: 11px;
  opacity: 0.7;
}

.preview-column {
  min-width: 0;
}

.qr-preview-stage {
  padding: 18px;
  border-radius: 20px;
  background: #f3f4f6;
}

.qr-payment-card {
  width: 100%;
  max-width: 360px;
  box-sizing: border-box;
  margin: 0 auto;
  padding: 24px 22px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(17, 24, 39, 0.08);
  color: #111827;
}

.qr-bank-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 62px;
  justify-content: center;
  text-align: center;
}

.qr-bank-logo {
  display: block;
  max-width: 138px;
  max-height: 46px;
  object-fit: contain;
}

.qr-bank-name {
  max-width: 100%;
  overflow: hidden;
  margin-top: 7px;
  color: #6b7280;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qr-heading {
  margin: 18px 0 12px;
  color: #374151;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
}

.qr-code-shell {
  width: min(100%, 292px);
  box-sizing: border-box;
  margin: 0 auto;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #fff;
}

.qr-code-image {
  display: block;
  width: 100%;
  object-fit: contain;
}

.qr-account {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 18px;
  text-align: center;
}

.qr-account span {
  color: #9ca3af;
  font-size: 10px;
  font-weight: 500;
}

.qr-account strong {
  max-width: 100%;
  margin-top: 5px;
  overflow-wrap: anywhere;
  color: #111827;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: clamp(19px, 5vw, 23px);
  font-weight: 750;
  letter-spacing: 0.02em;
}

.qr-details {
  margin-top: 18px;
  padding-top: 4px;
  border-top: 1px solid #f0f1f3;
}

.qr-detail-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.qr-detail-row:last-child {
  border-bottom: 0;
}

.qr-detail-row span {
  flex: none;
  color: #9ca3af;
  font-size: 10px;
}

.qr-detail-row strong {
  min-width: 0;
  overflow: hidden;
  color: #374151;
  font-size: 12px;
  font-weight: 600;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qr-detail-row .qr-amount {
  color: #111827;
  font-size: 15px;
  font-weight: 750;
}

.qr-copyright {
  margin-top: 14px;
  padding-top: 11px;
  border-top: 1px solid #f3f4f6;
  color: #b0b5bd;
  font-size: 8px;
  font-weight: 500;
  text-align: center;
}

@media (min-width: 1024px) {
  .preview-column {
    position: sticky;
    top: 18px;
    align-self: start;
  }
}

@media (max-width: 480px) {
  .bank-summary {
    align-items: flex-start;
  }

  .bank-bin {
    display: none;
  }

  .qr-preview-stage {
    padding: 10px;
    border-radius: 16px;
  }

  .qr-payment-card {
    padding: 20px 14px 12px;
    border-radius: 17px;
  }

  .qr-code-shell {
    width: min(100%, 280px);
    padding: 6px;
  }

  .qr-bank-logo {
    max-width: 124px;
    max-height: 42px;
  }
}
</style>
