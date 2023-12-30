import { FSMBuilder } from '../src';

const loginFlowFsm = FSMBuilder.create()
    .addEvent<'enter-login'>()
    .addEvent<'send-to-server'>()
    .addEvent<'login-fail'>()
    .addEvent<'login-success'>()
    .addEvent<'logout'>()
    .addEvent<'redirect'>()

    .addState('home-page')
    .addState('loading-page?')
    .addState('error-page')
    .addState('dashboard-page')

    .addTransition('home-page', 'enter-login', 'loading-page?')
    .addTransition('loading-page?', 'login-fail', 'error-page')
    .addTransition('loading-page?', 'login-success', 'dashboard-page')
    .addTransition('error-page', 'redirect', 'home-page')
    .addTransition('dashboard-page', 'logout', 'home-page');

export { loginFlowFsm };
