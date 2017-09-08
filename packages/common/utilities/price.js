export default {
  formatPrice(price, currency) {
    const formattedPrice = price.toFixed(2);
    let currencyPrefix = '$';
    if (currency === 'EUR') {
      currencyPrefix = '€';
    } else if (currency === 'GBP') {
      currencyPrefix = '£';
    }
    return currencyPrefix + formattedPrice;
  },
};
