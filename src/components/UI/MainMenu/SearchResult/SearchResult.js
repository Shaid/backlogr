import React, {Component, PropTypes} from 'react';
import { connect } from 'react-redux';
// import { change as changeLocation } from 'redux/modules/location';
import { clear as clearResults } from 'redux/modules/search';
import { hide as hideMenu } from 'redux/modules/mainmenu';
import { stateNames } from 'helpers/stateNames';
import { Icon } from 'components/UI';

@connect(null,
{hideMenu, clearResults})
export default class SearchResult extends Component {
  static propTypes = {
    result: PropTypes.object,
    // changeLocation: PropTypes.func.isRequired,
    hideMenu: PropTypes.func.isRequired,
    clearResults: PropTypes.func.isRequired,
  }

  handleChangeLocation(newLocation) {
    this.props.changeLocation(newLocation);
    this.props.hideMenu();
    this.props.clearResults();
  }

  render() {
    const styles = require('./SearchResult.scss');
    const result = this.props.result;

    return (
      <div onTouchTap={() => this.handleChangeLocation(result)} className={styles.result}>
        <Icon icon="chevron_right" styling={styles.chevron} />
        <div className={styles.label}>{result.name}, {stateNames[result.state].toUpperCase()}</div>
      </div>
    );
  }
}
