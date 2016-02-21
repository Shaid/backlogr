import React, {Component, PropTypes} from 'react';
import { connect } from 'react-redux';
import { hide, previous, next } from 'redux/modules/modal';
import { Icon } from 'components/UI';
import moment from 'moment';

@connect(state => ({modal: state.modal}),
{hide, previous, next})
export default class Modal extends Component {
  static propTypes = {
    modal: PropTypes.object,
    hide: PropTypes.func.isRequired,
    previous: PropTypes.func.isRequired,
    next: PropTypes.func.isRequired,
    forecasts: PropTypes.object,
  }

  render() {
    const styles = require('./Modal.scss');
    const day = this.props.modal.day;
    const forecast = this.props.forecasts.data[Object.keys(this.props.forecasts.data)[day]];

    if (!this.props.modal.display) {
      return <div className={styles.hide}></div>;
    }

    return (
      <div className={styles.modalWrapper} onTouchTap={this.props.hide}>
        <div className={styles.modal} onTouchTap={(event) => event.stopPropagation()}>
          <div className={styles.close} onTouchTap={this.props.hide}><Icon icon="close" /></div>
          <div className={styles.content}>
            <div className={styles.day}>{moment.unix(forecast.timestamp).calendar().split(' ')[0]}</div>
            <div className={styles.precis}>{forecast.precis}</div>
            <div>{forecast.maxT}&deg; / {forecast.minT}&deg;</div>
            <div className={styles.forecast}>{forecast.forecast}</div>
          </div>
          <div className={styles.previous + ' ' + (day <= 0 ? styles.inactive : '')} onTouchTap={this.props.previous}><Icon icon="chevron_left" styling={styles.chevron} />Previous</div>
          <div className={styles.next + ' ' + (day >= 6 ? styles.inactive : '')} onTouchTap={this.props.next}>Next<Icon icon="chevron_right" styling={styles.chevron} /></div>
        </div>

      </div>
    );
  }
}
