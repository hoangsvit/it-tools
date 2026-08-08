<script setup lang="ts">
import type { CKeyValueListItems } from '@/ui/c-key-value-list/c-key-value-list.types';
import { parseBic } from './swift-bic-validator.service';

const rawBic = ref('');
const details = computed(() => parseBic(rawBic.value));

const bicInfo = computed<CKeyValueListItems>(() => {
  if (!details.value.normalized) {
    return [];
  }

  if (!details.value.valid) {
    return [
      {
        label: 'Valid SWIFT / BIC structure',
        value: false,
        showCopyButton: false,
      },
      {
        label: 'Normalized input',
        value: details.value.normalized,
      },
    ];
  }

  return [
    {
      label: 'Valid SWIFT / BIC structure',
      value: true,
      showCopyButton: false,
    },
    { label: 'Normalized BIC', value: details.value.normalized },
    { label: 'Institution / business party code', value: details.value.institutionCode },
    { label: 'Country code', value: details.value.countryCode },
    { label: 'Location code', value: details.value.locationCode },
    { label: 'Branch code', value: details.value.branchCode },
    { label: 'BIC8', value: details.value.bic8 },
    { label: 'BIC11', value: details.value.bic11 },
  ];
});

const examples = [
  { bank: 'Vietcombank', bic: 'BFTVVNVX' },
  { bank: 'BIDV', bic: 'BIDVVNVX' },
  { bank: 'VietinBank', bic: 'ICBVVNVX' },
  { bank: 'Techcombank', bic: 'VTCBVNVX' },
];
</script>

<template>
  <div flex flex-col gap-5>
    <n-alert type="info" :bordered="false">
      This tool validates the ISO 9362 BIC structure only. A structurally valid code is not proof that the institution or branch currently exists; confirm routing details with the bank before sending money.
    </n-alert>

    <c-card title="SWIFT / BIC validator">
      <c-input-text
        v-model:value="rawBic"
        placeholder="BFTVVNVX or DEUTDEFF500"
        label="SWIFT / BIC"
      />

      <n-alert v-if="details.normalized && !details.valid" mt-4 type="error" :bordered="false">
        Expected an 8-character BIC or an 11-character BIC with an optional 3-character branch identifier. Country code positions 5-6 must be letters.
      </n-alert>

      <c-key-value-list v-if="bicInfo.length" mt-5 :items="bicInfo" />
    </c-card>

    <c-card title="Vietnam bank examples">
      <div grid grid-cols-1 gap-3 sm:grid-cols-2>
        <div v-for="example in examples" :key="example.bic" rounded-lg border="1 solid #00000018" p-3>
          <div text-sm font-600>
            {{ example.bank }}
          </div>
          <c-text-copyable :value="example.bic" font-mono />
        </div>
      </div>
      <div mt-3 text-sm op-70>
        For live Vietnam bank BIN/NAPAS/SWIFT directory data, use the VietQR & Vietnam bank codes tool.
      </div>
    </c-card>
  </div>
</template>
