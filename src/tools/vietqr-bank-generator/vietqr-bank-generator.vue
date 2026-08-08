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
const COPYRIGHT_YEAR = 2026;
const VIETQR_LOGO_URL = 'https://upload.wikimedia.org/wikipedia/commons/6/68/VietQR_Logo.svg';

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

function drawInfoRow(
  context: CanvasRenderingContext2D,
  label: string,
  value: string,
  y: number,
  accent = false,
) {
  context.textAlign = 'left';
  context.fillStyle = '#667085';
  context.font = '500 17px sans-serif';
  context.fillText(label, 110, y);

  context.fillStyle = accent ? '#155eef' : '#101828';
  context.font = `${accent ? '700' : '600'} 25px sans-serif`;
  context.fillText(value, 110, y + 34, 680);
}

async function createShareImage() {
  if (!qrDataUrl.value || !selectedBank.value) {
    return '';
  }

  const qrImage = await loadImage(qrDataUrl.value);
  const [bankLogo, vietQrLogo] = await Promise.all([
    loadRemoteImage(selectedBank.value.logo),
    loadRemoteImage(VIETQR_LOGO_URL),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1240;
  const context = canvas.getContext('2d');
  if (!context) {
    return '';
  }

  const background = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  background.addColorStop(0, '#f8fafc');
  background.addColorStop(1, '#eef4ff');
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.shadowColor = 'rgba(16, 24, 40, 0.12)';
  context.shadowBlur = 36;
  context.shadowOffsetY = 16;
  fillRoundedRect(context, 52, 42, 796, 1148, 40, '#ffffff');
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;

  fillRoundedRect(context, 76, 70, 748, 185, 30, '#f8fafc');

  if (bankLogo) {
    drawContainedImage(context, bankLogo, 102, 94, 330, 82);
  }
  else {
    context.textAlign = 'left';
    context.fillStyle = '#101828';
    context.font = '700 34px sans-serif';
    context.fillText(selectedBank.value.shortName, 108, 145, 330);
  }

  context.textAlign = 'left';
  context.fillStyle = '#344054';
  context.font = '600 18px sans-serif';
  context.fillText(selectedBank.value.shortName, 108, 205, 360);
  context.fillStyle = '#667085';
  context.font = '500 15px sans-serif';
  context.fillText(selectedBank.value.name, 108, 229, 430);

  fillRoundedRect(context, 565, 98, 224, 98, 22, '#ffffff');
  if (vietQrLogo) {
    drawContainedImage(context, vietQrLogo, 594, 112, 166, 42);
  }
  else {
    context.textAlign = 'center';
    context.fillStyle = '#0b63ce';
    context.font = '700 24px sans-serif';
    context.fillText('VietQR', 677, 143);
  }
  context.textAlign = 'center';
  context.fillStyle = '#475467';
  context.font = '500 14px sans-serif';
  context.fillText(t('compatible'), 677, 178, 190);

  context.textAlign = 'center';
  context.fillStyle = '#101828';
  context.font = '700 27px sans-serif';
  context.fillText(t('scanTitle'), 450, 302);

  context.shadowColor = 'rgba(21, 94, 239, 0.14)';
  context.shadowBlur = 24;
  context.shadowOffsetY = 8;
  fillRoundedRect(context, 146, 334, 608, 608, 36, '#ffffff');
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;
  context.drawImage(qrImage, 170, 358, 560, 560);

  fillRoundedRect(context, 76, 978, 748, 144, 24, '#f8fafc');
  drawInfoRow(context, t('account'), accountNo.value, 1014);

  context.textAlign = 'right';
  context.fillStyle = '#667085';
  context.font = '500 17px sans-serif';
  context.fillText(t('amount'), 790, 1014);
  context.fillStyle = '#155eef';
  context.font = '700 25px sans-serif';
  context.fillText(previewAmount.value, 790, 1048, 310);

  context.textAlign = 'left';
  context.fillStyle = '#667085';
  context.font = '500 15px sans-serif';
  context.fillText(`${t('content')}: ${previewDescription.value}`, 110, 1090, 670);

  context.textAlign = 'center';
  context.fillStyle = '#98a2b3';
  context.font = '500 14px sans-serif';
  context.fillText(`${t('generatedBy')} tools.eplus.dev · © ${COPYRIGHT_YEAR} ePlus.DEV`, 450, 1158);

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
          <div v-if="qrDataUrl && selectedBank" flex flex-col items-center gap-4>
            <div class="qr-share-card">
              <div class="qr-bank-header">
                <div class="qr-bank-primary">
                  <img
                    :src="selectedBank.logo"
                    :alt="t('bankLogoAlt', { bank: selectedBank.shortName })"
                    class="qr-bank-logo"
                  >
                  <div class="qr-bank-name">
                    {{ selectedBank.shortName }}
                  </div>
                  <div class="qr-bank-full-name">
                    {{ selectedBank.name }}
                  </div>
                </div>

                <div class="vietqr-badge">
                  <img :src="VIETQR_LOGO_URL" alt="VietQR" class="vietqr-logo">
                  <span>{{ t('compatible') }}</span>
                </div>
              </div>

              <div class="qr-scan-title">
                {{ t('scanTitle') }}
              </div>

              <div class="qr-code-frame">
                <img :src="qrDataUrl" alt="VietQR bank transfer code" class="qr-code-image">
              </div>

              <div class="qr-details">
                <div class="qr-detail-row qr-detail-account">
                  <span>{{ t('account') }}</span>
                  <strong>{{ accountNo }}</strong>
                </div>
                <div class="qr-detail-row">
                  <span>{{ t('amount') }}</span>
                  <strong class="qr-amount">{{ previewAmount }}</strong>
                </div>
                <div class="qr-detail-row">
                  <span>{{ t('content') }}</span>
                  <strong>{{ previewDescription }}</strong>
                </div>
              </div>

              <div class="qr-copyright">
                {{ t('generatedBy') }} tools.eplus.dev · © {{ COPYRIGHT_YEAR }} ePlus.DEV
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

.qr-share-card {
  width: 100%;
  max-width: 390px;
  overflow: hidden;
  box-sizing: border-box;
  padding: 18px;
  border: 1px solid #e4e7ec;
  border-radius: 26px;
  background: #fff;
  box-shadow: 0 18px 44px rgba(16, 24, 40, 0.12);
  color: #101828;
}

.qr-bank-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 16px;
  border-radius: 18px;
  background: #f8fafc;
}

.qr-bank-primary {
  min-width: 0;
  flex: 1;
}

.qr-bank-logo {
  display: block;
  width: auto;
  max-width: 190px;
  height: 52px;
  object-fit: contain;
  object-position: left center;
}

.qr-bank-name {
  margin-top: 10px;
  font-size: 16px;
  font-weight: 700;
}

.qr-bank-full-name {
  margin-top: 2px;
  overflow: hidden;
  color: #667085;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vietqr-badge {
  display: flex;
  min-width: 112px;
  flex: none;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 9px 10px;
  border: 1px solid #e4e7ec;
  border-radius: 14px;
  background: #fff;
  color: #475467;
  font-size: 10px;
  font-weight: 600;
  text-align: center;
}

.vietqr-logo {
  width: 96px;
  height: 28px;
  object-fit: contain;
}

.qr-scan-title {
  margin: 18px 0 12px;
  font-size: 18px;
  font-weight: 700;
  text-align: center;
}

.qr-code-frame {
  width: min(100%, 330px);
  margin: 0 auto;
  box-sizing: border-box;
  padding: 10px;
  border: 1px solid #eaecf0;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(21, 94, 239, 0.08);
}

.qr-code-image {
  display: block;
  width: 100%;
  object-fit: contain;
}

.qr-details {
  margin-top: 16px;
  overflow: hidden;
  border: 1px solid #eaecf0;
  border-radius: 16px;
  background: #f9fafb;
}

.qr-detail-row {
  display: grid;
  grid-template-columns: minmax(88px, auto) minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  padding: 10px 13px;
  border-top: 1px solid #eaecf0;
}

.qr-detail-row:first-child {
  border-top: 0;
}

.qr-detail-row span {
  color: #667085;
  font-size: 11px;
}

.qr-detail-row strong {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 13px;
  text-align: right;
}

.qr-detail-account strong {
  font-family: monospace;
  letter-spacing: 0.02em;
}

.qr-detail-row .qr-amount {
  color: #155eef;
  font-size: 15px;
}

.qr-copyright {
  margin-top: 13px;
  color: #98a2b3;
  font-size: 10px;
  text-align: center;
}

@media (max-width: 480px) {
  .bank-summary {
    align-items: flex-start;
  }

  .bank-bin {
    display: none;
  }

  .qr-share-card {
    padding: 13px;
    border-radius: 20px;
  }

  .qr-bank-header {
    gap: 10px;
    padding: 13px;
  }

  .qr-bank-logo {
    max-width: 148px;
    height: 44px;
  }

  .vietqr-badge {
    min-width: 92px;
    padding: 8px;
  }

  .vietqr-logo {
    width: 78px;
    height: 24px;
  }
}
</style>
