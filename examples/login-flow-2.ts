import { FSMBuilder } from 'fancy-state-machine';

const loginFlowFsm = FSMBuilder.create()
    .addEvent<'enter login', [{ userName: string; password: string }]>()
    .addEvent<'login fail', [reason: string]>()
    .addEvent<'login success', [userToken: string]>()
    .addEvent<'logout'>()
    .addEvent<'retry'>()

    .addState('home page')
    .addState('verifying password?', async ({ userName, password }: { userName: string; password: string }) => {
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

        const userData = Users.get(userName);
        if (userData !== password) return ['login fail', 'wrong username or password'];
        return ['login success', '<ACCESS_TOKEN>'];
    })
    .addState('error page', (reason: string) => {})
    .addState('dashboard page', (userToken: string) => {})

    .addTransition('home page', 'enter login', 'verifying password?')
    .addTransition('verifying password?', 'login fail', 'error page', (_userData, reason) => {
        // drop userData and return the reason only
        return [reason];
    })
    .addTransition('verifying password?', 'login success', 'dashboard page', (_userData, userToken) => {
        // drop userData and return the token only
        return [userToken];
    })
    .addTransition('error page', 'retry', 'home page', () => {
        // drop everything, return to blank state
        return [];
    })
    .addTransition('dashboard page', 'logout', 'home page', () => {
        // drop everything, return to blank state
        return [];
    });

export { loginFlowFsm };
