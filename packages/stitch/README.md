# MorePlease - Stitch Draft Order Integration

## Overview

When The Feed (TF) subscribers had their subscriptions renewed, there was previously no guarantee that the products on their subscription would be in stock, and available to ship out. TF currently uses Stitch Labs for inventory management, and Stitch has released a public API that allows order/inventory manipulation. This integration attempts to work around the out of stock issue, by leveraging Stitch's API to create "Draft" sales orders representing future subscription renewal orders, when appropriate. These placeholder draft orders reserve subscriber inventory, until the real order is placed, at which point the draft order is removed.

## Implementation

The Stitch labs integration work has been implemented leveraging a series of scheduled processes, that control the complete draft order workflow. This was done to make sure that communication with Stitch is handled completely outside of the normal subscription management workflow. This prevents communication with Stitch from slowing down other subscription related activities.

### Scheduled "Draft Order" Jobs

1) "Create Ready Draft Orders" Job

- When this job runs, it finds all TF subscriptions (that don't currently have an associated draft order in Stitch) that are set to renew in less than 15 days.
- Each found subscription has a draft order created in Stitch, that includes all subscription items, thereby reserving inventory.
- After the draft order is created, the draft order ID is stored back with the associated subscription.
- Note: TF supports multiple subscription renewal frequencies (weekly, every 2 weeks, monthly, every 2 months, every 3 months). Since draft orders are created when a subscription is set to renew in less then 15 days, this means that draft orders are created instantly (after a renewal order has fired) for subscriptions that have a weekly or every 2 week subscription renewal frequency. For the rest, draft orders are created 15 days out from renewal.
- This job is currently scheduled to run every 4 hours.

2) "Delete Modified/Finalized Draft Orders" Job

This job handles both the deletion of draft orders when a subscription's products have changed, and the deletion of draft orders that are no longer valid, after a subscription has been renewed. This job is currently scheduled to run every 4 hours.

Delete Modified:

- If a customer modifies their subscription and has an associated draft order in Stitch, a flag is set on their subscription identifying that draft order changes are required.
- When this job runs, it finds all TF subscriptions that have a draft order in Stitch, and have been flagged to be re-synched with Stitch. Each draft order found is removed from Stitch, the subscription's associated draft order ID is removed, and the draft order changes required flag is reset.
- A new draft order (containing the new subscription changes) is then re-created in Stitch, when the "Create Ready Draft Orders" job runs next.

Delete Finalized:

- When a subscription renews, if it has an associated draft order ID, a flag is set on the subscription identifying that the draft order is no loner valid.
- When this job runs, it finds all TF subscriptions that have a draft order in Stitch, and have been flagged to be removed from Stitch. Each draft order found is removed from Stitch, the subscription's associated draft order ID is removed, and the draft order deletion flag is reset.

3) "Delete Paused/Cancelled Draft Orders" Job

- When this job runs, it looks for any subscriptions with paused/cancelled status, that have an associated draft order in Stitch.
- All matching draft orders are removed from Stitch, and their associated subscription is updated to remove the draft order ID.
- This job is currently scheduled to run every 4 hours.
