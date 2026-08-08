<script setup lang="ts">
import bankDirectory from '../vietqr-bank-generator/banks.json';
import type { VietQrBank } from '../vietqr-bank-generator/vietqr-bank-generator.service';
import { rankVietnamBanks } from './vietnam-bank-bin-lookup.service';

const query = ref('');
const banks = bankDirectory.data as VietQrBank[];
const matches = computed(() => rankVietnamBanks(banks, query.value).slice(0, query.value.trim() ? 20 : 12));
</script>

<template>
  <div class="bank-lookup">
    <c-input-text
      v-model:value="query"
      label="Bank BIN, code, name or SWIFT/BIC"
      placeholder="Try 970416, ACB, Vietcombank, BFTVVNVX..."
      clearable
      autofocus
    />

    <n-alert type="info" :bordered="false">
      Data is loaded from the VietQR bank directory bundled with this app. Search stays in your browser.
    </n-alert>

    <div class="result-heading">
      <strong>{{ matches.length }}</strong>
      <span>{{ query.trim() ? 'matching banks' : 'banks shown' }}</span>
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
            <div><span>NAPAS code</span><strong>{{ bank.code }}</strong></div>
            <div><span>SWIFT/BIC</span><strong>{{ bank.swift_code || 'Not published' }}</strong></div>
            <div><span>Transfer</span><strong>{{ bank.transferSupported ? 'Supported' : 'Unavailable' }}</strong></div>
            <div><span>Account lookup</span><strong>{{ bank.lookupSupported ? 'Supported' : 'Unavailable' }}</strong></div>
          </div>

          <router-link :to="`/vietqr-bank-generator?bank=${encodeURIComponent(bank.bin)}`" class="vietqr-link">
            Create VietQR for this bank →
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
