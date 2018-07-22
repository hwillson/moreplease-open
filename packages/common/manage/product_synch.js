import { HTTP } from 'meteor/http';

import { StoresCollection } from '../domain/store';
import StoreType from '../domain/store_type';
import { ProductsCollection } from '../domain/product';
import log from '../utilities/log';

const ProductSynch = {
  fetchProductVariations(storeId) {
    if (storeId) {
      const store = StoresCollection.findOne({ _id: storeId });
      if (store) {
        switch (store.storeType) {
          case (StoreType.codes.shopify.id):
            this._fetchProductVariationsFromShopify(store);
            break;
          case (StoreType.codes.wooCommerce.id):
          default:
            this._fetchProductVariationsFromWooCommerce(store);
            break;
        }

        log.info(
          '[MorePlease.utilities.productSynch.fetchProductVariations] '
          + `Products have been synched for store ${storeId}.`,
        );
      }
    } else {
      log.error(
        '[MorePlease.utilities.productSynch.fetchProductVariations] '
        + 'Missing store ID.',
      );
    }
  },

  _fetchProductVariationsFromWooCommerce(store) {
    if (store) {
      const response = HTTP.get(
        `${store.url}`,
        { query: 'wc-ajax=get_product_variations' },
      );

      if (response && response.data && response.data.data) {
        const products = JSON.parse(response.data.data);
        ProductsCollection.remove({ storeId: store._id });

        // Used to make sure duplicate productId->variationId combos aren't
        // added.
        const productIdToVariationId = {};

        products.forEach((product) => {
          const productId = `${product.productId}`;
          const variationId = `${product.variationId}`;
          if (!Object.keys(productIdToVariationId).includes(productId)) {
            productIdToVariationId[productId] = [];
          }

          if (!productIdToVariationId[productId].includes(variationId)) {
            productIdToVariationId[productId].push(variationId);

            const newProduct = product;
            newProduct.storeId = store._id;
            // If a variation price is provided without currency, this is a
            // default USD price; store this as a USD currency price as well.
            if (product.variationPrice) {
              if (product.variationPriceInCurrency) {
                newProduct.variationPriceInCurrency.USD =
                  product.variationPrice;
              } else {
                newProduct.variationPriceInCurrency = {
                  USD: product.variationPrice,
                };
              }
            }
            try {
              ProductsCollection.insert(newProduct);
            } catch (error) {
              // TODO - for now log any products that can't be inserted
              console.log(error, newProduct);
            }
          }
        });
      }
    }
  },

  _fetchProductVariationsFromShopify(store) {
    if (store) {
      ProductsCollection.remove({ storeId: store._id });

      let page = 1;
      let fetchMore = true;
      while (fetchMore) {
        const response = HTTP.get(
          `${store.webServiceUrl}/products.json`,
          {
            auth: `${store.storeWsAuthUser}:${store.storeWsAuthPass}`,
            query: `page=${page}`,
          },
        );
        if (response && response.data) {
          const products = response.data.products;
          if (products && products.length > 0) {
            this._insertNewShopifyProducts(store, products);
            page += 1;
          } else {
            fetchMore = false;
          }
        } else {
          fetchMore = false;
        }
      }
    }
  },

  _insertNewShopifyProducts(store, products) {
    products.forEach((product) => {
      if (product.variants) {
        product.variants.forEach((variant) => {
          if (variant.sku.indexOf('TF_SUB_') === -1) {
            // If a product is not on sale, Shopify returns the retail price
            // in the `variant.price` field. If a product is on sale the
            // retail price comes back in the `variant.compare_at_price`
            // field, with the discounted price coming back in the
            // `variant.price` field.
            const currentPrice = variant.price;
            const retailPrice = variant.compare_at_price;
            const newVariant = {
              productId: product.id,
              productUrl: `${store.url}/products/${product.handle}`,
              productName: product.title,
              variationId: variant.id,
              variationName: variant.title,
              variationPrice: currentPrice,
              variationRetailPrice: retailPrice || currentPrice,
              variationSalePrice: retailPrice ? currentPrice : null,
              variationPriceInCurrency: {
                USD: variant.price,
              },
              variationSku: variant.sku,
              storeId: store._id,
            };

            const images = [];
            if (product.images) {
              product.images.forEach((image) => {
                if (image.variant_ids.indexOf(variant.id) > -1) {
                  images.push(image.src);
                }
              });
              if (images.length > 0) {
                newVariant.productImage = images[0];
              }
            }

            ProductsCollection.insert(newVariant);
          }
        });
      }
    });
  },
};

export default ProductSynch;
