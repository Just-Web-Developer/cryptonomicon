const tickersHandlers = new Map();
const API_KEY = '3093f979689f4b4002592a5910c7d106c9e960cad6b9e80bf6a2d63ae2f63a6d'

export const loadPrices = () => {
  if (tickersHandlers.size === 0) {
    return
  }

  const response = fetch(
    `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${[...tickersHandlers.keys()].join(
      ","
    )}&tsyms=USD&api_key=${API_KEY}`
  )
    .then(r => r.json())
    .then(r => {
      r = Object.fromEntries(
        Object.entries(r).map(r => [r[0],r[1].USD])
      )
      Object.entries(r).forEach(([currency, newPrice]) => {
        const handlers = tickersHandlers.get(currency) ?? []
        handlers.forEach(fn => fn(newPrice))
      })
    })
  return response
};

export const subscribeToTicker = (ticker, cb) => {
  const subscribers = tickersHandlers.get(ticker) || [];
  tickersHandlers.set(ticker, [...subscribers, cb]);
};

export const unsubscribeFromTicker = (ticker) => {
  tickersHandlers.delete(ticker)
};

setInterval(loadPrices, 5000);
