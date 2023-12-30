import { loginFlowFsm } from './login-flow';
import assert from 'assert';

async function login() {
    const fsm = loginFlowFsm.build('home page');

    async function tryLogin() {
        assert(fsm.stateData[0] === 'verifying password?');
        // get the state right from fsm.
        const accessTokenOrError = await verifyLogin(fsm.stateData[1].userName, fsm.stateData[1].password);

        if (accessTokenOrError instanceof Error) {
            await fsm.dispatch('login fail', accessTokenOrError.message);
            await fsm.dispatch('retry');
        } else {
            await fsm.dispatch('login success', accessTokenOrError);
            // now user will use the app for a while
            // then logout
            await fsm.dispatch('logout');
        }
    }

    // wrong login
    await fsm.dispatch('enter login', { userName: 'user1', password: 'bruh' });
    await tryLogin();
    await fsm.dispatch('enter login', { userName: 'whoami', password: 'idontknow' });
    await tryLogin();

    // correct login
    await fsm.dispatch('enter login', { userName: 'demo_account', password: '1234pass5678' });
    await tryLogin();
}

const Users = new Map([
    ['user1', 'Password123'],
    ['testuser', '9876abcd'],
    ['sample_user', 'passWORD456'],
    ['newuser123', 'mySecret789'],
    ['demo_account', '1234pass5678'],
    ['access_granted', 'secureAccess99'],
    ['alpha_beta', 'BetaAlpha#1'],
    ['user42', 'Pass123word!'],
    ['temp_user', 'samplePass789'],
    ['guest123', 'Welcome567!'],
]);

async function verifyLogin(userName: string, password: string) {
    const userData = Users.get(userName);
    if (userData !== password) return new Error(`wrong username or password`);
    return '<ACCESS_TOKEN>';
}
