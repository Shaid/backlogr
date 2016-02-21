import React, { Component, PropTypes } from 'react';
// import { Link } from 'react-router';

import { connect } from 'react-redux';

import { Icon } from 'components/UI';
import { hide as hideMenu } from 'redux/modules/mainmenu';
import { searchByString, searchByLatLon } from 'redux/modules/search';

@connect(state => ({mainmenu: state.mainmenu, search: state.search}),
{hideMenu, searchByString, searchByLatLon})
export default class MainMenu extends Component {
  static propTypes = {
    mainmenu: PropTypes.object,
    hideMenu: PropTypes.func.isRequired,
    searchByString: PropTypes.func.isRequired,
    searchByLatLon: PropTypes.func.isRequired,
    search: PropTypes.object,
    locationSearch: PropTypes.string,
  };

  handeSearchInput(input) {
    if (input.length >= 4) {
      this.props.searchByString(input);
    }
  }

  render() {
    const styles = require('./MainMenu.scss');
    // const recents = this.props.recents;
    // const favourites = this.props.favourites;

    const fixedLocations = [
      {hash: 'MV0Z', name: 'Sydney', state: 'NSW'},
      {hash: 'KFY8', name: 'Melbourne', state: 'VIC'},
      {hash: 'W10W', name: 'Brisbane', state: 'QLD'},
      {hash: '3NKT', name: 'Perth', state: 'WA'},
      {hash: 'KHS4', name: 'Adelaide', state: 'SA'},
      {hash: 'JR8D', name: 'Hobart', state: 'TAS'},
      {hash: 'MS26', name: 'Canberra', state: 'ACT'},
      {hash: 'G4E7', name: 'Darwin', state: 'NT'},
    ];

    const actions = [
      {label: 'Settings', icon: 'settings'},
      // {label: 'BOM Website', icon: 'settings_system_daydream'},
      {label: 'BOM Website', icon: 'hot_tub'},
      {label: 'Send feedback', icon: 'comment'},
      {label: 'Terms', icon: 'description'},
    ];

    let mainStyle = styles.mainMenu;
    if (this.props.mainmenu.display) {
      mainStyle = styles.mainMenu + ' ' + styles.show;
    }

    const search = this.props.search;

    const searchInput = React.createElement('input', {
      type: 'text',
      placeholder: 'Search by place or postcode',
      value: this.props.locationSearch,
      onChange: (event) => this.handeSearchInput(event.target.value)
    });

    return (
      <div className={mainStyle}>
        <div className={styles.sideBar} onTouchTap={this.props.hideMenu}><Icon icon="arrow_back" styling={styles.hideIcon} /></div>
        <div className={styles.container}>

          <div className={styles.itemGroup}>
            <div className={styles.useMyLocation}>
              <div className={styles.useMyLocationButton} onTouchTap={this.props.searchByLatLon}>
                <Icon icon="location_searching" styling={styles.useMyLocationIcon}/>
                Use my current location...
                </div>
            </div>
            <div className={styles.search}>
              <Icon icon="search" styling={styles.searchIcon} />
              {searchInput}
            </div>
            {(search.results && search.results.length > 0) ?
              <div>
                <div className={styles.resultsHeader}>
                  {search.results.length} results for <span className={styles.italic}>{search.query}</span>
                </div>
                // {search.results.map( (result) => <SearchResult key={result.hash + result.name} result={result} /> )}
              </div>
              :
              ''
            }
          </div>

          <div className={styles.itemGroup}>
            {
              actions.map( (action) => <div key={action.label} className={styles.action}><Icon icon={action.icon} styling={styles.actionIcon}/>{action.label}</div> )
            }
          </div>
        </div>
      </div>
    );
  }
}
