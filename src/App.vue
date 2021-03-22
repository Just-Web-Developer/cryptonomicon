<template>
  <div class="mx-20 mt-10">
    <div
      v-if="loading"
      class="loader absolute w-screen h-screen bg-purple-900 left-0 top-0 flex items-center justify-center"
    >
      <div class="lds-ring">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
    <div class="flex flex-col">
      <h1>Enter the currency</h1>
      <input
        class="border w-48 my-4"
        type="text"
        placeholder="BTC"
        v-model="newCurrency"
        @keydown.enter="addCurrency"
        @input="tipsHandler"
      />
      <div v-if="tips.length > 0" class="tips mt-1 mb-4 flex">
        <template v-for="i in 4" :key="i.id">
          <div
            v-if="this.tips[i] !== undefined"
            class="tip border rounded-xl bg-gray-200 mr-4 px-1 flex justify-center items-center cursor-pointer"
            @click="useTip(this.tips[i])"
          >
            {{ this.tips[i] }}
          </div>
        </template>
      </div>
      <p v-if="error.length > 0" class="text-red-600 mb-4">
        {{ error }}
      </p>
      <button class="border w-20" @click="addCurrency">
        Add
      </button>
    </div>
    <div class="flex justify-between mt-4">
      <div class="search flex">
        <p>Search:</p>
        <input type="text" class="border ml-4" v-model="filter" />
      </div>
      <div class="pagination">
        <button class="prev mr-5 border" @click="page--" v-if="page > 1">
          Prev
        </button>
        <button class="next border" @click="page++" v-if="nextPage">
          Next
        </button>
      </div>
    </div>
    <div
      v-if="showFilteredCurrencies.length > 0"
      class="cards flex flex-wrap mt-20 border-t border-b py-4"
    >
      <div
        class="card w-1/6 mb-6 flex border  flex-col items-center py-6 px-3 mx-3"
        :class="{
          ' border-solid border-indigo-800': currentCurrency === currency,
          'border-dashed': currentCurrency !== currency,
          'bg-red-100': currency.price === '-'
        }"
        v-for="currency in showFilteredCurrencies"
        :key="currency.id"
        @click="this.currentCurrency = currency"
      >
        <h3 class="">{{ currency.name }} - USD</h3>
        <h1 class="text-3xl my-4">{{ currency.price }}</h1>
        <button class="border" @click.stop="deleteCurrency(currency)">
          Delete
        </button>
      </div>
    </div>

    <template v-if="currentCurrency !== null">
      <div class="graphic-info flex justify-between mt-5">
        <h1>{{ currentCurrency.name }} - USD</h1>
        <button @click="currentCurrency = null" class="border py-1 px-3">
          Close
        </button>
      </div>
      <div
        class="graphic w-full border-l border-b border-black flex items-end flex-nowrap h-96 my-2"
      >
        <div
          v-for="(i, index) in currentCurrencyPrices"
          :key="i.id"
          class="column mx-1 bg-purple-900"
          style="max-width: 1rem; width: 100%;"
          :style="'height:' + normalize(index) + '%'"
        ></div>
      </div>
    </template>
  </div>
</template>

<script>
import { subscribeToTicker, unsubscribeFromTicker } from "./api";
export default {
  name: "App",
  data() {
    return {
      newCurrency: null,
      currencies: [],
      currentCurrency: null,
      currentCurrencyPrices: [],
      allCurrencies: [],
      tips: [],
      loading: true,
      error: "",
      filter: "",
      page: 1
    };
  },
  methods: {
    addCurrency() {
      if (!this.validation) {
        if (this.newCurrency !== null) {
          this.newCurrency = this.newCurrency.toUpperCase();
          const currency = {
            name: this.newCurrency,
            price: "-"
          };
          this.currencies.push(currency);
          localStorage.setItem(
            "currencies-list",
            JSON.stringify(this.currencies)
          );
          subscribeToTicker(currency.name, newPrice =>
            this.updatePrices(currency.name, newPrice)
          );
          this.newCurrency = null;
          this.tips = [];
          this.error = "";
        }
      } else {
        this.error = "Валюта уже добавлена!";
      }
    },
    deleteCurrency(currency) {
      this.currencies = this.currencies.filter(item => item !== currency);
      localStorage.setItem("currencies-list", JSON.stringify(this.currencies));
      unsubscribeFromTicker(currency.name);
      if (this.currentCurrency === currency) {
        this.currentCurrency = null;
      }
    },
    updatePrices(tickerName, price) {
      if (price > 1){
        price = price.toFixed(2)
      }else {
        price = price.toPrecision(4)
      }
      this.currencies
        .filter(t => t.name === tickerName)
        .forEach(t => (t.price = price));
      if (this.currentCurrency && this.currentCurrency.name === tickerName) {
        this.currentCurrencyPrices.push(price);
        if (this.currentCurrencyPrices.length > 72) {
          this.currentCurrencyPrices.shift();
        }
      }
    },
    normalize(index) {
      const max = Math.max(...this.currentCurrencyPrices);
      const min = Math.min(...this.currentCurrencyPrices);
      let value =
        5 + ((this.currentCurrencyPrices[index] - min) * 95) / (max - min);
      if (isNaN(value)) {
        value = 100;
      }
      return value;
    },
    async getCurrencies() {
      const response = await fetch(
        `https://min-api.cryptocompare.com/data/all/coinlist?summary=true`
      );
      const data = await response.json();
      await Object.entries(data.Data).map(item => {
        this.allCurrencies.push(item[0]);
      });
      this.loading = false;
    },
    tipsHandler() {
      const tipsBuffer = this.allCurrencies.filter(currency =>
        currency.match(this.newCurrency.toUpperCase())
      );
      this.tips = tipsBuffer;
      this.error = "";
    },
    useTip(tip) {
      this.newCurrency = tip;
      this.addCurrency();
    }
  },
  computed: {
    start() {
      return (this.page - 1) * 10;
    },
    end() {
      return this.page * 10;
    },
    filteredCurrencies() {
      return this.currencies.filter(currency =>
        currency.name.match(this.filter.toUpperCase())
      );
    },
    showFilteredCurrencies() {
      return this.filteredCurrencies.slice(this.start, this.end);
    },
    nextPage() {
      return this.end < this.filteredCurrencies.length;
    },
    validation() {
      return (
        this.currencies.filter(
          item => item.name === this.newCurrency.toUpperCase()
        ).length > 0
      );
    }
  },
  watch: {
    filter() {
      this.page = 1;
    },
    currentCurrency() {
      this.currentCurrencyPrices = [];
      this.currentCurrencySizes = [];
    },
    page() {
      window.history.pushState(
        null,
        document.title,
        `${window.location.pathname}?filter=${this.filter}&page=${this.page}`
      );
    }
  },
  created() {
    const windowData = Object.fromEntries(
      new URL(window.location).searchParams.entries()
    );

    if (windowData.filter) {
      this.filter = windowData.filter;
    }

    if (windowData.page) {
      this.page = windowData.page;
    }

    this.getCurrencies();
    const currenciesData = localStorage.getItem("currencies-list");
    if (currenciesData) {
      this.currencies = JSON.parse(currenciesData);
      this.currencies.forEach(ticker => {
        subscribeToTicker(ticker.name, newPrice =>
          this.updatePrices(ticker.name, newPrice)
        );
      });
    }
  }
};
</script>
<style>
.lds-ring {
  display: inline-block;
  position: relative;
  width: 80px;
  height: 80px;
}
.lds-ring div {
  box-sizing: border-box;
  display: block;
  position: absolute;
  width: 64px;
  height: 64px;
  margin: 8px;
  border: 8px solid #fff;
  border-radius: 50%;
  animation: lds-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  border-color: #fff transparent transparent transparent;
}
.lds-ring div:nth-child(1) {
  animation-delay: -0.45s;
}
.lds-ring div:nth-child(2) {
  animation-delay: -0.3s;
}
.lds-ring div:nth-child(3) {
  animation-delay: -0.15s;
}
@keyframes lds-ring {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
