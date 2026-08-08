<script setup lang="ts">
import QRCode from 'qrcode';
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

const banks = ref<VietQrBank[]>([]);
const banksLoading = ref(false);
const banksError = ref('');
const selectedBankBin = ref('');
const accountNo = ref('');
const amount = ref('');
const description = ref('');
const qrDataUrl = ref('');
const copyStatus = ref('Copy QR image');

const bankOptions = computed(() => banks.value
  .filter(bank => Boolean(bank.transferSupported))
  .map(bank => ({
    label: bankSearchLabel(bank),
    value: bank.bin,
  })));

const selectedBank = computed(() => banks.value.find(bank => bank.bin === selectedBankBin.value));
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

const qrPayload = computed(() => makeVietQrContent({
  bankId: selectedBankBin.value,
  accountNo: accountNo.value,
  amount: amount.value,
  description: description.value,
}));

const previewTitle = computed(() => {
  if (!selectedBank.value || !accountNo.value) {
    return 'VietQR';
  }

  return `${selectedBank.value.shortName} - ${accountNo.value}`;
});

watch(qrPayload, async (payload) => {
  if (!payload) {
    qrDataUrl.value = '';
    return;
  }

  const rendered = await QRCode.toDataURL(payload, {
    width: 640,
    margin: 3,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
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

async function loadBanks() {
  banksLoading.value = true;
  banksError.value = '';

  try {
    const response = await fetch('https://api.vietqr.io/v2/banks');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json() as { data?: VietQrBank[] };
    banks.value = [...(payload.data ?? [])].sort((a, b) => a.shortName.localeCompare(b.shortName));
  }
  catch (error) {
    banksError.value = `Unable to load the VietQR bank directory (${error instanceof Error ? error.message : 'unknown error'}).`;
  }
  finally {
    banksLoading.value = false;
  }
}

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

async function createShareImage() {
  if (!qrDataUrl.value) {
    return '';
  }

  const qrImage = await loadImage(qrDataUrl.value);
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 800;
  const context = canvas.getContext('2d');
  if (!context) {
    return '';
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#111111';
  context.textAlign = 'center';
  context.font = '600 28px sans-serif';
  context.fillText(previewTitle.value, canvas.width / 2, 48);
  context.drawImage(qrImage, 60, 70, 600, 600);
  context.font = '20px sans-serif';
  context.fillStyle = '#555555';
  context.fillText('tools.eplus.dev/vietqr-bank-generator', canvas.width / 2, 744);

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

onMounted(async () => {
  await loadBanks();
  restoreForm();
});
</script>

<template>
  <div flex flex-col gap-5>
    <n-alert type="info" :bordered="false">
      Bank data comes from VietQR's public bank directory. The VietQR/NAPAS payload and QR image are generated locally in your browser, following the same payload approach used by the open-source vietqr.net reference implementation.
    </n-alert>

    <div grid grid-cols-1 gap-5 class="lg:grid-cols-[minmax(0,1fr)_380px]">
      <div flex flex-col gap-5>
        <c-card title="Create VietQR bank transfer code">
          <div flex flex-col gap-4>
            <c-select
              v-model:value="selectedBankBin"
              :options="bankOptions"
              searchable
              label="Bank"
              :placeholder="banksLoading ? 'Loading banks...' : 'Search or choose a bank by name...'"
            />

            <n-alert v-if="banksError" type="warning" :bordered="false">
              {{ banksError }}
              <c-button mt-2 @click="loadBanks">
                Retry bank directory
              </c-button>
            </n-alert>

            <div v-if="selectedBank" flex items-center gap-4 rounded-lg border="1 solid #00000018" p-4>
              <img :src="selectedBank.logo" :alt="`${selectedBank.shortName} logo`" h-42px max-w-130px object-contain>
              <div min-w-0 flex-1>
                <div font-600>
                  {{ selectedBank.shortName }}
                </div>
                <div truncate text-sm op-70>
                  {{ selectedBank.name }}
                </div>
              </div>
            </div>

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
              <c-button @click="loadBanks">
                Refresh bank list
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
            <div w-full max-w-340px rounded-xl bg-white p-4 text-center shadow-sm>
              <div mb-2 truncate text-base font-600 text-black>
                {{ previewTitle }}
              </div>
              <img :src="qrDataUrl" alt="VietQR bank transfer code" w-full object-contain>
              <div mt-2 text-xs text-gray-600>
                tools.eplus.dev/vietqr-bank-generator
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
            Select a bank and enter a valid account number to generate VietQR instantly.
          </div>
        </c-card>
      </div>
    </div>
  </div>
</template>
