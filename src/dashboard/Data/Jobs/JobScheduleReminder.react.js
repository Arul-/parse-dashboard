import React from 'react';
import {horizontalCenter} from 'stylesheets/base.scss'

export default class JobScheduleReminder extends React.Component {
  render() {
    return (
      <div className={horizontalCenter}>
        <p>
          {'Be noted that '}
          <b>{'one job can be scheduled one time only'}</b>
        </p>
      </div>
    );
  }
}
