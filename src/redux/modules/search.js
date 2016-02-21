const SEARCH = 'bomelette/search/SEARCH';
const CLEAR = 'bomelette/search/CLEAR';
const LOAD = 'bomelette/search/LOAD';
const LOAD_SUCCESS = 'bomelette/search/LOAD_SUCCESS';
const LOAD_FAIL = 'bomelette/search/LOAD_FAIL';

const initialState = {};

export default function search(state = initialState, action = {}) {
  switch (action.type) {
    case SEARCH:
      return {
        ...state,
        [action.location.hash]: action.location,
      };
    case CLEAR:
      return {
        ...initialState
      };
    case LOAD:
      return {
        ...state,
        loading: true
      };
    case LOAD_SUCCESS:
      return {
        ...state,
        loading: false,
        loaded: true,
        fetched: action.fetched,
        query: action.query,
        results: action.result.data,
      };
    case LOAD_FAIL:
      return {
        ...state,
        loading: false,
        loaded: false,
        fetched: action.fetched,
        query: action.query,
        error: action.error
      };
    default:
      return state;
  }
}

export function searchByString(query) {
  return {
    types: [LOAD, LOAD_SUCCESS, LOAD_FAIL],
    promise: (client) => client.get('/api/v1/search/locations/?q=' + query),
    // promise: (client) => client.get('/api/v1/search/locations/' + 'melb'),
    query: query,
    fetched: Date.now(),
  };
}

export function searchByLatLon(lat, lon) {
  let query = lat + ',' + lon;
  query = '-37.7041105' + ',' + '145.1828456';

  return {
    types: [LOAD, LOAD_SUCCESS, LOAD_FAIL],
    // promise: (client) => client.get('/api/v1/search/locations/?q=' + query),
    promise: (client) => client.get('/api/v1/search/locations/fakeGPS'),
    query: query,
    lon: lon,
    fetched: Date.now(),
  };
}

export function clear() {
  return {
    type: CLEAR,
  };
}
