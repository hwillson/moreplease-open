import { SubscriptionsCollection } from '../domain/subscription';
import SubscriptionItemsCollection from '../domain/subscription_item';

SubscriptionsCollection.permit(['update']).allowInClientCode();
SubscriptionItemsCollection.permit(['remove', 'update']).allowInClientCode();
