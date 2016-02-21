import React, {Component, PropTypes} from 'react';
import { connect } from 'react-redux';
import { change as changeLocation } from 'redux/modules/location';
import { hide as hideMenu } from 'redux/modules/mainmenu';
import { stateNames } from 'helpers/stateNames';
import { Icon } from 'components/UI';

@connect(null,
{changeLocation, hideMenu})
export default class Favourite extends Component {
  static propTypes = {
    favourite: PropTypes.object,
    changeLocation: PropTypes.func.isRequired,
    hideMenu: PropTypes.func.isRequired,
  }

  handleChangeLocation(newLocation) {
    this.props.changeLocation(newLocation);
    this.props.hideMenu();
  }

  render() {
    const styles = require('./Favourite.scss');
    const favourite = this.props.favourite;

    return (
      <div onTouchTap={() => this.handleChangeLocation(favourite)} className={styles.favourite}>
        <Icon icon="star" styling={styles.star} />
        <Icon icon="chevron_right" styling={styles.chevron} />
        <div className={styles.labelName}>{favourite.name}</div>
        <div className={styles.labelState}>{stateNames[favourite.state].toUpperCase()}</div>
      </div>
    );
  }
}
