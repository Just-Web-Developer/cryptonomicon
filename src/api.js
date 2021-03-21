const tickersHandlers = new Map();
const API_KEY =
  "3093f979689f4b4002592a5910c7d106c9e960cad6b9e80bf6a2d63ae2f63a6d";
const socket = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
);
const AGGREGATE_INDEX = "5"

socket.addEventListener('message', e => {
  const { TYPE: type, FROMSYMBOL: currency, PRICE: newPrice } = JSON.parse(e.data)
  if (type !== AGGREGATE_INDEX || !newPrice){
    return
  }

  const handlers = tickersHandlers.get(currency) ?? [];
  handlers.forEach(fn => fn(newPrice));




})



function sendToWs(message) {
 const stringifyedQuery = JSON.stringify(message)

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
}

function subscribeToTickerOnWs(ticker) {
  sendToWs({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~USD`]
  })
}
function unsubscribeFromTickerOnWs(ticker) {
  sendToWs({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~USD`]
  })
}

export const subscribeToTicker = (ticker, cb) => {
  const subscribers = tickersHandlers.get(ticker) || [];
  tickersHandlers.set(ticker, [...subscribers, cb]);
  subscribeToTickerOnWs(ticker);
};

export const unsubscribeFromTicker = ticker => {
  tickersHandlers.delete(ticker);
  unsubscribeFromTickerOnWs(ticker)
};

