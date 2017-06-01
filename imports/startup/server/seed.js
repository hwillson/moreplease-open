import widgetsCollection from '../../api/widgets/collection';

if (!widgetsCollection.find().count()) {
  widgetsCollection.insert({ name: 'Widget 1' });
  widgetsCollection.insert({ name: 'Widget 2' });
}
