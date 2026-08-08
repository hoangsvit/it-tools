<script setup lang="ts">
import QRCode from 'qrcode';
import bankDirectory from './banks.json';
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

const banks = [...bankDirectory.data]
  .sort((a, b) => a.shortName.localeCompare(b.shortName)) as VietQrBank[];
const selectedBankBin = ref('');
const accountNo = ref('');
const amount = ref('');
const description = ref('');
const qrDataUrl = ref('');
const copyStatus = ref('Copy QR image');

const bankOptions = computed(() => banks.map(bank => ({
  label: `${bankSearchLabel(bank)}${bank.transferSupported ? '' : ' · VietQR transfer unavailable'}`,
  value: bank.bin,
})));

const selectedBank = computed(() => banks.find(bank => bank.bin === selectedBankBin.value));
const selectedBankInfo = computed<CKeyValueListItems>(() => {
  if (!selectedBank.value) {
    return [];
  }

  const bank = selectedBank.value;
  return [
    { label: 'Bank', value: bank.name },
    { label: 'Short name', value: bank.shortName },
    { label: 'BIN / Acquirer ID', value: bank.bin },
    { label: 'NAPAS code', value: bank.code },
    { label: 'SWIFT / BIC', value: bank.swift_code || 'Not published' },
    { label: 'VietQR transfer supported', value: Boolean(bank.transferSupported), showCopyButton: false },
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

const previewTitle = computed(() => {
  if (!selectedBank.value || !accountNo.value) {
    return 'Bank transfer QR';
  }

  return `${selectedBank.value.shortName} · ${accountNo.value}`;
});

const previewAmount = computed(() => amount.value
  ? `${formatVietQrAmount(amount.value)} ₫`
  : 'Amount not specified');

const previewDescription = computed(() => description.value || 'Transfer content not specified');

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

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
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

function drawInfoRow(
  context: CanvasRenderingContext2D,
  label: string,
  value: string,
  y: number,
) {
  context.textAlign = 'left';
  context.fillStyle = '#667085';
  context.font = '500 18px sans-serif';
  context.fillText(label, 94, y);

  context.fillStyle = '#101828';
  context.font = '600 25px sans-serif';
  context.fillText(value, 94, y + 34, 712);
}

async function createShareImage() {
  if (!qrDataUrl.value) {
    return '';
  }

  const qrImage = await loadImage(qrDataUrl.value);
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1160;
  const context = canvas.getContext('2d');
  if (!context) {
    return '';
  }

  const background = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  background.addColorStop(0, '#f4f7ff');
  background.addColorStop(0.52, '#ffffff');
  background.addColorStop(1, '#f5f3ff');
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.globalAlpha = 0.35;
  const halo = context.createRadialGradient(80, 50, 20, 80, 50, 360);
  halo.addColorStop(0, '#7c5cff');
  halo.addColorStop(1, 'rgba(124, 92, 255, 0)');
  context.fillStyle = halo;
  context.fillRect(0, 0, 500, 430);
  context.globalAlpha = 1;

  context.shadowColor = 'rgba(16, 24, 40, 0.12)';
  context.shadowBlur = 34;
  context.shadowOffsetY = 14;
  fillRoundedRect(context, 52, 46, 796, 1064, 38, '#ffffff');
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;

  const headerGradient = context.createLinearGradient(72, 66, 828, 230);
  headerGradient.addColorStop(0, '#4f46e5');
  headerGradient.addColorStop(1, '#7c3aed');
  fillRoundedRect(context, 72, 66, 756, 154, 30, headerGradient);

  context.textAlign = 'left';
  context.fillStyle = '#ffffff';
  context.font = '700 29px sans-serif';
  context.fillText('ePlus.DEV', 104, 119);
  context.globalAlpha = 0.8;
  context.font = '500 17px sans-serif';
  context.fillText('BANK TRANSFER QR', 104, 151);
  context.globalAlpha = 1;

  context.textAlign = 'right';
  context.fillStyle = '#ffffff';
  context.font = '600 22px sans-serif';
  context.fillText(selectedBank.value?.shortName || 'BANK', 794, 128);
  context.globalAlpha = 0.76;
  context.font = '500 16px sans-serif';
  context.fillText(`BIN ${selectedBank.value?.bin || selectedBankBin.value}`, 794, 158);
  context.globalAlpha = 1;

  context.shadowColor = 'rgba(79, 70, 229, 0.18)';
  context.shadowBlur = 26;
  context.shadowOffsetY = 8;
  fillRoundedRect(context, 146, 256, 608, 608, 36, '#ffffff');
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;
  context.drawImage(qrImage, 170, 280, 560, 560);

  context.textAlign = 'center';
  context.fillStyle = '#475467';
  context.font = '500 16px sans-serif';
  context.fillText('Scan with a compatible banking app and verify before transfer', 450, 895);

  fillRoundedRect(context, 72, 928, 756, 126, 24, '#f8f9fc');
  drawInfoRow(context, 'Recipient account', accountNo.value, 965);

  context.textAlign = 'right';
  context.fillStyle = '#667085';
  context.font = '500 18px sans-serif';
  context.fillText('Amount', 790, 965);
  context.fillStyle = '#4f46e5';
  context.font = '700 25px sans-serif';
  context.fillText(previewAmount.value, 790, 999);

  context.textAlign = 'left';
  context.fillStyle = '#98a2b3';
  context.font = '500 15px sans-serif';
  context.fillText(previewDescription.value, 94, 1032, 696);

  context.textAlign = 'center';
  context.fillStyle = '#98a2b3';
  context.font = '500 15px sans-serif';
  context.fillText(`© ${COPYRIGHT_YEAR} ePlus.DEV · tools.eplus.dev`, 450, 1086);

  return canvas.toDataURL('image/png');
}

async function copyQrImage() {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    copyStatus.value = 'Clipboard image copy unsupported';
    return;
  }

  try {
    const image = await createShareImage();
    const blob = await (await fetch(image)).blob();
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    copyStatus.value = 'Copied';
  }
  catch {
    copyStatus.value = 'Copy failed';
  }

  window.setTimeout(() => {
    copyStatus.value = 'Copy QR image';
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
      The Vietnam bank directory is bundled with this app, so opening the tool does not call a bank-directory API. The VietQR/NAPAS payload and QR image are also generated locally in your browser.
    </n-alert>

    <div grid grid-cols-1 gap-5 class="lg:grid-cols-[minmax(0,1fr)_420px]">
      <div flex flex-col gap-5>
        <c-card title="Create VietQR bank transfer code">
          <div flex flex-col gap-4>
            <c-select
              v-model:value="selectedBankBin"
              :options="bankOptions"
              searchable
              label="Bank"
              placeholder="Search or choose a bank by name, BIN, code or SWIFT..."
            />

            <div v-if="selectedBank" class="bank-summary">
              <div class="bank-logo-wrap">
                <img :src="selectedBank.logo" :alt="`${selectedBank.shortName} logo`" class="bank-logo">
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
              This bank is included in the local directory, but the reference data does not mark it as supporting VietQR transfers. QR generation is disabled for this selection.
            </n-alert>

            <c-input-text
              v-model:value="accountNo"
              label="Account number"
              placeholder="Recipient account number / alias"
              maxlength="25"
            />

            <c-input-text
              v-model:value="formattedAmount"
              label="Amount (VND)"
              placeholder="Optional, up to 13 digits"
            />

            <c-input-text
              v-model:value="description"
              label="Transfer content"
              placeholder="Optional, max 25 unaccented characters"
              maxlength="25"
            />

            <n-alert v-if="!validation.valid && (selectedBankBin || accountNo || amount || description)" type="error" :bordered="false">
              <ul m-0 pl-5>
                <li v-for="error in validation.errors" :key="error">
                  {{ error }}
                </li>
              </ul>
            </n-alert>

            <div flex flex-wrap gap-3>
              <c-button @click="resetForm">
                Clear
              </c-button>
            </div>
          </div>
        </c-card>

        <c-card v-if="selectedBankInfo.length" title="Technical bank details">
          <div mb-3 text-sm op-65>
            These identifiers are filled automatically from the selected bank. You do not need to enter them.
          </div>
          <c-key-value-list :items="selectedBankInfo" />
        </c-card>

        <c-card v-if="qrPayload" title="VietQR payload">
          <c-text-copyable :value="qrPayload" font-mono break-all />
          <div mt-3 text-sm op-70>
            Point of initiation 11 · Service QRIBFTTA · Currency VND (704) · CRC16-CCITT
          </div>
        </c-card>
      </div>

      <div>
        <c-card title="Live preview">
          <div v-if="qrDataUrl" flex flex-col items-center gap-4>
            <div class="qr-share-card">
              <div class="qr-share-header">
                <div>
                  <div class="qr-brand">
                    ePlus.DEV
                  </div>
                  <div class="qr-eyebrow">
                    BANK TRANSFER QR
                  </div>
                </div>
                <div class="qr-bank-badge">
                  <strong>{{ selectedBank?.shortName }}</strong>
                  <span>BIN {{ selectedBank?.bin }}</span>
                </div>
              </div>

              <div class="qr-code-shell">
                <img :src="qrDataUrl" alt="VietQR bank transfer code" class="qr-code-image">
              </div>

              <div class="qr-verify-note">
                Scan with a compatible banking app and verify before transfer
              </div>

              <div class="qr-payment-info">
                <div class="qr-info-block">
                  <span>Recipient account</span>
                  <strong>{{ accountNo }}</strong>
                </div>
                <div class="qr-info-block qr-info-amount">
                  <span>Amount</span>
                  <strong>{{ previewAmount }}</strong>
                </div>
              </div>

              <div class="qr-description">
                {{ previewDescription }}
              </div>

              <div class="qr-copyright">
                © {{ COPYRIGHT_YEAR }} ePlus.DEV · tools.eplus.dev
              </div>
            </div>

            <div flex flex-wrap justify-center gap-3>
              <c-button @click="copyQrImage">
                {{ copyStatus }}
              </c-button>
              <c-button @click="downloadQrImage">
                Download PNG
              </c-button>
            </div>

            <n-alert type="warning" :bordered="false">
              Always scan and verify the bank, recipient account, amount and transfer content in your banking app before confirming a transfer.
            </n-alert>
          </div>

          <div v-else py-12 text-center op-60>
            Select a VietQR-supported bank and enter a valid account number to generate VietQR instantly.
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
  padding: 14px;
  border: 1px solid rgba(99, 102, 241, 0.16);
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.06), rgba(139, 92, 246, 0.03));
}

.bank-logo-wrap {
  display: grid;
  width: 54px;
  height: 54px;
  flex: 0 0 auto;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  background: #fff;
}

.bank-logo {
  width: 44px;
  height: 36px;
  object-fit: contain;
}

.bank-bin {
  flex: 0 0 auto;
  padding: 6px 9px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.1);
  color: #4f46e5;
  font-size: 12px;
  font-weight: 700;
}

.qr-share-card {
  box-sizing: border-box;
  width: 100%;
  max-width: 380px;
  overflow: hidden;
  padding: 14px;
  border: 1px solid rgba(99, 102, 241, 0.14);
  border-radius: 26px;
  background:
    radial-gradient(circle at 10% 0%, rgba(124, 92, 255, 0.14), transparent 34%),
    linear-gradient(145deg, #f7f9ff 0%, #fff 48%, #f7f4ff 100%);
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.12);
}

.qr-share-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 17px 18px;
  border-radius: 18px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
}

.qr-brand {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.qr-eyebrow {
  margin-top: 3px;
  opacity: 0.78;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.qr-bank-badge {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
}

.qr-bank-badge strong {
  max-width: 130px;
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qr-bank-badge span {
  margin-top: 2px;
  opacity: 0.72;
  font-size: 9px;
}

.qr-code-shell {
  width: calc(100% - 28px);
  margin: 18px auto 0;
  padding: 10px;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 12px 30px rgba(79, 70, 229, 0.13);
}

.qr-code-image {
  display: block;
  width: 100%;
  border-radius: 16px;
  object-fit: contain;
}

.qr-verify-note {
  margin: 12px 14px 0;
  color: #667085;
  font-size: 10px;
  line-height: 1.45;
  text-align: center;
}

.qr-payment-info {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 10px;
  margin: 14px 2px 0;
  padding: 13px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.88);
}

.qr-info-block {
  min-width: 0;
}

.qr-info-block span {
  display: block;
  margin-bottom: 3px;
  color: #98a2b3;
  font-size: 9px;
  font-weight: 600;
}

.qr-info-block strong {
  display: block;
  overflow: hidden;
  color: #101828;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qr-info-amount {
  text-align: right;
}

.qr-info-amount strong {
  color: #4f46e5;
}

.qr-description {
  margin: 8px 16px 0;
  overflow: hidden;
  color: #667085;
  font-size: 10px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qr-copyright {
  margin-top: 14px;
  padding-bottom: 2px;
  color: #98a2b3;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-align: center;
}

@media (max-width: 480px) {
  .qr-share-card {
    max-width: 100%;
    border-radius: 22px;
  }

  .qr-share-header {
    padding: 15px;
  }

  .qr-payment-info {
    grid-template-columns: 1fr;
  }

  .qr-info-amount {
    text-align: left;
  }
}
</style>
