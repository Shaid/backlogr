import React, {Component, PropTypes} from 'react';
import { connect } from 'react-redux';
import { change as changeLocation } from 'redux/modules/location';
import { hide as hideMenu } from 'redux/modules/mainmenu';

import { Icon } from 'components/UI';

@connect(null,
{changeLocation, hideMenu})
export default class Location extends Component {
  static propTypes = {
    location: PropTypes.object,
    changeLocation: PropTypes.func.isRequired,
    hideMenu: PropTypes.func.isRequired,
  }

  handleChangeLocation(newLocation) {
    this.props.changeLocation(newLocation);
    this.props.hideMenu();
  }

  render() {
    const styles = require('./Location.scss');
    const location = this.props.location;

    return (
      <div onTouchTap={() => this.handleChangeLocation(location)} className={styles.location}>
        <Icon icon="chevron_right" styling={styles.chevron} />
        <div className={styles.label}>{location.name}</div>
      </div>
    );
  }
}
