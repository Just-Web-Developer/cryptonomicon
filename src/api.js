const tickersHandlers = new Map();
const API_KEY =
  "3093f979689f4b4002592a5910c7d106c9e960cad6b9e80bf6a2d63ae2f63a6d";
const socket = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
);
const AGGREGATE_INDEX = "5";
const broadcastChannel = new BroadcastChannel("Cryptonomicon");
let role = "";

const SOCKETS_LIMIT_ERROR = "429";
const LIMIT_MESSAGE = "TOO_MANY_SOCKETS_MAX";

const BAD_CURRENCY_ERROR = "500";
const BAD_CURRENCY_MESSAGE = "INVALID_SUB";

const MAIN_CURRENCY = "USD";
const SPARE_CURRENCY = "BTC"

const BAD_CURRENCIES = []
let SPARE_CURRENCY_COST = 1



function updating(currency, newPrice) {
  const handlers = tickersHandlers.get(currency) ?? [];
  if (BAD_CURRENCIES.includes(currency)){
    newPrice = newPrice * SPARE_CURRENCY_COST
  }
  if (currency === SPARE_CURRENCY){
    SPARE_CURRENCY_COST = newPrice
  }
  handlers.forEach(fn => fn(newPrice));
}

function receivingData(e) {
  const { TYPE: type, FROMSYMBOL: currency, PRICE: newPrice } = JSON.parse(
    e.data
  );
  if (type !== AGGREGATE_INDEX || !newPrice) {
    return;
  }
  updating(currency, newPrice);
}

function badCurrencyHandler(response) {
  const currency = response.PARAMETER.substring(
    9,
    response.PARAMETER.length - 4
  );
  if (response.PARAMETER.match(MAIN_CURRENCY)) {
    sendToWs({
      action: "SubAdd",
      subs: [`5~CCCAGG~${currency}~${SPARE_CURRENCY}`]
    });
    BAD_CURRENCIES.push(currency)
    subscribeToTicker(SPARE_CURRENCY, () => {})
  }
}

// {"TYPE":"500","MESSAGE":"INVALID_SUB","PARAMETER":"5~CCCAGG~FOO~USD","INFO":"We have not integrated any of the exchanges FOO trades on or we have not currently mapped it."}

broadcastChannel.addEventListener("message", e => {
  if (role !== "Admin") {
    receivingData(e);
  }
  if (role === "Admin" && JSON.parse(e.data).action) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(e.data);
      return;
    }
  }
});

socket.addEventListener("message", e => {
  receivingData(e);
  role = "Admin";
  if (
    JSON.parse(e.data).TYPE === BAD_CURRENCY_ERROR &&
    JSON.parse(e.data).MESSAGE === BAD_CURRENCY_MESSAGE
  ) {
    badCurrencyHandler(JSON.parse(e.data));
  }
  broadcastChannel.postMessage(e.data);
});

socket.addEventListener(
  "message",
  e => {
    const { TYPE: type, MESSAGE: message } = JSON.parse(e.data);
    if (type !== SOCKETS_LIMIT_ERROR && !message.match(LIMIT_MESSAGE)) {
      return;
    }
    role = "Subscriber";
  },
  { once: true }
);

function sendToWs(message) {
  const stringifyedQuery = JSON.stringify(message);
  if (role !== "Subscriber") {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(stringifyedQuery);
      return;
    }
    socket.addEventListener(
      "open",
      () => {
        socket.send(stringifyedQuery);
      },
      { once: true }
    );
  } else {
    broadcastChannel.postMessage(stringifyedQuery);
  }
}

function subscribeToTickerOnWs(ticker) {
  sendToWs({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~USD`]
  });
}
function unsubscribeFromTickerOnWs(ticker) {
  sendToWs({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~USD`]
  });
}

export const subscribeToTicker = (ticker, cb) => {
  const subscribers = tickersHandlers.get(ticker) || [];
  tickersHandlers.set(ticker, [...subscribers, cb]);
  subscribeToTickerOnWs(ticker);
};

export const unsubscribeFromTicker = ticker => {
  tickersHandlers.delete(ticker);
  unsubscribeFromTickerOnWs(ticker);
};
