import { SubscriptionsCollection } from '../domain/subscription';
import SubscriptionItemsCollection from '../domain/subscription_item';
import subscriptionHistoryCollection from '../domain/subscription_history';

SubscriptionsCollection.permit(['update']).allowInClientCode();
SubscriptionItemsCollection.permit(['remove', 'update']).allowInClientCode();
subscriptionHistoryCollection.permit(['insert']).allowInClientCode();
