<script setup lang="ts">
import { extractIBAN, friendlyFormatIBAN, isQRIBAN, validateIBAN } from 'ibantools';
import { buildIban, getFriendlyErrors } from './iban-validator-and-parser.service';
import type { CKeyValueListItems } from '@/ui/c-key-value-list/c-key-value-list.types';

const rawIban = ref('');
const builderCountryCode = ref('GB');
const builderBban = ref('NWBK60161331926819');

const ibanInfo = computed<CKeyValueListItems>(() => {
  const iban = rawIban.value.toUpperCase().replace(/\s/g, '').replace(/-/g, '');

  if (iban === '') {
    return [];
  }

  const { valid: isIbanValid, errorCodes } = validateIBAN(iban);
  const { countryCode, bban } = extractIBAN(iban);
  const errors = getFriendlyErrors(errorCodes);

  return [
    {
      label: 'Is IBAN valid ?',
      value: isIbanValid,
      showCopyButton: false,
    },
    {
      label: 'IBAN errors',
      value: errors.length === 0 ? undefined : errors,
      hideOnNil: true,
      showCopyButton: false,
    },
    {
      label: 'Is IBAN a QR-IBAN ?',
      value: isQRIBAN(iban),
      showCopyButton: false,
    },
    {
      label: 'Country code',
      value: countryCode,
    },
    {
      label: 'BBAN',
      value: bban,
    },
    {
      label: 'IBAN friendly format',
      value: friendlyFormatIBAN(iban),
    },
  ];
});

const builderResult = computed(() => {
  try {
    const iban = buildIban(builderCountryCode.value, builderBban.value);
    if (!iban) {
      return {
        iban: '',
        valid: false,
        errors: [] as string[],
        error: '',
      };
    }

    const validation = validateIBAN(iban);
    return {
      iban,
      valid: validation.valid,
      errors: getFriendlyErrors(validation.errorCodes),
      error: '',
    };
  }
  catch (error) {
    return {
      iban: '',
      valid: false,
      errors: [] as string[],
      error: error instanceof Error ? error.message : 'Unable to build IBAN.',
    };
  }
});

const builtIbanInfo = computed<CKeyValueListItems>(() => {
  if (!builderResult.value.iban) {
    return [];
  }

  return [
    {
      label: 'Generated IBAN',
      value: builderResult.value.iban,
    },
    {
      label: 'Friendly format',
      value: friendlyFormatIBAN(builderResult.value.iban),
    },
    {
      label: 'Passes IBAN country / BBAN validation',
      value: builderResult.value.valid,
      showCopyButton: false,
    },
    {
      label: 'Validation notes',
      value: builderResult.value.errors.length ? builderResult.value.errors : undefined,
      hideOnNil: true,
      showCopyButton: false,
    },
  ];
});

const ibanExamples = [
  'FR7630006000011234567890189',
  'DE89370400440532013000',
  'GB29NWBK60161331926819',
];
</script>

<template>
  <div flex flex-col gap-5>
    <c-card title="Validate & parse IBAN">
      <c-input-text v-model:value="rawIban" placeholder="Enter an IBAN to check for validity..." test-id="iban-input" />

      <c-key-value-list v-if="ibanInfo.length > 0" mt-5 :items="ibanInfo" data-test-id="iban-info" />
    </c-card>

    <c-card title="IBAN check-digit builder">
      <n-alert mb-4 type="info" :bordered="false">
        Enter a country code and BBAN to calculate ISO 13616 check digits. This creates a structurally checkable IBAN for development/testing; it does not prove that a bank account exists.
      </n-alert>

      <div grid grid-cols-1 gap-4 md:grid-cols-[160px_minmax(0,1fr)]>
        <c-input-text
          v-model:value="builderCountryCode"
          label="Country code"
          placeholder="GB"
        />
        <c-input-text
          v-model:value="builderBban"
          label="BBAN"
          placeholder="NWBK60161331926819"
        />
      </div>

      <n-alert v-if="builderResult.error" mt-4 type="error" :bordered="false">
        {{ builderResult.error }}
      </n-alert>

      <c-key-value-list v-if="builtIbanInfo.length" mt-5 :items="builtIbanInfo" />
    </c-card>

    <c-card title="Valid IBAN examples">
      <div v-for="iban in ibanExamples" :key="iban">
        <c-text-copyable :value="iban" font-mono :displayed-value="friendlyFormatIBAN(iban)" />
      </div>
    </c-card>
  </div>
</template>
