import { web } from '@nfjs/back';
import { container, config } from '@nfjs/core';
import { registerLibDir } from '@nfjs/front-server';

import { build } from './src/build.js';
import * as swaggerInit from './src/swaggerInit.js';
import { gather } from './src/gather.js';


const meta = {
    require: {
        after: ['@nfjs/back','@nfjs/winston-logger']
    }
};

const moduleConfig = config?.['@nfjs/back-openapi'];

async function init() {
    if (!(moduleConfig?.denySwagger ?? false)) {
        const route = moduleConfig?.route ?? '/@nfjs/back-openapi';
        const gathered = await gather(moduleConfig?.gather && {});
        const {doc, errors} = build(gathered);
        container.service('openapi-doc', () => doc);
        registerLibDir('swagger-ui-dist', undefined, {minify: 'deny', denyPathReplace: true, allowPackageJson: false});
        web.on('GET', route, async (context) => {
            context.send(swaggerInit.htmlString, true);
        });
        web.on('GET', `${route}/doc`, async (context) => {
            context.headers({'Content-Type': 'application/json'});
            context.send(JSON.stringify(doc), true);
        });
        if (!(moduleConfig?.denyRouteErrors ?? false) && errors && errors.length > 0) {
            container.logger.info(`@nfjs/back-openapi | Есть ошибки при сборе openapi документа. Доступны по адресу ${route}/errors`);
            web.on('GET', `${route}/errors`, async (context) => {
                context.headers({'Content-Type': 'application/json'});
                context.send(JSON.stringify(errors), true);
            });
        }
    }
}

export {
    init,
    meta
};
