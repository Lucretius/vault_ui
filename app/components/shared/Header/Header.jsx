import React, { PropTypes } from 'react';
import _ from 'lodash';
import { Toolbar, ToolbarGroup, ToolbarTitle } from 'material-ui/Toolbar';
import FlatButton from 'material-ui/FlatButton';
import IconButton from 'material-ui/IconButton';
import Github from 'mui-icons/fontawesome/github';
import CountDown from './countdown.js'
import styles from './header.css';
import { callVaultApi, history } from '../../shared/VaultUtils.jsx';

var logout = () => {
    window.localStorage.removeItem('vaultAccessToken');
    history.push('/login');
}

function snackBarMessage(message) {
    let ev = new CustomEvent("snackbar", { detail: { message: message } });
    document.dispatchEvent(ev);
}

class Header extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            serverAddr: window.localStorage.getItem('vaultUrl'),
            version: ''
        }
    }

    static propTypes = {
        tokenIdentity: PropTypes.object
    }

    componentWillMount() {
        callVaultApi('get', 'sys/health', null, null, null)
            .then((resp) => {
                this.setState({
                    version: resp.data.version,
                });
            })
            .catch((error) => {
                if (error.response.status === 429) {
                    this.setState({
                        version: error.response.data.version,
                    });
                } else {
                    snackBarMessage(error);
                }
            });
    }

    render() {

        let renderTokenInfo = () => {

            let infoSectionItems = []

            let username;
            if (_.has(this.props.tokenIdentity, 'meta.username')) {
                username = this.props.tokenIdentity.meta.username;
            } else {
                username = this.props.tokenIdentity.display_name
            }
            if (username) {
                infoSectionItems.push(
                    <span key="infoUsername" className={styles.infoSectionItem}>
                        <span className={styles.infoSectionItemKey}>logged in as</span>
                        <span className={styles.infoSectionItemValue}>{username}</span>
                    </span>
                )
            }

            infoSectionItems.push(
                <span key="infoServer" className={styles.infoSectionItem}>
                    <span className={styles.infoSectionItemKey}>connected to</span>
                    <span className={styles.infoSectionItemValue}>{this.state.serverAddr}</span>
                </span>
            )

            if (this.props.tokenIdentity.ttl) {
                infoSectionItems.push(
                    <span key="infoSessionTimeout" className={styles.infoSectionItem}>
                        <span className={styles.infoSectionItemKey}>token ttl</span>
                        <span className={styles.infoSectionItemValue}>
                            <CountDown countDown={this.props.tokenIdentity.ttl} retrigger={this.props.tokenIdentity.last_renewal_time} />
                        </span>
                    </span>
                )
            }

            if (this.state.version) {
                infoSectionItems.push(
                    <span key="infoVersion" className={styles.infoSectionItem}>
                        <span className={styles.infoSectionItemKey}>vault version</span>
                        <span className={styles.infoSectionItemValue}>{this.state.version}</span>
                    </span>
                )
            }

            return infoSectionItems;
        }

        return (
            <div id={styles.headerWrapper}>
                <Toolbar style={{ backgroundColor: '#000000', height: '64px' }}>
                    <ToolbarGroup firstChild={true}>
                        <IconButton
                            onTouchTap={() => {
                                if(WEBPACK_DEF_TARGET_WEB) {
                                    window.open('https://github.com/djenriquez/vault-ui', '_blank');
                                } else {
                                    event.preventDefault();
                                    require('electron').shell.openExternal('https://github.com/djenriquez/vault-ui')
                                }
                            }}
                        >
                            <Github className={styles.title}/>
                        </IconButton>
                        <ToolbarTitle className={styles.title}
                            onTouchTap={() => {
                                history.push('/');
                            }}
                            text="VAULT - UI" />
                    </ToolbarGroup>
                    <ToolbarGroup>
                        {renderTokenInfo()}
                    </ToolbarGroup>
                    <ToolbarGroup lastChild={true}>
                        <FlatButton className={styles.title} onTouchTap={logout} label="Logout" />
                    </ToolbarGroup>
                </Toolbar>
            </div>
        )
    }
}

export default Header;
