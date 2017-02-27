import React, { PropTypes } from 'react'
import axios from 'axios';
import _ from 'lodash';
import styles from './login.css';
import TextField from 'material-ui/TextField';
import IconButton from 'material-ui/IconButton';
import Settings from 'material-ui/svg-icons/action/settings';
import Dialog from 'material-ui/Dialog';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import FlatButton from 'material-ui/FlatButton';
import Snackbar from 'material-ui/Snackbar';
import { browserHistory } from 'react-router';
import { callVaultLogin } from '../shared/VaultUtils.jsx'

export default class Login extends React.Component {
    static propTypes = {
        location: PropTypes.object.isRequired
    }

    constructor(props) {
        super(props);

        this.state = {
            show: false,
            openSettings: false,
            authToken: "",
            vaultUrl: this.getVaultUrl(),
            tmpVaultUrl: "",
            errorMessage: "",
            username: "",
            password: "",
            loginMethodType: this.getVaultAuthMethod(),
            tmpLoginMethodType: this.getVaultAuthMethod(),
            settingsChanged: false,
        };

        _.bindAll(
            this,
            'validateAuthToken',
            'validateToken',
            'submitSettings',
            'renderSettingsDialog',
            'renderSelectedLoginOption',
            'validateUsernamePassword',
            'checkSettings',
            'login'
        )

        // If a token was supplied in the window.suppliedAuthToken variable, then simulate a login
        if (window.suppliedAuthToken && this.state.vaultUrl) {
            this.state.loginMethodType = 'TOKEN';
            this.state.authToken = window.suppliedAuthToken;
            this.validateToken({ keyCode: 13 });
        }

    }

    componentDidMount() {
        this.setState({ show: true });
        if (!this.state.vaultUrl) {
            this.setState({
                openSettings: true
            });
        }
    }

    getVaultUrl() {
        if (window.localStorage.getItem("vaultUrl"))
            return window.localStorage.getItem("vaultUrl");
        else
            return window.defaultUrl;
    }

    getVaultAuthMethod() {
        if (window.localStorage.getItem("loginMethodType"))
            return window.localStorage.getItem("loginMethodType");
        else
            return window.defaultAuth;
    }

    login() {
        let method = '';
        let uri = '';
        let query = null;
        let data = null;
        let headers = null;

        switch (this.state.loginMethodType) {
            case "TOKEN":
                method = 'get';
                uri = 'auth/token/lookup-self';
                headers = { "X-Vault-Token": this.state.authToken };
                break;
            case "GITHUB":
                method = 'post';
                uri = `auth/github/login`;
                data = { token: this.state.authToken };
                break;
            case "LDAP":
                method = 'post';
                uri = `auth/ldap/login/${this.state.username}`;
                data = { password: this.state.password };
                break;
            case "USERNAMEPASSWORD":
                method = 'post';
                uri = `auth/userpass/login/${this.state.username}`;
                data = { password: this.state.password };
                break;
            default:
                throw new Error(`Login method type: '${this.state.loginMethodType}' is not supported`);
        }

        callVaultLogin(
                uri,
                method,
                data,
                this.state.vaultUrl,
                headers)
            .then((resp) => {
                if (this.state.loginMethodType == "TOKEN") {
                    this.setAccessToken({
                        client_token: resp.data.data.id,
                        lease_duration: resp.data.lease_duration
                    });
                } else {
                    this.setAccessToken(resp.data.auth);
                }
            })
            .catch((error) => {
                var loginErrorMessage;
                if (_.has(error, 'response.data.errors') &&
                    error.response.data.errors.length > 0) {
                    loginErrorMessage = _.join(
                            error.response.data.errors,
                            ", ");
                } else {
                    loginErrorMessage = error.message;
                }
                this.setState({ errorMessage: `Error: ${loginErrorMessage}` });
            });
    }

    validateUsernamePassword(e) {
        if (e.keyCode === 13) {
            if (!this.getVaultUrl()) {
                this.setState({ errorMessage: "No Vault URL specified.  Click the gear to edit your Vault URL." });
                return;
            }
            if (!this.state.username) {
                this.setState({ errorMessage: "No username provided." });
                return;
            }

            if (!this.state.password) {
                this.setState({ errorMessage: "No password provided." });
                return;
            }

            this.login();
        }
    }

    validateToken(e) {
        if (e.keyCode === 13) {
            if (!this.getVaultUrl()) {
                this.setState({ errorMessage: "No Vault URL specified.  Click the gear to edit your Vault URL." });
                return;
            }
            if (!this.state.authToken) {
                this.setState({ errorMessage: "No auth token provided." });
                return;
            }
            this.login();
        }
    }

    validateAuthToken(e) {
        if (e.keyCode === 13) {
            if (!this.getVaultUrl()) {
                this.setState({ errorMessage: "No Vault URL specified.  Click the gear to edit your Vault URL." });
                return;
            }
            if (!this.state.authToken) {
                this.setState({ errorMessage: "No auth token provided." });
                return;
            }

            this.login();
        }
    }

    setAccessToken(resp) {
        let accessToken = _.get(resp, 'client_token');
        if (accessToken) {
            window.localStorage.setItem('capability_cache', JSON.stringify({}));
            window.localStorage.setItem("vaultAccessToken", accessToken);
            window.localStorage.setItem('vaultUrl', this.getVaultUrl());
            window.localStorage.setItem('loginMethodType', this.getVaultAuthMethod());
            if (this.props.location.query.returnto && this.props.location.query.returnto.indexOf('/') === 0)
                window.location.href = this.props.location.query.returnto;
            else
                window.location.href = '/';
        } else {
            this.setState({ errorMessage: "Unable to obtain access token." })
        }
    }

    submitSettings(e) {
        if (this.state.settingsChanged) {
            if (!this.state.tmpVaultUrl) {
                this.setState({ errorMessage: 'Please enter a Vault URL' });
            }
            else if (!this.state.tmpLoginMethodType) {
                this.setState({ errorMessage: 'Please select an authentication backend' });
            } else {
                window.localStorage.setItem("vaultUrl", this.state.tmpVaultUrl);
                window.localStorage.setItem("loginMethodType", this.state.tmpLoginMethodType);
                this.setState({
                    errorMessage: '',
                    vaultUrl: this.state.tmpVaultUrl,
                    loginMethodType: this.state.tmpLoginMethodType,
                    openSettings: false
                });
            }
        } else {
            this.setState({ openSettings: false });
        }
    }

    checkSettings(e) {
        this.setState({
            errorMessage: this.state.vaultUrl ? '' : 'No Vault URL specified.  Click the gear to edit your Vault URL.',
            openSettings: false
        });
    }

    renderSettingsDialog() {
        const actions = [
            <div>
                <FlatButton label="Close" primary={true} onTouchTap={this.checkSettings} />
                <FlatButton label="Submit" secondary={true} onTouchTap={this.submitSettings} />
            </div>
        ]

        let handleSelectFieldChange = (e, i, v) => {
            this.setState({ tmpLoginMethodType: v, settingsChanged: true });
        }

        return (
            <Dialog
                title="Settings"
                actions={actions}
                modal={true}
                open={this.state.openSettings}
                >
                <TextField
                    id="vaultUrl"
                    fullWidth={true}
                    className="col-xs-12"
                    defaultValue={this.state.vaultUrl}
                    onChange={(e, v) => this.setState({ tmpVaultUrl: v, settingsChanged: true })}
                    />
                <SelectField
                    style={{ paddingLeft: 8 }}
                    value={this.state.tmpLoginMethodType}
                    onChange={handleSelectFieldChange.bind(this)}
                    floatingLabelText="Login Method">
                    <MenuItem value={"GITHUB"} primaryText="Github" />
                    <MenuItem value={"TOKEN"} primaryText="Token" />
                    <MenuItem value={"LDAP"} primaryText="LDAP" />
                    <MenuItem value={"USERNAMEPASSWORD"} primaryText="Username & Password" />
                </SelectField>
                <div className={styles.error}>{this.state.errorMessage}</div>
            </Dialog>
        )
    }

    renderSelectedLoginOption() {
        switch (this.state.loginMethodType) {
            case "GITHUB":
                return (
                    <TextField
                        fullWidth={true}
                        className="col-xs-12"
                        errorText={this.state.errorMessage}
                        hintText="Enter Github token"
                        onKeyDown={this.validateAuthToken}
                        onChange={(e, v) => this.setState({ authToken: v })}
                        />
                );
            case "TOKEN":
                return (
                    <TextField
                        fullWidth={true}
                        className="col-xs-12"
                        errorText={this.state.errorMessage}
                        hintText="Enter token"
                        onKeyDown={this.validateToken}
                        onChange={(e, v) => this.setState({ authToken: v })}
                        />
                );
            case "LDAP":
                return (
                    <div>
                        <TextField
                            fullWidth={true}
                            className="col-xs-12"
                            hintText="Enter LDAP username"
                            onKeyDown={this.validateUsernamePassword}
                            onChange={(e, v) => this.setState({ username: v })}
                            />
                        <TextField
                            fullWidth={true}
                            className="col-xs-12"
                            type="password"
                            hintText="Enter LDAP password"
                            onKeyDown={this.validateUsernamePassword}
                            onChange={(e, v) => this.setState({ password: v })}
                            />
                        <div className={styles.error}>{this.state.errorMessage}</div>
                    </div>
                );
            case "USERNAMEPASSWORD":
                return (
                    <div>
                        <TextField
                            fullWidth={true}
                            className="col-xs-12"
                            hintText="Enter username"
                            onKeyDown={this.validateUsernamePassword}
                            onChange={(e, v) => this.setState({ username: v })}
                            />
                        <TextField
                            fullWidth={true}
                            className="col-xs-12"
                            type="password"
                            hintText="Enter password"
                            onKeyDown={this.validateUsernamePassword}
                            onChange={(e, v) => this.setState({ password: v })}
                            />
                        <div className={styles.error}>{this.state.errorMessage}</div>
                    </div>
                )
        }
    }

    render() {
        return (
            <div id={styles.root} className="row middle-xs center-xs">
                {this.state.openSettings && this.renderSettingsDialog()}
                <div className={`col-xs-12 col-sm-6 col-md-4 ${this.state.show ? styles.show : styles.hide}`}>
                    <div className="col-xs-12" id={styles.title}><img height="40" src="https://www.vaultproject.io/assets/images/favicon-16466d1a.png"></img>AULT</div>
                    <div className="row">
                        <div className="col-xs-11">
                            {this.renderSelectedLoginOption()}
                        </div>
                        <div className="col-xs-1">
                            <IconButton tooltip="Settings" onTouchTap={() => this.setState({ openSettings: true, tmpLoginMethodType: this.state.loginMethodType, tmpVaultUrl: this.state.vaultUrl })}>
                                <Settings />
                            </IconButton>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
