/**
 * @file Dialog that shows the server settings and allows the user to
 * edit it.
 */

import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import { change, reduxForm, Field } from 'redux-form'

import Dialog from 'material-ui/Dialog'
import FlatButton from 'material-ui/FlatButton'

import { closeServerSettingsDialog } from '../actions/server-settings'
import { createValidator, between, integer, required } from '../utils/validation'
import { renderTextField } from './helpers/reduxFormRenderers'

/**
 * Presentation of the form that shows the fields that the user can use to
 * edit the server settings.
 */
class ServerSettingsFormPresentation extends React.Component {
  render () {
    return (
      <div onKeyPress={this.props.onKeyPress}>
        <Field
          name={'hostName'}
          component={renderTextField}
          floatingLabelText={'Hostname'}
        />
        <br />
        <Field
          name={'port'}
          component={renderTextField}
          floatingLabelText={'Port'}
        />
      </div>
    )
  }
}

ServerSettingsFormPresentation.propTypes = {
  onKeyPress: PropTypes.func,
  getFormFields: PropTypes.func
}

/**
 * Container of the form that shows the fields that the user can use to
 * edit the server settings.
 */
const ServerSettingsForm = connect(
  state => ({               // mapStateToProps
    initialValues: state.dialogs.serverSettings
  }), null, null, { withRef: true }
)(reduxForm({
  form: 'serverSettings',
  validate: createValidator({
    hostName: required,
    port: [required, integer, between(1, 65535)]
  })
})(ServerSettingsFormPresentation))

/**
 * Presentation component for the dialog that shows the form that the user
 * can use to edit the server settings.
 */
class ServerSettingsDialogPresentation extends React.Component {
  constructor (props) {
    super(props)
    this.handleSubmit = this.handleSubmit.bind(this)
    this.handleKeyPress_ = this.handleKeyPress_.bind(this)
  }

  handleSubmit () {
    this.refs.form.getWrappedInstance().submit()
  }

  handleKeyPress_ (e) {
    if (e.nativeEvent.code === 'Enter') {
      this.handleSubmit()
    }
  }

  render () {
    const { autoSetServer, onClose, onSubmit, open } = this.props
    const actions = [
      <FlatButton label={'Connect'} primary onTouchTap={this.handleSubmit} />,
      <FlatButton label={'Auto'} onTouchTap={autoSetServer} />,
      <FlatButton label={'Close'} onTouchTap={onClose} />
    ]
    const contentStyle = {
      width: '320px'
    }
    return (
      <Dialog title={'Server Settings'} open={open}
        actions={actions} contentStyle={contentStyle}
        onRequestClose={onClose}
      >
        <ServerSettingsForm ref={'form'}
          onSubmit={onSubmit}
          onKeyPress={this.handleKeyPress_} />
      </Dialog>
    )
  }
}

ServerSettingsDialogPresentation.propTypes = {
  onClose: PropTypes.func,
  onSubmit: PropTypes.func,
  open: PropTypes.bool.isRequired
}

ServerSettingsDialogPresentation.defaultProps = {
  open: false
}

/**
 * Container of the dialog that shows the form that the user can use to
 * edit the server settings.
 */
const ServerSettingsDialog = connect(
  // mapStateToProps
  state => ({
    open: state.dialogs.serverSettings.dialogVisible
  }),
  // mapDispatchToProps
  dispatch => ({
    onClose () {
      dispatch(closeServerSettingsDialog())
    },
    onSubmit (data) {
      // Cast the port into a number first, then dispatch the action
      data.port = Number(data.port)
      dispatch(closeServerSettingsDialog(data))
    },
    autoSetServer () {
      dispatch(change('serverSettings', 'hostName', window.location.hostname))
      dispatch(change('serverSettings', 'port', '5000'))
    }
  })
)(ServerSettingsDialogPresentation)

export default ServerSettingsDialog
