<script setup lang="ts">
import type { CKeyValueListItems } from '@/ui/c-key-value-list/c-key-value-list.types';
import {
  bankSearchLabel,
  buildVietQrQuickLink,
  type VietQrBank,
  type VietQrTemplate,
  validateVietQrInput,
} from './vietqr-bank-generator.service';

const banks = ref<VietQrBank[]>([]);
const banksLoading = ref(false);
const banksError = ref('');
const selectedBankBin = ref<string>();
const bankId = ref('');
const accountNo = ref('');
const amount = ref('');
const description = ref('');
const accountName = ref('');
const template = ref<VietQrTemplate>('compact2');
const generatedUrl = ref('');

const bankOptions = computed(() => banks.value.map(bank => ({
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
    { label: 'SWIFT / BIC', value: bank.swift_code || 'Not published in the directory' },
    { label: 'VietQR transfer supported', value: Boolean(bank.transferSupported), showCopyButton: false },
    { label: 'Account lookup supported', value: Boolean(bank.lookupSupported), showCopyButton: false },
  ];
});

const validation = computed(() => validateVietQrInput({
  bankId: bankId.value,
  accountNo: accountNo.value,
  template: template.value,
  amount: amount.value,
  description: description.value,
  accountName: accountName.value,
}));

watch(selectedBankBin, (bin) => {
  if (bin) {
    bankId.value = bin;
  }
});

watch([bankId, accountNo, amount, description, accountName, template], () => {
  generatedUrl.value = '';
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
    banksError.value = `Unable to load the VietQR bank directory (${error instanceof Error ? error.message : 'unknown error'}). You can still enter a BIN or bank code manually.`;
  }
  finally {
    banksLoading.value = false;
  }
}

function generateQr() {
  if (!validation.value.valid) {
    return;
  }

  generatedUrl.value = buildVietQrQuickLink({
    bankId: bankId.value,
    accountNo: accountNo.value,
    template: template.value,
    amount: amount.value,
    description: description.value,
    accountName: accountName.value,
  });
}

onMounted(loadBanks);
</script>

<template>
  <div flex flex-col gap-5>
    <n-alert type="info" :bordered="false">
      The bank directory is loaded from VietQR's public API. This tool does not verify that an account exists. A QR preview is only requested from VietQR after you click Generate.
    </n-alert>

    <c-card title="Vietnam bank directory">
      <div flex flex-col gap-4>
        <c-select
          v-model:value="selectedBankBin"
          :options="bankOptions"
          :disabled="banksLoading"
          searchable
          label="Search bank / BIN / NAPAS / SWIFT"
          :placeholder="banksLoading ? 'Loading bank directory...' : 'Search Vietcombank, 970436, VCB, BFTVVNVX...'
          "
        />

        <n-alert v-if="banksError" type="warning" :bordered="false">
          {{ banksError }}
        </n-alert>

        <c-input-text
          v-model:value="bankId"
          label="Bank BIN / code"
          placeholder="970436"
        />

        <div v-if="selectedBank" flex items-center gap-4 rounded-lg border="1 solid #00000018" p-4>
          <img :src="selectedBank.logo" :alt="`${selectedBank.shortName} logo`" h-40px max-w-120px object-contain>
          <div min-w-0 flex-1>
            <div font-600>
              {{ selectedBank.shortName }}
            </div>
            <div truncate text-sm op-70>
              {{ selectedBank.name }}
            </div>
          </div>
        </div>

        <c-key-value-list v-if="selectedBankInfo.length" :items="selectedBankInfo" />
      </div>
    </c-card>

    <c-card title="VietQR Quick Link generator">
      <div grid grid-cols-1 gap-4 md:grid-cols-2>
        <c-input-text
          v-model:value="accountNo"
          label="Account number / alias"
          placeholder="Recipient account number (max 19 letters or digits)"
        />
        <c-select
          v-model:value="template"
          label="Template"
          :options="[
            { label: 'Compact 2 — QR + logos + transfer info', value: 'compact2' },
            { label: 'Compact — QR + logos', value: 'compact' },
            { label: 'QR only', value: 'qr_only' },
            { label: 'Print — full transfer info', value: 'print' },
            { label: 'Loa — payment speaker layout', value: 'loax' },
          ]"
        />
        <c-input-text
          v-model:value="amount"
          label="Amount (VND, optional)"
          placeholder="79000"
        />
        <c-input-text
          v-model:value="accountName"
          label="Displayed account name (optional)"
          placeholder="EPLUS DEV"
        />
        <div md:col-span-2>
          <c-input-text
            v-model:value="description"
            label="Transfer content (optional)"
            placeholder="Invoice 2026"
          />
        </div>
      </div>

      <n-alert v-if="!validation.valid && (bankId || accountNo || amount || description || accountName)" mt-4 type="error" :bordered="false">
        <ul m-0 pl-5>
          <li v-for="error in validation.errors" :key="error">
            {{ error }}
          </li>
        </ul>
      </n-alert>

      <div mt-5 flex flex-wrap gap-3>
        <c-button :disabled="!validation.valid" @click="generateQr">
          Generate VietQR
        </c-button>
        <c-button @click="loadBanks">
          Refresh bank directory
        </c-button>
      </div>
    </c-card>

    <c-card v-if="generatedUrl" title="Generated VietQR">
      <div grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]>
        <div min-w-0>
          <div mb-2 text-sm font-600>
            Quick Link
          </div>
          <c-text-copyable :value="generatedUrl" font-mono />
          <n-alert mt-4 type="warning" :bordered="false">
            The generated link contains the bank/account fields you entered. Share it only when that information is intended to be public.
          </n-alert>
        </div>
        <div flex justify-center>
          <img :src="generatedUrl" alt="Generated VietQR" max-h-420px max-w-full rounded-lg object-contain>
        </div>
      </div>
    </c-card>
  </div>
</template>
