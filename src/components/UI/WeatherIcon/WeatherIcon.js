import React, {Component, PropTypes} from 'react';

import { Icon } from 'components/UI';

export default class WeatherIcon extends Component {
  static propTypes = {
    icon: PropTypes.number,
    styling: PropTypes.string,
  }
  render() {
    const iconTable = {
      1: 'sunny',
      2: 'clear',
      3: 'partly-cloudy',
      4: 'cloudy',
      6: 'hazy',
      8: 'light-rain',
      9: 'wind',
      10: 'fog',
      11: 'showers',
      12: 'rain',
      13: 'dusty',
      14: 'frost',
      15: 'snow',
      16: 'storms',
      17: 'light-showers',
      18: 'heavy-shower',
      19: 'cyclone'
    };

    const {icon, styling} = this.props; // eslint-disable-line no-shadow
    const styles = require('./WeatherIcon.scss');
    // @todo: translate iconcodes.

    let smallIcon;

    if (typeof icon === undefined || icon === null) {
      smallIcon = <Icon icon="panorama_fish_eye" styling={styles.weatherIconNoIcon} />;
    } else {
      smallIcon = <img src={require('../../../theme/assets/weather-icons/' + iconTable[icon] + '-ol.svg')} />;
    }

    return (
      <div className={styles.weatherIcon + ' ' + styling ? styling : ''}>
        {smallIcon}
      </div>
    );
  }
}
