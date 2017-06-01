import { Mongo } from 'meteor/mongo';

const widgetsCollection = new Mongo.Collection('widgets');

export default widgetsCollection;
