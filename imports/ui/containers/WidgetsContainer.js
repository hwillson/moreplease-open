import { Meteor } from 'meteor/meteor';
import { createContainer } from 'meteor/react-meteor-data';

import widgetsCollection from '../../api/widgets/collection';
import Widgets from '../components/Widgets';

const WidgetsContainer = createContainer(() => {
  const widgetsHandle = Meteor.subscribe('widgets');
  const widgets = widgetsCollection.find().fetch();

  return {
    widgetsReady: widgetsHandle.ready(),
    widgets,
  };
}, Widgets);

export default WidgetsContainer;
