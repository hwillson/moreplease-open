import { apiKeysCollections } from './api_key';

export default (() => {
  const randomStringLength = 12;

  const allowedChars =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const generateRandomString = () => {
    let randomString = '';
    for (let i = 0; i < randomStringLength; i += 1) {
      randomString +=
        allowedChars[Math.round(Math.random() * (allowedChars.length - 1))];
    }
    return randomString;
  };

  const publicMethods = {
    newKey(storeId, description) {
      if (storeId) {
        apiKeysCollections.insert({
          key: generateRandomString().match(/.../g).join('-'),
          description,
          created: new Date(),
          storeId,
        });
      }
    },
  };

  return publicMethods;
})();
