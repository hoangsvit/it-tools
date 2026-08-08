<script setup lang="ts">
import bankDirectory from '../vietqr-bank-generator/banks.json';
import type { VietQrBank } from '../vietqr-bank-generator/vietqr-bank-generator.service';
import { rankVietnamBanks } from './vietnam-bank-bin-lookup.service';
import '@/modules/developer-workspace/developer-platform.i18n';

const query = ref('');
const banks = bankDirectory.data as VietQrBank[];
const matches = computed(() => rankVietnamBanks(banks, query.value).slice(0, query.value.trim() ? 20 : 12));
</script>

<template>
  <div class="bank-lookup">
    <c-input-text
      v-model:value="query"
      :label="$t('developerPlatform.bankLookup.label')"
      :placeholder="$t('developerPlatform.bankLookup.placeholder')"
      clearable
      autofocus
    />

    <n-alert type="info" :bordered="false">
      {{ $t('developerPlatform.bankLookup.info') }}
    </n-alert>

    <div class="result-heading">
      <strong>{{ matches.length }}</strong>
      <span>{{ query.trim() ? $t('developerPlatform.bankLookup.matchingBanks') : $t('developerPlatform.bankLookup.banksShown') }}</span>
    </div>

    <div class="bank-grid">
      <c-card v-for="bank in matches" :key="bank.bin">
        <div class="bank-card">
          <div class="bank-title-row">
            <div>
              <strong>{{ bank.shortName }}</strong>
              <div class="bank-name">
                {{ bank.name }}
              </div>
            </div>
            <span class="bin-pill">{{ bank.bin }}</span>
          </div>

          <div class="bank-meta">
            <div><span>{{ $t('developerPlatform.bankLookup.napasCode') }}</span><strong>{{ bank.code }}</strong></div>
            <div><span>SWIFT/BIC</span><strong>{{ bank.swift_code || $t('developerPlatform.common.notPublished') }}</strong></div>
            <div><span>{{ $t('developerPlatform.bankLookup.transfer') }}</span><strong>{{ bank.transferSupported ? $t('developerPlatform.common.supported') : $t('developerPlatform.common.unavailable') }}</strong></div>
            <div><span>{{ $t('developerPlatform.bankLookup.accountLookup') }}</span><strong>{{ bank.lookupSupported ? $t('developerPlatform.common.supported') : $t('developerPlatform.common.unavailable') }}</strong></div>
          </div>

          <router-link :to="`/vietqr-bank-generator?bank=${encodeURIComponent(bank.bin)}`" class="vietqr-link">
            {{ $t('developerPlatform.bankLookup.createVietqr') }}
          </router-link>
        </div>
      </c-card>
    </div>
  </div>
</template>

<style scoped>
.bank-lookup {
  display: grid;
  gap: 16px;
}

.result-heading {
  display: flex;
  align-items: baseline;
  gap: 7px;
  opacity: 0.7;
  font-size: 13px;
}

.bank-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}

.bank-card {
  display: grid;
  gap: 14px;
}

.bank-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.bank-title-row strong {
  font-size: 16px;
}

.bank-name {
  margin-top: 4px;
  opacity: 0.58;
  font-size: 12px;
  line-height: 1.45;
}

.bin-pill {
  flex: none;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(24, 160, 88, 0.1);
  color: #18a058;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  font-weight: 700;
}

.bank-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
}

.bank-meta div {
  display: grid;
  gap: 3px;
}

.bank-meta span {
  opacity: 0.52;
  font-size: 10px;
  text-transform: uppercase;
}

.bank-meta strong {
  overflow-wrap: anywhere;
  font-size: 12px;
}

.vietqr-link {
  color: #18a058;
  font-size: 12px;
  font-weight: 650;
  text-decoration: none;
}

@media (max-width: 480px) {
  .bank-meta {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
