import { FSMBuilder, StateDataMap, EventDataMap, renderToMermaid } from '../src';
import path from 'path';
import fs from 'fs';

import { loginFlowFsm } from './login-flow';
import { trafficLightFsmBuilder } from './traffic-light';
import { simpleTurnstileFsmBuilder } from './simple-turnstile';
import { simpleCliFsmBuilder } from './simple-cli-app';
import { passwordFSMBuilder } from './password';

export async function renderToFile<S extends StateDataMap, E extends EventDataMap>(
    fsm: FSMBuilder<S, E>,
    fileName: string,
    options?: Parameters<typeof renderToMermaid>[1]
) {
    console.log(`Rendering to ${fileName}`);
    const dirName = path.dirname(fileName);
    await fs.promises.mkdir(dirName, { recursive: true });
    await fs.promises.writeFile(fileName, renderToMermaid(fsm, options), { encoding: 'utf-8' });
}

async function main() {
    await renderToFile(loginFlowFsm, './examples/charts/login-flow.mermaid');
    await renderToFile(trafficLightFsmBuilder, './examples/charts/traffic-light.mermaid', {
        direction: 'LR',
    });
    await renderToFile(simpleTurnstileFsmBuilder, './examples/charts/simple-turnstile.mermaid', {
        direction: 'LR',
    });
    await renderToFile(simpleCliFsmBuilder, './examples/charts/simple-cli-app.mermaid', {
        direction: 'LR',
    });
    await renderToFile(passwordFSMBuilder, './examples/charts/password.mermaid', {
        direction: 'LR',
        subgraphNameSeparator: '.',
    });
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
