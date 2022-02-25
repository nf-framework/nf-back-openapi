import assert from 'assert';
import { readFile } from 'fs/promises';

import { parse } from 'comment-parser';
import * as testing from '../build.js';
import path from "path";

function relativePath(relative, importMetaUrl) {
    return path.join(decodeURI(new URL(relative, importMetaUrl).pathname)).replace(/^\\([A-Z]:\\)/, "$1");
}

describe('@nfjs/back-openapi/src/build', () => {
    describe('build', () => {
        it('all', async () => {
            // Arrange
            const yamlF = await readFile(relativePath('./t1.yaml.txt', import.meta.url), 'utf8');
            const jsdocF = await readFile(relativePath('./t1.js.txt', import.meta.url), 'utf8');
            const jsdocRegex = /\/\*\*([\s\S]*?)\*\//gm;
            const jsdoc = [];
            [jsdocF].forEach(f => {
                const reg = f.match(jsdocRegex);
                jsdoc.push(...reg);
            });
            // Act
            const res = await testing.build({yaml: [yamlF], jsdoc, model: {}});
            // Assert
            const expected = {
                "post": {
                    "summary": "post r4",
                    "requestBody": {
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/NfcExSystemMapping"
                                }
                            }
                        }
                    },
                    "responses": {
                        "default": {
                            "$ref": "#/components/responses/r2"
                        }
                    }
                }
            };
            assert.deepStrictEqual(res?.doc?.paths?.['/r4'], expected);
            assert.deepStrictEqual(res?.errors?.[0]?.error, 'type NfcExSystemMapping not-found', );
        });
    });
});
