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
      width: 720,
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
  fill: string,
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
  context.fillStyle = '#98a2b3';
  context.font = '500 14px sans-serif';
  context.fillText(label, 150, y);

  context.textAlign = 'right';
  context.fillStyle = '#101828';
  context.font = `${emphasize ? '700 20px' : '600 16px'} sans-serif`;
  context.fillText(value, 690, y, 400);
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

  context.fillStyle = '#f8fafc';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.shadowColor = 'rgba(16, 24, 40, 0.10)';
  context.shadowBlur = 34;
  context.shadowOffsetY = 14;
  fillRoundedRect(context, 92, 48, 656, 984, 32, '#ffffff');
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;

  if (bankLogo) {
    drawContainImage(context, bankLogo, 265, 90, 310, 74);
  }
  else {
    context.textAlign = 'center';
    context.fillStyle = '#101828';
    context.font = '700 28px sans-serif';
    context.fillText(selectedBank.value.shortName, 420, 136, 320);
  }

  context.textAlign = 'center';
  context.fillStyle = '#98a2b3';
  context.font = '500 13px sans-serif';
  context.fillText(selectedBank.value.name, 420, 188, 560);

  context.fillStyle = '#344054';
  context.font = '600 17px sans-serif';
  context.fillText(t('scanTitle'), 420, 230, 520);

  context.drawImage(qrImage, 172, 264, 496, 496);

  fillRoundedRect(context, 138, 790, 564, 92, 18, '#f8fafc');
  context.fillStyle = '#98a2b3';
  context.font = '500 13px sans-serif';
  context.fillText(t('accountLabel'), 420, 821);
  context.fillStyle = '#101828';
  context.font = '700 30px monospace';
  context.fillText(accountNo.value, 420, 858, 510);

  let rowY = 928;
  if (amount.value) {
    drawShareRow(context, t('amount'), previewAmount.value, rowY, true);
    rowY += 48;
  }
  if (description.value) {
    drawShareRow(context, t('content'), previewDescription.value, rowY);
  }

  context.textAlign = 'center';
  context.fillStyle = '#c0c4cc';
  context.font = '500 11px sans-serif';
  context.fillText(`© ${COPYRIGHT_YEAR} ePlus.DEV · tools.eplus.dev`, 420, 1002);

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

    <div grid grid-cols-1 gap-5 class="lg:grid-cols-[minmax(0,1fr)_430px]">
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
          <div v-if="qrDataUrl && selectedBank" class="preview-content">
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

            <div class="scan-label">
              {{ t('scanTitle') }}
            </div>

            <div class="qr-wrap">
              <img :src="qrDataUrl" alt="VietQR bank transfer code" class="qr-code-image">
            </div>

            <div class="account-panel">
              <div class="account-label">
                {{ t('accountLabel') }}
              </div>
              <div class="account-value">
                {{ accountNo }}
              </div>
            </div>

            <div v-if="amount || description" class="payment-meta">
              <div v-if="amount" class="meta-row">
                <span>{{ t('amount') }}</span>
                <strong class="amount-value">{{ previewAmount }}</strong>
              </div>
              <div v-if="description" class="meta-row">
                <span>{{ t('content') }}</span>
                <strong>{{ previewDescription }}</strong>
              </div>
            </div>

            <div class="qr-copyright">
              © {{ COPYRIGHT_YEAR }} ePlus.DEV · tools.eplus.dev
            </div>

            <div class="qr-actions">
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
  padding: 12px 14px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 12px;
  background: rgba(148, 163, 184, 0.05);
}

.bank-logo-box {
  display: flex;
  width: 74px;
  height: 44px;
  align-items: center;
  justify-content: center;
  flex: none;
  border-radius: 9px;
  background: #fff;
}

.bank-logo {
  display: block;
  max-width: 62px;
  max-height: 32px;
  object-fit: contain;
}

.bank-summary-title {
  font-size: 14px;
  font-weight: 700;
}

.bank-summary-name {
  max-width: 100%;
  overflow: hidden;
  margin-top: 2px;
  opacity: 0.62;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bank-bin {
  flex: none;
  padding: 4px 7px;
  border-radius: 6px;
  background: rgba(148, 163, 184, 0.10);
  font-family: monospace;
  font-size: 11px;
  opacity: 0.7;
}

.preview-column {
  min-width: 0;
}

.preview-content {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 2px 10px 0;
}

.bank-brand {
  display: flex;
  min-height: 68px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.preview-bank-logo {
  display: block;
  max-width: 150px;
  max-height: 50px;
  object-fit: contain;
}

.preview-bank-name {
  max-width: 320px;
  overflow: hidden;
  margin-top: 6px;
  color: #98a2b3;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scan-label {
  margin: 18px 0 8px;
  color: #667085;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

.qr-wrap {
  width: min(100%, 318px);
  margin: 0 auto;
  padding: 2px;
  background: #fff;
}

.qr-code-image {
  display: block;
  width: 100%;
  object-fit: contain;
}

.account-panel {
  margin: 18px auto 0;
  width: min(100%, 340px);
  box-sizing: border-box;
  padding: 13px 16px 14px;
  border-radius: 14px;
  background: rgba(148, 163, 184, 0.08);
  text-align: center;
}

.account-label {
  color: #98a2b3;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.account-value {
  margin-top: 5px;
  overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: clamp(20px, 5vw, 24px);
  font-weight: 750;
  letter-spacing: 0.025em;
}

.payment-meta {
  width: min(100%, 340px);
  margin: 12px auto 0;
}

.meta-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
  padding: 9px 2px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.15);
}

.meta-row:last-child {
  border-bottom: 0;
}

.meta-row span {
  flex: none;
  color: #98a2b3;
  font-size: 10px;
}

.meta-row strong {
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  font-weight: 600;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta-row .amount-value {
  font-size: 16px;
  font-weight: 750;
}

.qr-copyright {
  width: min(100%, 340px);
  margin: 12px auto 0;
  padding-top: 10px;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
  color: #b0b5bd;
  font-size: 8px;
  text-align: center;
}

.qr-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin: 18px 0 14px;
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

  .preview-content {
    padding-inline: 0;
  }

  .preview-bank-logo {
    max-width: 132px;
    max-height: 44px;
  }

  .qr-wrap {
    width: min(100%, 300px);
  }

  .account-panel,
  .payment-meta,
  .qr-copyright {
    width: 100%;
  }
}
</style>
