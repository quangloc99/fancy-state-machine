import { FSMBuilder, StateDataMap, EventDataMap, renderToMermaid } from '../src';
import path from 'path';
import fs from 'fs';

import { loginFlowFsm } from './login-flow';

export async function renderToFile<S extends StateDataMap, E extends EventDataMap>(
    fsm: FSMBuilder<S, E>,
    fileName: string
) {
    console.log(`Rendering to ${fileName}`);
    const dirName = path.dirname(fileName);
    await fs.promises.mkdir(dirName, { recursive: true });
    await fs.promises.writeFile(fileName, renderToMermaid(fsm), { encoding: 'utf-8' });
}

async function main() {
    await renderToFile(loginFlowFsm, './examples/charts/login-flow.mermaid');
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
