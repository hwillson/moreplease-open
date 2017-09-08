const getStore = () => {
  return MorePlease.collections.stores.findOne();
};

/* eslint func-names:0 */
Template.adminProducts.onCreated(function () {
  this.subscribe('store');
});

Template.adminProducts.helpers({

  settings() {

    const fields = [
      {
        key: 'productId',
        label: 'Product ID'
      },
      {
        key: 'variationId',
        label: 'Variation ID'
      },
      {
        key: 'productImage',
        label: 'Product Image',
        fn(value) {
          if (value) {
            let imageUrl;
            if (value.indexOf('http') > -1) {
              imageUrl = value;
            } else {
              imageUrl = getStore().url + value;
            }
            return new Spacebars.SafeString(
              `<img src="${imageUrl}">`
            );
          }
        }
      },
      {
        key: 'productName',
        label: 'Product Name',
        fn(value, object) {
          if (value) {
            let productUrl = object.productUrl;
            if (productUrl.indexOf('http') === -1) {
              productUrl = getStore().url + productUrl;
            }
            return new Spacebars.SafeString(
              `<a href="${productUrl}" target="_blank">${value}</a>`
            );
          }
        }
      },
      {
        key: 'variationName',
        label: 'Variation Name',
        fn(value) {
          if (value) {
            return new Spacebars.SafeString(value);
          }
        }
      }
    ];

    if (getStore().supportedCurrencies) {
      fields.push({
        key: 'variationPriceInCurrency.GBP',
        label: 'Price (GBP)',
        fn(value) {
          if (value) {
            return new Spacebars.SafeString(
              '&pound;' + value.toFixed(2)
            );
          }
        }
      });
      fields.push({
        key: 'variationPriceInCurrency.EUR',
        label: 'Price (EUR)',
        fn(value) {
          if (value) {
            return new Spacebars.SafeString(
              '&euro;' + value.toFixed(2)
            );
          }
        }
      });
    } else {
      fields.push({
        key: 'variationPrice',
        label: 'Price',
        fn(value) {
          if (value) {
            return '$' + value.toFixed(2);
          }
        }
      });
    }

    fields.push({
      key: 'action',
      label: 'Action',
      fn() {
        return new Spacebars.SafeString(
          '<button class="btn btn-xs btn-danger remove-from-sub">'
          + 'Remove From Subscriptions</button>'
        );
      }
    });

    return {
      collection: 'productsTable',
      class: 'table table-striped col-sm-12',
      fields
    };

  }

});

Template.adminProducts.events({

  'click .reactive-table tbody tr'(e) {
    if ($(e.target).hasClass('remove-from-sub')) {
      sweetAlert({
        title: 'Remove From Subscriptions?',
        text: 'Are you sure you want to remove this product from all subscriptions?',
        type: 'warning',
        showCancelButton: true,
        cancelButtonText: 'Cancel',
        confirmButtonText: 'Remove',
        closeOnConfirm: false,
        confirmButtonColor: '#dd4b39',
        animation: false
      }, _.bind(() => {
        $('.confirm').html('Removing...');
        Meteor.call(
          'removeProductFromSubscriptions',
          this.productId,
          this.variationId,
          () => {
            swal('Product has been removed from all subscriptions.');
          }
        );
      }, this));
    }
  }

});
