/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import {ActionTypes} from 'lib/stores/ConfigStore';
import Button from 'components/Button/Button.react';
import ConfigDialog from 'dashboard/Data/Config/ConfigDialog.react';
import DeleteParameterDialog from 'dashboard/Data/Config/DeleteParameterDialog.react';
import Icon from 'components/Icon/Icon.react';
import {isDate} from 'lib/DateUtils';
import Parse from 'parse';
import React from 'react';
import subscribeTo from 'lib/subscribeTo';
import SidebarAction from 'components/Sidebar/SidebarAction';
import TableView from 'dashboard/TableView.react';
import Toolbar from 'components/Toolbar/Toolbar.react';
import TableHeader from 'components/Table/TableHeader.react';

@subscribeTo('Config', 'config')
class ServerConfig extends TableView {
  constructor() {
    super();
    this.section = 'Core';
    this.subsection = 'Server Config';
    this.action = new SidebarAction('Create a parameter', this.createParameter.bind(this));
    this.state = {
      modalOpen: false,
      showDeleteParameterDialog: false,
      modalParam: '',
      modalType: 'String',
      modalValue: '',
      modalMasterKeyOnly: true,
      modelShowMasterKeyOption: false
    };
  }

  componentWillMount() {
    this.props.config.dispatch(ActionTypes.FETCH);
  }

  componentWillReceiveProps(nextProps, nextContext) {
    if (this.context !== nextContext) {
      nextProps.config.dispatch(ActionTypes.FETCH);
    }
  }

  renderToolbar() {
    return (
      <Toolbar
        section='Core'
        subsection='Server Config'>
        <Button color='white' value='Create a parameter' onClick={this.createParameter.bind(this)}/>
        &nbsp;
        <Button color='red' value='Apply to Environment and Restart' onClick={this.applyAndRestart.bind(this)}/>
      </Toolbar>
    );
  }

  renderExtras() {
    const {currentApp = {}} = this.context;
    let extras = null;
    if (this.state.modalOpen) {
      extras = (
        <ConfigDialog
          onConfirm={this.saveParam.bind(this)}
          onCancel={() => this.setState({modalOpen: false})}
          param={this.state.modalParam}
          type={this.state.modalType}
          value={this.state.modalValue}
          masterKeyOnly={this.state.modalMasterKeyOnly}
          showMasterKeyOption={this.state.modelShowMasterKeyOption}
          parseServerVersion={currentApp.serverInfo && currentApp.serverInfo.parseServerVersion}/>
      );
    }
  else if (this.state.showDeleteParameterDialog) {
      extras = (
        <DeleteParameterDialog
          param={this.state.modalParam}
          onCancel={() => this.setState({showDeleteParameterDialog: false})}
          onConfirm={this.deleteParam.bind(this, this.state.modalParam)}/>
      );
    }
    return extras;
  }

  renderRow(data) {
    let value = data.value;
    let modalValue = value;
    let type = typeof value;

    if (type === 'object') {
      if (isDate(value)) {
        type = 'Date';
        value = value.toISOString();
      } else if (Array.isArray(value)) {
        type = 'Array';
        value = JSON.stringify(value);
        modalValue = value;
      } else if (value instanceof Parse.GeoPoint) {
        type = 'GeoPoint';
        value = `(${value.latitude}, ${value.longitude})`;
        modalValue = data.value.toJSON();
      } else if (data.value instanceof Parse.File) {
        type = 'File';
        value = <a target='_blank' href={data.value.url()}>Open in new window</a>;
      } else {
        type = 'Object';
        value = JSON.stringify(value);
        modalValue = value;
      }
    } else {
      if (type === 'boolean') {
        value = value ? 'true' : 'false';
      }
      type = type.substr(0, 1).toUpperCase() + type.substr(1);
    }
    let openModal = () => this.setState({
      modalOpen: true,
      modalParam: data.param,
      modalType: type,
      modalValue: modalValue,
      modalMasterKeyOnly: true,
      modelShowMasterKeyOption: false,
    });
    let columnStyleLarge = {width: '42%', cursor: 'pointer'};
    let columnStyleSmall = {width: '10%', cursor: 'pointer'};

    let openModalValueColumn = () => {
      if (data.value instanceof Parse.File) {
        return
      }
      openModal()
    }

    let openDeleteParameterDialog = () => this.setState({
      showDeleteParameterDialog: true,
      modalParam: data.param
    });

    return (
      <tr key={data.param}>
        <td style={columnStyleLarge} onClick={openModal}>{data.param}</td>
        <td style={columnStyleSmall} onClick={openModal}>{type}</td>
        <td style={columnStyleLarge} onClick={openModalValueColumn}>{value}</td>
        <td style={{textAlign: 'center'}}>
          <a onClick={openDeleteParameterDialog}>
            <Icon width={16} height={16} name='trash-solid' fill='#ff395e'/>
          </a>
        </td>
      </tr>
    );
  }

  renderHeaders() {
    return [
      <TableHeader key='parameter' width={42}>Parameter</TableHeader>,
      <TableHeader key='type' width={10}>Type</TableHeader>,
      <TableHeader key='value' width={42}>Value</TableHeader>,
    ];
  }

  renderEmpty() {
    return (
      <EmptyState
        title='Dynamically configure your server through environment variables'
        description='Set up parameters that let you control the behavior of your parse server.'
        icon='gears'
        cta='Create your first parameter'
        action={this.createParameter.bind(this)}/>
    );
  }

  tableData() {
    let data = undefined;
    if (this.props.config.data) {
      let params = this.props.config.data.get('params');
      if (params) {
        data = [];
        params.forEach((value, param) => {
          if (!param.startsWith('ENV_')) return;
          param = param.substr(4);
          let type = typeof value;
          if (type === 'object' && value.__type == 'File') {
            value = Parse.File.fromJSON(value);
          } else if (type === 'object' && value.__type == 'GeoPoint') {
            value = new Parse.GeoPoint(value);
          }
          data.push({param: param, value: value, masterKeyOnly: true})

        });
        data.sort((object1, object2) => {
          return object1.param.localeCompare(object2.param);
        });
      }
    }
    return data;
  }

  saveParam({name, value}) {
    this.props.config.dispatch(
      ActionTypes.SET,
      {param: 'ENV_' + name, value: value, masterKeyOnly: true}
    ).then(() => {
      this.setState({modalOpen: false});
    }, () => {
      // Catch the error
    });
  }

  deleteParam(name) {
    this.props.config.dispatch(
      ActionTypes.DELETE,
      {param: 'ENV_' + name}
    ).then(() => {
      this.setState({showDeleteParameterDialog: false});
    });
  }

  createParameter() {
    this.setState({
      modalOpen: true,
      modalParam: '',
      modalType: 'String',
      modalValue: '',
      modalMasterKeyOnly: true,
      modelShowMasterKeyOption: false,
    });
  }

  applyAndRestart() {
    Parse.Cloud.run(
      'ConfigApplyToEnvironmentAndRestart',
      {},
      {useMasterKey: true}
    ).then(result => {
      return new Promise(resolve => setTimeout(() => resolve(result), 1000));
    }).then(
      window.location.href = window.PARSE_DASHBOARD_PATH + 'logout'
    );
  }
}

export default ServerConfig;
