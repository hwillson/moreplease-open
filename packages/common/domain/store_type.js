const StoreType = {
  codes: {
    wooCommerce: {
      id: 'wooCommerce',
      label: 'WooCommerce',
    },
    shopify: {
      id: 'shopify',
      label: 'Shopify',
    },
  },

  labelValues() {
    const labelValues = [];
    Object.keys(this.codes).forEach((code) => {
      labelValues.push({
        label: this.codes[code].label,
        value: this.codes[code].id,
      });
    });
    return labelValues;
  },
};

export default StoreType;
