import { Meteor } from 'meteor/meteor';
import { moment } from 'meteor/momentjs:moment';
import { HTTP } from 'meteor/http';
import { Base64 } from 'meteor/base64';
import { _ } from 'meteor/underscore';

import { StoresCollection } from '../domain/store';
import { SubscriptionsCollection } from '../domain/subscription';
import SubscriptionStatus from '../domain/subscription_status';
import StoreType from '../domain/store_type';
import SubscriptionCustomersCollection from '../domain/subscription_customer';
import SubscriptionItemsCollection from '../domain/subscription_item';
import subscriptionOrderHistoryCollection
  from '../domain/subscription_order_history';
import transmitEvent from '../webhook/transmit_event';
import { emailsCollection } from '../emails/email';
import emailType from '../emails/email_type';
import email from '../utilities/email';
import subscriptionOrderType from '../domain/subscription_order_type';
import { subscriptionOrdersCollection } from '../domain/subscription_order';

import Raven from 'raven';
Raven.config(Meteor.settings.private.sentry.dsn).install();

const SubscriptionManager = {
  renewSubscriptions(storeId) {
    let subscriptionCount = 0;
    let currentSubscriptionId;

    if (storeId) {
      // Won't try to renew paused or cancelled subscriptions.
      const subscriptions = SubscriptionsCollection.find({
        storeId,
        // Any order with a renewal date < the end of the current day are
        // considered for renewal.
        renewalDate: {
          $lte: moment().endOf('day').toDate(),
        },
        statusId: {
          $nin: [
            SubscriptionStatus.paused.id,
            SubscriptionStatus.cancelled.id,
          ],
        },
        // Only retry subscriptions for up to 14 days.
        billingRetryCount: {
          $lt: 14
        }
      });

      subscriptionCount = subscriptions.count();
      subscriptions.forEach((subscription) => {
        try {
          // Only retry subscription renewals for up to 14 times.
          if (_.isUndefined(subscription.billingRetryCount)
              || subscription.billingRetryCount < 14) {
            currentSubscriptionId = subscription._id;
            this.createSubscriptionRenewal(subscription._id);
          }
        } catch (error) {
          // Keep trying subsequent renewals, but logged the failed ones
          Raven.captureException(error);
          Raven.captureMessage(
            `Unable to renew subscription: ${currentSubscriptionId}`,
          );
        }
      });
    }

    return subscriptionCount;
  },

  createSubscriptionRenewal(subscriptionId) {
    let renewedSuccessfuly = false;
    if (subscriptionId) {
      const subscription =
        SubscriptionsCollection.findOne({ _id: subscriptionId });
      if (subscription && subscription.subscriptionSubtotal() > 0) {
        // Make sure an order hasn't renewed within a recent renewal threshold
        // (to help make sure multiple renewals aren't created back to back,
        // for the same subscription).
        if (!subscriptionOrderHistoryCollection.hasOrderRenewedRecently({
          storeId: subscription.storeId,
          subscriptionId,
        })) {
          const store = StoresCollection.findOne({ _id: subscription.storeId });
          const customer = subscription.getCustomer();
          const subscriptionItems = [];
          subscription.getSubscriptionItems().forEach((subscriptionItem) => {
            if (subscriptionItem.quantity > 0) {
              const product = subscriptionItem.productVariation();
              subscriptionItems.push({
                productId: subscriptionItem.productId,
                variationId: subscriptionItem.variationId,
                quantity: subscriptionItem.quantity,
                discountPercent: subscriptionItem.activeDiscountPercent(),
                productName: product.productName,
                variationName: product.variationName,
              });
            }
          });
          if (subscriptionItems.length > 0) {
            switch (store.storeType) {
              case (StoreType.codes.test.id):
                renewedSuccessfuly = true;
                break;
              case (StoreType.codes.shopify.id):
                renewedSuccessfuly = this._createSubscriptionRenewalShopify({
                  store,
                  subscription,
                  customer,
                  subscriptionItems,
                });
                break;
              case (StoreType.codes.wooCommerce.id):
              default:
                renewedSuccessfuly = this._createSubscriptionRenewalWooCommerce({
                  store,
                  subscription,
                  customer,
                  subscriptionItems,
                });
                break;
            }
          }
        }
      } else {
        // If the subscription subtotal is $0 then pause it so future renewals
        // don't attempt to fire
        subscription.updateSubscriptionStatus(
          SubscriptionStatus.paused.id,
        );
      }
    }

    return renewedSuccessfuly;
  },

  cancelSubscription(subscriptionId) {
    let subscriptionCancelled = false;
    const subscription =
      SubscriptionsCollection.findOne({ _id: subscriptionId });
    const customer = subscription.getCustomer();
    const store = StoresCollection.findOne({ _id: subscription.storeId });

    if (subscription) {
      let response;
      switch (store.storeType) {
        case (StoreType.codes.shopify.id): {
          subscription.updateSubscriptionStatus(
            SubscriptionStatus.cancelled.id,
          );
          subscriptionCancelled = true;

          const metafieldQueryUrl =
            `${store.webServiceUrl}/customers/${customer.externalId}`
            + '/metafields.json';

          // Find the matching Shopify metafield
          response = HTTP.call('GET', metafieldQueryUrl, {
            auth: `${store.storeWsAuthUser}:${store.storeWsAuthPass}`,
            query: 'key=subscription_id',
          });

          // If a subscriber ID metafield is found, remove it
          if (response && response.data
              && (response.data.metafields.length > 0)) {
            const metafield = response.data.metafields[0];
            const metafieldDeleteUrl =
              `${store.webServiceUrl}/customers/${customer.externalId}`
              + `/metafields/${metafield.id}.json`;
            HTTP.call('DELETE', metafieldDeleteUrl, {
              auth: `${store.storeWsAuthUser}:${store.storeWsAuthPass}`,
            });
          }

          // Load any existing Shopify customer tags, remove the "Subscribe"
          // tag if it exists, then submit the updated tags back.
          const customerUrl =
            `${store.webServiceUrl}/customers/${customer.externalId}.json`;
          const customerResponse = HTTP.call('GET', customerUrl, {
            auth: `${store.storeWsAuthUser}:${store.storeWsAuthPass}`,
          });
          if (customerResponse && customerResponse.data
                && customerResponse.data.customer) {
            const shopifyCustomer = customerResponse.data.customer;
            let customerTags = shopifyCustomer.tags;
            if (customerTags && (customerTags.indexOf('Subscriber') > -1)) {
              customerTags =
                customerTags.replace(', Subscriber', '').replace('Subscriber', '');
              HTTP.call('PUT', customerUrl, {
                auth: `${store.storeWsAuthUser}:${store.storeWsAuthPass}`,
                data: {
                  customer: {
                    id: customer.externalId,
                    tags: customerTags,
                  },
                },
              });
            }
          }

          break;
        }
        case (StoreType.codes.wooCommerce.id):
        default: {
          response = HTTP.get(
            `${store.url}/wp-admin/admin-ajax.php`,
            {
              headers: {
                authorization: this.basicAuthHeader(store),
              },
              query: `action=cancel_box&user_id=${customer.externalId}`,
            },
          );
          if (response && response.data && response.data.success) {
            subscription.updateSubscriptionStatus(SubscriptionStatus.cancelled.id);
            subscriptionCancelled = true;
          }
        }
      }
    }

    return subscriptionCancelled;
  },

  basicAuthHeader(store) {
    const authString = `${store.storeWsAuthUser}:${store.storeWsAuthPass}`;
    return `Basic ${Base64.encode(authString)}`;
  },

  sendSubscriptionReminders(storeId) {
    let emailsSent = 0;
    if (storeId) {
      // Won't try to renew paused, payment failed or cancelled subscriptions.
      const subscriptions = SubscriptionsCollection.find({
        storeId,
        // Send reminders 5 days before subscription renewal (so when the
        // difference between the renewal date and todays date is exactly
        // 5 days).
        renewalDate: {
          $gte: moment().startOf('day').add(5, 'days').toDate(),
          $lte: moment().endOf('day').add(5, 'days').toDate(),
        },
        statusId: {
          $nin: [
            SubscriptionStatus.paused.id,
            SubscriptionStatus.failed.id,
            SubscriptionStatus.cancelled.id,
          ],
        },
      });

      if (subscriptions.count()) {
        const reminderEmail = emailsCollection.findOne({
          storeId,
          emailType: emailType.reminder.id,
        });
        if (reminderEmail && reminderEmail.enabled) {
          subscriptions.forEach((subscription) => {
            if (!subscription.isNewFreeTrialSubscription()) {
              // Add an extra failsafe check to make sure the customer
              // really is part of this store, to make sure we aren't sending
              // emails to customers of other stores.
              const customer = subscription.getCustomer();
              if (customer.storeId === storeId) {
                this.sendReminderEmail(
                  reminderEmail,
                  customer.email,
                );
              }
            }
          });
        }

        this.sendSubscriptionReminderEvent(subscriptions);
      }

      emailsSent = subscriptions.count();
    }

    return emailsSent;
  },

  sendReminderEmail(reminderEmail, to) {
    if (reminderEmail && to) {
      email.sendEmail(
        to,
        reminderEmail.from,
        reminderEmail.subject,
        reminderEmail.body,
        null,
        reminderEmail.bcc,
      );
    }
  },

  sendSubscriptionReminderEvent(subscriptions = []) {
    subscriptions.forEach((subscription) => {
      const store = StoresCollection.findOne({ _id: subscription.storeId });
      transmitEvent({
        store,
        event: 'Subscription Renewal Reminder',
        extra: {
          subscriptionId: subscription._id,
          subscriptionStatus: subscription.statusId,
          customerEmail: subscription.customerEmail,
          externalCustomerId: subscription.getCustomer().externalId,
          nextShipmentDate: subscription.renewalDate,
          totalSubscriptionPrice:
            +subscription.subscriptionTotal().toFixed(2),
          subscriptionItems: subscription.getSubscriptionItems(),
          renewalFrequencyLabel: subscription.renewalFrequencyLabel(),
          totalOrders: subscription.totalOrders(),
          totalSpent: subscription.totalSpent(),
        },
      });
    });
  },

  sendPaymentFailedEmail(subscription) {
    const paymentFailedEmail = emailsCollection.findOne({
      storeId: subscription.storeId,
      emailType: emailType.paymentFailed.id,
    });
    if (paymentFailedEmail && paymentFailedEmail.enabled) {
      email.sendEmail(
        subscription.customerEmail,
        paymentFailedEmail.from,
        paymentFailedEmail.subject,
        paymentFailedEmail.body,
        null,
        paymentFailedEmail.bcc,
      );
    }
  },

  sendSubscriptionDetailsToStore({ storeId, subscriptionId, customer }) {
    if (storeId && subscriptionId && customer) {
      const store = StoresCollection.findOne({ _id: storeId });
      let webServiceUrl = store.webServiceUrl;
      switch (store.storeType) {
        case (StoreType.codes.shopify.id):
          webServiceUrl += `/customers/${customer.externalId}/metafields.json`;
          break;
        case (StoreType.codes.wooCommerce.id):
        default:
          // TODO - not implemented yet (not needed yet)
          break;
      }

      HTTP.call('POST', webServiceUrl, {
        auth: `${store.storeWsAuthUser}:${store.storeWsAuthPass}`,
        data: {
          metafield: {
            key: 'subscription_id',
            value: subscriptionId,
            value_type: 'string',
            namespace: 'moreplease',
          },
        },
      });

      // Load existing Shopify customer tags, add "Subscriber" tag, then
      // submit back to Shopify.
      const customerUrl =
        `${store.webServiceUrl}/customers/${customer.externalId}.json`;
      const customerResponse = HTTP.call('GET', customerUrl, {
        auth: `${store.storeWsAuthUser}:${store.storeWsAuthPass}`,
      });
      if (customerResponse && customerResponse.data
            && customerResponse.data.customer) {
        const shopifyCustomer = customerResponse.data.customer;
        let newTags;
        if (shopifyCustomer.tags) {
          newTags = `${shopifyCustomer.tags}, Subscriber`;
        } else {
          newTags = 'Subscriber';
        }
        HTTP.call(
          'PUT',
          `${store.webServiceUrl}/customers/${customer.externalId}.json`,
          {
            auth: `${store.storeWsAuthUser}:${store.storeWsAuthPass}`,
            data: {
              customer: {
                id: customer.externalId,
                tags: newTags,
              },
            },
          },
        );
      }
    }
  },

  _createSubscriptionRenewalShopify({
    store, subscription, customer, subscriptionItems,
  }) {
    let subCustomer = customer;
    // First make sure the subscription customer has a valid shopify customer
    // ID; if not query shopify to get the customer ID, and store it.
    if (this._verifyCustomerId({ store, customer: subCustomer })) {
      subCustomer = subscription.getCustomer();
    }

    const totalAmount = subscription.subscriptionTotal();
    const chargeDetails = this._chargeCard({
      store,
      stripeCustomerId: subCustomer.stripeCustomerId,
      amount: totalAmount * 100,
    });

    let renewedSuccessfuly = false;
    if (chargeDetails.data.success) {
      // Set shipping; calculate and set if missing.
      let shipping;
      if (subscription.shippingMethodId) {
        shipping = {
          code: subscription.shippingMethodId,
          title: subscription.shippingMethodName,
          price: subscription.shippingCost,
        };
      } else if (totalAmount > 49) {
        shipping = {
          code: store.freeShippingMethod.externalId,
          title: store.freeShippingMethod.name,
          price: store.freeShippingMethod.cost,
        };
      } else {
        shipping = {
          code: store.defaultShippingMethod.externalId,
          title: store.defaultShippingMethod.name,
          price: store.defaultShippingMethod.cost,
        };
      }

      const order = {
        subtotal_price: subscription.subscriptionSubtotal(),
        total_price: subscription.subscriptionTotal(),
        line_items: [],
        customer: {},
        shipping_address: {},
        discount_codes: [],
        financial_status: null,
        transactions: [],
        tags: null,
        shipping_lines: [shipping],
        send_receipt: true,
        inventory_behaviour: 'decrement_obeying_policy',
      };

      order.line_items = [];
      let discountNotes = '';
      let onetimeNotes = '';
      subscriptionItems.forEach((item) => {
        order.line_items.push({
          variant_id: item.variationId,
          quantity: item.quantity,
        });
        if (item.discountPercent) {
          discountNotes +=
            `- ${item.productName} (${item.variationName}): `
            + `${item.discountPercent}%\n`;
        }
        if (item.oneTime) {
          onetimeNotes += `- ${item.productName} (${item.variationName})\n`;
        }
      });
      discountNotes =
        _.isEmpty(discountNotes) ? '' : `Discounts: \n${discountNotes}`;
      onetimeNotes =
        _.isEmpty(onetimeNotes) ? '' : `One-time items: \n${onetimeNotes}`;

      order.customer.id = subCustomer.externalId;

      order.shipping_address = this._getShippingAddressFromShopify({
        store,
        customer: subCustomer,
      });

      const discount = subscription.subscriptionDiscount();
      if (discount) {
        // order.discount_codes = [{
        //   code: 'SUB_DISCOUNT',
        //   amount: 10,
        //   type: 'percentage',
        // }];
        order.total_discounts = discount;
      }

      order.financial_status = 'paid';
      order.transactions.push({
        kind: 'sale',
        amount: totalAmount,
        gateway: 'Credit Card',
        status: 'success',
      });
      order.tags = 'subscription_renewal_order';
      order.note =
        `Subscription ID: ${subscription._id} \n\n` +
        `${discountNotes} \n\n` +
        `${onetimeNotes}`;
      if (subscription.notes) {
        order.note = `Customer Notes:\n${subscription.notes}\n\n${order.note}`;
      }

      const response = HTTP.post(
        `${store.webServiceUrl}/orders.json`,
        {
          auth: `${store.storeWsAuthUser}:${store.storeWsAuthPass}`,
          data: { order },
        },
      );

      if (response && response.data && response.data.order) {
        const completedOrder = response.data.order;
        const subscriptionOrder = {
          orderId: completedOrder.id,
          subscriptionId: subscription._id,
          storeId: store._id,
          orderTypeId: subscriptionOrderType.renewal.id,
          orderDate: completedOrder.created_at,
          totalPrice: completedOrder.total_price,
        };
        subscriptionOrdersCollection.insert(subscriptionOrder);
        subscription.updateSubscriptionStatus(
          SubscriptionStatus.active.id,
        );

        // Increase next renewal date by renewal frequency.
        subscription.resetRenewalDate();
        subscription.resetBillingRetryCount();

        this._triggerRenewedEvent({ storeId: store._id, subscription });

        // Remove any onetime subscription items that need to be cleared
        // after a successful renewal
        SubscriptionItemsCollection.removeOneTimeItems(subscription._id);

        renewedSuccessfuly = true;

        // If the subscription has an associated draft order, flag that it
        // should be removed.
        this._flagDraftOrderForRemoval(subscription);
      } else {
        Raven.captureMessage(
          `Subscription ${subscription._id} was successfuly billed for an `
          + 'order, but that order could not be created in Shopify.',
        );
      }
    } else {
      subscription.updateSubscriptionStatus(SubscriptionStatus.failed.id);
      subscription.increaseBillingRetryCount();
      subscription.setRenewalDateToTomorrow();
      this.sendPaymentFailedEmail(subscription);
      renewedSuccessfuly = false;
    }

    return renewedSuccessfuly;
  },

  _createSubscriptionRenewalWooCommerce({
    store, subscription, customer, subscriptionItems,
  }) {
    let renewedSuccessfuly = false;
    // For WC, we'll only renew active subscriptions (don't try to renew
    // failed payments).
    if (subscription.statusId === SubscriptionStatus.active.id) {
      const renewalData = {};
      renewalData.subscriptionId = subscription._id;
      renewalData.currency = subscription.currency;
      renewalData.renewalFrequencyId = subscription.renewalFrequencyId;
      renewalData.customerId = customer.externalId;
      renewalData.customerEmail = customer.email;
      renewalData.subscriptionItems = subscriptionItems;
      renewalData.shippingMethodId = subscription.shippingMethodId;
      renewalData.shippingMethodName = subscription.shippingMethodName;
      renewalData.shippingCost = subscription.shippingCost;

      const response = HTTP.post(
        `${store.url}/wp-admin/admin-ajax.php`,
        {
          headers: {
            authorization: this.basicAuthHeader(store),
          },
          query: 'action=create_subscription_renewal_order',
          params: {
            renewalData: JSON.stringify(renewalData),
          },
        },
      );


      if (response) {
        const responseData = response.data;
        if (responseData.success) {
          const order = responseData.data;
          order.subscriptionId = subscription._id;
          order.storeId = store._id;
          subscriptionOrdersCollection.insert(order);
          // Increase next renewal date by renewal frequency.
          subscription.resetRenewalDate();
          subscription.resetBillingRetryCount();

          // Make sure status is set to active
          subscription.updateSubscriptionStatus(
            SubscriptionStatus.active.id,
          );

          // Remove any onetime subscription items that need to be cleared
          // after a successful renewal
          SubscriptionItemsCollection.removeOneTimeItems(subscription._id);

          renewedSuccessfuly = true;
        } else {
          // Set to payment failed status and advance renewal date to tomorrow.
          subscription.updateSubscriptionStatus(
            SubscriptionStatus.failed.id,
          );
          subscription.increaseBillingRetryCount();
          subscription.setRenewalDateToTomorrow();

          // Send payment failed email to customer
          this.sendPaymentFailedEmail(subscription);

          renewedSuccessfuly = false;
        }
      }
    }

    return renewedSuccessfuly;
  },

  _chargeCard({ store, stripeCustomerId, amount }) {
    let chargeDetails;
    try {
      chargeDetails = HTTP.post(
        `${store.paymentServiceUrl}/charge-card`,
        {
          data: {
            stripeCustomerId,
            amount,
            description: `Charge for ${store.url} subscription renewal.`,
          },
        },
      );
    } catch (error) {
      Raven.setContext({
        tags: {
          mp_store_payment_url: store.paymentServiceUrl,
          mp_stripe_customer_id: stripeCustomerId,
          mp_amount: amount,
        },
      });
      Raven.captureException(error);
      Raven.captureMessage('Unable to charge customer card.');
      chargeDetails = {
        data: {
          success: false,
        },
      };
    }
    return chargeDetails;
  },

  _getShippingAddressFromShopify({ store, customer }) {
    let address;
    if (customer.externalId) {
      const response = HTTP.get(
        `${store.webServiceUrl}/customers/${customer.externalId}.json`,
        {
          auth: `${store.storeWsAuthUser}:${store.storeWsAuthPass}`,
        },
      );
      if (response && response.data) {
        address = response.data.customer.default_address;
      }
    }
    return address;
  },

  _verifyCustomerId({ store, customer }) {
    let customerUpdated = false;
    if (!customer.externalId) {
      // We don't have a shopify customer ID stored, so attempt to find
      // customer details by email address. Update the customer record with
      // any matching customer ID.
      const response = HTTP.get(
        `${store.webServiceUrl}/customers/search.json`,
        {
          auth: `${store.storeWsAuthUser}:${store.storeWsAuthPass}`,
          query: `query=email:${customer.email}`,
        },
      );
      if (response && response.data) {
        const customers = response.data.customers;
        if (customers.length) {
          const externalCustomerId = customers[0].id;
          SubscriptionCustomersCollection.update({
            _id: customer._id,
          }, {
            $set: {
              externalId: externalCustomerId,
            },
          });
          customerUpdated = true;
        }
      }
    }
    return customerUpdated;
  },

  _triggerRenewedEvent({ storeId, subscription }) {
    if (storeId && subscription) {
      const store = StoresCollection.findOne({ _id: storeId });
      if (store) {
        const webhookUrl = store.webhookUrl;
        if (webhookUrl) {
          HTTP.post(webhookUrl, {
            headers: {
              authorization: `Basic ${Base64.encode('moreplease')}`,
            },
            params: {
              data: JSON.stringify({
                event: 'Renewed Subscription',
                extra: {
                  subscriptionId: subscription._id,
                  subscriptionStatus: subscription.statusId,
                  customerEmail: subscription.customerEmail,
                  externalCustomerId: subscription.getCustomer().externalId,
                  nextShipmentDate: subscription.renewalDate,
                  totalSubscriptionPrice: +subscription.subscriptionTotal().toFixed(2),
                  subscriptionItems: subscription.getSubscriptionItems(),
                },
              }),
            },
          });
        }
      }
    }
  },

  _flagDraftOrderForRemoval(subscription) {
    if (subscription.draftOrderId) {
      SubscriptionsCollection.update({
        _id: subscription._id,
      }, {
        $set: {
          draftOrderChanges: true,
        },
      });
    }
  },
};

export default SubscriptionManager;
