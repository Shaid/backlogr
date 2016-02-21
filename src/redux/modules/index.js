import { combineReducers } from 'redux';
import { routeReducer } from 'react-router-redux';
import { reducer as reduxAsyncConnect } from 'redux-async-connect';
import mainmenu from './mainmenu';
import search from './search';

export default combineReducers({
  reduxAsyncConnect,
  mainmenu: mainmenu,
  routing: routeReducer,
  search: search,
});
