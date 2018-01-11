import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Spacebars } from 'meteor/spacebars';
import { $ } from 'meteor/jquery';
import swal from 'sweetalert';

import { StoresCollection } from 'meteor/moreplease:common';

import './products.html';

const getStore = () => StoresCollection.findOne();

Template.adminProducts.onCreated(function onCreated() {
  this.subscribe('store');
});

Template.adminProducts.helpers({
  settings() {
    const fields = [
      {
        key: 'productId',
        label: 'Product ID',
      },
      {
        key: 'variationId',
        label: 'Variation ID',
      },
      {
        key: 'productImage',
        label: 'Product Image',
        fn(value) {
          let newValue;
          if (value) {
            let imageUrl;
            if (value.indexOf('http') > -1) {
              imageUrl = value;
            } else {
              imageUrl = getStore().url + value;
            }
            newValue = new Spacebars.SafeString(
              `<img src="${imageUrl}">`,
            );
          }
          return newValue;
        },
      },
      {
        key: 'productName',
        label: 'Product Name',
        fn(value, object) {
          let newValue;
          if (value) {
            let productUrl = object.productUrl;
            if (productUrl.indexOf('http') === -1) {
              productUrl = getStore().url + productUrl;
            }
            newValue = new Spacebars.SafeString(
              `<a href="${productUrl}" target="_blank">${value}</a>`,
            );
          }
          return newValue;
        },
      },
      {
        key: 'variationName',
        label: 'Variation Name',
        fn(value) {
          let newValue;
          if (value) {
            newValue = new Spacebars.SafeString(value);
          }
          return newValue;
        },
      },
    ];

    if (getStore().supportedCurrencies) {
      fields.push({
        key: 'variationPriceInCurrency.GBP',
        label: 'Price (GBP)',
        fn(value) {
          let newValue;
          if (value) {
            newValue = new Spacebars.SafeString(
              `&pound;${value.toFixed(2)}`,
            );
          }
          return newValue;
        },
      });
      fields.push({
        key: 'variationPriceInCurrency.EUR',
        label: 'Price (EUR)',
        fn(value) {
          let newValue;
          if (value) {
            newValue = new Spacebars.SafeString(
              `&euro;${value.toFixed(2)}`,
            );
          }
          return newValue;
        },
      });
    } else {
      fields.push({
        key: 'variationPrice',
        label: 'Price',
        fn(value) {
          let newValue;
          if (value) {
            newValue = `$${value.toFixed(2)}`;
          }
          return newValue;
        },
      });
    }

    fields.push({
      key: 'action',
      label: 'Action',
      fn() {
        return new Spacebars.SafeString(
          '<button class="btn btn-xs btn-danger remove-from-sub">'
          + 'Remove From Subscriptions</button>',
        );
      },
    });

    return {
      collection: 'productsTable',
      class: 'table table-striped col-sm-12',
      fields,
    };
  },
});

Template.adminProducts.events({
  'click .reactive-table tbody tr'(event) {
    if ($(event.target).hasClass('remove-from-sub')) {
      swal({
        title: 'Remove From Subscriptions?',
        text: 'Are you sure you want to remove this product from all subscriptions?',
        icon: 'warning',
        buttons: {
          cancel: {
            text: 'Cancel',
            visible: true,
            value: false,
          },
          confirm: {
            text: 'Remove',
            closeModal: false,
            value: true,
          },
        },
        dangerMode: true,
      }).then((confirmed) => {
        if (confirmed) {
          $('.confirm').html('Removing...');
          Meteor.call(
            'removeProductFromSubscriptions',
            this.productId,
            this.variationId,
            () => {
              swal('Product has been removed from all subscriptions.');
            },
          );
        }
      });
    }
  },
});
