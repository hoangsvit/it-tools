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

const VALIDATION_MESSAGE_KEYS: Record<string, string> = {
  'Please choose a bank from the list.': 'validation.chooseBank',
  'Account number or alias must contain 1-25 letters or digits.': 'validation.account',
  'Amount must be a positive VND integer with at most 13 digits.': 'validation.amount',
  'Transfer content must be 25 characters or fewer.': 'validation.contentLength',
  'Transfer content must use unaccented letters, numbers and spaces only.': 'validation.contentCharset',
};

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

const localizedValidationErrors = computed(() => validation.value.errors.map((error) => {
  const key = VALIDATION_MESSAGE_KEYS[error];
  return key ? t(key) : error;
}));

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

  const rendered = await QRCode.toDataURL(payload, {
    width: 640,
    margin: 4,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#101828',
      light: '#ffffff',
    },
  });

  if (qrPayload.value === payload) {
    qrDataUrl.value = rendered;
  }
}, { immediate: true });

watch([selectedBankBin, accountNo, amount, description], () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(`${STORAGE_PREFIX}:bank`, selectedBankBin.value);
  window.localStorage.setItem(`${STORAGE_PREFIX}:account`, accountNo.value);
  window.localStorage.setItem(`${STORAGE_PREFIX}:amount`, amount.value);
  window.localStorage.setItem(`${STORAGE_PREFIX}:content`, description.value);
});

function restoreForm() {
  selectedBankBin.value = window.localStorage.getItem(`${STORAGE_PREFIX}:bank`) ?? '';
  accountNo.value = window.localStorage.getItem(`${STORAGE_PREFIX}:account`) ?? '';
  amount.value = normalizeVietQrAmount(window.localStorage.getItem(`${STORAGE_PREFIX}:amount`) ?? '');
  description.value = window.localStorage.getItem(`${STORAGE_PREFIX}:content`) ?? '';
}

function resetForm() {
  selectedBankBin.value = '';
  accountNo.value = '';
  amount.value = '';
  description.value = '';
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

async function loadRemoteImage(source?: string) {
  if (!source) {
    return null;
  }

  try {
    return await loadImage(source, true);
  }
  catch {
    return null;
  }
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

function drawContainedImage(
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

function drawCanvasLabel(
  context: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  accent = false,
) {
  context.textAlign = 'left';
  context.fillStyle = '#667085';
  context.font = '500 16px sans-serif';
  context.fillText(label, x, y, maxWidth);

  context.fillStyle = accent ? '#4f46e5' : '#101828';
  context.font = `${accent ? '700' : '600'} 24px sans-serif`;
  context.fillText(value, x, y + 34, maxWidth);
}

async function createShareImage() {
  if (!qrDataUrl.value || !selectedBank.value) {
    return '';
  }

  const qrImage = await loadImage(qrDataUrl.value);
  const bankLogo = await loadRemoteImage(selectedBank.value.logo);

  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1220;
  const context = canvas.getContext('2d');
  if (!context) {
    return '';
  }

  const background = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  background.addColorStop(0, '#f6f7ff');
  background.addColorStop(0.55, '#f8f5ff');
  background.addColorStop(1, '#f4f7fb');
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.shadowColor = 'rgba(16, 24, 40, 0.14)';
  context.shadowBlur = 44;
  context.shadowOffsetY = 20;
  fillRoundedRect(context, 70, 52, 760, 1110, 44, '#ffffff');
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;

  if (bankLogo) {
    drawContainedImage(context, bankLogo, 235, 92, 430, 92);
  }
  else {
    context.textAlign = 'center';
    context.fillStyle = '#101828';
    context.font = '700 38px sans-serif';
    context.fillText(selectedBank.value.shortName, 450, 150, 560);
  }

  fillRoundedRect(context, 338, 198, 224, 44, 22, '#f2f4f7');
  context.textAlign = 'center';
  context.fillStyle = '#475467';
  context.font = '600 14px sans-serif';
  context.fillText(t('compatible'), 450, 226, 190);

  fillRoundedRect(context, 142, 278, 616, 616, 34, '#ffffff');
  context.drawImage(qrImage, 164, 300, 572, 572);

  context.setLineDash([10, 10]);
  context.strokeStyle = '#d0d5dd';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(108, 930);
  context.lineTo(792, 930);
  context.stroke();
  context.setLineDash([]);

  context.fillStyle = '#f7f6ff';
  context.beginPath();
  context.arc(70, 930, 18, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(830, 930, 18, 0, Math.PI * 2);
  context.fill();

  context.textAlign = 'center';
  context.fillStyle = '#667085';
  context.font = '600 15px sans-serif';
  context.fillText(selectedBank.value.shortName, 450, 976, 620);
  context.fillStyle = '#101828';
  context.font = '700 31px monospace';
  context.fillText(accountNo.value, 450, 1018, 650);

  drawCanvasLabel(context, t('amount'), previewAmount.value, 120, 1064, 300, Boolean(amount.value));
  drawCanvasLabel(context, t('content'), previewDescription.value, 480, 1064, 300);

  context.textAlign = 'center';
  context.fillStyle = '#98a2b3';
  context.font = '500 14px sans-serif';
  context.fillText(`© ${COPYRIGHT_YEAR} ePlus.DEV · tools.eplus.dev`, 450, 1140);

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

    <div grid grid-cols-1 gap-5 class="lg:grid-cols-[minmax(0,1fr)_460px]">
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
              <div class="bank-logo-wrap">
                <img
                  :src="selectedBank.logo"
                  :alt="t('bankLogoAlt', { bank: selectedBank.shortName })"
                  class="bank-logo"
                >
              </div>
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
              <div class="qr-receive-card">
                <div class="qr-identity">
                  <img
                    :src="selectedBank.logo"
                    :alt="t('bankLogoAlt', { bank: selectedBank.shortName })"
                    class="qr-bank-logo"
                  >
                  <div class="qr-compatible-pill">
                    {{ t('compatible') }}
                  </div>
                </div>

                <div class="qr-code-frame">
                  <img :src="qrDataUrl" alt="VietQR bank transfer code" class="qr-code-image">
                </div>

                <div class="qr-action-bar">
                  <button type="button" class="qr-action" @click="downloadQrImage">
                    <span class="qr-action-icon">↓</span>
                    <span>{{ t('downloadPng') }}</span>
                  </button>
                  <div class="qr-action-divider" />
                  <button type="button" class="qr-action" @click="copyQrImage">
                    <span class="qr-action-icon">⧉</span>
                    <span>{{ copyStatusLabel }}</span>
                  </button>
                </div>

                <div class="qr-tear-line" />

                <div class="qr-recipient">
                  <div class="qr-bank-short-name">
                    {{ selectedBank.shortName }}
                  </div>
                  <div class="qr-account-number">
                    {{ accountNo }}
                  </div>
                </div>

                <div class="qr-payment-details">
                  <div class="qr-payment-item">
                    <span>{{ t('amount') }}</span>
                    <strong :class="{ 'is-accent': amount }">{{ previewAmount }}</strong>
                  </div>
                  <div class="qr-payment-item">
                    <span>{{ t('content') }}</span>
                    <strong>{{ previewDescription }}</strong>
                  </div>
                </div>

                <div class="qr-copyright">
                  © {{ COPYRIGHT_YEAR }} ePlus.DEV · tools.eplus.dev
                </div>
              </div>
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

.bank-logo-wrap {
  display: flex;
  width: 96px;
  height: 48px;
  align-items: center;
  justify-content: center;
  flex: none;
  padding: 4px 8px;
  border-radius: 10px;
  background: #fff;
}

.bank-logo {
  max-width: 100%;
  max-height: 38px;
  object-fit: contain;
}

.bank-bin {
  flex: none;
  color: #667085;
  font-family: monospace;
  font-size: 12px;
}

.qr-preview-stage {
  padding: 18px;
  border: 1px solid rgba(99, 102, 241, 0.1);
  border-radius: 30px;
  background:
    radial-gradient(circle at 18% 12%, rgba(236, 72, 153, 0.08), transparent 30%),
    radial-gradient(circle at 84% 4%, rgba(59, 130, 246, 0.1), transparent 34%),
    linear-gradient(180deg, #f7f5ff 0%, #f8faff 52%, #f5f7fb 100%);
}

.qr-receive-card {
  position: relative;
  width: 100%;
  max-width: 402px;
  overflow: hidden;
  box-sizing: border-box;
  margin: 0 auto;
  border: 1px solid #eaecf0;
  border-radius: 28px;
  background: #fff;
  box-shadow: 0 20px 54px rgba(16, 24, 40, 0.13);
  color: #101828;
}

.qr-identity {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 22px 8px;
}

.qr-bank-logo {
  display: block;
  width: auto;
  max-width: 230px;
  height: 66px;
  object-fit: contain;
  object-position: center;
}

.qr-compatible-pill {
  padding: 5px 11px;
  border: 1px solid #e4e7ec;
  border-radius: 999px;
  background: #f9fafb;
  color: #667085;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.qr-code-frame {
  width: min(calc(100% - 46px), 326px);
  margin: 4px auto 10px;
  box-sizing: border-box;
  padding: 6px;
  border-radius: 12px;
  background: #fff;
}

.qr-code-image {
  display: block;
  width: 100%;
  object-fit: contain;
}

.qr-action-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
  align-items: stretch;
  margin: 0 18px 16px;
  overflow: hidden;
  border: 1px solid #eaecf0;
  border-radius: 14px;
  background: #f9fafb;
}

.qr-action {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 10px;
  border: 0;
  background: transparent;
  color: #344054;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  transition: background 0.15s ease, color 0.15s ease;
}

.qr-action:hover {
  background: #f2f4f7;
  color: #4f46e5;
}

.qr-action-icon {
  color: #4f46e5;
  font-size: 17px;
  line-height: 1;
}

.qr-action-divider {
  width: 1px;
  background: #d0d5dd;
}

.qr-tear-line {
  position: relative;
  height: 1px;
  margin: 6px 24px 0;
  border-top: 1px dashed #d0d5dd;
}

.qr-tear-line::before,
.qr-tear-line::after {
  position: absolute;
  top: 50%;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #f7f6ff;
  content: '';
  transform: translateY(-50%);
}

.qr-tear-line::before {
  left: -36px;
}

.qr-tear-line::after {
  right: -36px;
}

.qr-recipient {
  padding: 22px 22px 14px;
  text-align: center;
}

.qr-bank-short-name {
  color: #667085;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.qr-account-number {
  margin-top: 7px;
  overflow-wrap: anywhere;
  color: #101828;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: clamp(20px, 6vw, 27px);
  font-weight: 800;
  letter-spacing: 0.025em;
}

.qr-payment-details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 0 18px 18px;
}

.qr-payment-item {
  min-width: 0;
  padding: 12px 13px;
  border: 1px solid #eaecf0;
  border-radius: 14px;
  background: #f9fafb;
}

.qr-payment-item span {
  display: block;
  margin-bottom: 4px;
  color: #667085;
  font-size: 10px;
}

.qr-payment-item strong {
  display: block;
  overflow: hidden;
  color: #344054;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qr-payment-item strong.is-accent {
  color: #4f46e5;
  font-size: 14px;
}

.qr-copyright {
  padding: 0 16px 16px;
  color: #98a2b3;
  font-size: 9px;
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
    padding: 10px;
    border-radius: 22px;
  }

  .qr-receive-card {
    border-radius: 22px;
  }

  .qr-identity {
    padding-top: 20px;
  }

  .qr-bank-logo {
    max-width: 190px;
    height: 56px;
  }

  .qr-code-frame {
    width: min(calc(100% - 32px), 310px);
  }

  .qr-action-bar {
    margin-inline: 12px;
  }

  .qr-action {
    gap: 5px;
    padding-inline: 6px;
    font-size: 11px;
  }

  .qr-payment-details {
    grid-template-columns: 1fr;
    gap: 8px;
    padding-inline: 13px;
  }

  .qr-payment-item strong {
    white-space: normal;
  }
}
</style>
